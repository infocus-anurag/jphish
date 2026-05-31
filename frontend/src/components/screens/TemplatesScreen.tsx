'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { I } from '@/components/ui/Icons';
import { Badge, Drawer } from '@/components/ui/Primitives';
import { PageHeader } from '@/components/shell/PageHeader';
import { useCan } from '@/lib/rbac';
import {
  createEmailTemplate,
  deleteEmailTemplate,
  listEmailTemplates,
  type EmailTemplate,
  type EmailTemplateType,
} from '@/lib/api/templates';

export function TemplatesScreen(): JSX.Element {
  const canCreate = useCan('template.create');
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<EmailTemplate | null>(null);
  const [showForm, setShowForm] = useState(false);

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
        sub={`${templates.length} templates`}
        actions={
          canCreate ? (
            <button
              type="button"
              className="btn primary"
              onClick={() => setShowForm(true)}
            >
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
        {isLoading && (
          <div style={{ color: 'var(--fg-subtle)' }}>Loading templates…</div>
        )}
        {!isLoading && templates.length === 0 && (
          <div style={{ color: 'var(--fg-subtle)' }}>
            No email templates yet. Create one to use in a campaign.
          </div>
        )}
        {templates.map((t) => (
          <div
            key={t.id}
            className="card"
            style={{ cursor: 'pointer' }}
            onClick={() => setOpen(t)}
          >
            <div
              style={{
                height: 130,
                background: 'var(--bg-sunken)',
                borderBottom: '1px solid var(--line)',
                padding: 12,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--fg-subtle)',
                  marginBottom: 6,
                }}
              >
                {t.subject}
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
                {t.htmlContent.replace(/<[^>]+>/g, '').slice(0, 240)}
              </div>
            </div>
            <div className="card-body" style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Badge tone={t.type === 'training' ? 'info' : 'warn'}>{t.type}</Badge>
                {!t.isActive && <Badge tone="default">disabled</Badge>}
                <span className="spacer" />
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
        <Drawer onClose={() => setOpen(null)} width={640}>
          <div style={{ padding: 22, display: 'grid', gap: 12 }}>
            <h2 style={{ margin: 0 }}>{open.name}</h2>
            <div style={{ color: 'var(--fg-subtle)', fontSize: 12 }}>
              <span className="mono">{open.subject}</span>
            </div>
            <div
              style={{
                background: 'var(--bg-sunken)',
                border: '1px solid var(--line)',
                borderRadius: 4,
                padding: 12,
              }}
              dangerouslySetInnerHTML={{ __html: open.htmlContent }}
            />
            {canCreate && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="btn ghost danger"
                  onClick={() => {
                    if (confirm(`Delete template "${open.name}"?`)) {
                      removeMutation.mutate(open.id);
                    }
                  }}
                >
                  <I.trash size={12} /> Delete
                </button>
              </div>
            )}
          </div>
        </Drawer>
      )}

      {showForm && <TemplateForm onDone={() => setShowForm(false)} />}
    </>
  );
}

function TemplateForm({ onDone }: { onDone: () => void }): JSX.Element {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    description: '',
    subject: '',
    type: 'phishing' as EmailTemplateType,
    htmlContent:
      '<p>Hello {{firstName}},</p>\n<p>Your password expires today. <a href="https://example.com/reset">Reset it now</a>.</p>\n<p>IT Helpdesk</p>',
    textContent: '',
  });

  const create = useMutation({
    mutationFn: createEmailTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template created');
      onDone();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Create failed'),
  });

  return (
    <Drawer onClose={onDone} width={720}>
      <div style={{ padding: 22, display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0 }}>New email template</h2>
        <div>
          <label className="field-label">Name</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
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
            className="input"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="[Action required] Verify your account"
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
            <option value="announcement">Announcement</option>
          </select>
        </div>
        <div>
          <label className="field-label">HTML body</label>
          <textarea
            className="input mono"
            rows={12}
            value={form.htmlContent}
            onChange={(e) => setForm({ ...form, htmlContent: e.target.value })}
          />
          <div className="field-help">
            Use <code className="mono">{'{{firstName}}'}</code>,{' '}
            <code className="mono">{'{{lastName}}'}</code>,{' '}
            <code className="mono">{'{{email}}'}</code> for per-recipient
            substitution. Any <code className="mono">{'<a href>'}</code> is
            rewritten through the click tracker at send time.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="btn primary"
            disabled={create.isPending}
            onClick={() =>
              create.mutate({
                name: form.name,
                description: form.description || undefined,
                subject: form.subject,
                type: form.type,
                htmlContent: form.htmlContent,
                textContent: form.textContent || undefined,
              })
            }
          >
            {create.isPending ? 'Saving…' : 'Create template'}
          </button>
          <button type="button" className="btn ghost" onClick={onDone}>
            Cancel
          </button>
        </div>
      </div>
    </Drawer>
  );
}
