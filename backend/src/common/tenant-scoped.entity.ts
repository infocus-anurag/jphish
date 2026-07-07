import { Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';

/**
 * Base class for every tenant-scoped resource. Extend this instead of BaseEntity
 * so the row carries a `tenantId` FK back to the owning Tenant — the central
 * authority for multi-tenancy. Deleting a tenant cascades to its resources.
 *
 * New feature entities should extend TenantScopedEntity and always filter queries
 * by `tenantId` so data never leaks across tenants.
 */
export abstract class TenantScopedEntity extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}
