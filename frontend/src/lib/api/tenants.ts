import apiClient from '@/lib/api-client';

// ─── Enums (string values mirror the backend) ────────────────────────────────

export type TenantStatus =
  | 'pending'
  | 'trial'
  | 'active'
  | 'suspended'
  | 'expired'
  | 'disabled'
  | 'archived';

export const TENANT_STATUSES: TenantStatus[] = [
  'pending',
  'trial',
  'active',
  'suspended',
  'expired',
  'disabled',
  'archived',
];

export const TENANT_STATUS_LABELS: Record<TenantStatus, string> = {
  pending: 'Pending',
  trial: 'Trial',
  active: 'Active',
  suspended: 'Suspended',
  expired: 'Expired',
  disabled: 'Disabled',
  archived: 'Archived',
};

// Which statuses a tenant may transition into from its current one. Mirrors the
// backend TENANT_STATUS_TRANSITIONS so the UI only offers legal moves.
export const TENANT_STATUS_TRANSITIONS: Record<TenantStatus, TenantStatus[]> = {
  pending: ['trial', 'active', 'disabled', 'archived'],
  trial: ['active', 'expired', 'suspended', 'disabled', 'archived'],
  active: ['suspended', 'expired', 'disabled', 'archived'],
  suspended: ['active', 'expired', 'disabled', 'archived'],
  expired: ['active', 'trial', 'disabled', 'archived'],
  disabled: ['active', 'archived'],
  archived: [],
};

export type PlanTier = 'starter' | 'professional' | 'enterprise' | 'custom';

export type TenantFeature =
  | 'campaigns'
  | 'templates'
  | 'landing_pages'
  | 'sending_profiles'
  | 'analytics'
  | 'ai_features'
  | 'api_access'
  | 'custom_branding';

export const TENANT_FEATURES: TenantFeature[] = [
  'campaigns',
  'templates',
  'landing_pages',
  'sending_profiles',
  'analytics',
  'ai_features',
  'api_access',
  'custom_branding',
];

export const TENANT_FEATURE_LABELS: Record<TenantFeature, string> = {
  campaigns: 'Campaigns',
  templates: 'Templates',
  landing_pages: 'Landing Pages',
  sending_profiles: 'Sending Profiles',
  analytics: 'Analytics',
  ai_features: 'AI Features',
  api_access: 'API Access',
  custom_branding: 'Custom Branding',
};

export type UsageMetric =
  | 'users'
  | 'campaigns'
  | 'templates'
  | 'landing_pages'
  | 'sending_profiles'
  | 'emails_sent'
  | 'storage';

// ─── Shapes ──────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  contactEmail: string;
  timezone: string;
  logoUrl: string | null;
  status: TenantStatus;
  planId: string | null;
  featureOverrides: Partial<Record<TenantFeature, boolean>>;
  createdAt: string;
  updatedAt: string;
}

export interface Plan {
  id: string;
  tier: PlanTier;
  name: string;
  description: string | null;
  maxUsers: number;
  maxCampaigns: number;
  maxTemplates: number;
  maxLandingPages: number;
  maxSendingProfiles: number;
  emailQuota: number;
  storageQuota: number;
  defaultFeatures: TenantFeature[];
  isActive: boolean;
}

export interface TenantEntitlements {
  tenantId: string;
  status: TenantStatus;
  usable: boolean;
  plan:
    | (Plan & { tier: PlanTier; name: string; id: string })
    | null;
  features: Record<TenantFeature, boolean>;
}

export interface MetricUsage {
  metric: UsageMetric;
  label: string;
  used: number;
  limit: number; // -1 = unlimited
  remaining: number | null; // null when unlimited (Infinity → null over JSON)
  unlimited: boolean;
  exceeded: boolean;
}

export interface UsageSummary {
  tenantId: string;
  plan: { id: string; name: string } | null;
  metrics: MetricUsage[];
}

export interface CreateTenantInput {
  name: string;
  slug?: string;
  contactEmail: string;
  timezone?: string;
  logoUrl?: string;
}

export type UpdateTenantInput = Partial<CreateTenantInput>;

// ─── Requests ────────────────────────────────────────────────────────────────

export async function listTenants(params?: {
  status?: TenantStatus;
  skip?: number;
  take?: number;
}): Promise<{ tenants: Tenant[]; total: number }> {
  const { data } = await apiClient.get<{ tenants: Tenant[]; total: number }>('/tenants', {
    params,
  });
  return data;
}

export async function getTenant(id: string): Promise<Tenant> {
  const { data } = await apiClient.get<Tenant>(`/tenants/${id}`);
  return data;
}

export async function createTenant(input: CreateTenantInput): Promise<Tenant> {
  const { data } = await apiClient.post<Tenant>('/tenants', input);
  return data;
}

export async function updateTenant(id: string, input: UpdateTenantInput): Promise<Tenant> {
  const { data } = await apiClient.patch<Tenant>(`/tenants/${id}`, input);
  return data;
}

export async function changeTenantStatus(id: string, status: TenantStatus): Promise<Tenant> {
  const { data } = await apiClient.patch<Tenant>(`/tenants/${id}/status`, { status });
  return data;
}

/** Convenience: archiving is a status transition to 'archived' (terminal). */
export async function archiveTenant(id: string): Promise<Tenant> {
  return changeTenantStatus(id, 'archived');
}

export async function listPlans(): Promise<Plan[]> {
  const { data } = await apiClient.get<Plan[]>('/plans');
  return data;
}

export async function assignPlan(id: string, planId: string): Promise<TenantEntitlements> {
  const { data } = await apiClient.put<TenantEntitlements>(`/tenants/${id}/plan`, { planId });
  return data;
}

export async function getEntitlements(id: string): Promise<TenantEntitlements> {
  const { data } = await apiClient.get<TenantEntitlements>(`/tenants/${id}/subscription`);
  return data;
}

export async function setTenantFeatures(
  id: string,
  overrides: Partial<Record<TenantFeature, boolean | null>>,
): Promise<TenantEntitlements> {
  const { data } = await apiClient.patch<TenantEntitlements>(`/tenants/${id}/features`, {
    overrides,
  });
  return data;
}

export async function getTenantUsage(id: string): Promise<UsageSummary> {
  const { data } = await apiClient.get<UsageSummary>(`/tenants/${id}/usage`);
  return data;
}

export async function resetTenantUsage(id: string, metric?: UsageMetric): Promise<UsageSummary> {
  const { data } = await apiClient.post<UsageSummary>(`/tenants/${id}/usage/reset`, { metric });
  return data;
}
