import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantSubscriptionService } from './tenant-subscription.service';
import { Plan } from '../entities/plan.entity';
import { Tenant } from '../entities/tenant.entity';
import { PlanTier } from '../enums/plan-tier.enum';
import { TenantFeature } from '../enums/tenant-feature.enum';
import { TenantStatus } from '../enums/tenant-status.enum';

function makePlan(over: Partial<Plan> = {}): Plan {
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
    defaultFeatures: [TenantFeature.CAMPAIGNS, TenantFeature.ANALYTICS],
    isActive: true,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...over,
  } as Plan;
}

function makeTenant(over: Partial<Tenant> = {}): Tenant {
  return {
    id: 'tenant-1',
    name: 'Acme',
    slug: 'acme',
    contactEmail: 'a@acme.example',
    timezone: 'UTC',
    logoUrl: null,
    status: TenantStatus.ACTIVE,
    planId: null,
    plan: null,
    featureOverrides: {},
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...over,
  } as Tenant;
}

describe('TenantSubscriptionService', () => {
  let tenant: Tenant;
  let plan: Plan;
  let tenantRepo: any;
  let planRepo: any;
  let service: TenantSubscriptionService;

  beforeEach(() => {
    plan = makePlan();
    tenant = makeTenant({ plan, planId: plan.id });
    tenantRepo = {
      findOne: jest.fn(async () => tenant),
      save: jest.fn(async (t: Tenant) => t),
    };
    planRepo = {
      findOne: jest.fn(async ({ where }: any) => (where.id === plan.id ? plan : null)),
    };
    service = new TenantSubscriptionService(tenantRepo, planRepo);
  });

  describe('getPlan', () => {
    it('returns the assigned plan', async () => {
      await expect(service.getPlan('tenant-1')).resolves.toBe(plan);
    });

    it('returns null when no plan is assigned', async () => {
      tenant = makeTenant({ plan: null, planId: null });
      tenantRepo.findOne.mockResolvedValue(tenant);
      await expect(service.getPlan('tenant-1')).resolves.toBeNull();
    });

    it('throws when the tenant is missing', async () => {
      tenantRepo.findOne.mockResolvedValue(null);
      await expect(service.getPlan('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('hasFeature', () => {
    it('is true for a plan-granted feature', async () => {
      await expect(service.hasFeature('tenant-1', TenantFeature.ANALYTICS)).resolves.toBe(true);
    });

    it('is false for a feature outside the plan', async () => {
      await expect(service.hasFeature('tenant-1', TenantFeature.AI_FEATURES)).resolves.toBe(false);
    });

    it('honors a per-tenant override enabling an off-plan feature', async () => {
      tenant.featureOverrides = { [TenantFeature.AI_FEATURES]: true };
      await expect(service.hasFeature('tenant-1', TenantFeature.AI_FEATURES)).resolves.toBe(true);
    });

    it('ignores lifecycle state (entitlement only)', async () => {
      tenant.status = TenantStatus.SUSPENDED;
      await expect(service.hasFeature('tenant-1', TenantFeature.ANALYTICS)).resolves.toBe(true);
    });
  });

  describe('canUseFeature', () => {
    it('is true when entitled and the tenant is ACTIVE', async () => {
      await expect(service.canUseFeature('tenant-1', TenantFeature.ANALYTICS)).resolves.toBe(true);
    });

    it('is false when entitled but the tenant is SUSPENDED', async () => {
      tenant.status = TenantStatus.SUSPENDED;
      await expect(service.canUseFeature('tenant-1', TenantFeature.ANALYTICS)).resolves.toBe(false);
    });

    it('is false when usable but not entitled', async () => {
      await expect(service.canUseFeature('tenant-1', TenantFeature.AI_FEATURES)).resolves.toBe(false);
    });
  });

  describe('assignPlan', () => {
    it('assigns an active plan and returns entitlements', async () => {
      tenant = makeTenant({ plan: null, planId: null });
      tenantRepo.findOne.mockResolvedValue(tenant);
      const ent = await service.assignPlan('tenant-1', plan.id);
      expect(tenant.planId).toBe(plan.id);
      expect(ent.plan?.id).toBe(plan.id);
      expect(tenantRepo.save).toHaveBeenCalled();
    });

    it('rejects an inactive plan', async () => {
      plan.isActive = false;
      await expect(service.assignPlan('tenant-1', plan.id)).rejects.toThrow(BadRequestException);
    });

    it('throws when the plan does not exist', async () => {
      await expect(service.assignPlan('tenant-1', 'ghost')).rejects.toThrow(NotFoundException);
    });
  });

  describe('setFeatureOverrides', () => {
    it('merges overrides and clears on null', async () => {
      tenant.featureOverrides = { [TenantFeature.API_ACCESS]: false };
      await service.setFeatureOverrides('tenant-1', {
        [TenantFeature.AI_FEATURES]: true,
        [TenantFeature.API_ACCESS]: null,
      });
      expect(tenant.featureOverrides).toEqual({ [TenantFeature.AI_FEATURES]: true });
    });

    it('rejects an unknown feature key', async () => {
      await expect(
        service.setFeatureOverrides('tenant-1', { bogus: true } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a non-boolean value', async () => {
      await expect(
        service.setFeatureOverrides('tenant-1', { [TenantFeature.ANALYTICS]: 'yes' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
