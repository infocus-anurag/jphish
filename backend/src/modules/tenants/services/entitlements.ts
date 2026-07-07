import { Plan } from '../entities/plan.entity';
import { Tenant } from '../entities/tenant.entity';
import { ALL_TENANT_FEATURES, TenantFeature } from '../enums/tenant-feature.enum';
import { isUsableStatus } from '../enums/tenant-status.enum';

export interface PlanLimits {
  maxUsers: number;
  maxCampaigns: number;
  maxTemplates: number;
  maxLandingPages: number;
  maxSendingProfiles: number;
  emailQuota: number;
  storageQuota: number;
}

export interface TenantEntitlements {
  tenantId: string;
  status: Tenant['status'];
  usable: boolean;
  plan: (PlanLimits & { id: string; tier: Plan['tier']; name: string }) | null;
  // Effective feature map after layering per-tenant overrides on the plan default.
  features: Record<TenantFeature, boolean>;
}

/**
 * Resolve whether a single feature is granted: a per-tenant override wins over
 * the plan default; with no plan and no override the feature is off.
 */
export function resolveFeature(
  plan: Plan | null,
  overrides: Partial<Record<TenantFeature, boolean>> | null | undefined,
  feature: TenantFeature,
): boolean {
  const override = overrides?.[feature];
  if (override !== undefined) return override;
  return plan?.defaultFeatures?.includes(feature) ?? false;
}

export function resolveAllFeatures(
  plan: Plan | null,
  overrides: Partial<Record<TenantFeature, boolean>> | null | undefined,
): Record<TenantFeature, boolean> {
  const map = {} as Record<TenantFeature, boolean>;
  for (const feature of ALL_TENANT_FEATURES) {
    map[feature] = resolveFeature(plan, overrides, feature);
  }
  return map;
}

export function buildEntitlements(tenant: Tenant): TenantEntitlements {
  const plan = tenant.plan ?? null;
  return {
    tenantId: tenant.id,
    status: tenant.status,
    usable: isUsableStatus(tenant.status),
    plan: plan
      ? {
          id: plan.id,
          tier: plan.tier,
          name: plan.name,
          maxUsers: plan.maxUsers,
          maxCampaigns: plan.maxCampaigns,
          maxTemplates: plan.maxTemplates,
          maxLandingPages: plan.maxLandingPages,
          maxSendingProfiles: plan.maxSendingProfiles,
          emailQuota: plan.emailQuota,
          storageQuota: plan.storageQuota,
        }
      : null,
    features: resolveAllFeatures(plan, tenant.featureOverrides),
  };
}
