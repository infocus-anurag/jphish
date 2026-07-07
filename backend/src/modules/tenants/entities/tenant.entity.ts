import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/base.entity';
import { TenantStatus } from '../enums/tenant-status.enum';
import { TenantFeature } from '../enums/tenant-feature.enum';
import { Plan } from './plan.entity';

/**
 * Tenant — the central authority for multi-tenancy. Every tenant-scoped resource
 * carries a `tenantId` FK back to this row, so the tenant is the top of the
 * ownership tree. `id` (uuid, from BaseEntity) is that FK target.
 */
@Entity('tenants')
@Index(['slug'], { unique: true })
@Index(['status'])
export class Tenant extends BaseEntity {
  // Human-readable organization name.
  @Column({ type: 'varchar', length: 255 })
  name: string;

  // URL-safe unique identifier used to reference the tenant in paths/subdomains.
  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  // Primary contact / owner email for the organization.
  @Column({ type: 'varchar', length: 254 })
  contactEmail: string;

  // IANA timezone (e.g. 'America/New_York'); drives scheduling/report display.
  @Column({ type: 'varchar', length: 64, default: 'UTC' })
  timezone: string;

  // Optional organization logo URL.
  @Column({ type: 'text', nullable: true })
  logoUrl: string | null;

  @Column({ type: 'enum', enum: TenantStatus, default: TenantStatus.PENDING })
  status: TenantStatus;

  // Subscribed plan (nullable until a plan is assigned). Drives resource limits
  // and the default feature set. onDelete SET NULL so removing a plan doesn't
  // delete tenants — the subscription just falls back to "no plan".
  @Column({ type: 'uuid', nullable: true })
  planId: string | null;

  @ManyToOne(() => Plan, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'planId' })
  plan: Plan | null;

  // Per-tenant feature overrides layered on top of the plan's defaults:
  // `true` force-enables, `false` force-disables, absent = inherit from plan.
  @Column({ type: 'jsonb', default: () => "'{}'" })
  featureOverrides: Partial<Record<TenantFeature, boolean>>;
}
