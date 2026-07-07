import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsageService } from './usage.service';
import { Plan } from '../entities/plan.entity';
import { Tenant } from '../entities/tenant.entity';
import { TenantUsage } from '../entities/tenant-usage.entity';
import { PlanTier } from '../enums/plan-tier.enum';
import { UsageMetric } from '../enums/usage-metric.enum';

class FakeUsageRepo {
  rows: TenantUsage[] = [];
  private seq = 0;

  create(partial: Partial<TenantUsage>): TenantUsage {
    return {
      users: 0,
      campaigns: 0,
      templates: 0,
      landingPages: 0,
      sendingProfiles: 0,
      emailsSent: 0,
      storageMb: 0,
      ...partial,
    } as TenantUsage;
  }

  async save(entity: TenantUsage): Promise<TenantUsage> {
    if (!entity.id) {
      entity.id = `usage-${++this.seq}`;
      this.rows.push(entity);
    } else {
      const idx = this.rows.findIndex((r) => r.id === entity.id);
      if (idx >= 0) this.rows[idx] = entity;
    }
    return entity;
  }

  async findOne({ where }: any): Promise<TenantUsage | null> {
    return this.rows.find((r) => r.tenantId === where.tenantId) ?? null;
  }

  async increment({ tenantId }: any, column: keyof TenantUsage, amount: number): Promise<void> {
    const row = this.rows.find((r) => r.tenantId === tenantId);
    if (row) (row[column] as number) += amount;
  }
}

function makePlan(over: Partial<Plan> = {}): Plan {
  return {
    id: 'plan-1',
    tier: PlanTier.STARTER,
    name: 'Starter',
    maxUsers: 3,
    maxCampaigns: 5,
    maxTemplates: 10,
    maxLandingPages: 5,
    maxSendingProfiles: 1,
    emailQuota: 1000,
    storageQuota: 512,
    defaultFeatures: [],
    isActive: true,
    ...over,
  } as Plan;
}

describe('UsageService', () => {
  let usageRepo: FakeUsageRepo;
  let tenant: Tenant;
  let tenantRepo: any;
  let service: UsageService;

  beforeEach(() => {
    usageRepo = new FakeUsageRepo();
    tenant = { id: 'tenant-1', plan: makePlan(), planId: 'plan-1' } as Tenant;
    tenantRepo = { findOne: jest.fn(async () => tenant) };
    service = new UsageService(usageRepo as any, tenantRepo);
  });

  describe('getOrCreate', () => {
    it('lazily creates a zeroed usage row', async () => {
      const u = await service.getOrCreate('tenant-1');
      expect(u.campaigns).toBe(0);
      expect(usageRepo.rows).toHaveLength(1);
    });

    it('reuses the existing row', async () => {
      await service.getOrCreate('tenant-1');
      await service.getOrCreate('tenant-1');
      expect(usageRepo.rows).toHaveLength(1);
    });

    it('throws when the tenant does not exist', async () => {
      tenantRepo.findOne.mockResolvedValue(null);
      await expect(service.getOrCreate('ghost')).rejects.toThrow(NotFoundException);
    });
  });

  describe('canCreateResource', () => {
    it('allows under the limit and reports remaining', async () => {
      const check = await service.canCreateResource('tenant-1', UsageMetric.CAMPAIGNS);
      expect(check.allowed).toBe(true);
      expect(check.limit).toBe(5);
      expect(check.remaining).toBe(5);
    });

    it('blocks when the requested amount would exceed the limit', async () => {
      const check = await service.canCreateResource('tenant-1', UsageMetric.SENDING_PROFILES, 2);
      expect(check.allowed).toBe(false); // limit 1, requesting 2
    });

    it('treats -1 as unlimited', async () => {
      tenant.plan = makePlan({ maxCampaigns: -1 });
      const check = await service.canCreateResource('tenant-1', UsageMetric.CAMPAIGNS, 999);
      expect(check.allowed).toBe(true);
      expect(check.unlimited).toBe(true);
      expect(check.remaining).toBe(Infinity);
    });

    it('denies everything when no plan is assigned', async () => {
      tenant.plan = null;
      const check = await service.canCreateResource('tenant-1', UsageMetric.CAMPAIGNS);
      expect(check.allowed).toBe(false);
      expect(check.limit).toBe(0);
    });
  });

  describe('incrementUsage', () => {
    it('increments the counter', async () => {
      await service.incrementUsage('tenant-1', UsageMetric.CAMPAIGNS, 2);
      const u = await service.getOrCreate('tenant-1');
      expect(u.campaigns).toBe(2);
    });

    it('enforces the quota when asked and throws at the ceiling', async () => {
      await service.incrementUsage('tenant-1', UsageMetric.SENDING_PROFILES, 1); // now at 1/1
      await expect(
        service.incrementUsage('tenant-1', UsageMetric.SENDING_PROFILES, 1, { enforce: true }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('does not enforce by default (usage-tracking increments can pass the cap)', async () => {
      // emailsSent is tracked, not gated at creation — increment must always succeed.
      await service.incrementUsage('tenant-1', UsageMetric.EMAILS_SENT, 5000);
      const u = await service.getOrCreate('tenant-1');
      expect(u.emailsSent).toBe(5000);
    });
  });

  describe('decrementUsage', () => {
    it('decrements and floors at zero', async () => {
      await service.incrementUsage('tenant-1', UsageMetric.CAMPAIGNS, 3);
      await service.decrementUsage('tenant-1', UsageMetric.CAMPAIGNS, 5);
      const u = await service.getOrCreate('tenant-1');
      expect(u.campaigns).toBe(0);
    });
  });

  describe('resetUsage', () => {
    it('resets a single metric to zero, leaving others intact', async () => {
      await service.incrementUsage('tenant-1', UsageMetric.CAMPAIGNS, 3);
      await service.incrementUsage('tenant-1', UsageMetric.TEMPLATES, 2);
      await service.resetUsage('tenant-1', UsageMetric.CAMPAIGNS);
      const u = await service.getOrCreate('tenant-1');
      expect(u.campaigns).toBe(0);
      expect(u.templates).toBe(2);
    });

    it('resets every counter when no metric is given', async () => {
      await service.incrementUsage('tenant-1', UsageMetric.CAMPAIGNS, 3);
      await service.incrementUsage('tenant-1', UsageMetric.EMAILS_SENT, 500);
      await service.resetUsage('tenant-1');
      const u = await service.getOrCreate('tenant-1');
      expect(u.campaigns).toBe(0);
      expect(u.emailsSent).toBe(0);
    });
  });

  describe('getUsageSummary', () => {
    it('returns a row per metric with used/limit/remaining', async () => {
      await service.incrementUsage('tenant-1', UsageMetric.CAMPAIGNS, 2);
      const summary = await service.getUsageSummary('tenant-1');
      expect(summary.plan?.name).toBe('Starter');
      expect(summary.metrics).toHaveLength(7);
      const campaigns = summary.metrics.find((m) => m.metric === UsageMetric.CAMPAIGNS)!;
      expect(campaigns.used).toBe(2);
      expect(campaigns.limit).toBe(5);
      expect(campaigns.remaining).toBe(3);
      expect(campaigns.exceeded).toBe(false);
    });

    it('flags an exceeded metric', async () => {
      await service.incrementUsage('tenant-1', UsageMetric.SENDING_PROFILES, 3); // limit 1
      const summary = await service.getUsageSummary('tenant-1');
      const sp = summary.metrics.find((m) => m.metric === UsageMetric.SENDING_PROFILES)!;
      expect(sp.exceeded).toBe(true);
    });
  });
});
