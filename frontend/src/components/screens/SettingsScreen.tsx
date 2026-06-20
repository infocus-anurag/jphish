'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { I, type IconKey } from '@/components/ui/Icons';
import { Badge, Switch, Modal } from '@/components/ui/Primitives';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States';
import { PageHeader } from '@/components/shell/PageHeader';
import { useCan } from '@/lib/rbac';
import { useAuthStore } from '@/store/auth.store';
import {
  createSmtpProfile,
  deleteSmtpProfile,
  listSmtpProfiles,
  testSmtpProfile,
  testSmtpConnection,
  type CreateSmtpProfileInput,
  type SmtpProfile,
} from '@/lib/api/smtp-profiles';
import { listAuditLogs } from '@/lib/api/audit';

interface SmtpPreset {
  id: string;
  label: string;
  host: string;
  port: number;
  secure: boolean;
}

// Common provider presets to prefill host/port/TLS and remove guesswork.
const SMTP_PRESETS: SmtpPreset[] = [
  { id: 'gmail', label: 'Gmail / Google Workspace', host: 'smtp.gmail.com', port: 587, secure: false },
  { id: 'o365', label: 'Microsoft 365', host: 'smtp.office365.com', port: 587, secure: false },
  { id: 'mailgun', label: 'Mailgun (SMTP)', host: 'smtp.mailgun.org', port: 587, secure: false },
  { id: 'sendgrid', label: 'SendGrid', host: 'smtp.sendgrid.net', port: 587, secure: false },
  { id: 'ses', label: 'Amazon SES', host: 'email-smtp.us-east-1.amazonaws.com', port: 465, secure: true },
];

type SectionId =
  | 'smtp'
  | 'domains'
  | 'security'
  | 'audit'
  | 'billing'
  | 'api';

interface NavEntry {
  id: SectionId;
  label: string;
  icon: IconKey;
}

const NAV: NavEntry[] = [
  { id: 'smtp', label: 'SMTP & sending', icon: 'send' },
  { id: 'domains', label: 'Domains & DNS', icon: 'domains' },
  { id: 'security', label: 'Security & SSO', icon: 'shield' },
  { id: 'audit', label: 'Audit logs', icon: 'history' },
  { id: 'billing', label: 'Billing', icon: 'briefcase' },
  { id: 'api', label: 'API & webhooks', icon: 'code' },
];

export function SettingsScreen(): JSX.Element {
  const [section, setSection] = useState<SectionId>('smtp');
  return (
    <>
      <PageHeader title="Settings" sub="SMTP, domains, security, billing" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '220px 1fr',
          minHeight: 'calc(100% - 100px)',
        }}
      >
        <aside
          style={{
            borderRight: '1px solid var(--line)',
            padding: 16,
            background: 'var(--bg-elev)',
          }}
        >
          {NAV.map((it) => {
            const Ic = I[it.icon];
            return (
              <button
                key={it.id}
                type="button"
                className={`nav-item ${section === it.id ? 'active' : ''}`}
                onClick={() => setSection(it.id)}
              >
                <span className="nav-item-icon">
                  <Ic size={14} />
                </span>
                <span>{it.label}</span>
              </button>
            );
          })}
        </aside>
        <div className="page" style={{ padding: 24 }}>
          {section === 'smtp' && <SmtpSettings />}
          {section === 'domains' && <DomainsSettings />}
          {section === 'security' && <SecuritySettings />}
          {section === 'audit' && <AuditLog />}
          {section === 'billing' && <BillingSettings />}
          {section === 'api' && <ApiSettings />}
        </div>
      </div>
    </>
  );
}

