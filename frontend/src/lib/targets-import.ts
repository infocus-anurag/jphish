// Target (recipient) bulk-import helpers: delimiter-aware parsing, column
// auto-mapping, and per-row validation/dedupe. Pure functions — no React, no I/O —
// so they are unit-testable and reusable by any import surface.

export type TargetField =
  | 'email'
  | 'firstName'
  | 'lastName'
  | 'department'
  | 'position'
  | 'ignore';

export interface TargetFieldMeta {
  field: Exclude<TargetField, 'ignore'>;
  label: string;
  required: boolean;
  /** Lowercased header aliases used for auto-detection. */
  aliases: string[];
}

export const TARGET_FIELDS: TargetFieldMeta[] = [
  { field: 'email', label: 'Email', required: true, aliases: ['email', 'e-mail', 'mail', 'email address', 'emailaddress'] },
  { field: 'firstName', label: 'First name', required: false, aliases: ['firstname', 'first name', 'first', 'given name', 'givenname', 'fname'] },
  { field: 'lastName', label: 'Last name', required: false, aliases: ['lastname', 'last name', 'last', 'surname', 'family name', 'lname'] },
  { field: 'department', label: 'Department', required: false, aliases: ['department', 'dept', 'team', 'division'] },
  { field: 'position', label: 'Position', required: false, aliases: ['position', 'title', 'job title', 'jobtitle', 'role'] },
];

export interface ParsedTarget {
  email: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  position?: string;
  /** Original 1-based row number in the uploaded data (excluding header). */
  row: number;
  status: TargetRowStatus;
}

export type TargetRowStatus = 'ok' | 'invalid-email' | 'missing-email' | 'dup-in-file' | 'dup-in-group';

// Pragmatic email check — intentionally not RFC-5322-strict, just enough to catch
// typos and obviously-bad rows before they reach the API.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** Detect the most likely delimiter from the first few non-empty lines. */
export function detectDelimiter(text: string): ',' | '\t' | ';' {
  const sample = text
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .slice(0, 5)
    .join('\n');
  const counts: Record<string, number> = {
    ',': (sample.match(/,/g) ?? []).length,
    '\t': (sample.match(/\t/g) ?? []).length,
    ';': (sample.match(/;/g) ?? []).length,
  };
  const best = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ',') as ',' | '\t' | ';';
  return counts[best] > 0 ? best : ',';
}

/**
 * Parse delimited text (CSV/TSV) into a matrix of trimmed cells. Handles
 * double-quoted fields with embedded delimiters, newlines, and escaped quotes.
 */
export function parseDelimited(text: string, delimiter?: string): string[][] {
  const delim = delimiter ?? detectDelimiter(text);
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(field.trim());
      field = '';
    } else if (ch === '\n') {
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  // flush trailing field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    rows.push(row);
  }
  // drop fully-empty rows
  return rows.filter((r) => r.some((c) => c.length > 0));
}

/** Heuristic: does the first row look like a header (contains a known alias and no '@')? */
export function looksLikeHeader(firstRow: string[]): boolean {
  if (!firstRow.length) return false;
  const hasEmailCell = firstRow.some((c) => c.includes('@'));
  if (hasEmailCell) return false;
  const all = TARGET_FIELDS.flatMap((f) => f.aliases);
  return firstRow.some((c) => all.includes(c.trim().toLowerCase()));
}

/** Auto-map each column index to a target field based on header names (or position). */
export function autoMapColumns(headerRow: string[], hasHeader: boolean): TargetField[] {
  if (hasHeader) {
    return headerRow.map((h) => {
      const key = h.trim().toLowerCase();
      const match = TARGET_FIELDS.find((f) => f.aliases.includes(key));
      return match ? match.field : 'ignore';
    });
  }
  // No header: assume conventional order email, firstName, lastName, department, position.
  const order: TargetField[] = ['email', 'firstName', 'lastName', 'department', 'position'];
  return headerRow.map((_, i) => order[i] ?? 'ignore');
}

/** Apply a column mapping + validation/dedupe to data rows. `existingEmails` are lowercased. */
export function buildTargets(
  dataRows: string[][],
  mapping: TargetField[],
  existingEmails: Set<string>,
): ParsedTarget[] {
  const seenInFile = new Set<string>();
  const emailCol = mapping.indexOf('email');

  return dataRows.map((cells, idx) => {
    const get = (field: TargetField): string | undefined => {
      const col = mapping.indexOf(field);
      const v = col >= 0 ? (cells[col] ?? '').trim() : '';
      return v || undefined;
    };
    const emailRaw = (emailCol >= 0 ? (cells[emailCol] ?? '') : '').trim();
    const email = emailRaw.toLowerCase();
    const base: Omit<ParsedTarget, 'status'> = {
      row: idx + 1,
      email: emailRaw,
      firstName: get('firstName'),
      lastName: get('lastName'),
      department: get('department'),
      position: get('position'),
    };

    let status: TargetRowStatus;
    if (!emailRaw) status = 'missing-email';
    else if (!isValidEmail(emailRaw)) status = 'invalid-email';
    else if (existingEmails.has(email)) status = 'dup-in-group';
    else if (seenInFile.has(email)) status = 'dup-in-file';
    else status = 'ok';

    if (email) seenInFile.add(email);
    return { ...base, status };
  });
}

export const ROW_STATUS_LABEL: Record<TargetRowStatus, string> = {
  ok: 'Ready',
  'invalid-email': 'Invalid email',
  'missing-email': 'No email',
  'dup-in-file': 'Duplicate in file',
  'dup-in-group': 'Already in group',
};

/** A blank CSV template (header + two example rows) for users to fill in. */
export function targetCsvTemplate(): string {
  return [
    'email,firstName,lastName,department,position',
    'alice@example.com,Alice,Smith,Finance,Analyst',
    'bob@example.com,Bob,Jones,IT,Engineer',
  ].join('\n');
}

/** Build a CSV string from a header row and data rows, quoting as needed. */
export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const esc = (v: string | number | null | undefined): string => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(',')];
  for (const row of rows) lines.push(row.map(esc).join(','));
  return lines.join('\n');
}

/** Trigger a client-side file download of the given text content. */
export function downloadTextFile(filename: string, content: string, mime = 'text/csv'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
