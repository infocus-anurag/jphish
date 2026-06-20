import { describe, it, expect } from 'vitest';
import { slugify, suggestFromSource, LANDING_PRESETS } from '@/lib/landing-utils';

describe('slugify', () => {
  it('lowercases, strips protocol, and hyphenates', () => {
    expect(slugify('Workday Password Reset')).toBe('workday-password-reset');
    expect(slugify('https://Login.Example.com')).toBe('login-example-com');
    expect(slugify('  Trim__me!! ')).toBe('trim-me');
  });

  it('caps length at 64 characters', () => {
    expect(slugify('a'.repeat(100)).length).toBeLessThanOrEqual(64);
  });
});

describe('suggestFromSource', () => {
  it('prefers the page title for the name and host for the slug', () => {
    const out = suggestFromSource('Sign in · Acme', 'https://www.acme-corp.com/login');
    expect(out.name).toBe('Sign in · Acme');
    expect(out.slug).toBe('acme-corp-com');
  });

  it('falls back to the host when there is no title', () => {
    const out = suggestFromSource('', 'https://portal.example.org/');
    expect(out.name).toBe('portal.example.org');
    expect(out.slug).toBe('portal-example-org');
  });

  it('handles an unparseable URL gracefully', () => {
    const out = suggestFromSource('My Page', 'not a url');
    expect(out.name).toBe('My Page');
    expect(out.slug.length).toBeGreaterThan(0);
  });
});

describe('LANDING_PRESETS', () => {
  it('each preset has html and a valid capture type', () => {
    for (const p of LANDING_PRESETS) {
      expect(p.html).toContain('<html');
      expect(['none', 'credentials', 'credentials_otp', 'custom']).toContain(p.captureType);
    }
  });
});
