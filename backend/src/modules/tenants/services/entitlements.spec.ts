import { buildEntitlements, resolveAllFeatures, resolveFeature } from './entitlements';
import { Plan } from '../entities/plan.entity';
import { Tenant } from '../entities/tenant.entity';
import { PlanTier } from '../enums/plan-tier.enum';
import { TenantFeature } from '../enums/tenant-feature.enum';
import { TenantStatus } from '../enums/tenant-status.enum';

function makePlan(features: TenantFeature[]): Plan {
  return {
    id: 'plan-1',
    tier: PlanTier.PROFESSIONAL,
    name: 'Professional',
    description: null,
    maxUsers: 15,
    maxCampaigns: 50,
    maxTemplates: 100,
    maxLandingPages: 50,
    maxSendingProfiles: 5,
    emailQuota: 25000,
    storageQuota: 5120,
    defaultFeatures: features,
    isActive: true,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  } as Plan;
}

function makeTenant(plan: Plan | null, overrides = {}, status = TenantStatus.ACTIVE): Tenant {
  return {
    id: 'tenant-1',
    name: 'Acme',
    slug: 'acme',
    contactEmail: 'a@acme.example',
    timezone: 'UTC',
    logoUrl: null,
    status,
    planId: plan?.id ?? null,
    plan,
    featureOverrides: overrides,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  } as Tenant;
}

describe('resolveFeature', () => {
  const plan = makePlan([TenantFeature.CAMPAIGNS, TenantFeature.ANALYTICS]);

  it('returns true when the plan grants the feature and no override exists', () => {
    expect(resolveFeature(plan, {}, TenantFeature.ANALYTICS)).toBe(true);
  });

  it('returns false when the plan lacks the feature', () => {
    expect(resolveFeature(plan, {}, TenantFeature.AI_FEATURES)).toBe(false);
  });

  it('lets a true override enable a feature the plan lacks', () => {
    expect(resolveFeature(plan, { [TenantFeature.AI_FEATURES]: true }, TenantFeature.AI_FEATURES)).toBe(
      true,
    );
  });

  it('lets a false override disable a feature the plan grants', () => {
    expect(resolveFeature(plan, { [TenantFeature.ANALYTICS]: false }, TenantFeature.ANALYTICS)).toBe(
      false,
    );
  });

  it('returns false for every feature when there is no plan', () => {
    expect(resolveFeature(null, {}, TenantFeature.CAMPAIGNS)).toBe(false);
  });
});

describe('resolveAllFeatures', () => {
  it('produces a complete map over all features', () => {
    const plan = makePlan([TenantFeature.CAMPAIGNS]);
    const map = resolveAllFeatures(plan, { [TenantFeature.API_ACCESS]: true });
    expect(map[TenantFeature.CAMPAIGNS]).toBe(true);
    expect(map[TenantFeature.API_ACCESS]).toBe(true);
    expect(map[TenantFeature.TEMPLATES]).toBe(false);
    expect(Object.keys(map).length).toBe(Object.values(TenantFeature).length);
  });
});

describe('buildEntitlements', () => {
  it('includes plan limits, effective features and the usable flag', () => {
    const plan = makePlan([TenantFeature.CAMPAIGNS]);
    const tenant = makeTenant(plan, { [TenantFeature.AI_FEATURES]: true }, TenantStatus.TRIAL);
    const ent = buildEntitlements(tenant);

    expect(ent.plan?.maxUsers).toBe(15);
    expect(ent.plan?.tier).toBe(PlanTier.PROFESSIONAL);
    expect(ent.features[TenantFeature.CAMPAIGNS]).toBe(true);
    expect(ent.features[TenantFeature.AI_FEATURES]).toBe(true);
    expect(ent.usable).toBe(true); // TRIAL is usable
  });

  it('marks a suspended tenant not-usable but keeps its plan', () => {
    const plan = makePlan([TenantFeature.CAMPAIGNS]);
    const ent = buildEntitlements(makeTenant(plan, {}, TenantStatus.SUSPENDED));
    expect(ent.usable).toBe(false);
    expect(ent.plan).not.toBeNull();
  });

  it('reports a null plan when none assigned', () => {
    const ent = buildEntitlements(makeTenant(null));
    expect(ent.plan).toBeNull();
    expect(ent.features[TenantFeature.CAMPAIGNS]).toBe(false);
  });
});
