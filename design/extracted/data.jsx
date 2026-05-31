// data.jsx — seed data for the prototype
// Realistic-feeling phishing simulation data, no real names/orgs.

const SEED_USERS = [
  { id: 'u1', name: 'Imani Okafor', email: 'imani.okafor@northbeam.io', dept: 'Engineering', role: 'Staff Engineer', risk: 12, last: 'reported', trained: 6 },
  { id: 'u2', name: 'Theo Kowalski', email: 'theo.kowalski@northbeam.io', dept: 'Finance', role: 'AP Manager', risk: 84, last: 'submitted', trained: 1 },
  { id: 'u3', name: 'Renata Vasquez', email: 'renata.v@northbeam.io', dept: 'Sales', role: 'AE', risk: 67, last: 'clicked', trained: 3 },
  { id: 'u4', name: 'Malik Chen', email: 'malik.chen@northbeam.io', dept: 'IT', role: 'SRE', risk: 8, last: 'reported', trained: 7 },
  { id: 'u5', name: 'Soraya Nazari', email: 'soraya.n@northbeam.io', dept: 'HR', role: 'People Ops Lead', risk: 41, last: 'opened', trained: 4 },
  { id: 'u6', name: 'Jonas Lindqvist', email: 'jonas.l@northbeam.io', dept: 'Finance', role: 'Controller', risk: 73, last: 'submitted', trained: 2 },
  { id: 'u7', name: 'Priya Bhatt', email: 'priya.bhatt@northbeam.io', dept: 'Engineering', role: 'Frontend Eng', risk: 22, last: 'opened', trained: 5 },
  { id: 'u8', name: 'Hugo Marchetti', email: 'hugo.m@northbeam.io', dept: 'Marketing', role: 'Brand Lead', risk: 56, last: 'clicked', trained: 3 },
  { id: 'u9', name: 'Zara Aboulafia', email: 'zara.a@northbeam.io', dept: 'Legal', role: 'Counsel', risk: 18, last: 'reported', trained: 6 },
  { id: 'u10', name: 'Devansh Reddy', email: 'd.reddy@northbeam.io', dept: 'Sales', role: 'SDR', risk: 79, last: 'submitted', trained: 1 },
  { id: 'u11', name: 'Linnea Halvorsen', email: 'linnea.h@northbeam.io', dept: 'Engineering', role: 'Backend Eng', risk: 31, last: 'opened', trained: 4 },
  { id: 'u12', name: 'Bashir Otieno', email: 'bashir.o@northbeam.io', dept: 'IT', role: 'Helpdesk', risk: 47, last: 'clicked', trained: 3 },
  { id: 'u13', name: 'Camille Aubert', email: 'camille.a@northbeam.io', dept: 'Marketing', role: 'PMM', risk: 38, last: 'opened', trained: 4 },
  { id: 'u14', name: 'Mateus Ribeiro', email: 'mateus.r@northbeam.io', dept: 'Finance', role: 'Treasury Analyst', risk: 91, last: 'submitted', trained: 0 },
  { id: 'u15', name: 'Anika Schreiber', email: 'anika.s@northbeam.io', dept: 'HR', role: 'Recruiter', risk: 27, last: 'reported', trained: 5 },
  { id: 'u16', name: 'Yusuf El-Amin', email: 'yusuf.e@northbeam.io', dept: 'Engineering', role: 'EM', risk: 15, last: 'reported', trained: 6 },
];

