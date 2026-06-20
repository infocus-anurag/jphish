import { describe, it, expect } from 'vitest';
import {
  renderWithVars,
  extractVariables,
  unknownVariables,
  TEMPLATE_PRESETS,
  TEMPLATE_VARIABLES,
  SAMPLE_VARS,
} from '@/lib/template-utils';

describe('renderWithVars', () => {
  it('substitutes whitespace-tolerant tokens', () => {
    expect(renderWithVars('Hi {{firstName}} {{ lastName }}', { firstName: 'A', lastName: 'B' })).toBe(
      'Hi A B',
    );
  });

  it('leaves unknown tokens untouched', () => {
    expect(renderWithVars('Hi {{nope}}', { firstName: 'A' })).toBe('Hi {{nope}}');
  });
});

describe('extractVariables', () => {
  it('returns the unique set across subject and body', () => {
    const vars = extractVariables('Hello {{firstName}}', '{{firstName}} from {{department}}');
    expect(vars.sort()).toEqual(['department', 'firstName']);
  });

  it('returns empty when there are no tokens', () => {
    expect(extractVariables('no tokens here')).toEqual([]);
  });
});

describe('unknownVariables', () => {
  it('flags only tokens the platform will not substitute', () => {
    expect(unknownVariables('Hi {{firstName}} {{company}}')).toEqual(['company']);
  });

  it('returns empty when all tokens are supported', () => {
    expect(unknownVariables('{{firstName}} {{lastName}} {{email}} {{department}}')).toEqual([]);
  });
});

describe('TEMPLATE_PRESETS', () => {
  it('every preset only uses supported variables', () => {
    const supported = new Set(TEMPLATE_VARIABLES.map((v) => v.token));
    for (const p of TEMPLATE_PRESETS) {
      const used = extractVariables(p.subject, p.htmlContent);
      for (const v of used) expect(supported.has(v), `${p.id} uses {{${v}}}`).toBe(true);
    }
  });

  it('every preset has a name and valid type', () => {
    for (const p of TEMPLATE_PRESETS) {
      expect(p.name.length).toBeGreaterThan(0);
      expect(['phishing', 'training', 'transactional']).toContain(p.type);
    }
  });

  it('presets render cleanly with sample data (no leftover supported tokens)', () => {
    for (const p of TEMPLATE_PRESETS) {
      const rendered = renderWithVars(p.htmlContent, SAMPLE_VARS);
      expect(rendered).not.toMatch(/{{\s*(firstName|lastName|email|department)\s*}}/);
    }
  });
});
