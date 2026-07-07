import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { Plan } from '../entities/plan.entity';
import { ALL_TENANT_FEATURES, TenantFeature } from '../enums/tenant-feature.enum';
import { isUsableStatus } from '../enums/tenant-status.enum';
import {
  buildEntitlements,
  resolveFeature,
  TenantEntitlements,
} from './entitlements';

/**
 * Subscription side of the Tenant service: assigns plans, manages per-tenant
 * feature overrides, and answers entitlement questions via the helper methods
 * getPlan() / hasFeature() / canUseFeature().
 */
@Injectable()
export class TenantSubscriptionService {
  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(Plan) private readonly plans: Repository<Plan>,
  ) {}

  /** Load a tenant with its plan relation, or throw if it doesn't exist. */
  private async loadTenant(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenants.findOne({
      where: { id: tenantId },
      relations: { plan: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  /** Subscribe a tenant to a plan. */
  async assignPlan(tenantId: string, planId: string): Promise<TenantEntitlements> {
    const tenant = await this.loadTenant(tenantId);
    const plan = await this.plans.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');
    if (!plan.isActive) throw new BadRequestException('Cannot assign an inactive plan');

    tenant.planId = plan.id;
    tenant.plan = plan;
    await this.tenants.save(tenant);
    return buildEntitlements(tenant);
  }

  /** Merge per-tenant feature overrides. Passing `null` for a key clears it. */
  async setFeatureOverrides(
    tenantId: string,
    overrides: Partial<Record<TenantFeature, boolean | null>>,
  ): Promise<TenantEntitlements> {
    const tenant = await this.loadTenant(tenantId);
    const merged: Partial<Record<TenantFeature, boolean>> = { ...tenant.featureOverrides };
    for (const [key, value] of Object.entries(overrides)) {
      if (!ALL_TENANT_FEATURES.includes(key as TenantFeature)) {
        throw new BadRequestException(`Unknown feature '${key}'`);
      }
      if (value !== null && typeof value !== 'boolean') {
        throw new BadRequestException(`Override for '${key}' must be a boolean or null`);
      }
      const feature = key as TenantFeature;
      if (value === null) {
        delete merged[feature];
      } else {
        merged[feature] = value;
      }
    }
    tenant.featureOverrides = merged;
    await this.tenants.save(tenant);
    return buildEntitlements(tenant);
  }

  // ---- Helper methods (the public entitlement API) ------------------------

  /** The tenant's currently subscribed plan, or null if none is assigned. */
  async getPlan(tenantId: string): Promise<Plan | null> {
    const tenant = await this.loadTenant(tenantId);
    return tenant.plan ?? null;
  }

  /**
   * Whether the tenant is *entitled* to a feature (plan default + per-tenant
   * override), regardless of the tenant's lifecycle state.
   */
  async hasFeature(tenantId: string, feature: TenantFeature): Promise<boolean> {
    const tenant = await this.loadTenant(tenantId);
    return resolveFeature(tenant.plan ?? null, tenant.featureOverrides, feature);
  }

  /**
   * Whether the tenant may actually use a feature right now: entitled AND in a
   * usable lifecycle state (ACTIVE/TRIAL). A SUSPENDED/EXPIRED tenant keeps its
   * entitlements but cannot use them.
   */
  async canUseFeature(tenantId: string, feature: TenantFeature): Promise<boolean> {
    const tenant = await this.loadTenant(tenantId);
    if (!isUsableStatus(tenant.status)) return false;
    return resolveFeature(tenant.plan ?? null, tenant.featureOverrides, feature);
  }

  /** Full entitlement snapshot: plan limits + effective feature map + usable flag. */
  async getEntitlements(tenantId: string): Promise<TenantEntitlements> {
    const tenant = await this.loadTenant(tenantId);
    return buildEntitlements(tenant);
  }
}
