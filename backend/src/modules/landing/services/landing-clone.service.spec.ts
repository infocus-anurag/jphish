import { BadRequestException } from '@nestjs/common';
import { LandingCloneService } from './landing-clone.service';

describe('LandingCloneService', () => {
  let service: LandingCloneService;

  beforeEach(() => {
    service = new LandingCloneService();
  });

  describe('isBlockedIp', () => {
    const blocked = (ip: string) => (service as any).isBlockedIp(ip) as boolean;

    it('blocks private and reserved IPv4 ranges', () => {
      expect(blocked('10.0.0.1')).toBe(true);
      expect(blocked('127.0.0.1')).toBe(true);
      expect(blocked('169.254.169.254')).toBe(true); // cloud metadata
      expect(blocked('172.16.5.4')).toBe(true);
      expect(blocked('192.168.1.1')).toBe(true);
      expect(blocked('100.64.0.1')).toBe(true); // CGNAT
      expect(blocked('0.0.0.0')).toBe(true);
    });

    it('allows public IPv4 addresses', () => {
      expect(blocked('8.8.8.8')).toBe(false);
      expect(blocked('1.1.1.1')).toBe(false);
      expect(blocked('172.15.0.1')).toBe(false); // just outside 172.16/12
      expect(blocked('172.32.0.1')).toBe(false);
    });

    it('blocks loopback / link-local / unique-local IPv6', () => {
      expect(blocked('::1')).toBe(true);
      expect(blocked('fe80::1')).toBe(true);
      expect(blocked('fc00::1')).toBe(true);
      expect(blocked('fd12:3456::1')).toBe(true);
      expect(blocked('::ffff:127.0.0.1')).toBe(true); // IPv4-mapped loopback
    });

    it('allows public IPv6', () => {
      expect(blocked('2606:4700:4700::1111')).toBe(false);
    });
  });

  describe('assertSafeUrl', () => {
    const check = (url: string) => (service as any).assertSafeUrl(url) as Promise<void>;

    it('rejects non-http(s) schemes', async () => {
      await expect(check('ftp://example.com')).rejects.toBeInstanceOf(BadRequestException);
      await expect(check('file:///etc/passwd')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects localhost and internal hostnames', async () => {
      await expect(check('http://localhost/x')).rejects.toBeInstanceOf(BadRequestException);
      await expect(check('http://db.internal/x')).rejects.toBeInstanceOf(BadRequestException);
      await expect(check('http://service.local/x')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects private IP literals', async () => {
      await expect(check('http://127.0.0.1:8080')).rejects.toBeInstanceOf(BadRequestException);
      await expect(check('http://169.254.169.254/latest/meta-data')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('sanitize', () => {
    const sanitize = (html: string, base: string) =>
      (service as any).sanitize(html, base) as { html: string; title: string };

    it('strips scripts, iframes and inline event handlers', () => {
      const { html } = sanitize(
        `<html><head><title>X</title></head><body>
         <script>alert(1)</script>
         <iframe src="https://evil"></iframe>
         <button onclick="steal()">Go</button>
         <a href="javascript:alert(2)">bad</a>
        </body></html>`,
        'https://site.test/',
      );
      expect(html).not.toMatch(/<script/i);
      expect(html).not.toMatch(/<iframe/i);
      expect(html).not.toMatch(/onclick/i);
      expect(html).not.toMatch(/javascript:/i);
    });

    it('absolutizes relative asset URLs against the base', () => {
      const { html } = sanitize(
        `<html><head><link rel="stylesheet" href="/css/app.css"></head>
         <body><img src="img/logo.png"></body></html>`,
        'https://site.test/login',
      );
      expect(html).toContain('https://site.test/css/app.css');
      expect(html).toContain('https://site.test/img/logo.png');
    });

    it('rewrites url() references in inline styles', () => {
      const { html } = sanitize(
        `<html><body><div style="background:url('/bg.png')"></div></body></html>`,
        'https://site.test/',
      );
      expect(html).toContain('https://site.test/bg.png');
    });

    it('extracts the page title', () => {
      const { title } = sanitize('<html><head><title> Hello </title></head></html>', 'https://x.test/');
      expect(title).toBe('Hello');
    });

    it('leaves forms intact for the phish-server to rewrite', () => {
      const { html } = sanitize(
        '<html><body><form action="/login" method="post"><input name="u"></form></body></html>',
        'https://site.test/',
      );
      expect(html).toMatch(/<form/i);
      expect(html).toMatch(/name="u"/i);
    });
  });
});
