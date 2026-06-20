'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Modal, Badge } from '@/components/ui/Primitives';
import { FileDrop } from '@/components/ui/FileDrop';
import { Stepper } from '@/components/ui/Stepper';
import { I } from '@/components/ui/Icons';
import { addGroupMembers, type GroupMember } from '@/lib/api/groups';
import {
  TARGET_FIELDS,
  type TargetField,
  type TargetRowStatus,
  parseDelimited,
  looksLikeHeader,
  autoMapColumns,
  buildTargets,
  targetCsvTemplate,
  downloadTextFile,
  ROW_STATUS_LABEL,
} from '@/lib/targets-import';

const STEPS = ['Upload', 'Map columns', 'Review & import'];
const PREVIEW_CAP = 200;

const STATUS_TONE: Record<TargetRowStatus, 'ok' | 'warn' | 'danger' | 'default'> = {
  ok: 'ok',
  'dup-in-group': 'default',
  'dup-in-file': 'warn',
  'invalid-email': 'danger',
  'missing-email': 'danger',
};

interface ImportTargetsModalProps {
  groupId: string;
  groupName: string;
  existingMembers: GroupMember[];
  onClose: () => void;
}

export function ImportTargetsModal({
  groupId,
  groupName,
  existingMembers,
  onClose,
}: ImportTargetsModalProps): JSX.Element {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [text, setText] = useState('');
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState<TargetField[]>([]);

  const existingEmails = useMemo(
    () => new Set(existingMembers.map((m) => m.email.toLowerCase())),
    [existingMembers],
  );

  const matrix = useMemo(() => (text.trim() ? parseDelimited(text) : []), [text]);
  const headerRow = matrix[0] ?? [];
  const dataRows = hasHeader ? matrix.slice(1) : matrix;
  const columnCount = matrix.reduce((max, r) => Math.max(max, r.length), 0);

  const targets = useMemo(
    () => (mapping.length ? buildTargets(dataRows, mapping, existingEmails) : []),
    [dataRows, mapping, existingEmails],
  );

  const summary = useMemo(() => {
    const s = { ok: 0, dup: 0, invalid: 0 };
    for (const t of targets) {
      if (t.status === 'ok') s.ok += 1;
      else if (t.status === 'dup-in-file' || t.status === 'dup-in-group') s.dup += 1;
      else s.invalid += 1;
    }
    return s;
  }, [targets]);

  function goToMapping(): void {
    if (!matrix.length) {
      toast.error('Paste rows or upload a file first.');
      return;
    }
    // Re-detect header on entry so the auto-map matches the user's data.
    const detected = looksLikeHeader(headerRow);
    setHasHeader(detected);
    const auto = autoMapColumns(headerRow, detected);
    const filled: TargetField[] = [];
    for (let i = 0; i < columnCount; i += 1) filled[i] = auto[i] ?? 'ignore';
    setMapping(filled);
    setStep(1);
  }

  function setColumn(index: number, field: TargetField): void {
    setMapping((prev) => {
      const next = [...prev];
      // a field (other than ignore) can map to only one column
      if (field !== 'ignore') {
        for (let i = 0; i < next.length; i += 1) if (next[i] === field) next[i] = 'ignore';
      }
      next[index] = field;
      return next;
    });
  }

  const emailMapped = mapping.includes('email');

  const importMut = useMutation({
    mutationFn: () => {
      const payload = targets
        .filter((t) => t.status === 'ok')
        .map((t) => ({
          email: t.email,
          firstName: t.firstName,
          lastName: t.lastName,
          department: t.department,
          position: t.position,
        }));
      return addGroupMembers(groupId, payload as Array<Omit<GroupMember, 'groupId' | 'addedAt'>>);
    },
    onSuccess: (r) => {
      const skippedNote = summary.dup + summary.invalid;
      toast.success(
        `Added ${r.added} target${r.added === 1 ? '' : 's'}` +
          (skippedNote ? ` · ${skippedNote} skipped` : ''),
      );
      queryClient.invalidateQueries({ queryKey: ['groups', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Import failed'),
  });

  return (
    <Modal title={`Import targets · ${groupName}`} size="lg" onClose={onClose}>
      <div style={{ padding: '4px 2px 14px' }}>
        <Stepper steps={STEPS} current={step} onStepClick={(i) => i < step && setStep(i)} />
      </div>

      {/* ── Step 1: Upload / paste ─────────────────────────────── */}
      {step === 0 && (
        <div style={{ display: 'grid', gap: 14 }}>
          <FileDrop onFile={(content) => setText(content)} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            <span style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>or paste rows</span>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>
          <div>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
              <label className="field-label" style={{ margin: 0 }}>
                Paste CSV / TSV (email, first name, last name, department, position)
              </label>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => downloadTextFile('targets-template.csv', targetCsvTemplate())}
              >
                <I.download size={12} /> Template
              </button>
            </div>
            <textarea
              className="input mono"
              rows={7}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'email,firstName,lastName,department,position\nalice@example.com,Alice,Smith,Finance,Analyst'}
            />
            {matrix.length > 0 && (
              <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 5 }}>
                Detected {matrix.length} row{matrix.length === 1 ? '' : 's'} × {columnCount} column
                {columnCount === 1 ? '' : 's'}.
              </div>
            )}
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn primary" onClick={goToMapping}>
              Next <I.chevR size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Map columns ────────────────────────────────── */}
      {step === 1 && (
        <div style={{ display: 'grid', gap: 14 }}>
          <label className="row" style={{ gap: 8, cursor: 'pointer', fontSize: 12.5 }}>
            <input
              type="checkbox"
              checked={hasHeader}
              onChange={(e) => {
                setHasHeader(e.target.checked);
                const auto = autoMapColumns(headerRow, e.target.checked);
                const filled: TargetField[] = [];
                for (let i = 0; i < columnCount; i += 1) filled[i] = auto[i] ?? 'ignore';
                setMapping(filled);
              }}
            />
            First row is a header
          </label>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Sample</th>
                  <th>Maps to</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: columnCount }).map((_, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>
                      {hasHeader ? headerRow[i] || `Column ${i + 1}` : `Column ${i + 1}`}
                    </td>
                    <td className="mono" style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>
                      {(dataRows[0]?.[i] ?? '—') || '—'}
                    </td>
                    <td>
                      <select
                        className="input"
                        style={{ height: 28, maxWidth: 200 }}
                        value={mapping[i] ?? 'ignore'}
                        onChange={(e) => setColumn(i, e.target.value as TargetField)}
                      >
                        <option value="ignore">Ignore</option>
                        {TARGET_FIELDS.map((f) => (
                          <option key={f.field} value={f.field}>
                            {f.label}
                            {f.required ? ' *' : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!emailMapped && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--danger)', fontSize: 12 }}>
              <I.alerts size={13} /> Map one column to <strong>Email</strong> to continue.
            </div>
          )}

          <div className="row" style={{ justifyContent: 'space-between' }}>
            <button type="button" className="btn ghost" onClick={() => setStep(0)}>
              <I.chevL size={13} /> Back
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={!emailMapped}
              onClick={() => setStep(2)}
            >
              Review <I.chevR size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Review & import ─────────────────────────────── */}
      {step === 2 && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="import-summary">
            <div className="import-stat ok">
              <span className="num">{summary.ok}</span>
              <span className="lbl">Ready</span>
            </div>
            <div className="import-stat warn">
              <span className="num">{summary.dup}</span>
              <span className="lbl">Duplicates</span>
            </div>
            <div className="import-stat bad">
              <span className="num">{summary.invalid}</span>
              <span className="lbl">Invalid</span>
            </div>
            <div className="import-stat">
              <span className="num">{targets.length}</span>
              <span className="lbl">Total rows</span>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
            Only the <strong>{summary.ok}</strong> ready row{summary.ok === 1 ? '' : 's'} will be
            imported. Duplicates and invalid rows are skipped.
          </div>

          <div className="card" style={{ padding: 0, maxHeight: 320, overflow: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Status</th>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Position</th>
                </tr>
              </thead>
              <tbody>
                {targets.slice(0, PREVIEW_CAP).map((t) => (
                  <tr key={t.row} style={{ opacity: t.status === 'ok' ? 1 : 0.6 }}>
                    <td className="num" style={{ color: 'var(--fg-subtle)' }}>
                      {t.row}
                    </td>
                    <td>
                      <Badge tone={STATUS_TONE[t.status]}>{ROW_STATUS_LABEL[t.status]}</Badge>
                    </td>
                    <td className="mono" style={{ fontSize: 11.5 }}>
                      {t.email || '—'}
                    </td>
                    <td>{[t.firstName, t.lastName].filter(Boolean).join(' ') || '—'}</td>
                    <td style={{ color: 'var(--fg-subtle)' }}>{t.department || '—'}</td>
                    <td style={{ color: 'var(--fg-subtle)' }}>{t.position || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {targets.length > PREVIEW_CAP && (
            <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>
              Showing first {PREVIEW_CAP} of {targets.length} rows. All ready rows will still be
              imported.
            </div>
          )}

          <div className="row" style={{ justifyContent: 'space-between' }}>
            <button type="button" className="btn ghost" onClick={() => setStep(1)}>
              <I.chevL size={13} /> Back
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={summary.ok === 0 || importMut.isPending}
              onClick={() => importMut.mutate()}
            >
              {importMut.isPending ? 'Importing…' : `Import ${summary.ok} target${summary.ok === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