const SEED_CAMPAIGNS = [
  { id: 'c1', name: 'Q2 — Workday Password Reset', status: 'running', sent: 1284, opened: 902, clicked: 318, submitted: 142, reported: 287, risk: 'high', start: 'Apr 28', owner: 'You', template: 'Workday — Password Expiring', group: 'All Employees', adaptive: false },
  { id: 'c2', name: 'AP Wire Transfer — Finance Pilot', status: 'running', sent: 64, opened: 51, clicked: 38, submitted: 24, reported: 6, risk: 'critical', start: 'May 01', owner: 'You', template: 'CFO Urgent Wire', group: 'Finance Dept', adaptive: true },
  { id: 'c3', name: 'IT Helpdesk — MFA Re-enrollment', status: 'scheduled', sent: 0, opened: 0, clicked: 0, submitted: 0, reported: 0, risk: 'med', start: 'May 06', owner: 'M. Chen', template: 'MFA Re-enroll', group: 'All Employees', adaptive: false },
  { id: 'c4', name: 'Adaptive: High-Risk Cohort May', status: 'running', sent: 47, opened: 39, clicked: 12, submitted: 4, reported: 18, risk: 'med', start: 'Apr 30', owner: 'Auto', template: 'Multi-template', group: 'Adaptive: Risk ≥ 70', adaptive: true },
  { id: 'c5', name: 'Q1 — DocuSign Contract Review', status: 'completed', sent: 1284, opened: 1019, clicked: 412, submitted: 89, reported: 521, risk: 'low', start: 'Mar 12', owner: 'S. Nazari', template: 'DocuSign — Contract', group: 'All Employees', adaptive: false },
  { id: 'c6', name: 'Onboarding Baseline Q2', status: 'completed', sent: 38, opened: 30, clicked: 14, submitted: 6, reported: 8, risk: 'med', start: 'Apr 02', owner: 'You', template: 'Welcome — IT Setup', group: 'New Hires Q2', adaptive: false },
  { id: 'c7', name: 'Vendor Invoice Pretext', status: 'draft', sent: 0, opened: 0, clicked: 0, submitted: 0, reported: 0, risk: 'low', start: '—', owner: 'You', template: 'Invoice Past Due', group: 'AP Team', adaptive: false },
  { id: 'c8', name: 'CEO Gift Card Pretext', status: 'awaiting-approval', sent: 0, opened: 0, clicked: 0, submitted: 0, reported: 0, risk: 'high', start: 'May 09', owner: 'R. Vasquez', template: 'CEO Urgent', group: 'EAs + Mgmt', adaptive: false },
];

const SEED_TEMPLATES = [
  { id: 't1', name: 'Workday — Password Expiring', category: 'IT', difficulty: 3, lang: 'EN', usage: 12, ctr: 31, lastUsed: '2d', author: 'JPhish' },
  { id: 't2', name: 'CFO Urgent Wire', category: 'Finance', difficulty: 5, lang: 'EN', usage: 4, ctr: 58, lastUsed: '1d', author: 'You' },
  { id: 't3', name: 'DocuSign — Contract', category: 'Legal', difficulty: 4, lang: 'EN', usage: 8, ctr: 39, lastUsed: '4w', author: 'JPhish' },
  { id: 't4', name: 'MFA Re-enroll', category: 'IT', difficulty: 3, lang: 'EN', usage: 6, ctr: 22, lastUsed: '6d', author: 'M. Chen' },
  { id: 't5', name: 'CEO Urgent', category: 'Executive', difficulty: 5, lang: 'EN', usage: 2, ctr: 64, lastUsed: '5w', author: 'JPhish' },
  { id: 't6', name: 'Invoice Past Due', category: 'Finance', difficulty: 4, lang: 'EN', usage: 3, ctr: 41, lastUsed: '3w', author: 'JPhish' },
  { id: 't7', name: 'Shipping — Package Held', category: 'Consumer', difficulty: 2, lang: 'EN', usage: 9, ctr: 28, lastUsed: '8d', author: 'JPhish' },
  { id: 't8', name: 'LinkedIn — New Connection', category: 'Social', difficulty: 3, lang: 'EN', usage: 7, ctr: 19, lastUsed: '2w', author: 'JPhish' },
  { id: 't9', name: 'Welcome — IT Setup', category: 'IT', difficulty: 2, lang: 'EN', usage: 5, ctr: 17, lastUsed: '1w', author: 'You' },
  { id: 't10', name: 'Bonus Notification', category: 'HR', difficulty: 4, lang: 'EN', usage: 2, ctr: 47, lastUsed: '6w', author: 'JPhish' },
  { id: 't11', name: 'Calendar Invite — Mandatory', category: 'IT', difficulty: 3, lang: 'EN', usage: 6, ctr: 33, lastUsed: '2w', author: 'P. Bhatt' },
  { id: 't12', name: 'Office 365 Quota Full', category: 'IT', difficulty: 2, lang: 'EN', usage: 11, ctr: 25, lastUsed: '11d', author: 'JPhish' },
];

