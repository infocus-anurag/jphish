import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContextService, TenantResolvable } from '../access/tenant-context.service';
import { ENFORCE_QUOTA_KEY } from '../decorators/tenant-access.decorators';
import { UsageMetric } from '../enums/usage-metric.enum';
import { UsageService } from '../services/usage.service';

/**
 * Blocks a create route when the acting tenant is at/over its plan limit for the
 * metric named by @EnforceQuota(...). Pre-check only: the controller/service is
 * still responsible for calling UsageService.incrementUsage after a successful
 * create (and decrementUsage on delete).
 */
@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantContext: TenantContextService,
    private readonly usage: UsageService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const metric = this.reflector.getAllAndOverride<UsageMetric | undefined>(ENFORCE_QUOTA_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!metric) return true;

    const req = ctx.switchToHttp().getRequest<TenantResolvable>();
    const { tenantId, tenant } = await this.tenantContext.resolve(req);
    // Platform-level request (no tenant) — no per-tenant quota applies.
    if (!tenantId) return true;
    if (!tenant) {
      throw new ForbiddenException('Tenant not found for this request');
    }

    await this.usage.assertCanCreateResource(tenant.id, metric);
    return true;
  }
}
