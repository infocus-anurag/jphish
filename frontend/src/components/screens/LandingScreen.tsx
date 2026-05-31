'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { I } from '@/components/ui/Icons';
import { Badge, Drawer } from '@/components/ui/Primitives';
import { PageHeader } from '@/components/shell/PageHeader';
import { useCan } from '@/lib/rbac';
import {
  createLandingPage,
  deleteLandingPage,
  listLandingPages,
  publicLandingPageUrl,
  type LandingPage,
  type LandingPageCapture,
} from '@/lib/api/landing-pages';

export function LandingScreen(): JSX.Element {
  const canCreate = useCan('template.create');
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [open, setOpen] = useState<LandingPage | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['landing-pages'],
    queryFn: listLandingPages,
  });
  const pages = data?.items ?? [];

  const remove = useMutation({
    mutationFn: deleteLandingPage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
      toast.success('Landing page deleted');
      setOpen(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  return (
    <>
      <PageHeader
        title="Landing pages"
        sub="Phishing landing pages served from a public URL on the phish-server."
        actions={
          canCreate ? (
            <button
              type="button"
              className="btn primary"
              onClick={() => setShowForm(true)}
            >
              <I.plus size={13} /> New page
            </button>
          ) : null
        }
      />
      {error && (
        <div style={{ padding: 16 }}>
          <Badge tone="danger">Failed to load landing pages</Badge>
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
        {isLoading && <div style={{ color: 'var(--fg-subtle)' }}>Loading…</div>}
        {!isLoading && pages.length === 0 && (
          <div style={{ color: 'var(--fg-subtle)' }}>
            No landing pages yet. Create one to attach to a campaign.
          </div>
        )}
        {pages.map((p) => (
          <div
            key={p.id}
            className="card"
            style={{ cursor: 'pointer' }}
            onClick={() => setOpen(p)}
          >
            <div
              style={{
                height: 140,
                background: 'var(--bg-sunken)',
                borderBottom: '1px solid var(--line)',
                padding: 10,
                overflow: 'hidden',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--fg-faint)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {p.htmlContent.replace(/<[^>]+>/g, '').slice(0, 200)}
            </div>
            <div className="card-body" style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Badge tone="info">{p.captureType.replace('_', '+')}</Badge>
                <Badge tone="ok">
                  <I.shieldCheck size={9} /> public
                </Badge>
                <span className="spacer" />
              </div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2 }}>
                /{p.slug}
              </div>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <Drawer onClose={() => setOpen(null)} width={620}>
          <div style={{ padding: 22, display: 'grid', gap: 12 }}>
            <h2 style={{ margin: 0 }}>{open.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <code className="mono" style={{ fontSize: 12 }}>
                {publicLandingPageUrl(open.slug, 'preview')}
              </code>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => {
                  navigator.clipboard.writeText(publicLandingPageUrl(open.slug, 'preview'));
                  toast.success('Preview URL copied');
                }}
              >
                <I.copy size={11} /> Copy
              </button>
            </div>
            <div className="field-help">
              At send time, <code className="mono">preview</code> is replaced
              with the per-recipient tracking id so submissions, opens and
              clicks attribute back to the target.
            </div>
            <div
              style={{
                border: '1px solid var(--line)',
                background: '#fff',
                color: '#111',
                padding: 12,
                borderRadius: 4,
              }}
              dangerouslySetInnerHTML={{ __html: open.htmlContent }}
            />
            {canCreate && (
              <div>
                <button
                  type="button"
                  className="btn ghost danger"
                  onClick={() => {
                    if (confirm(`Delete "${open.name}"?`)) remove.mutate(open.id);
                  }}
                >
                  <I.trash size={12} /> Delete
                </button>
              </div>
            )}
          </div>
        </Drawer>
      )}

      {showForm && <LandingPageForm onDone={() => setShowForm(false)} />}
    </>
  );
}

function LandingPageForm({ onDone }: { onDone: () => void }): JSX.Element {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    captureType: 'credentials' as LandingPageCapture,
    redirectUrl: '',
    htmlContent:
      '<!doctype html><html><head><meta charset="utf-8"><title>Sign in</title>\n<style>body{font:14px system-ui;background:#f6f7f9;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.card{background:#fff;border:1px solid #ddd;padding:32px;border-radius:6px;width:340px}h1{margin:0 0 16px;font-size:18px}label{display:block;margin-top:12px;font-size:12px;color:#444}input{width:100%;padding:8px;margin-top:4px;border:1px solid #ccc;border-radius:4px;font:inherit;box-sizing:border-box}button{margin-top:18px;width:100%;padding:10px;background:#1f6feb;color:#fff;border:0;border-radius:4px;font:inherit;cursor:pointer}</style></head>\n<body><div class="card"><h1>Sign in</h1><form>\n<label>Email<input name="email" required></label>\n<label>Password<input name="password" type="password" required></label>\n<button type="submit">Sign in</button></form></div></body></html>',
  });

  const create = useMutation({
    mutationFn: createLandingPage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
      toast.success('Landing page created');
      onDone();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Create failed'),
  });

  return (
    <Drawer onClose={onDone} width={760}>
      <div style={{ padding: 22, display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0 }}>New landing page</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label className="field-label">Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">URL slug</label>
            <input
              className="input mono"
              value={form.slug}
              onChange={(e) =>
                setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })
              }
              placeholder="workday-reset"
            />
            <div className="field-help">
              Public URL: <code className="mono">/p/{form.slug || 'slug'}/:trackingId</code>
            </div>
          </div>
          <div>
            <label className="field-label">Capture</label>
            <select
              className="input"
              value={form.captureType}
              onChange={(e) =>
                setForm({ ...form, captureType: e.target.value as LandingPageCapture })
              }
            >
              <option value="credentials">credentials</option>
              <option value="credentials_otp">credentials + OTP</option>
              <option value="custom">custom</option>
              <option value="none">none (awareness only)</option>
            </select>
          </div>
          <div>
            <label className="field-label">Post-submit redirect (optional)</label>
            <input
              className="input mono"
              value={form.redirectUrl}
              onChange={(e) => setForm({ ...form, redirectUrl: e.target.value })}
              placeholder="https://training.example.com/phishing"
            />
          </div>
        </div>
        <div>
          <label className="field-label">HTML</label>
          <textarea
            className="input mono"
            rows={14}
            value={form.htmlContent}
            onChange={(e) => setForm({ ...form, htmlContent: e.target.value })}
          />
          <div className="field-help">
            Any <code className="mono">{'<form>'}</code> on the page is
            re-routed at render time to POST back to the phish-server so
            submissions are captured.
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
                slug: form.slug,
                description: form.description || undefined,
                captureType: form.captureType,
                redirectUrl: form.redirectUrl || undefined,
                htmlContent: form.htmlContent,
              })
            }
          >
            {create.isPending ? 'Saving…' : 'Create landing page'}
          </button>
          <button type="button" className="btn ghost" onClick={onDone}>
            Cancel
          </button>
        </div>
      </div>
    </Drawer>
  );
}
