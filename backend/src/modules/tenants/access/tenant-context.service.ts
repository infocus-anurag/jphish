import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';

// The subset of the request the resolver reads. `user.tenantId` is the normal
// path once users are tenant-scoped; header/param are fallbacks for service or
// admin-acting-as-tenant calls.
export interface TenantResolvable {
  user?: { tenantId?: string | null } | null;
  headers?: Record<string, string | string[] | undefined>;
  params?: Record<string, string | undefined>;
  // Cache slot so guards/interceptors on the same request share one DB load.
  __tenant?: Tenant | null;
}

/**
 * Resolves the acting tenant for a request and caches it on the request object.
 * Guards depend on this rather than each re-deriving the tenant, so tenant
 * resolution lives in one place.
 */
@Injectable()
export class TenantContextService {
  constructor(@InjectRepository(Tenant) private readonly tenants: Repository<Tenant>) {}

  resolveTenantId(req: TenantResolvable): string | null {
    const fromUser = req.user?.tenantId ?? null;
    const header = req.headers?.['x-tenant-id'];
    const fromHeader = Array.isArray(header) ? header[0] : header;
    const fromParam = req.params?.tenantId;
    return fromUser || fromHeader || fromParam || null;
  }

  async loadTenant(req: TenantResolvable): Promise<Tenant | null> {
    if (req.__tenant !== undefined) return req.__tenant;
    const id = this.resolveTenantId(req);
    const tenant = id
      ? await this.tenants.findOne({ where: { id }, relations: { plan: true } })
      : null;
    req.__tenant = tenant;
    return tenant;
  }

  /**
   * Resolve the request's tenant context. `tenantId === null` means a
   * platform-level request (e.g. the super-admin) which is exempt from tenant
   * gating; a non-null `tenantId` with `tenant === null` is a dangling reference
   * that guards should reject.
   */
  async resolve(
    req: TenantResolvable,
  ): Promise<{ tenantId: string | null; tenant: Tenant | null }> {
    const tenantId = this.resolveTenantId(req);
    if (!tenantId) return { tenantId: null, tenant: null };
    const tenant = await this.loadTenant(req);
    return { tenantId, tenant };
  }
}
