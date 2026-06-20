'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { I } from '@/components/ui/Icons';
import { Badge, Drawer, Modal } from '@/components/ui/Primitives';
import { EmptyState, SkeletonCards } from '@/components/ui/States';
import { PageHeader } from '@/components/shell/PageHeader';
import { useCan } from '@/lib/rbac';
import { listSmtpProfiles } from '@/lib/api/smtp-profiles';
import {
  createEmailTemplate,
  deleteEmailTemplate,
  listEmailTemplates,
  testEmailTemplate,
  updateEmailTemplate,
  type EmailTemplate,
  type EmailTemplateType,
} from '@/lib/api/templates';
import {
  SAMPLE_VARS,
  TEMPLATE_PRESETS,
  TEMPLATE_TYPE_LABEL,
  TEMPLATE_VARIABLES,
  extractVariables,
  renderWithVars,
  unknownVariables,
} from '@/lib/template-utils';

type EditorState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; template: EmailTemplate };

export function TemplatesScreen(): JSX.Element {
  const canCreate = useCan('template.create');
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<EmailTemplate | null>(null);
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' });
  const [duplicateSeed, setDuplicateSeed] = useState<EmailTemplate | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['email-templates'],
    queryFn: listEmailTemplates,
  });
  const templates: EmailTemplate[] = data?.[0] ?? [];

  const removeMutation = useMutation({
    mutationFn: deleteEmailTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template deleted');
      setOpen(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  return (
    <>
      <PageHeader
        title="Email templates"
        sub={`${templates.length} template${templates.length === 1 ? '' : 's'}`}
        actions={
          canCreate ? (
            <button type="button" className="btn primary" onClick={() => setEditor({ mode: 'create' })}>
              <I.plus size={13} /> New template
            </button>
          ) : null
        }
      />
      {error && (
        <div style={{ padding: 16 }}>
          <Badge tone="danger">Failed to load templates</Badge>
        </div>
      )}
      <div
        className="page"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12,
        }}
      >
        {isLoading && <SkeletonCards count={6} />}
        {!isLoading && templates.length === 0 && !error && (
          <div style={{ gridColumn: '1 / -1' }}>
            <EmptyState
              icon="templates"
              title="No email templates yet"
              message="Templates are the phishing emails your campaigns send. Start from a preset or build your own."
              action={
                canCreate ? (
                  <button type="button" className="btn primary" onClick={() => setEditor({ mode: 'create' })}>
                    <I.plus size={13} /> New template
                  </button>
                ) : undefined
              }
            />
          </div>
        )}
        {templates.map((t) => (
          <div key={t.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setOpen(t)}>
            <div
              style={{
                height: 130,
                background: 'var(--bg-sunken)',
                borderBottom: '1px solid var(--line)',
                padding: 12,
                overflow: 'hidden',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 6 }}>
                {t.subject || '(no subject)'}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--fg-faint)',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--font-mono)',
                  maxHeight: 90,
                  overflow: 'hidden',
                }}
              >
                {renderWithVars(t.htmlContent, SAMPLE_VARS)
                  .replace(/<[^>]+>/g, ' ')
                  .replace(/\s+/g, ' ')
                  .slice(0, 240)}
              </div>
            </div>
            <div className="card-body" style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Badge tone={t.type === 'training' ? 'info' : t.type === 'phishing' ? 'warn' : 'default'}>
                  {TEMPLATE_TYPE_LABEL[t.type]}
                </Badge>
                {!t.isActive && <Badge tone="default">disabled</Badge>}
              </div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{t.name}</div>
              {t.description && (
                <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 2 }}>
                  {t.description}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {open && (
        <Drawer onClose={() => setOpen(null)} width={680}>
          <div style={{ padding: 22, display: 'grid', gap: 12 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0 }}>{open.name}</h2>
                <Badge tone={open.type === 'training' ? 'info' : open.type === 'phishing' ? 'warn' : 'default'}>
                  {TEMPLATE_TYPE_LABEL[open.type]}
                </Badge>
              </div>
            </div>
            <MailPreview subject={open.subject} html={open.htmlContent} />
            {canCreate && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    setEditor({ mode: 'edit', template: open });
                    setOpen(null);
                  }}
                >
                  <I.edit size={12} /> Edit
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setDuplicateSeed(open);
                    setEditor({ mode: 'create' });
                    setOpen(null);
                  }}
                >
                  <I.copy size={12} /> Duplicate
                </button>
                <span className="spacer" />
                <button
                  type="button"
                  className="btn ghost danger"
                  onClick={() => {
                    if (confirm(`Delete template "${open.name}"?`)) removeMutation.mutate(open.id);
                  }}
                >
                  <I.trash size={12} /> Delete
                </button>
              </div>
            )}
          </div>
        </Drawer>
      )}

      {editor.mode !== 'closed' && (
        <TemplateEditor
          key={editor.mode === 'edit' ? editor.template.id : 'create'}
          initial={editor.mode === 'edit' ? editor.template : duplicateSeed}
          isDuplicate={editor.mode === 'create' && !!duplicateSeed}
          onClose={() => {
            setEditor({ mode: 'closed' });
            setDuplicateSeed(null);
          }}
        />
      )}
    </>
  );
}

