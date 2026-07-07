'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState, ErrorState, SkeletonRows, errorMessage } from '@/components/ui/States';
import { Modal, Drawer, Switch } from '@/components/ui/Primitives';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/types/auth.types';
import {
  useTenantsQuery,
  usePlansQuery,
  useTenantEntitlements,
  useTenantUsage,
  useCreateTenant,
  useUpdateTenant,
  useChangeTenantStatus,
  useArchiveTenant,
  useAssignPlan,
  useSetTenantFeatures,
  useResetTenantUsage,
} from '@/hooks/useTenants';
import {
  TENANT_STATUSES,
  TENANT_STATUS_LABELS,
  TENANT_STATUS_TRANSITIONS,
  TENANT_FEATURES,
  TENANT_FEATURE_LABELS,
  type Plan,
  type Tenant,
  type TenantFeature,
  type TenantStatus,
} from '@/lib/api/tenants';

// ─── Screen ──────────────────────────────────────────────────────────────────

export function TenantsScreen(): JSX.Element {
  const role = useAuthStore((s) => s.user?.role);
  const isSuper = role === UserRole.SUPER_ADMIN;

  const [statusFilter, setStatusFilter] = useState<TenantStatus | 'all'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const tenantsQ = useTenantsQuery(statusFilter === 'all' ? undefined : statusFilter);
  const plansQ = usePlansQuery();
  const createTenant = useCreateTenant();

  const plansById = useMemo(() => {
    const m = new Map<string, Plan>();
    (plansQ.data ?? []).forEach((p) => m.set(p.id, p));
    return m;
  }, [plansQ.data]);

  const tenants = tenantsQ.data?.tenants ?? [];
  const selected = tenants.find((t) => t.id === selectedId) ?? null;

  return (
    <>
      <PageHeader
        title="Tenants"
        sub="Platform administration — onboard organizations, manage plans, features, quotas and lifecycle."
      />

      <div className="page" style={{ padding: 22 }}>
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Status</span>
            <select
              className="input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TenantStatus | 'all')}
              style={{ width: 180 }}
            >
              <option value="all">All statuses</option>
              {TENANT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {TENANT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>

          {isSuper ? (
            <button type="button" className="btn primary" onClick={() => setShowCreate(true)}>
              New tenant
            </button>
          ) : null}
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {tenantsQ.isLoading ? (
            <div style={{ padding: 16 }}>
              <SkeletonRows rows={6} cols={5} />
            </div>
          ) : tenantsQ.error ? (
            <ErrorState message={errorMessage(tenantsQ.error)} onRetry={() => tenantsQ.refetch()} />
          ) : tenants.length === 0 ? (
            <EmptyState
              icon="building"
              title="No tenants yet"
              message={
                isSuper
                  ? 'Create your first organization to start managing plans, features and quotas.'
                  : 'When organizations are onboarded to the platform, they’ll appear here.'
              }
            />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-elev, #f8fafc)', textAlign: 'left' }}>
                  <Th>Organization</Th>
                  <Th>Status</Th>
                  <Th>Plan</Th>
                  <Th>Contact</Th>
                  <Th>Created</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id}>
                    <td style={cell}>
                      <div style={{ fontWeight: 600 }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--fg-faint)' }}>{t.slug}</div>
                    </td>
                    <td style={cell}>
                      <TenantStatusBadge status={t.status} />
                    </td>
                    <td style={cell}>
                      {t.planId ? (
                        plansById.get(t.planId)?.name ?? '—'
                      ) : (
                        <span style={{ color: 'var(--fg-faint)' }}>No plan</span>
                      )}
                    </td>
                    <td style={cell}>{t.contactEmail}</td>
                    <td style={cell}>{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td style={cell}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => setSelectedId(t.id)}
                        >
                          Manage
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showCreate && isSuper ? (
        <CreateTenantModal
          submitting={createTenant.isPending}
          onClose={() => setShowCreate(false)}
          onSubmit={(v) =>
            createTenant
              .mutateAsync({
                name: v.name,
                slug: v.slug || undefined,
                contactEmail: v.contactEmail,
                timezone: v.timezone || undefined,
                logoUrl: v.logoUrl || undefined,
              })
              .then(() => setShowCreate(false))
          }
        />
      ) : null}

      {selected ? (
        <TenantDrawer
          tenant={selected}
          plans={plansQ.data ?? []}
          isSuper={isSuper}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </>
  );
}

// ─── Drawer: manage a single tenant ──────────────────────────────────────────

function TenantDrawer({
  tenant,
  plans,
  isSuper,
  onClose,
}: {
  tenant: Tenant;
  plans: Plan[];
  isSuper: boolean;
  onClose: () => void;
}): JSX.Element {
  const entQ = useTenantEntitlements(tenant.id);
  const usageQ = useTenantUsage(tenant.id);

  const update = useUpdateTenant();
  const changeStatus = useChangeTenantStatus();
  const archive = useArchiveTenant();
  const assignPlan = useAssignPlan();
  const setFeatures = useSetTenantFeatures();
  const resetUsage = useResetTenantUsage();

  // Editable profile fields.
  const [name, setName] = useState(tenant.name);
  const [contactEmail, setContactEmail] = useState(tenant.contactEmail);
  const [timezone, setTimezone] = useState(tenant.timezone);
  const [logoUrl, setLogoUrl] = useState(tenant.logoUrl ?? '');

  const [planId, setPlanId] = useState(tenant.planId ?? '');
  const [nextStatus, setNextStatus] = useState<TenantStatus | ''>('');

  // Effective feature toggles, seeded from entitlements once loaded.
  const [features, setFeatureState] = useState<Record<TenantFeature, boolean> | null>(null);
  useEffect(() => {
    if (entQ.data) setFeatureState({ ...entQ.data.features });
  }, [entQ.data]);

  const allowedTransitions = TENANT_STATUS_TRANSITIONS[tenant.status];

  const profileDirty =
    name !== tenant.name ||
    contactEmail !== tenant.contactEmail ||
    timezone !== tenant.timezone ||
    (logoUrl || null) !== tenant.logoUrl;

  const featuresDirty =
    !!features && !!entQ.data && TENANT_FEATURES.some((f) => features[f] !== entQ.data!.features[f]);

  return (
    <Drawer onClose={onClose} width={560}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <header
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{tenant.name}</div>
            <div style={{ fontSize: 12, color: 'var(--fg-faint)' }}>{tenant.slug}</div>
          </div>
          <TenantStatusBadge status={tenant.status} />
          <button type="button" className="btn ghost sm" onClick={onClose}>
            Close
          </button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'grid', gap: 22 }}>
          {!isSuper ? (
            <div
              style={{
                fontSize: 13,
                color: 'var(--fg-muted)',
                background: 'var(--bg-elev,#f8fafc)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                padding: 12,
              }}
            >
              You have read-only access. Only super admins can modify tenants.
            </div>
          ) : null}

          {/* Profile */}
          <Section title="Profile">
            <div style={{ display: 'grid', gap: 12 }}>
              <LabeledInput
                label="Organization name"
                value={name}
                onChange={setName}
                disabled={!isSuper}
              />
              <LabeledInput
                label="Contact email"
                value={contactEmail}
                onChange={setContactEmail}
                type="email"
                disabled={!isSuper}
              />
              <LabeledInput
                label="Timezone (IANA)"
                value={timezone}
                onChange={setTimezone}
                disabled={!isSuper}
              />
              <LabeledInput
                label="Logo URL (optional)"
                value={logoUrl}
                onChange={setLogoUrl}
                placeholder="https://…"
                disabled={!isSuper}
              />
              {isSuper ? (
                <div>
                  <button
                    type="button"
                    className="btn primary sm"
                    disabled={!profileDirty || update.isPending}
                    onClick={() =>
                      update.mutate({
                        id: tenant.id,
                        input: {
                          name,
                          contactEmail,
                          timezone,
                          logoUrl: logoUrl || undefined,
                        },
                      })
                    }
                  >
                    {update.isPending ? 'Saving…' : 'Save profile'}
                  </button>
                </div>
              ) : null}
            </div>
          </Section>

          {/* Subscription: plan + status */}
          <Section title="Subscription">
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <FieldLabel>Plan</FieldLabel>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    className="input"
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                    disabled={!isSuper}
                    style={{ flex: 1 }}
                  >
                    <option value="">No plan</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.tier})
                      </option>
                    ))}
                  </select>
                  {isSuper ? (
                    <button
                      type="button"
                      className="btn sm"
                      disabled={
                        !planId || planId === (tenant.planId ?? '') || assignPlan.isPending
                      }
                      onClick={() => assignPlan.mutate({ id: tenant.id, planId })}
                    >
                      Change plan
                    </button>
                  ) : null}
                </div>
                {entQ.data?.plan ? (
                  <PlanLimitsRow plan={entQ.data.plan} />
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--fg-faint)', marginTop: 6 }}>
                    No plan assigned — quotas are zero until a plan is set.
                  </div>
                )}
              </div>

              <div>
                <FieldLabel>Lifecycle status</FieldLabel>
                {allowedTransitions.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--fg-faint)' }}>
                    {TENANT_STATUS_LABELS[tenant.status]} is a terminal state — no further
                    transitions.
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select
                      className="input"
                      value={nextStatus}
                      onChange={(e) => setNextStatus(e.target.value as TenantStatus)}
                      disabled={!isSuper}
                      style={{ flex: 1 }}
                    >
                      <option value="">Change to…</option>
                      {allowedTransitions.map((s) => (
                        <option key={s} value={s}>
                          {TENANT_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    {isSuper ? (
                      <button
                        type="button"
                        className="btn sm"
                        disabled={!nextStatus || changeStatus.isPending}
                        onClick={() =>
                          nextStatus &&
                          changeStatus.mutate(
                            { id: tenant.id, status: nextStatus },
                            { onSuccess: () => setNextStatus('') },
                          )
                        }
                      >
                        Apply
                      </button>
                    ) : null}
                  </div>
                )}
              </div>

              {isSuper && tenant.status !== 'archived' ? (
                <div>
                  <button
                    type="button"
                    className="btn ghost sm"
                    style={{ color: 'var(--danger, #b91c1c)' }}
                    disabled={archive.isPending}
                    onClick={() => {
                      if (
                        confirm(
                          `Archive “${tenant.name}”? This is a terminal state — the tenant becomes hidden and immutable.`,
                        )
                      ) {
                        archive.mutate(tenant.id, { onSuccess: onClose });
                      }
                    }}
                  >
                    Archive tenant
                  </button>
                </div>
              ) : null}
            </div>
          </Section>

          {/* Features */}
          <Section title="Features">
            {entQ.isLoading || !features ? (
              <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Loading features…</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {TENANT_FEATURES.map((f) => (
                  <div
                    key={f}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: 13 }}>{TENANT_FEATURE_LABELS[f]}</span>
                    <Switch
                      on={features[f]}
                      onChange={(next) =>
                        isSuper &&
                        setFeatureState((prev) => (prev ? { ...prev, [f]: next } : prev))
                      }
                    />
                  </div>
                ))}
                {isSuper ? (
                  <div>
                    <button
                      type="button"
                      className="btn primary sm"
                      disabled={!featuresDirty || setFeatures.isPending}
                      onClick={() => {
                        if (!features || !entQ.data) return;
                        const overrides: Partial<Record<TenantFeature, boolean>> = {};
                        for (const f of TENANT_FEATURES) {
                          if (features[f] !== entQ.data.features[f]) overrides[f] = features[f];
                        }
                        setFeatures.mutate({ id: tenant.id, overrides });
                      }}
                    >
                      {setFeatures.isPending ? 'Saving…' : 'Save features'}
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </Section>

          {/* Usage */}
          <Section
            title="Usage"
            action={
              isSuper ? (
                <button
                  type="button"
                  className="btn ghost sm"
                  disabled={resetUsage.isPending}
                  onClick={() => {
                    if (confirm('Reset all usage counters for this tenant to zero?')) {
                      resetUsage.mutate({ id: tenant.id });
                    }
                  }}
                >
                  Reset quotas
                </button>
              ) : undefined
            }
          >
            {usageQ.isLoading ? (
              <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Loading usage…</div>
            ) : usageQ.error ? (
              <div style={{ fontSize: 13, color: 'var(--danger,#b91c1c)' }}>
                {errorMessage(usageQ.error)}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {usageQ.data?.metrics.map((m) => (
                  <UsageBar
                    key={m.metric}
                    label={m.label}
                    used={m.used}
                    limit={m.limit}
                    unlimited={m.unlimited}
                    exceeded={m.exceeded}
                  />
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </Drawer>
  );
}

// ─── Create modal ─────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(2, 'Min 2 chars').max(255),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase, digits and single hyphens')
    .max(100)
    .optional()
    .or(z.literal('')),
  contactEmail: z.string().email().max(254),
  timezone: z.string().max(64).optional().or(z.literal('')),
  logoUrl: z.string().url('Must be a URL').optional().or(z.literal('')),
});
type CreateValues = z.infer<typeof createSchema>;

function CreateTenantModal({
  submitting,
  onClose,
  onSubmit,
}: {
  submitting: boolean;
  onClose: () => void;
  onSubmit: (v: CreateValues) => Promise<unknown>;
}): JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { timezone: 'UTC' },
  });

  return (
    <Modal
      title="New tenant"
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="create-tenant-form"
            className="btn primary"
            disabled={submitting}
          >
            {submitting ? 'Creating…' : 'Create tenant'}
          </button>
        </div>
      }
    >
      <form
        id="create-tenant-form"
        onSubmit={handleSubmit(async (v) => {
          await onSubmit(v);
        })}
        style={{ display: 'grid', gap: 12 }}
      >
        <Field label="Organization name" error={errors.name?.message}>
          <input className="input" {...register('name')} placeholder="Acme Corporation" />
        </Field>
        <Field label="Slug (optional — derived from name)" error={errors.slug?.message}>
          <input className="input" {...register('slug')} placeholder="acme-corp" />
        </Field>
        <Field label="Contact email" error={errors.contactEmail?.message}>
          <input
            className="input"
            type="email"
            {...register('contactEmail')}
            placeholder="admin@acme.example"
          />
        </Field>
        <Field label="Timezone (IANA)" error={errors.timezone?.message}>
          <input className="input" {...register('timezone')} placeholder="UTC" />
        </Field>
        <Field label="Logo URL (optional)" error={errors.logoUrl?.message}>
          <input
            className="input"
            {...register('logoUrl')}
            placeholder="https://cdn.acme.example/logo.png"
          />
        </Field>
      </form>
    </Modal>
  );
}

// ─── Small building blocks ────────────────────────────────────────────────────

const cell: React.CSSProperties = {
  padding: '10px 14px',
  borderBottom: '1px solid var(--line)',
  fontSize: 13,
  verticalAlign: 'middle',
};

function Th({ children }: { children?: React.ReactNode }): JSX.Element {
  return (
    <th
      style={{
        padding: '10px 14px',
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: 'var(--fg-muted)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      {children}
    </th>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <h3
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            color: 'var(--fg-muted)',
            margin: 0,
          }}
        >
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <span style={{ display: 'block', fontSize: 11, color: 'var(--fg-muted)', marginBottom: 4 }}>
      {children}
    </span>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}): JSX.Element {
  return (
    <label style={{ display: 'block' }}>
      <FieldLabel>{label}</FieldLabel>
      <input
        className="input"
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%' }}
      />
    </label>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <label style={{ display: 'block' }}>
      <FieldLabel>{label}</FieldLabel>
      {children}
      {error ? <span style={{ fontSize: 11, color: 'var(--danger, #b91c1c)' }}>{error}</span> : null}
    </label>
  );
}

function PlanLimitsRow({
  plan,
}: {
  plan: {
    maxUsers: number;
    maxCampaigns: number;
    maxTemplates: number;
    maxLandingPages: number;
    maxSendingProfiles: number;
    emailQuota: number;
    storageQuota: number;
  };
}): JSX.Element {
  const items: Array<[string, number]> = [
    ['Users', plan.maxUsers],
    ['Campaigns', plan.maxCampaigns],
    ['Templates', plan.maxTemplates],
    ['Landing', plan.maxLandingPages],
    ['Profiles', plan.maxSendingProfiles],
    ['Emails', plan.emailQuota],
    ['Storage MB', plan.storageQuota],
  ];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {items.map(([label, n]) => (
        <span
          key={label}
          style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 6,
            background: 'var(--bg-elev,#f1f5f9)',
            color: 'var(--fg-muted)',
          }}
        >
          {label}: {fmtLimit(n)}
        </span>
      ))}
    </div>
  );
}

