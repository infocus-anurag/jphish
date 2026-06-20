// Pure helpers for the email-template editor: the personalization tokens that
// the campaign worker actually substitutes, client-side preview rendering, and
// a small library of starter templates. No React / no I/O.
import type { EmailTemplateType } from '@/lib/api/templates';

export interface TemplateVariable {
  token: string;
  label: string;
}

/**
 * The ONLY tokens substituted at real send time — see
 * campaigns.service.ts → templateVariables. Anything else stays literal, so the
 * picker advertises exactly these to avoid dead tokens in production sends.
 */
export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { token: 'firstName', label: 'First name' },
  { token: 'lastName', label: 'Last name' },
  { token: 'email', label: 'Email' },
  { token: 'department', label: 'Department' },
];

/** Realistic sample values used only for the live preview. */
export const SAMPLE_VARS: Record<string, string> = {
  firstName: 'Alex',
  lastName: 'Taylor',
  email: 'alex.taylor@acme-corp.com',
  department: 'Finance',
};

/** Substitute {{ token }} (whitespace-tolerant) with the provided values. */
export function renderWithVars(text: string, vars: Record<string, string>): string {
  let out = text;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), value);
  }
  return out;
}

/** Return the unique set of {{ tokens }} referenced anywhere in the text. */
export function extractVariables(...texts: string[]): string[] {
  const found = new Set<string>();
  const re = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
  for (const text of texts) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) found.add(m[1]);
  }
  return [...found];
}

/** Tokens used in the template that the platform will NOT substitute. */
export function unknownVariables(...texts: string[]): string[] {
  const known = new Set(TEMPLATE_VARIABLES.map((v) => v.token));
  return extractVariables(...texts).filter((v) => !known.has(v));
}

export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  type: EmailTemplateType;
  subject: string;
  htmlContent: string;
}

const wrap = (inner: string): string =>
  `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.6;max-width:560px">\n${inner}\n</div>`;

/**
 * Starter templates for authorized phishing-simulation / awareness training.
 * Each uses only supported personalization tokens.
 */
export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'password-expiry',
    name: 'Password expiry notice',
    description: 'Classic IT-helpdesk credential lure.',
    type: 'phishing',
    subject: 'Action required: your password expires today',
    htmlContent: wrap(
      `<p>Hi {{firstName}},</p>
<p>Our records show the password for <strong>{{email}}</strong> will expire in <strong>2 hours</strong>. To avoid losing access, please re-verify your account now.</p>
<p style="margin:24px 0"><a href="https://example.com/reset" style="background:#0b5cab;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Keep my password</a></p>
<p>If you don't act, your account will be locked for security reasons.</p>
<p>Regards,<br/>IT Service Desk</p>`,
    ),
  },
  {
    id: 'mfa-verify',
    name: 'MFA re-enrollment',
    description: 'Security-themed multi-factor prompt.',
    type: 'phishing',
    subject: 'Your multi-factor authentication needs re-verification',
    htmlContent: wrap(
      `<p>Hello {{firstName}},</p>
<p>We've upgraded our security systems. All {{department}} staff must re-enroll their authenticator before end of day.</p>
<p style="margin:24px 0"><a href="https://example.com/mfa" style="background:#1a7f37;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Re-enroll now</a></p>
<p>Thank you for helping keep our data safe.</p>
<p>Information Security Team</p>`,
    ),
  },
  {
    id: 'shared-doc',
    name: 'Shared document',
    description: 'A colleague shared a file with you.',
    type: 'phishing',
    subject: 'A document has been shared with you',
    htmlContent: wrap(
      `<p>Hi {{firstName}},</p>
<p>A file <strong>"Q3 Budget — {{department}}.xlsx"</strong> has been shared with you and is awaiting your review.</p>
<p style="margin:24px 0"><a href="https://example.com/doc" style="background:#0b5cab;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Open document</a></p>
<p>This link will expire in 7 days.</p>`,
    ),
  },
  {
    id: 'payroll-update',
    name: 'Payroll update',
    description: 'HR/finance themed lure.',
    type: 'phishing',
    subject: 'Important: confirm your direct-deposit details',
    htmlContent: wrap(
      `<p>Dear {{firstName}} {{lastName}},</p>
<p>Payroll is migrating to a new provider. Please confirm your direct-deposit information before the next pay run to avoid a delayed payment.</p>
<p style="margin:24px 0"><a href="https://example.com/payroll" style="background:#8250df;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Confirm details</a></p>
<p>People &amp; Culture</p>`,
    ),
  },
  {
    id: 'awareness-followup',
    name: 'Training follow-up',
    description: 'Post-simulation awareness message.',
    type: 'training',
    subject: 'You spotted a phishing simulation — nice work',
    htmlContent: wrap(
      `<p>Hi {{firstName}},</p>
<p>This was a <strong>simulated phishing test</strong> run by your security team. Thanks for taking a moment to think before clicking.</p>
<p>A few quick reminders:</p>
<ul>
  <li>Check the sender's real address, not just the display name.</li>
  <li>Hover over links before clicking.</li>
  <li>Report anything suspicious to the security team.</li>
</ul>
<p>Stay safe,<br/>Security Awareness</p>`,
    ),
  },
  {
    id: 'blank',
    name: 'Blank template',
    description: 'Start from an empty body.',
    type: 'phishing',
    subject: '',
    htmlContent: wrap(`<p>Hello {{firstName}},</p>\n<p>Write your message here.</p>`),
  },
];

export const TEMPLATE_TYPE_LABEL: Record<EmailTemplateType, string> = {
  phishing: 'Phishing',
  training: 'Training',
  transactional: 'Notification',
};