interface TemplateEditorProps {
  initial?: EmailTemplate | null;
  isDuplicate?: boolean;
  onClose: () => void;
}

function MailPreview({ subject, html }: { subject: string; html: string }): JSX.Element {
  return (
    <div className="mail-preview">
      <div className="mail-head">
        <div className="mail-head-row">
          <strong>Subject:</strong> {renderWithVars(subject, SAMPLE_VARS) || '(no subject)'}
        </div>
        <div className="mail-head-row" style={{ color: 'var(--fg-subtle)', fontSize: 11.5 }}>
          Preview shown with sample data ({SAMPLE_VARS.firstName} {SAMPLE_VARS.lastName})
        </div>
      </div>
      <div
        className="mail-body"
        dangerouslySetInnerHTML={{ __html: renderWithVars(html, SAMPLE_VARS) }}
      />
    </div>
  );
}

function TemplateEditor({ initial, isDuplicate, onClose }: TemplateEditorProps): JSX.Element {
  const queryClient = useQueryClient();
  const [pickedPreset, setPickedPreset] = useState(!!initial);
  const [savedId, setSavedId] = useState<string | null>(isDuplicate ? null : (initial?.id ?? null));
  const [showTest, setShowTest] = useState(false);

  const [form, setForm] = useState({
    name: initial ? (isDuplicate ? `${initial.name} (copy)` : initial.name) : '',
    description: initial?.description ?? '',
    subject: initial?.subject ?? '',
    type: (initial?.type ?? 'phishing') as EmailTemplateType,
    htmlContent: initial?.htmlContent ?? '',
  });

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const focusedRef = useRef<'subject' | 'body'>('body');

  const usedVars = useMemo(
    () => extractVariables(form.subject, form.htmlContent),
    [form.subject, form.htmlContent],
  );
  const unknownVars = useMemo(
    () => unknownVariables(form.subject, form.htmlContent),
    [form.subject, form.htmlContent],
  );

  function insertToken(token: string): void {
    const snippet = `{{${token}}}`;
    if (focusedRef.current === 'subject' && subjectRef.current) {
      const el = subjectRef.current;
      const start = el.selectionStart ?? form.subject.length;
      const end = el.selectionEnd ?? form.subject.length;
      const next = form.subject.slice(0, start) + snippet + form.subject.slice(end);
      setForm((f) => ({ ...f, subject: next }));
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + snippet.length, start + snippet.length);
      });
    } else if (bodyRef.current) {
      const el = bodyRef.current;
      const start = el.selectionStart ?? form.htmlContent.length;
      const end = el.selectionEnd ?? form.htmlContent.length;
      const next = form.htmlContent.slice(0, start) + snippet + form.htmlContent.slice(end);
      setForm((f) => ({ ...f, htmlContent: next }));
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + snippet.length, start + snippet.length);
      });
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        subject: form.subject,
        type: form.type,
        htmlContent: form.htmlContent,
        variables: usedVars,
      };
      if (savedId) return updateEmailTemplate(savedId, payload);
      return createEmailTemplate(payload);
    },
    onSuccess: (t) => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      setSavedId(t.id);
      toast.success(savedId ? 'Template saved' : 'Template created');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const valid = form.name.trim() && form.subject.trim() && form.htmlContent.trim();

  // Step 0 (create only): preset gallery
  if (!pickedPreset) {
    return (
      <Modal title="Choose a starting point" size="lg" onClose={onClose}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 10,
            padding: '4px 2px',
          }}
        >
          {TEMPLATE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="card"
              style={{ textAlign: 'left', padding: 14, cursor: 'pointer' }}
              onClick={() => {
                setForm({
                  name: '',
                  description: p.description,
                  subject: p.subject,
                  type: p.type,
                  htmlContent: p.htmlContent,
                });
                setPickedPreset(true);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Badge tone={p.type === 'training' ? 'info' : 'warn'}>{TEMPLATE_TYPE_LABEL[p.type]}</Badge>
              </div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 3 }}>{p.description}</div>
            </button>
          ))}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={savedId ? `Edit template` : 'New email template'}
      size="lg"
      onClose={onClose}
      footer={
        <div className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
          <button
            type="button"
            className="btn ghost"
            onClick={() => setShowTest((s) => !s)}
            disabled={!savedId}
            title={savedId ? 'Send yourself a test email' : 'Save first to enable test send'}
          >
            <I.send size={12} /> Send test
          </button>
          <div className="row" style={{ gap: 6 }}>
            <button type="button" className="btn ghost" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={!valid || save.isPending}
              onClick={() => save.mutate()}
            >
              {save.isPending ? 'Saving…' : savedId ? 'Save changes' : 'Create template'}
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* ── Left: form ───────────────────────────────── */}
        <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
          <div className="grid-2" style={{ gap: 10 }}>
            <div>
              <label className="field-label">Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Q3 password reset"
              />
            </div>
            <div>
              <label className="field-label">Type</label>
              <select
                className="input"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as EmailTemplateType })}
              >
                <option value="phishing">Phishing</option>
                <option value="training">Training</option>
                <option value="transactional">Notification</option>
              </select>
            </div>
          </div>

          <div>
            <label className="field-label">Description (optional)</label>
            <input
              className="input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div>
            <label className="field-label">Subject</label>
            <input
              ref={subjectRef}
              className="input"
              value={form.subject}
              onFocus={() => (focusedRef.current = 'subject')}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="[Action required] Verify your account"
            />
          </div>

          <div>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
              <label className="field-label" style={{ margin: 0 }}>
                Insert variable
              </label>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v.token}
                  type="button"
                  className="btn ghost sm"
                  onClick={() => insertToken(v.token)}
                  title={`Insert {{${v.token}}}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">HTML body</label>
            <textarea
              ref={bodyRef}
              className="input mono"
              rows={12}
              value={form.htmlContent}
              onFocus={() => (focusedRef.current = 'body')}
              onChange={(e) => setForm({ ...form, htmlContent: e.target.value })}
            />
            <div className="field-help">
              Links (<code className="mono">{'<a href>'}</code>) and a tracking pixel are added
              automatically at send time — don't add them yourself.
            </div>
            {unknownVars.length > 0 && (
              <div style={{ display: 'flex', gap: 5, alignItems: 'center', color: 'var(--warn)', fontSize: 11.5, marginTop: 5 }}>
                <I.alerts size={12} /> Unsupported token{unknownVars.length > 1 ? 's' : ''}:{' '}
                <span className="mono">{unknownVars.map((v) => `{{${v}}}`).join(', ')}</span> — will be
                sent literally.
              </div>
            )}
          </div>
        </div>

        {/* ── Right: live preview ──────────────────────── */}
        <div style={{ minWidth: 0 }}>
          <label className="field-label">Live preview</label>
          <MailPreview subject={form.subject} html={form.htmlContent} />
        </div>
      </div>

      {showTest && savedId && <TestSendRow templateId={savedId} />}
    </Modal>
  );
}



function TestSendRow({ templateId }: { templateId: string }): JSX.Element {
  const [email, setEmail] = useState('');
  const [profileId, setProfileId] = useState('');
  const { data } = useQuery({ queryKey: ['smtp-profiles'], queryFn: listSmtpProfiles });
  const profiles = data?.[0] ?? [];

  const send = useMutation({
    mutationFn: () => testEmailTemplate(templateId, { testEmail: email.trim(), smtpProfileId: profileId }),
    onSuccess: (r) => {
      toast.success('Test email sent' + (r.previewUrl ? ' — preview link in console' : ''));
      if (r.previewUrl) window.open(r.previewUrl, '_blank');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Test send failed'),
  });

  return (
    <div
      className="card"
      style={{ marginTop: 14, padding: 12, display: 'grid', gap: 8, background: 'var(--bg-sunken)' }}
    >
      <div className="field-label" style={{ margin: 0 }}>
        Send a test email
      </div>
      {profiles.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
          No sending profiles yet — create one in Settings → SMTP &amp; sending first.
        </div>
      ) : (
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <select
            className="input"
            style={{ maxWidth: 200 }}
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
          >
            <option value="">Sending profile…</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            className="input"
            style={{ flex: 1, minWidth: 180 }}
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            type="button"
            className="btn primary"
            disabled={!email.includes('@') || !profileId || send.isPending}
            onClick={() => send.mutate()}
          >
            {send.isPending ? 'Sending…' : 'Send'}
          </button>
        </div>
      )}
    </div>
  );
}
