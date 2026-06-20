// Pure helpers for the landing-page editor: slug derivation and starter
// templates. No React / no I/O.
import type { LandingPageCapture } from '@/lib/api/landing-pages';

/** Turn arbitrary text (a name or a hostname) into a valid slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/g, '');
}

/** Best-effort name/slug suggestion from a cloned page's title or URL. */
export function suggestFromSource(title: string, sourceUrl: string): { name: string; slug: string } {
  let host = '';
  try {
    host = new URL(sourceUrl).hostname.replace(/^www\./, '');
  } catch {
    host = '';
  }
  const name = title?.trim() || host || 'Cloned page';
  const slug = slugify(host || title || 'cloned-page');
  return { name, slug: slug || 'cloned-page' };
}

export interface LandingPreset {
  id: string;
  name: string;
  description: string;
  captureType: LandingPageCapture;
  html: string;
}

const SIGNIN = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sign in</title>
<style>body{font:14px system-ui,sans-serif;background:#f6f7f9;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.card{background:#fff;border:1px solid #ddd;padding:32px;border-radius:8px;width:340px;box-shadow:0 1px 4px rgba(0,0,0,.06)}h1{margin:0 0 16px;font-size:18px}label{display:block;margin-top:12px;font-size:12px;color:#444}input{width:100%;padding:9px;margin-top:4px;border:1px solid #ccc;border-radius:4px;font:inherit;box-sizing:border-box}button{margin-top:18px;width:100%;padding:10px;background:#1f6feb;color:#fff;border:0;border-radius:4px;font:inherit;cursor:pointer}</style></head>
<body><div class="card"><h1>Sign in</h1><form>
<label>Email<input name="email" type="email" required></label>
<label>Password<input name="password" type="password" required></label>
<button type="submit">Sign in</button></form></div></body></html>`;

const OTP = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Verify it's you</title>
<style>body{font:14px system-ui,sans-serif;background:#f6f7f9;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.card{background:#fff;border:1px solid #ddd;padding:32px;border-radius:8px;width:340px;box-shadow:0 1px 4px rgba(0,0,0,.06)}h1{margin:0 0 6px;font-size:18px}p{margin:0 0 14px;color:#666;font-size:12.5px}label{display:block;margin-top:12px;font-size:12px;color:#444}input{width:100%;padding:9px;margin-top:4px;border:1px solid #ccc;border-radius:4px;font:inherit;box-sizing:border-box}button{margin-top:18px;width:100%;padding:10px;background:#1a7f37;color:#fff;border:0;border-radius:4px;font:inherit;cursor:pointer}</style></head>
<body><div class="card"><h1>Verify it's you</h1><p>Enter your password and the 6-digit code from your authenticator.</p><form>
<label>Password<input name="password" type="password" required></label>
<label>One-time code<input name="otp" inputmode="numeric" maxlength="6" required></label>
<button type="submit">Verify</button></form></div></body></html>`;

const AWARENESS = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Notice</title>
<style>body{font:15px/1.6 system-ui,sans-serif;background:#fff;color:#111;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.card{max-width:460px;padding:32px}h1{font-size:20px;margin:0 0 10px}</style></head>
<body><div class="card"><h1>Page unavailable</h1><p>This resource is temporarily unavailable. Please contact your IT team if you need access.</p></div></body></html>`;

export const LANDING_PRESETS: LandingPreset[] = [
  {
    id: 'signin',
    name: 'Generic sign-in',
    description: 'Email + password login form.',
    captureType: 'credentials',
    html: SIGNIN,
  },
  {
    id: 'otp',
    name: 'Password + OTP',
    description: 'Login with a one-time code field.',
    captureType: 'credentials_otp',
    html: OTP,
  },
  {
    id: 'awareness',
    name: 'Awareness only',
    description: 'No form — just a benign notice page.',
    captureType: 'none',
    html: AWARENESS,
  },
];

export const CAPTURE_LABEL: Record<LandingPageCapture, string> = {
  none: 'No capture (awareness only)',
  credentials: 'Credentials (email + password)',
  credentials_otp: 'Credentials + OTP',
  custom: 'Custom fields',
};
