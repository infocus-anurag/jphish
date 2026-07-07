import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContextService, TenantResolvable } from '../access/tenant-context.service';
import { REQUIRE_CAPABILITY_KEY } from '../decorators/tenant-access.decorators';
import { TenantCapability } from '../enums/tenant-capability.enum';
import { accessDenialReason, tenantCan } from '../access/platform-access.policy';

/**
 * Enforces the status→capability policy for routes decorated with
 * @RequireCapability(...). Routes without the decorator pass through, so this
 * guard is safe to register globally or per-controller. Centralizes what would
 * otherwise be scattered `if (tenant.status === …)` checks.
 */
@Injectable()
export class TenantAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantContext: TenantContextService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<TenantCapability[] | undefined>(
      REQUIRE_CAPABILITY_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<TenantResolvable>();
    const { tenantId, tenant } = await this.tenantContext.resolve(req);
    // Platform-level request (no tenant) — not subject to tenant gating.
    if (!tenantId) return true;
    if (!tenant) {
      throw new ForbiddenException('Tenant not found for this request');
    }

    for (const capability of required) {
      if (!tenantCan(tenant.status, capability)) {
        throw new ForbiddenException(accessDenialReason(tenant.status, capability));
      }
    }
    return true;
  }
}
