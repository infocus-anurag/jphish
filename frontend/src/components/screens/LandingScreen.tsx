'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { I } from '@/components/ui/Icons';
import { Badge, Drawer, Modal } from '@/components/ui/Primitives';
import { EmptyState, SkeletonCards } from '@/components/ui/States';
import { PageHeader } from '@/components/shell/PageHeader';
import { useCan } from '@/lib/rbac';
import {
  cloneLandingPage,
  createLandingPage,
  deleteLandingPage,
  listLandingPages,
  publicLandingPageUrl,
  updateLandingPage,
  type LandingPage,
  type LandingPageCapture,
} from '@/lib/api/landing-pages';
import {
  CAPTURE_LABEL,
  LANDING_PRESETS,
  slugify,
  suggestFromSource,
} from '@/lib/landing-utils';

export function LandingScreen(): JSX.Element {
  const canCreate = useCan('template.create');
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<LandingPage | null>(null);
  const [editor, setEditor] = useState<{ initial: LandingPage | null; duplicate: boolean } | null>(
    null,
  );

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
              onClick={() => setEditor({ initial: null, duplicate: false })}
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
        {isLoading && <SkeletonCards count={6} />}
        {!isLoading && pages.length === 0 && !error && (
          <div style={{ gridColumn: '1 / -1' }}>
            <EmptyState
              icon="landing"
              title="No landing pages yet"
              message="Landing pages capture what targets do after a click. Clone a real sign-in page from its URL, start from a template, or write your own."
              action={
                canCreate ? (
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => setEditor({ initial: null, duplicate: false })}
                  >
                    <I.plus size={13} /> New page
                  </button>
                ) : undefined
              }
            />
          </div>
        )}
        {pages.map((p) => (
          <div key={p.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setOpen(p)}>
            <div style={{ height: 150, borderBottom: '1px solid var(--line)', overflow: 'hidden', position: 'relative' }}>
              <iframe
                title={`Preview of ${p.name}`}
                sandbox=""
                srcDoc={p.htmlContent}
                aria-hidden
                tabIndex={-1}
                style={{
                  border: 0,
                  width: 'calc(100% / 0.5)',
                  height: 'calc(150px / 0.5)',
                  transform: 'scale(0.5)',
                  transformOrigin: 'top left',
                  pointerEvents: 'none',
                  background: '#fff',
                }}
              />
            </div>
            <div className="card-body" style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Badge tone="info">{p.captureType.replace('_', '+')}</Badge>
                {!p.isActive && <Badge tone="default">disabled</Badge>}
              </div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2 }}>
                /{p.slug}
              </div>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <Drawer onClose={() => setOpen(null)} width={680}>
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
              At send time, <code className="mono">preview</code> is replaced with the per-recipient
              tracking id so submissions, opens and clicks attribute back to the target.
            </div>
            <iframe
              title={`Preview of ${open.name}`}
              sandbox=""
              srcDoc={open.htmlContent}
              style={{ width: '100%', height: 380, border: '1px solid var(--line)', borderRadius: 6, background: '#fff' }}
            />
            {canCreate && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    setEditor({ initial: open, duplicate: false });
                    setOpen(null);
                  }}
                >
                  <I.edit size={12} /> Edit
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setEditor({ initial: open, duplicate: true });
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

      {editor && (
        <LandingEditor
          key={editor.initial && !editor.duplicate ? editor.initial.id : 'new'}
          initial={editor.initial}
          isDuplicate={editor.duplicate}
          onClose={() => setEditor(null)}
        />
      )}
    </>
  );
}

interface LandingEditorProps {
  initial: LandingPage | null;
  isDuplicate: boolean;
  onClose: () => void;
}

