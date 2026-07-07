import { Entity, Column, Index, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/base.entity';
import { Tenant } from './tenant.entity';

/**
 * Live usage counters for a tenant — one row per tenant. Each column mirrors a
 * UsageMetric and is compared against the tenant plan's matching limit. Rows are
 * lazily created by UsageService on first access.
 */
@Entity('tenant_usage')
@Index(['tenantId'], { unique: true })
export class TenantUsage extends BaseEntity {
  @Column({ type: 'uuid' })
  tenantId: string;

  @OneToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ type: 'int', default: 0 })
  users: number;

  @Column({ type: 'int', default: 0 })
  campaigns: number;

  @Column({ type: 'int', default: 0 })
  templates: number;

  @Column({ type: 'int', default: 0 })
  landingPages: number;

  @Column({ type: 'int', default: 0 })
  sendingProfiles: number;

  // Cumulative emails sent this billing period (compared to Plan.emailQuota).
  @Column({ type: 'int', default: 0 })
  emailsSent: number;

  // Stored megabytes (compared to Plan.storageQuota, also MB).
  @Column({ type: 'int', default: 0 })
  storageMb: number;
}
