import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TenantAccessGuard } from './tenant-access.guard';
import { QuotaGuard } from './quota.guard';
import { TenantStatus } from '../enums/tenant-status.enum';
import { TenantCapability } from '../enums/tenant-capability.enum';
import { UsageMetric } from '../enums/usage-metric.enum';

function ctxWith(req: any): ExecutionContext {
  return {
    getHandler: () => 'handler',
    getClass: () => 'class',
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function reflectorReturning(value: unknown) {
  return { getAllAndOverride: jest.fn().mockReturnValue(value) } as any;
}

describe('TenantAccessGuard', () => {
  // resolve() returns { tenantId, tenant }: tenantId=null → platform request.
  const tenantContext = (tenant: any, tenantId: string | null = 't') =>
    ({ resolve: jest.fn(async () => ({ tenantId, tenant })) }) as any;

  it('passes through routes with no capability metadata', async () => {
    const guard = new TenantAccessGuard(reflectorReturning(undefined), tenantContext(null));
    await expect(guard.canActivate(ctxWith({}))).resolves.toBe(true);
  });

  it('allows when the tenant holds the required capability', async () => {
    const guard = new TenantAccessGuard(
      reflectorReturning([TenantCapability.LAUNCH_CAMPAIGN]),
      tenantContext({ status: TenantStatus.ACTIVE }),
    );
    await expect(guard.canActivate(ctxWith({}))).resolves.toBe(true);
  });

  it('denies a suspended tenant from launching a campaign', async () => {
    const guard = new TenantAccessGuard(
      reflectorReturning([TenantCapability.LAUNCH_CAMPAIGN]),
      tenantContext({ status: TenantStatus.SUSPENDED }),
    );
    await expect(guard.canActivate(ctxWith({}))).rejects.toThrow(ForbiddenException);
  });

  it('denies a write on an expired tenant', async () => {
    const guard = new TenantAccessGuard(
      reflectorReturning([TenantCapability.WRITE]),
      tenantContext({ status: TenantStatus.EXPIRED }),
    );
    await expect(guard.canActivate(ctxWith({}))).rejects.toThrow(/expired/);
  });

  it('allows platform-level requests (no tenant) through', async () => {
    const guard = new TenantAccessGuard(
      reflectorReturning([TenantCapability.WRITE]),
      tenantContext(null, null),
    );
    await expect(guard.canActivate(ctxWith({}))).resolves.toBe(true);
  });

  it('rejects a dangling tenant reference (id set, tenant missing)', async () => {
    const guard = new TenantAccessGuard(
      reflectorReturning([TenantCapability.READ]),
      tenantContext(null, 'ghost'),
    );
    await expect(guard.canActivate(ctxWith({}))).rejects.toThrow(/not found/);
  });
});

describe('QuotaGuard', () => {
  const tenantContext = (tenant: any, tenantId: string | null = 'tenant-1') =>
    ({ resolve: jest.fn(async () => ({ tenantId, tenant })) }) as any;

  it('passes through when no quota metadata', async () => {
    const usage = { assertCanCreateResource: jest.fn() } as any;
    const guard = new QuotaGuard(reflectorReturning(undefined), tenantContext(null), usage);
    await expect(guard.canActivate(ctxWith({}))).resolves.toBe(true);
    expect(usage.assertCanCreateResource).not.toHaveBeenCalled();
  });

  it('allows when under quota', async () => {
    const usage = { assertCanCreateResource: jest.fn(async () => ({ allowed: true })) } as any;
    const guard = new QuotaGuard(
      reflectorReturning(UsageMetric.CAMPAIGNS),
      tenantContext({ id: 'tenant-1' }),
      usage,
    );
    await expect(guard.canActivate(ctxWith({}))).resolves.toBe(true);
    expect(usage.assertCanCreateResource).toHaveBeenCalledWith('tenant-1', UsageMetric.CAMPAIGNS);
  });

  it('blocks when the quota check throws', async () => {
    const usage = {
      assertCanCreateResource: jest.fn(async () => {
        throw new ForbiddenException('Quota exceeded');
      }),
    } as any;
    const guard = new QuotaGuard(
      reflectorReturning(UsageMetric.CAMPAIGNS),
      tenantContext({ id: 'tenant-1' }),
      usage,
    );
    await expect(guard.canActivate(ctxWith({}))).rejects.toThrow(/Quota exceeded/);
  });

  it('passes through platform-level requests (no tenant, no quota)', async () => {
    const usage = { assertCanCreateResource: jest.fn() } as any;
    const guard = new QuotaGuard(
      reflectorReturning(UsageMetric.CAMPAIGNS),
      tenantContext(null, null),
      usage,
    );
    await expect(guard.canActivate(ctxWith({}))).resolves.toBe(true);
    expect(usage.assertCanCreateResource).not.toHaveBeenCalled();
  });
});