const SEED_ACTIVITY = [
  { t: '12:42:08', user: 'mateus.r@', action: 'submitted', target: 'AP Wire Transfer', risk: 'critical' },
  { t: '12:41:55', user: 'd.reddy@', action: 'clicked', target: 'AP Wire Transfer', risk: 'high' },
  { t: '12:41:30', user: 'imani.okafor@', action: 'reported', target: 'Workday Password Reset', risk: 'low' },
  { t: '12:40:18', user: 'theo.kowalski@', action: 'submitted', target: 'AP Wire Transfer', risk: 'critical' },
  { t: '12:39:51', user: 'soraya.n@', action: 'opened', target: 'Workday Password Reset', risk: 'med' },
  { t: '12:38:22', user: 'malik.chen@', action: 'reported', target: 'Adaptive: High-Risk', risk: 'low' },
  { t: '12:37:04', user: 'zara.a@', action: 'reported', target: 'Workday Password Reset', risk: 'low' },
  { t: '12:36:11', user: 'priya.bhatt@', action: 'opened', target: 'Workday Password Reset', risk: 'med' },
  { t: '12:35:42', user: 'hugo.m@', action: 'clicked', target: 'Workday Password Reset', risk: 'high' },
  { t: '12:35:08', user: 'jonas.l@', action: 'submitted', target: 'AP Wire Transfer', risk: 'critical' },
  { t: '12:34:19', user: 'camille.a@', action: 'opened', target: 'Workday Password Reset', risk: 'med' },
  { t: '12:33:55', user: 'yusuf.e@', action: 'reported', target: 'Workday Password Reset', risk: 'low' },
];

const SEED_DEPTS = [
  { name: 'Finance', users: 14, sent: 142, click: 41, submit: 19, report: 22, risk: 76 },
  { name: 'Sales', users: 38, sent: 384, click: 88, submit: 23, report: 71, risk: 58 },
  { name: 'Marketing', users: 22, sent: 222, click: 47, submit: 14, report: 49, risk: 47 },
  { name: 'HR', users: 12, sent: 120, click: 18, submit: 5, report: 36, risk: 34 },
  { name: 'Engineering', users: 64, sent: 642, click: 71, submit: 12, report: 198, risk: 22 },
  { name: 'IT', users: 18, sent: 180, click: 14, submit: 2, report: 71, risk: 14 },
  { name: 'Legal', users: 6, sent: 58, click: 6, submit: 1, report: 18, risk: 18 },
];

// 14 days × 24 hours of activity heat
function makeHeat() {
  const out = [];
  for (let d = 0; d < 14; d++) {
    for (let h = 0; h < 24; h++) {
      let v = Math.random() * 0.3;
      if (h >= 9 && h <= 17) v += Math.random() * 0.6;
      if (d === 12 || d === 13) v += Math.random() * 0.3;
      if (h === 10 && d === 13) v = 1;
      out.push({ d, h, v: Math.min(v, 1) });
    }
  }
  return out;
}
const SEED_HEAT = makeHeat();

// Risk distribution buckets
const SEED_RISK_DIST = [
  { bucket: '0-20', count: 64, label: 'Low' },
  { bucket: '21-40', count: 38, label: 'Watchful' },
  { bucket: '41-60', count: 22, label: 'Med' },
  { bucket: '61-80', count: 14, label: 'High' },
  { bucket: '81-100', count: 4, label: 'Critical' },
];

