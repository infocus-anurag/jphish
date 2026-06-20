import { describe, it, expect } from 'vitest';
import { toCsv } from '@/lib/targets-import';

describe('toCsv', () => {
  it('joins headers and rows with commas', () => {
    expect(toCsv(['a', 'b'], [[1, 2], [3, 4]])).toBe('a,b\n1,2\n3,4');
  });

  it('quotes values containing commas, quotes or newlines', () => {
    expect(toCsv(['x'], [['a,b']])).toBe('x\n"a,b"');
    expect(toCsv(['x'], [['he said "hi"']])).toBe('x\n"he said ""hi"""');
    expect(toCsv(['x'], [['line1\nline2']])).toBe('x\n"line1\nline2"');
  });

  it('renders null/undefined as empty cells', () => {
    expect(toCsv(['a', 'b', 'c'], [[null, undefined, 0]])).toBe('a,b,c\n,,0');
  });
});