function LandingEditor({ initial, isDuplicate, onClose }: LandingEditorProps): JSX.Element {
  const queryClient = useQueryClient();
  const [sourceChosen, setSourceChosen] = useState(!!initial);
  const [savedId, setSavedId] = useState<string | null>(isDuplicate ? null : (initial?.id ?? null));
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [cloneUrl, setCloneUrl] = useState('');

  const [form, setForm] = useState({
    name: initial ? (isDuplicate ? `${initial.name} (copy)` : initial.name) : '',
    slug: initial ? (isDuplicate ? '' : initial.slug) : '',
    description: initial?.description ?? '',
    captureType: (initial?.captureType ?? 'credentials') as LandingPageCapture,
    redirectUrl: initial?.redirectUrl ?? '',
    htmlContent: initial?.htmlContent ?? '',
  });

  function setName(name: string): void {
    setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));
  }

  const clone = useMutation({
    mutationFn: () => cloneLandingPage(cloneUrl.trim()),
    onSuccess: (r) => {
      const sug = suggestFromSource(r.title, r.sourceUrl);
      setForm((f) => ({ ...f, name: sug.name, slug: sug.slug, htmlContent: r.html }));
      setSourceChosen(true);
      toast.success('Page cloned — review and tweak before saving');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Could not clone that URL'),
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || undefined,
        captureType: form.captureType,
        redirectUrl: form.redirectUrl.trim() || undefined,
        htmlContent: form.htmlContent,
      };
      if (savedId) return updateLandingPage(savedId, payload);
      return createLandingPage(payload);
    },
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
      setSavedId(p.id);
      toast.success(savedId ? 'Landing page saved' : 'Landing page created');
      if (!savedId) onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const valid = form.name.trim() && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(form.slug) && form.htmlContent.trim();

  // Step 0 (create only): choose a source
  if (!sourceChosen) {
    return (
      <Modal title="New landing page" size="lg" onClose={onClose}>
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="card" style={{ padding: 16, display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <I.globe size={14} /> Clone a website
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
              Paste a public page URL (e.g. a real sign-in page). We fetch it server-side, strip
              scripts, and keep the look so you can use it as a replica.
            </div>
            <div className="row" style={{ gap: 6 }}>
              <input
                className="input mono"
                style={{ flex: 1 }}
                placeholder="https://login.example.com"
                value={cloneUrl}
                onChange={(e) => setCloneUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && cloneUrl.trim()) clone.mutate();
                }}
              />
              <button
                type="button"
                className="btn primary"
                disabled={!/^https?:\/\//i.test(cloneUrl.trim()) || clone.isPending}
                onClick={() => clone.mutate()}
              >
                {clone.isPending ? 'Cloning…' : 'Clone'}
              </button>
            </div>
          </div>

          <div>
            <div className="field-label">Or start from a template</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 10,
              }}
            >
              {LANDING_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="card"
                  style={{ textAlign: 'left', padding: 14, cursor: 'pointer' }}
                  onClick={() => {
                    setForm((f) => ({ ...f, captureType: p.captureType, htmlContent: p.html }));
                    setSourceChosen(true);
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 3 }}>
                    {p.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={savedId ? 'Edit landing page' : 'New landing page'}
      size="lg"
      onClose={onClose}
      footer={
        <div className="row" style={{ justifyContent: 'flex-end', width: '100%', gap: 6 }}>
          <button type="button" className="btn ghost" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!valid || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? 'Saving…' : savedId ? 'Save changes' : 'Create landing page'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Left: fields + HTML */}
        <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
          <div className="grid-2" style={{ gap: 10 }}>
            <div>
              <label className="field-label">Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Workday password reset"
              />
            </div>
            <div>
              <label className="field-label">URL slug</label>
              <input
                className="input mono"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') });
                }}
                placeholder="workday-reset"
              />
            </div>
          </div>
          <div className="field-help" style={{ marginTop: -4 }}>
            Public URL: <code className="mono">/p/{form.slug || 'slug'}/:trackingId</code>
          </div>

          <div className="grid-2" style={{ gap: 10 }}>
            <div>
              <label className="field-label">Capture</label>
              <select
                className="input"
                value={form.captureType}
                onChange={(e) => setForm({ ...form, captureType: e.target.value as LandingPageCapture })}
              >
                <option value="credentials">{CAPTURE_LABEL.credentials}</option>
                <option value="credentials_otp">{CAPTURE_LABEL.credentials_otp}</option>
                <option value="custom">{CAPTURE_LABEL.custom}</option>
                <option value="none">{CAPTURE_LABEL.none}</option>
              </select>
            </div>
            <div>
              <label className="field-label">Post-submit redirect (optional)</label>
              <input
                className="input mono"
                value={form.redirectUrl}
                onChange={(e) => setForm({ ...form, redirectUrl: e.target.value })}
                placeholder="https://training.example.com"
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
              Any <code className="mono">{'<form>'}</code> is re-routed at render time to POST back to
              the phish-server, so submissions are captured automatically.
            </div>
          </div>
        </div>

        {/* Right: isolated live preview */}
        <div style={{ minWidth: 0 }}>
          <label className="field-label">Live preview</label>
          <iframe
            title="Landing page preview"
            sandbox=""
            srcDoc={form.htmlContent}
            style={{ width: '100%', height: 460, border: '1px solid var(--line)', borderRadius: 6, background: '#fff' }}
          />
        </div>
      </div>
    </Modal>
  );
}
