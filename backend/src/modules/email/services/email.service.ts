import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as path from 'path';
import * as fs from 'fs/promises';
import { SmtpProfile } from '../entities/smtp-profile.entity';

type DevTransportMode = 'ethereal' | 'file' | null;

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private etherealTransporter: nodemailer.Transporter | null = null;
  private etherealAccount: { user: string; pass: string } | null = null;
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
}