function SmtpSettings(): JSX.Element {
  const canEdit = useCan('settings.edit');
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [testProfile, setTestProfile] = useState<SmtpProfile | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['smtp-profiles'],
    queryFn: listSmtpProfiles,
  });
  const profiles: SmtpProfile[] = data?.[0] ?? [];

  const removeMutation = useMutation({
    mutationFn: deleteSmtpProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smtp-profiles'] });
      toast.success('Profile removed');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div style={{ display: 'grid', gap: 14, maxWidth: 760 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Sending profiles</h2>
      <p style={{ marginTop: -8, color: 'var(--fg-muted)', fontSize: 12.5 }}>
        The SMTP servers your campaigns send from. Add one, send yourself a test, then pick it in the
        campaign wizard.
      </p>
      {error && (
        <Badge tone="danger">Could not load profiles ({(error as Error).message})</Badge>
      )}
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Profile</th>
              <th>Host</th>
              <th>From</th>
              <th>TLS</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} style={{ color: 'var(--fg-subtle)' }}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && profiles.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    compact
                    icon="send"
                    title="No sending profiles yet"
                    message="Add an SMTP profile to start sending campaigns. You can test it before saving."
                  />
                </td>
              </tr>
            )}
            {profiles.map((p) => (
              <tr key={p.id}>
                <td className="mono">{p.name}</td>
                <td className="mono" style={{ fontSize: 11.5 }}>
                  {p.host}:{p.port}
                </td>
                <td className="mono" style={{ fontSize: 11.5 }}>
                  {p.fromEmail}
                </td>
                <td>
                  <Badge tone={p.secure ? 'ok' : 'warn'}>
                    {p.secure ? 'TLS' : 'STARTTLS'}
                  </Badge>
                </td>
                <td>
                  {p.lastTestedAt == null ? (
                    <Badge tone="default">Untested</Badge>
                  ) : p.testSuccessful ? (
                    <Badge tone="ok" dot>
                      Healthy
                    </Badge>
                  ) : (
                    <Badge tone="danger" dot>
                      Auth failing
                    </Badge>
                  )}
                </td>
                <td style={{ display: 'flex', gap: 4 }}>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => setTestProfile(p)}
                  >
                    <I.send size={11} /> Test
                  </button>
                  {canEdit && (
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => {
                        if (confirm(`Delete sending profile "${p.name}"?`)) {
                          removeMutation.mutate(p.id);
                        }
                      }}
                    >
                      <I.trash size={12} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEdit && !showForm && (
        <button
          type="button"
          className="btn"
          style={{ width: 'fit-content' }}
          onClick={() => setShowForm(true)}
        >
          <I.plus size={12} /> Add sending profile
        </button>
      )}
      {canEdit && showForm && <SmtpProfileForm onDone={() => setShowForm(false)} />}
      {testProfile && (
        <TestProfileModal profile={testProfile} onClose={() => setTestProfile(null)} />
      )}
    </div>
  );
}

function TestProfileModal({ profile, onClose }: { profile: SmtpProfile; onClose: () => void }): JSX.Element {
  const queryClient = useQueryClient();
  const defaultEmail = useAuthStore((s) => s.user?.email ?? '');
  const [email, setEmail] = useState(defaultEmail);

  const send = useMutation({
    mutationFn: () => testSmtpProfile(profile.id, email.trim()),
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ['smtp-profiles'] });
      if (p.testSuccessful) {
        toast.success(`Test email sent to ${email}`);
        onClose();
      } else {
        toast.error(p.testError || 'SMTP test failed');
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Test failed'),
  });

  return (
    <Modal
      title={`Test "${profile.name}"`}
      onClose={onClose}
      footer={
        <div className="row" style={{ justifyContent: 'flex-end', width: '100%', gap: 6 }}>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!email.includes('@') || send.isPending}
            onClick={() => send.mutate()}
          >
            {send.isPending ? 'Sending…' : 'Send test email'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ fontSize: 12.5, color: 'var(--fg-subtle)' }}>
          We&apos;ll verify the connection and send a real test email so you can confirm
          deliverability.
        </div>
        <div>
          <label className="field-label">Send test to</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoFocus
          />
        </div>
      </div>
    </Modal>
  );
}

