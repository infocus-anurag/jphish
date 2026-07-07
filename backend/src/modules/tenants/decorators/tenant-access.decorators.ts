import { SetMetadata } from '@nestjs/common';
import { TenantCapability } from '../enums/tenant-capability.enum';
import { UsageMetric } from '../enums/usage-metric.enum';

export const REQUIRE_CAPABILITY_KEY = 'tenant_capability';
/**
 * Require the acting tenant to hold every listed capability (per its lifecycle
 * status). Enforced by TenantAccessGuard. Example:
 *   @RequireCapability(TenantCapability.LAUNCH_CAMPAIGN)
 */
export const RequireCapability = (
  ...capabilities: TenantCapability[]
): MethodDecorator & ClassDecorator => SetMetadata(REQUIRE_CAPABILITY_KEY, capabilities);

export const ENFORCE_QUOTA_KEY = 'enforce_quota';
/**
 * Block the route when the acting tenant is at/over its plan limit for `metric`.
 * Enforced by QuotaGuard (pre-check only — the create path still calls
 * UsageService.incrementUsage to record the new resource). Example:
 *   @EnforceQuota(UsageMetric.CAMPAIGNS)
 */
export const EnforceQuota = (metric: UsageMetric): MethodDecorator & ClassDecorator =>
  SetMetadata(ENFORCE_QUOTA_KEY, metric);
