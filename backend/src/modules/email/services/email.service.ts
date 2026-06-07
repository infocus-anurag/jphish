import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as path from 'path';
import * as fs from 'fs/promises';
import { SmtpProfile } from '../entities/smtp-profile.entity';

type DevTransportMode = 'ethereal' | 'file' | null;

/** Resolved Mailgun REST-API credentials. */
interface MailgunConfig {
  apiKey: string;
  domain: string;
  /** API base host — `api.mailgun.net` (US) or `api.eu.mailgun.net` (EU). */
  host: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private etherealTransporter: nodemailer.Transporter | null = null;
  private etherealAccount: { user: string; pass: string } | null = null;
  /** Cached Mailgun transporter — provider-wide, not per-profile (the profile
   *  only supplies the From address, not the connection). */
  private mailgunTransporter: nodemailer.Transporter | null = null;
  /** Cache of real-SMTP transporters keyed by the connection fingerprint, so a
   *  credential change invalidates the entry rather than reusing a stale pool. */
  private readonly smtpTransporters = new Map<string, nodemailer.Transporter>();

  constructor(private config: ConfigService) {}

  private smtpCacheKey(profile: SmtpProfile): string {
    return [profile.id, profile.host, profile.port, profile.secure, profile.user, profile.password].join(
      '|',
    );
  }

  async testSmtpConnection(profile: SmtpProfile): Promise<boolean> {
    // When Mailgun is the active provider there is no SMTP socket to verify —
    // probe the REST API instead (and skip the profile's host/port entirely).
    const mailgun = this.mailgunConfig();
    if (mailgun) {
      return this.verifyMailgun(mailgun);
    }

    try {
      const transporter = await this.createTransporter(profile);
      await transporter.verify();
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`SMTP verification failed for ${profile.name}:`, error);
      throw new BadRequestException(`Failed to connect to SMTP server: ${errorMsg}`);
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent: string | null,
    profile: SmtpProfile,
    headers?: Record<string, string>,
  ): Promise<{ messageId: string; accepted: boolean; previewUrl?: string }> {
    const transporter = await this.createTransporter(profile);

    const result = await transporter.sendMail({
      from: `${profile.fromName || profile.fromEmail} <${profile.fromEmail}>`,
      to,
      subject,
      html: htmlContent,
      text: textContent || undefined,
      headers,
    });

    const previewUrl =
      this.devTransportMode() === 'ethereal'
        ? (nodemailer.getTestMessageUrl(result) as string | undefined) || undefined
        : undefined;

    if (previewUrl) {
      this.logger.log(`[ethereal] Preview for ${to}: ${previewUrl}`);
    }

    return {
      messageId: result.messageId,
      accepted: true,
      previewUrl,
    };
  }

  private devTransportMode(): DevTransportMode {
    const mode = (this.config.get<string>('MAIL_DEV_MODE') || '').toLowerCase();
    if (mode === 'ethereal' || mode === 'file') return mode;
    return null;
  }