function SmtpProfileForm({ onDone }: { onDone: () => void }): JSX.Element {
  const queryClient = useQueryClient();
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState<CreateSmtpProfileInput>({
    name: '',
    host: '',
    port: 587,
    secure: false,
    user: '',
    password: '',
    fromEmail: '',
    fromName: '',
  });

  const create = useMutation({
    mutationFn: createSmtpProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smtp-profiles'] });
      toast.success('Sending profile created');
      onDone();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Create failed'),
  });

  const test = useMutation({
    mutationFn: () => testSmtpConnection(form),
    onSuccess: () => toast.success('Connection successful — credentials work'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Connection failed'),
  });

  const canTest =
    !!form.host && !!form.port && !!form.user && !!form.password && form.fromEmail.includes('@');

  function applyPreset(id: string): void {
    const preset = SMTP_PRESETS.find((p) => p.id === id);
    if (preset) setForm((f) => ({ ...f, host: preset.host, port: preset.port, secure: preset.secure }));
  }

  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ marginBottom: 12 }}>
        <label className="field-label">Provider preset</label>
        <select className="input" style={{ maxWidth: 320 }} defaultValue="" onChange={(e) => applyPreset(e.target.value)}>
          <option value="">Choose a provider to prefill…</option>
          {SMTP_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
        <Field label="Name">
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="postmark-prod"
          />
        </Field>
        <Field label="From email">
          <input
            className="input mono"
            value={form.fromEmail}
            onChange={(e) => setForm({ ...form, fromEmail: e.target.value })}
            placeholder="noreply@yourorg.com"
          />
        </Field>
        <Field label="From name">
          <input
            className="input"
            value={form.fromName ?? ''}
            onChange={(e) => setForm({ ...form, fromName: e.target.value })}
            placeholder="Security Team"
          />
        </Field>
        <Field label="Host">
          <input
            className="input mono"
            value={form.host}
            onChange={(e) => setForm({ ...form, host: e.target.value })}
            placeholder="smtp.example.com"
          />
        </Field>
        <Field label="Port">
          <input
            className="input mono"
            type="number"
            value={form.port}
            onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
          />
          <div className="field-help">587 = STARTTLS · 465 = TLS/SSL · 25 = unencrypted</div>
        </Field>
        <Field label="Secure (implicit TLS)">
          <Switch on={form.secure} onChange={(v) => setForm({ ...form, secure: v })} />
          <div className="field-help">On for port 465, off for 587 (STARTTLS).</div>
        </Field>
        <Field label="Username">
          <input
            className="input mono"
            value={form.user}
            onChange={(e) => setForm({ ...form, user: e.target.value })}
            autoComplete="off"
          />
        </Field>
        <Field label="Password">
          <div style={{ position: 'relative' }}>
            <input
              className="input mono"
              type={showPw ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
              style={{ paddingRight: 30 }}
            />
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setShowPw((s) => !s)}
              style={{ position: 'absolute', right: 2, top: 2, padding: '0 6px' }}
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              <I.eye size={12} />
            </button>
          </div>
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 12, alignItems: 'center' }}>
        <button
          type="button"
          className="btn primary"
          disabled={create.isPending}
          onClick={() => create.mutate(form)}
        >
          {create.isPending ? 'Saving…' : 'Save profile'}
        </button>
        <button
          type="button"
          className="btn"
          disabled={!canTest || test.isPending}
          onClick={() => test.mutate()}
          title={canTest ? 'Verify these credentials without saving' : 'Fill host, port, credentials and from-email first'}
        >
          {test.isPending ? 'Testing…' : 'Test connection'}
        </button>
        <button type="button" className="btn ghost" onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

function DomainsSettings(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 14, maxWidth: 880 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Domains &amp; DNS</h2>
      <p style={{ marginTop: -8, color: 'var(--fg-muted)', fontSize: 12.5 }}>
        Manage the sending and landing domains used by your phishing simulations.
      </p>
      <div className="card">
        <EmptyState
          icon="domains"
          title="No domains configured"
          message="Add a domain to generate DKIM, SPF, and DMARC records and serve landing pages from it."
        />
      </div>
    </div>
  );
}

function SecuritySettings(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 14, maxWidth: 720 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Security &amp; access</h2>
      <div className="card">
        <EmptyState
          icon="shield"
          title="No security policies configured"
          message="SSO, MFA enforcement, encryption-at-rest, and campaign approval policies will be managed here."
        />
      </div>
    </div>
  );
}

function AuditLog(): JSX.Element {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => listAuditLogs(100),
  });
  const rows = data ?? [];
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Audit log</h2>
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Target</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonRows rows={6} cols={5} />
            ) : isError ? (
              <tr>
                <td colSpan={5}>
                  <ErrorState
                    compact
                    message="Couldn’t load audit logs."
                    onRetry={() => refetch()}
                  />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    compact
                    icon="history"
                    title="No audit events yet"
                    message="Administrative actions — logins, role changes, campaign approvals — are recorded here."
                  />
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono" style={{ fontSize: 11 }}>
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <Badge tone={r.actorEmail ? 'default' : 'info'}>
                      {r.actorEmail ?? 'system'}
                    </Badge>
                  </td>
                  <td className="mono" style={{ fontSize: 11.5 }}>
                    {r.action}
                  </td>
                  <td className="mono" style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>
                    {r.targetId ?? '—'}
                  </td>
                  <td className="mono" style={{ fontSize: 11 }}>
                    {r.ipAddress ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BillingSettings(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 14, maxWidth: 760 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Billing</h2>
      <div className="card">
        <EmptyState
          icon="briefcase"
          title="No billing information"
          message="Your plan, seats, and usage will appear here once billing is set up for this workspace."
        />
      </div>
    </div>
  );
}

function ApiSettings(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 14, maxWidth: 760 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>API &amp; webhooks</h2>
      <div className="card">
        <EmptyState
          icon="code"
          title="No API keys yet"
          message="Generate an API key and configure webhooks to integrate JPhish with your security tooling."
        />
      </div>
    </div>
  );
}
