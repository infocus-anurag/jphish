import { describe, it, expect } from 'vitest';
import {
  detectDelimiter,
  parseDelimited,
  looksLikeHeader,
  autoMapColumns,
  buildTargets,
  isValidEmail,
  targetCsvTemplate,
  type TargetField,
} from '@/lib/targets-import';

describe('isValidEmail', () => {
  it('accepts well-formed addresses and rejects junk', () => {
    expect(isValidEmail('alice@example.com')).toBe(true);
    expect(isValidEmail('  bob@corp.co.uk ')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
    expect(isValidEmail('@nope.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('detectDelimiter', () => {
  it('detects commas, tabs and semicolons', () => {
    expect(detectDelimiter('a,b,c\n1,2,3')).toBe(',');
    expect(detectDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t');
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
  });

  it('falls back to comma when no delimiter present', () => {
    expect(detectDelimiter('singlecolumn')).toBe(',');
  });
});

describe('parseDelimited', () => {
  it('parses simple comma rows and trims cells', () => {
    expect(parseDelimited('a, b ,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('honours quoted fields containing the delimiter, escaped quotes and newlines', () => {
    const text = 'name,note\n"Smith, Alice","says ""hi"""\n"multi\nline","x"';
    expect(parseDelimited(text)).toEqual([
      ['name', 'note'],
      ['Smith, Alice', 'says "hi"'],
      ['multi\nline', 'x'],
    ]);
  });

  it('drops fully-empty rows', () => {
    expect(parseDelimited('a,b\n\n\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('parses tab-separated input', () => {
    expect(parseDelimited('a\tb\n1\t2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('looksLikeHeader', () => {
  it('treats a known-alias row without @ as a header', () => {
    expect(looksLikeHeader(['Email', 'First Name', 'Department'])).toBe(true);
  });

  it('does not treat a data row (with an email) as a header', () => {
    expect(looksLikeHeader(['alice@example.com', 'Alice'])).toBe(false);
  });

  it('returns false for unknown headers', () => {
    expect(looksLikeHeader(['foo', 'bar'])).toBe(false);
  });
});

describe('autoMapColumns', () => {
  it('maps by header aliases', () => {
    const map = autoMapColumns(['E-mail', 'first name', 'Surname', 'Team', 'Title'], true);
    expect(map).toEqual<TargetField[]>(['email', 'firstName', 'lastName', 'department', 'position']);
  });

  it('maps unknown headers to ignore', () => {
    expect(autoMapColumns(['email', 'whatever'], true)).toEqual(['email', 'ignore']);
  });

  it('falls back to positional order when there is no header', () => {
    expect(autoMapColumns(['a', 'b', 'c'], false)).toEqual(['email', 'firstName', 'lastName']);
  });
});

describe('buildTargets', () => {
  const mapping: TargetField[] = ['email', 'firstName', 'lastName', 'department', 'position'];

  it('classifies ok / invalid / missing / duplicates', () => {
    const rows = [
      ['alice@example.com', 'Alice', 'Smith', 'Finance', 'Analyst'],
      ['ALICE@example.com', 'Dup', 'InFile', '', ''], // dup within file (case-insensitive)
      ['bob@corp.com', 'Bob', '', '', ''], // already in group
      ['not-an-email', 'Bad', '', '', ''], // invalid
      ['', 'No', 'Email', '', ''], // missing email
    ];
    const existing = new Set(['bob@corp.com']);
    const out = buildTargets(rows, mapping, existing);

    expect(out.map((t) => t.status)).toEqual([
      'ok',
      'dup-in-file',
      'dup-in-group',
      'invalid-email',
      'missing-email',
    ]);
    expect(out[0]).toMatchObject({
      email: 'alice@example.com',
      firstName: 'Alice',
      lastName: 'Smith',
      department: 'Finance',
      position: 'Analyst',
      row: 1,
    });
  });

  it('leaves unmapped optional fields undefined', () => {
    const out = buildTargets([['x@y.com']], ['email'], new Set());
    expect(out[0].firstName).toBeUndefined();
    expect(out[0].status).toBe('ok');
  });
});

describe('targetCsvTemplate', () => {
  it('includes the header and is parseable back into 5 columns', () => {
    const parsed = parseDelimited(targetCsvTemplate());
    expect(parsed[0]).toEqual(['email', 'firstName', 'lastName', 'department', 'position']);
    expect(parsed.length).toBeGreaterThan(1);
  });
});