// Time series for funnel (last 14 days)
const SEED_TIMESERIES = (() => {
  const days = [];
  let sent = 80, open = 50, click = 20, sub = 6, rep = 14;
  for (let i = 0; i < 14; i++) {
    const j = (Math.sin(i * 0.7) + 1) * 0.3;
    sent = Math.round(70 + j * 50 + Math.random() * 30);
    open = Math.round(sent * (0.65 + Math.random() * 0.1));
    click = Math.round(open * (0.28 + Math.random() * 0.1));
    sub = Math.round(click * (0.18 + Math.random() * 0.08));
    rep = Math.round(sent * (0.18 + Math.random() * 0.06));
    days.push({ day: i, sent, open, click, sub, rep });
  }
  return days;
})();

const SEED_ALERTS = [
  { id: 'a1', sev: 'critical', title: 'Submission spike — Finance', body: '24 credentials submitted in 18 min during AP Wire pilot.', ago: '6m', campaign: 'AP Wire Transfer' },
  { id: 'a2', sev: 'high', title: 'High-risk user threshold met', body: 'M. Ribeiro reached risk score 91. Auto-enrolled in remediation.', ago: '24m', campaign: 'Adaptive Cohort' },
  { id: 'a3', sev: 'warn', title: 'Approval required', body: 'Campaign "CEO Gift Card Pretext" awaiting approval.', ago: '1h', campaign: 'CEO Gift Card' },
  { id: 'a4', sev: 'info', title: 'SMTP profile rotated', body: 'Sending profile postmark-prod-2 rotated keys.', ago: '3h', campaign: null },
];

const SEED_TRAINING = [
  { id: 'tr1', title: 'Spotting Wire Fraud', mins: 6, cohort: 'Finance', completion: 78, due: 'May 12' },
  { id: 'tr2', title: 'BEC & Executive Impersonation', mins: 8, cohort: 'High-risk', completion: 41, due: 'May 09' },
  { id: 'tr3', title: 'Password Hygiene 101', mins: 4, cohort: 'All Employees', completion: 92, due: 'Completed' },
  { id: 'tr4', title: 'Recognizing OAuth Consent Phishing', mins: 9, cohort: 'Engineering', completion: 67, due: 'May 18' },
];

// Color helpers for avatars / charts
const AVATAR_COLORS = [
  ['oklch(0.65 0.15 30)', 'oklch(0.55 0.15 10)'],
  ['oklch(0.65 0.15 80)', 'oklch(0.55 0.15 60)'],
  ['oklch(0.6 0.15 145)', 'oklch(0.5 0.15 165)'],
  ['oklch(0.6 0.15 210)', 'oklch(0.5 0.15 230)'],
  ['oklch(0.6 0.15 280)', 'oklch(0.5 0.15 300)'],
  ['oklch(0.6 0.15 340)', 'oklch(0.5 0.15 0)'],
];
function avatarFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const c = AVATAR_COLORS[h % AVATAR_COLORS.length];
  return `linear-gradient(135deg, ${c[0]}, ${c[1]})`;
}
function initials(name) {
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
}
function riskBucket(score) {
  if (score >= 80) return 'crit';
  if (score >= 60) return 'high';
  if (score >= 30) return 'med';
  return 'low';
}
function riskLabel(score) {
  return ({ crit: 'Critical', high: 'High', med: 'Med', low: 'Low' })[riskBucket(score)];
}

Object.assign(window, {
  SEED_USERS, SEED_CAMPAIGNS, SEED_TEMPLATES, SEED_ACTIVITY, SEED_DEPTS,
  SEED_HEAT, SEED_RISK_DIST, SEED_TIMESERIES, SEED_ALERTS, SEED_TRAINING,
  avatarFor, initials, riskBucket, riskLabel,
});
