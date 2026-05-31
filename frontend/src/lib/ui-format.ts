// Presentation-only helpers shared across UI primitives and charts.
// (Pure functions + types — no business data lives here.)

export type ActionKind = 'submitted' | 'clicked' | 'opened' | 'reported' | 'sent';
export type RiskTone = 'low' | 'med' | 'high' | 'critical';
export type CampaignStatus =
  | 'running'
  | 'scheduled'
  | 'completed'
  | 'draft'
  | 'awaiting-approval'
  | 'paused'
  | 'archived';

const AVATAR_COLORS: Array<[string, string]> = [
  ['oklch(0.65 0.15 30)', 'oklch(0.55 0.15 10)'],
  ['oklch(0.65 0.15 80)', 'oklch(0.55 0.15 60)'],
  ['oklch(0.6 0.15 145)', 'oklch(0.5 0.15 165)'],
  ['oklch(0.6 0.15 210)', 'oklch(0.5 0.15 230)'],
  ['oklch(0.6 0.15 280)', 'oklch(0.5 0.15 300)'],
  ['oklch(0.6 0.15 340)', 'oklch(0.5 0.15 0)'],
];

/** Deterministic gradient from a name, so an avatar's color is stable across renders. */
export function avatarFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const c = AVATAR_COLORS[h % AVATAR_COLORS.length]!;
  return `linear-gradient(135deg, ${c[0]}, ${c[1]})`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export type RiskBucket = 'crit' | 'high' | 'med' | 'low';

export function riskBucket(score: number): RiskBucket {
  if (score >= 80) return 'crit';
  if (score >= 60) return 'high';
  if (score >= 30) return 'med';
  return 'low';
}

export function riskLabel(score: number): string {
  return ({ crit: 'Critical', high: 'High', med: 'Med', low: 'Low' } as const)[
    riskBucket(score)
  ];
}
