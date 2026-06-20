import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { promises as dns } from 'dns';
import { isIP } from 'net';
import * as cheerio from 'cheerio';

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB cap on the fetched document
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 4;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

export interface ClonedPage {
  html: string;
  title: string;
  sourceUrl: string;
}

/**
 * Fetches a public web page server-side and turns it into a self-contained
 * landing-page template: scripts and event handlers are stripped, and asset
 * URLs (images, stylesheets) are absolutized so they still load. Forms are left
 * intact — the phish-server rewrites their action at serve time to capture
 * submissions.
 *
 * SSRF hardening: only http/https, redirects followed manually with re-checks,
 * and every resolved IP is validated against private/reserved ranges so the
 * server can't be tricked into reaching internal services or cloud metadata.
 */
@Injectable()
export class LandingCloneService {
  private readonly logger = new Logger(LandingCloneService.name);

  async clone(rawUrl: string): Promise<ClonedPage> {
    const { html, finalUrl } = await this.fetchSafely(rawUrl);
    const sanitized = this.sanitize(html, finalUrl);
    return { ...sanitized, sourceUrl: finalUrl };
  }

  /** Fetch with manual redirect handling, re-validating each hop against SSRF rules. */
  private async fetchSafely(startUrl: string): Promise<{ html: string; finalUrl: string }> {
    let url = startUrl;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      await this.assertSafeUrl(url);
      let res: Response;
      try {
        res = await fetch(url, {
          redirect: 'manual',
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new BadRequestException(`Could not fetch that URL: ${msg}`);
      }

      // Follow 3xx manually so each redirect target is re-validated.
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        url = new URL(res.headers.get('location') as string, url).toString();
        continue;
      }

      if (!res.ok) {
        throw new BadRequestException(`The site returned HTTP ${res.status}.`);
      }

      const contentType = res.headers.get('content-type') ?? '';
      if (contentType && !contentType.includes('html')) {
        throw new BadRequestException(`Expected an HTML page but got "${contentType}".`);
      }

      const declared = Number(res.headers.get('content-length') ?? '0');
      if (declared && declared > MAX_BYTES) {
        throw new BadRequestException('That page is too large to clone (over 3 MB).');
      }

      const html = await this.readCapped(res);
      return { html, finalUrl: url };
    }
    throw new BadRequestException('Too many redirects while fetching that URL.');
  }

  private async readCapped(res: Response): Promise<string> {
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) {
      throw new BadRequestException('That page is too large to clone (over 3 MB).');
    }
    return buf.toString('utf-8');
  }

  /** Reject non-public targets: bad scheme, or a host resolving to a private/reserved IP. */
  private async assertSafeUrl(rawUrl: string): Promise<void> {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new BadRequestException('That is not a valid URL.');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException('Only http and https URLs can be cloned.');
    }
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
      throw new BadRequestException('That host is not allowed.');
    }

    // Resolve the host to its IPs and reject any that are private/reserved.
    let addresses: string[];
    if (isIP(host)) {
      addresses = [host];
    } else {
      try {
        addresses = (await dns.lookup(host, { all: true })).map((a) => a.address);
      } catch {
        throw new BadRequestException('Could not resolve that host.');
      }
    }
    if (addresses.length === 0 || addresses.some((a) => this.isBlockedIp(a))) {
      throw new BadRequestException('That host resolves to a non-public address and was blocked.');
    }
  }

  private isBlockedIp(ip: string): boolean {
    const v = isIP(ip);
    if (v === 4) {
      const parts = ip.split('.').map(Number);
      const [a, b] = parts;
      if (a === 10) return true; // 10.0.0.0/8
      if (a === 127) return true; // loopback
      if (a === 0) return true; // 0.0.0.0/8
      if (a === 169 && b === 254) return true; // link-local + cloud metadata
      if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
      if (a === 192 && b === 168) return true; // 192.168.0.0/16
      if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
      return false;
    }
    if (v === 6) {
      const lower = ip.toLowerCase();
      if (lower === '::1' || lower === '::') return true; // loopback / unspecified
      if (lower.startsWith('fe80')) return true; // link-local
      if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique-local fc00::/7
      // IPv4-mapped (::ffff:a.b.c.d) → re-check the embedded v4 address
      const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/);
      if (mapped) return this.isBlockedIp(mapped[1]);
      return false;
    }
    return true; // unknown format → block
  }

  /** Strip active content and absolutize asset references. */
  private sanitize(html: string, baseUrl: string): { html: string; title: string } {
    const $ = cheerio.load(html);

    // 1. Drop anything that can execute or hijack the page.
    $('script, noscript, iframe, object, embed, base').remove();

    // 2. Remove inline event handlers (onclick, onload, …) and javascript: URLs.
    $('*').each((_, el) => {
      const attribs = (el as { attribs?: Record<string, string> }).attribs;
      if (!attribs) return;
      for (const attr of Object.keys(attribs)) {
        const val = attribs[attr];
        if (/^on/i.test(attr) || /^\s*javascript:/i.test(val)) {
          $(el).removeAttr(attr);
        }
      }
    });

    // 3. Absolutize asset URLs so images/CSS still resolve from our origin.
    const abs = (val: string): string => {
      try {
        if (/^(data:|mailto:|tel:|#)/i.test(val)) return val;
        return new URL(val, baseUrl).toString();
      } catch {
        return val;
      }
    };
    $('img, source, link[rel="stylesheet"], link[rel="icon"], link[rel="shortcut icon"]').each((_, el) => {
      const $el = $(el);
      const src = $el.attr('src');
      const href = $el.attr('href');
      if (src) $el.attr('src', abs(src));
      if (href) $el.attr('href', abs(href));
      const srcset = $el.attr('srcset');
      if (srcset) {
        $el.attr(
          'srcset',
          srcset
            .split(',')
            .map((part) => {
              const [u, d] = part.trim().split(/\s+/, 2);
              return `${abs(u)}${d ? ` ${d}` : ''}`;
            })
            .join(', '),
        );
      }
    });

    // 4. Absolutize url(...) inside <style> blocks and style="" attributes.
    const rewriteCssUrls = (css: string): string =>
      css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (_m, q, u) => `url(${q}${abs(u)}${q})`);
    $('style').each((_, el) => {
      const $el = $(el);
      $el.text(rewriteCssUrls($el.text()));
    });
    $('[style]').each((_, el) => {
      const $el = $(el);
      const s = $el.attr('style');
      if (s) $el.attr('style', rewriteCssUrls(s));
    });

    const title = ($('title').first().text() || $('meta[property="og:title"]').attr('content') || '').trim();
    return { html: $.html(), title };
  }
}
