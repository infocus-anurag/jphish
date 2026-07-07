import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { TenantUsage } from '../entities/tenant-usage.entity';
import {
  ALL_USAGE_METRICS,
  UNLIMITED,
  UsageMetric,
  USAGE_METRIC_CONFIG,
} from '../enums/usage-metric.enum';

export interface QuotaCheck {
  metric: UsageMetric;
  allowed: boolean;
  used: number;
  limit: number; // -1 = unlimited
  remaining: number; // Infinity when unlimited
  requested: number;
  unlimited: boolean;
}

export interface MetricUsage {
  metric: UsageMetric;
  label: string;
  used: number;
  limit: number;
  remaining: number; // Infinity when unlimited
  unlimited: boolean;
  exceeded: boolean;
}

export interface UsageSummary {
  tenantId: string;
  plan: { id: string; name: string } | null;
  metrics: MetricUsage[];
}

@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(TenantUsage) private readonly usage: Repository<TenantUsage>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
  ) {}

  /** Load the tenant's usage row, creating a zeroed one on first access. */
  async getOrCreate(tenantId: string): Promise<TenantUsage> {
    const existing = await this.usage.findOne({ where: { tenantId } });
    if (existing) return existing;
    // Validate the tenant exists before materializing a usage row for it.
    const tenant = await this.tenants.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.usage.save(this.usage.create({ tenantId }));
  }

  /**
   * Whether the tenant can create `amount` more of a resource without exceeding
   * its plan limit. Unlimited (-1) and "no plan → no allowance" are both handled.
   */
  async canCreateResource(
    tenantId: string,
    metric: UsageMetric,
    amount = 1,
  ): Promise<QuotaCheck> {
    const usage = await this.getOrCreate(tenantId);
    const limit = await this.limitFor(tenantId, metric);
    const used = usage[USAGE_METRIC_CONFIG[metric].column];
    const unlimited = limit === UNLIMITED;
    const allowed = unlimited || used + amount <= limit;
    return {
      metric,
      allowed,
      used,
      limit,
      remaining: unlimited ? Infinity : Math.max(0, limit - used),
      requested: amount,
      unlimited,
    };
  }

  /** Throw ForbiddenException if the quota check fails; otherwise return it. */
  async assertCanCreateResource(
    tenantId: string,
    metric: UsageMetric,
    amount = 1,
  ): Promise<QuotaCheck> {
    const check = await this.canCreateResource(tenantId, metric, amount);
    if (!check.allowed) {
      throw new ForbiddenException(
        `Quota exceeded for ${USAGE_METRIC_CONFIG[metric].label}: ` +
          `${check.used}/${check.limit} used, cannot add ${amount}.`,
      );
    }
    return check;
  }

  /**
   * Increment a usage counter. With `{ enforce: true }` it first checks the quota
   * and throws when exceeded — the single choke point that prevents over-quota
   * resource creation.
   */
  async incrementUsage(
    tenantId: string,
    metric: UsageMetric,
    amount = 1,
    opts: { enforce?: boolean } = {},
  ): Promise<TenantUsage> {
    await this.getOrCreate(tenantId);
    if (opts.enforce) await this.assertCanCreateResource(tenantId, metric, amount);
    const column = USAGE_METRIC_CONFIG[metric].column;
    await this.usage.increment({ tenantId }, column, amount);
    return this.getOrCreate(tenantId);
  }

  /** Decrement a usage counter, floored at zero (e.g. when a resource is deleted). */
  async decrementUsage(
    tenantId: string,
    metric: UsageMetric,
    amount = 1,
  ): Promise<TenantUsage> {
    const usage = await this.getOrCreate(tenantId);
    const column = USAGE_METRIC_CONFIG[metric].column;
    const next = Math.max(0, usage[column] - amount);
    usage[column] = next;
    return this.usage.save(usage);
  }

  /**
   * Reset usage counters back to zero — one metric when given, otherwise all of
   * them (e.g. at the start of a new billing period, or an operator override).
   */
  async resetUsage(tenantId: string, metric?: UsageMetric): Promise<TenantUsage> {
    const usage = await this.getOrCreate(tenantId);
    if (metric) {
      usage[USAGE_METRIC_CONFIG[metric].column] = 0;
    } else {
      for (const m of ALL_USAGE_METRICS) {
        usage[USAGE_METRIC_CONFIG[m].column] = 0;
      }
    }
    return this.usage.save(usage);
  }

  /** Per-metric used/limit/remaining snapshot for the tenant. */
  async getUsageSummary(tenantId: string): Promise<UsageSummary> {
    const usage = await this.getOrCreate(tenantId);
    const tenant = await this.tenants.findOne({
      where: { id: tenantId },
      relations: { plan: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const plan = tenant.plan ?? null;

    const metrics: MetricUsage[] = ALL_USAGE_METRICS.map((metric) => {
      const cfg = USAGE_METRIC_CONFIG[metric];
      const used = usage[cfg.column];
      const limit = plan ? plan[cfg.limit] : 0;
      const unlimited = limit === UNLIMITED;
      return {
        metric,
        label: cfg.label,
        used,
        limit,
        remaining: unlimited ? Infinity : Math.max(0, limit - used),
        unlimited,
        exceeded: !unlimited && used > limit,
      };
    });

    return {
      tenantId,
      plan: plan ? { id: plan.id, name: plan.name } : null,
      metrics,
    };
  }

  /** Resolve the effective plan limit for a metric (0 when no plan is assigned). */
  private async limitFor(tenantId: string, metric: UsageMetric): Promise<number> {
    const tenant = await this.tenants.findOne({
      where: { id: tenantId },
      relations: { plan: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (!tenant.plan) return 0; // No plan → no allowance.
    return tenant.plan[USAGE_METRIC_CONFIG[metric].limit];
  }
}
