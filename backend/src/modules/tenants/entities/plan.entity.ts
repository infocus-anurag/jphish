import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/common/base.entity';
import { PlanTier } from '../enums/plan-tier.enum';
import { TenantFeature } from '../enums/tenant-feature.enum';

/**
 * Plan — a subscription catalog entry. Defines the resource limits and the
 * default feature set for tenants assigned to it. Numeric limits use `-1` to
 * mean "unlimited". Per-tenant feature overrides live on the Tenant, not here.
 *
 * The four built-in tiers (STARTER/PROFESSIONAL/ENTERPRISE/CUSTOM) are seeded on
 * startup by PlansBootstrap; CUSTOM is an operator-editable template.
 */
@Entity('plans')
@Index(['tier'])
export class Plan extends BaseEntity {
  @Column({ type: 'enum', enum: PlanTier })
  tier: PlanTier;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Resource limits. -1 = unlimited.
  @Column({ type: 'int', default: 0 })
  maxUsers: number;

  @Column({ type: 'int', default: 0 })
  maxCampaigns: number;

  @Column({ type: 'int', default: 0 })
  maxTemplates: number;

  @Column({ type: 'int', default: 0 })
  maxLandingPages: number;

  @Column({ type: 'int', default: 0 })
  maxSendingProfiles: number;

  // Emails allowed per billing period. -1 = unlimited.
  @Column({ type: 'int', default: 0 })
  emailQuota: number;

  // Storage allowance in megabytes. -1 = unlimited.
  @Column({ type: 'int', default: 0 })
  storageQuota: number;

  // Features granted by default to tenants on this plan (before per-tenant overrides).
  @Column({ type: 'jsonb', default: () => "'[]'" })
  defaultFeatures: TenantFeature[];

  // Whether operators can pick this plan for a tenant (CUSTOM stays selectable
  // but is meant to be cloned/edited per tenant needs).
  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