  // The transporter we return depends on MAIL_DEV_MODE:
  //   - "ethereal"  → free dev account, sends mail into nodemailer's preview UI.
  //   - "file"      → writes each message as .eml to ./tmp/mail/ for inspection.
  //   - unset       → real SMTP using the profile's host/port/credentials.
  private async createTransporter(profile: SmtpProfile): Promise<nodemailer.Transporter> {
    const mode = this.devTransportMode();

    if (mode === 'ethereal') {
      if (!this.etherealTransporter) {
        const account = await nodemailer.createTestAccount();
        this.etherealAccount = { user: account.user, pass: account.pass };
        this.etherealTransporter = nodemailer.createTransport({
          host: account.smtp.host,
          port: account.smtp.port,
          secure: account.smtp.secure,
          auth: { user: account.user, pass: account.pass },
        });
        this.logger.log(`[ethereal] Dev account created: ${account.user}`);
      }
      return this.etherealTransporter;
    }

    if (mode === 'file') {
      const outDir = path.resolve(process.cwd(), 'tmp', 'mail');
      await fs.mkdir(outDir, { recursive: true });
      // streamTransport returns the raw message; we persist it ourselves.
      const transport = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
      // Wrap sendMail to also write the file.
      const origSend = transport.sendMail.bind(transport);
      transport.sendMail = (async (mailOpts: nodemailer.SendMailOptions) => {
        const info = await origSend(mailOpts);
        const fname = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.eml`;
        const fpath = path.join(outDir, fname);
        await fs.writeFile(fpath, info.message as Buffer);
        this.logger.log(`[file] Wrote email to ${fpath}`);
        return info;
      }) as typeof transport.sendMail;
      return transport;
    }

    // Mailgun HTTP API — for environments that block outbound SMTP (e.g.
    // Railway Free/Hobby). Talks to api.mailgun.net over HTTPS:443, so it
    // ignores the profile's host/port/secure entirely; the profile is still
    // used by sendEmail() for the From name/address. Cached provider-wide.
    const mailgun = this.mailgunConfig();
    if (mailgun) {
      if (!this.mailgunTransporter) {
        this.mailgunTransporter = this.buildMailgunTransporter(mailgun);
        this.logger.log(`[mailgun] Using REST API transport for domain ${mailgun.domain}`);
      }
      return this.mailgunTransporter;
    }

    // Real SMTP — driven entirely by the supplied profile. Pooled & cached per
    // profile so a 100-recipient campaign reuses a handful of kept-alive
    // connections instead of dialing the server 100 times.
    const key = this.smtpCacheKey(profile);
    const cached = this.smtpTransporters.get(key);
    if (cached) return cached;

    // Pool sizing is read from config (so .env applies). Bulk sends reuse a
    // kept-alive pool instead of a fresh TCP+TLS+auth handshake per email.
    const maxConnections = this.config.get<number>('MAIL_SMTP_MAX_CONNECTIONS') || 5;
    const maxMessages = this.config.get<number>('MAIL_SMTP_MAX_MESSAGES') || 100;
    const transporter = nodemailer.createTransport({
      host: profile.host,
      port: profile.port,
      secure: profile.secure,
      auth: {
        user: profile.user,
        pass: profile.password,
      },
      pool: true,
      maxConnections,
      maxMessages,
      connectionTimeout: 10000,
      socketTimeout: 10000,
    });
    this.smtpTransporters.set(key, transporter);
    return transporter;
  }

  /**
   * Resolve Mailgun credentials when it is the selected provider.
   * Returns null when `MAIL_PROVIDER` is anything other than `mailgun` (so the
   * SMTP path stays the default). Throws if it's selected but misconfigured —
   * a silent fall-through to SMTP would just time out on Railway.
   */
  private mailgunConfig(): MailgunConfig | null {
    const provider = (this.config.get<string>('MAIL_PROVIDER') || '').toLowerCase();
    if (provider !== 'mailgun') return null;

    const apiKey = this.config.get<string>('MAILGUN_API_KEY');
    const domain = this.config.get<string>('MAILGUN_DOMAIN');
    if (!apiKey || !domain) {
      throw new BadRequestException(
        'MAIL_PROVIDER=mailgun but MAILGUN_API_KEY and/or MAILGUN_DOMAIN are not set',
      );
    }

    const host = this.config.get<string>('MAILGUN_API_HOST') || 'api.mailgun.net';
    return { apiKey, domain, host };
  }

  /** HTTP Basic auth header for the Mailgun API (user is the literal "api"). */
  private mailgunAuthHeader(cfg: MailgunConfig): string {
    return 'Basic ' + Buffer.from(`api:${cfg.apiKey}`).toString('base64');
  }

  /**
   * Verify Mailgun connectivity + credentials without sending mail by fetching
   * the domain record. Surfaces a clear error (bad key → 401, wrong region/
   * domain → 404) so the SMTP-profile "Test" button reports something useful.
   */
  private async verifyMailgun(cfg: MailgunConfig): Promise<boolean> {
    try {
      const res = await fetch(`https://${cfg.host}/v3/domains/${encodeURIComponent(cfg.domain)}`, {
        headers: { Authorization: this.mailgunAuthHeader(cfg) },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${body.slice(0, 300)}`);
      }
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Mailgun verification failed for domain ${cfg.domain}: ${msg}`);
      throw new BadRequestException(`Failed to verify Mailgun API: ${msg}`);
    }
  }

  /**
   * A custom Nodemailer transport that POSTs to Mailgun's `/messages` REST
   * endpoint over HTTPS instead of opening an SMTP connection. Implementing it
   * as a Nodemailer transport keeps sendEmail()/the campaign worker unchanged.
   */
  private buildMailgunTransporter(cfg: MailgunConfig): nodemailer.Transporter {
    const endpoint = `https://${cfg.host}/v3/${encodeURIComponent(cfg.domain)}/messages`;
    const authHeader = this.mailgunAuthHeader(cfg);

    // Typed loosely: a custom transport receives a MailMessage whose `.data`
    // holds the options we passed to sendMail().
    const transport: any = {
      name: 'mailgun-rest',
      version: '1.0.0',
      send(mail: any, callback: (err: Error | null, info?: unknown) => void): void {
        void (async () => {
          const data = mail.data as nodemailer.SendMailOptions;
          const form = new URLSearchParams();

          const from = typeof data.from === 'string' ? data.from : '';
          if (from) form.set('from', from);

          const recipients = ([] as unknown[])
            .concat((data.to as unknown) ?? [])
            .map((r) => (typeof r === 'string' ? r : (r as { address?: string })?.address))
            .filter((r): r is string => Boolean(r));
          for (const r of recipients) form.append('to', r);

          if (typeof data.subject === 'string') form.set('subject', data.subject);
          if (typeof data.html === 'string') form.set('html', data.html);
          if (typeof data.text === 'string') form.set('text', data.text);

          // Custom headers (tracking IDs, List-Unsubscribe, …) → Mailgun's
          // "h:" prefixed form fields.
          const headers = data.headers as Record<string, string> | undefined;
          if (headers && typeof headers === 'object') {
            for (const [k, v] of Object.entries(headers)) {
              form.set(`h:${k}`, String(v));
            }
          }

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: form.toString(),
            signal: AbortSignal.timeout(15000),
          });

          if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new Error(`Mailgun API ${res.status}: ${body.slice(0, 300)}`);
          }

          const json = (await res.json()) as { id?: string; message?: string };
          callback(null, {
            envelope: { from, to: recipients },
            messageId: json.id ?? '',
            accepted: recipients,
            rejected: [],
            response: json.message ?? 'Queued',
          });
        })().catch((err: unknown) =>
          callback(err instanceof Error ? err : new Error(String(err))),
        );
      },
    };

    return nodemailer.createTransport(transport);
  }
}