function UsageBar({
  label,
  used,
  limit,
  unlimited,
  exceeded,
}: {
  label: string;
  used: number;
  limit: number;
  unlimited: boolean;
  exceeded: boolean;
}): JSX.Element {
  const pct = unlimited || limit <= 0 ? 0 : Math.min(100, (used / limit) * 100);
  const bar = exceeded ? 'var(--danger,#dc2626)' : pct > 85 ? '#f59e0b' : 'var(--accent,#4f46e5)';
  return (
    <div>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}
      >
        <span>{label}</span>
        <span style={{ color: exceeded ? 'var(--danger,#dc2626)' : 'var(--fg-muted)' }}>
          {used} / {unlimited ? '∞' : fmtLimit(limit)}
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: 'var(--bg-elev,#e2e8f0)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${unlimited ? 4 : pct}%`,
            height: '100%',
            background: bar,
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}

function fmtLimit(n: number): string {
  return n === -1 ? 'Unlimited' : n.toLocaleString();
}

function TenantStatusBadge({ status }: { status: TenantStatus }): JSX.Element {
  const palette: Record<TenantStatus, { bg: string; fg: string }> = {
    active: { bg: 'rgba(16,185,129,0.14)', fg: '#047857' },
    trial: { bg: 'rgba(59,130,246,0.14)', fg: '#1d4ed8' },
    pending: { bg: 'rgba(234,179,8,0.16)', fg: '#a16207' },
    suspended: { bg: 'rgba(249,115,22,0.16)', fg: '#c2410c' },
    expired: { bg: 'rgba(148,163,184,0.20)', fg: '#475569' },
    disabled: { bg: 'rgba(148,163,184,0.20)', fg: '#475569' },
    archived: { bg: 'rgba(100,116,139,0.16)', fg: '#334155' },
  };
  const { bg, fg } = palette[status];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: bg,
        color: fg,
        whiteSpace: 'nowrap',
      }}
    >
      {TENANT_STATUS_LABELS[status]}
    </span>
  );
}
