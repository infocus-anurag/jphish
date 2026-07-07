import { TenantStatus } from '../enums/tenant-status.enum';
import {
  TenantCapability,
  TENANT_STATUS_CAPABILITIES,
} from '../enums/tenant-capability.enum';

/**
 * Pure, dependency-free access policy. Everything that needs to know "can a
 * tenant in status X do Y" routes through here so the rules are never duplicated
 * as inline conditionals. Guards and services consume these functions.
 */

export function capabilitiesFor(status: TenantStatus): TenantCapability[] {
  return TENANT_STATUS_CAPABILITIES[status] ?? [];
}

export function tenantCan(status: TenantStatus, capability: TenantCapability): boolean {
  return capabilitiesFor(status).includes(capability);
}

export function canLogin(status: TenantStatus): boolean {
  return tenantCan(status, TenantCapability.LOGIN);
}

/**
 * Human-readable reason a capability is denied, tailored to the status so the
 * API can tell the caller *why* (suspended vs expired vs disabled…).
 */
export function accessDenialReason(
  status: TenantStatus,
  capability: TenantCapability,
): string {
  switch (status) {
    case TenantStatus.PENDING:
      return 'Tenant is pending activation.';
    case TenantStatus.SUSPENDED:
      return capability === TenantCapability.LAUNCH_CAMPAIGN
        ? 'Tenant is suspended — campaigns cannot be launched.'
        : 'Tenant is suspended — access is read-only.';
    case TenantStatus.EXPIRED:
      return 'Tenant subscription has expired — existing data is read-only.';
    case TenantStatus.DISABLED:
      return 'Tenant is disabled.';
    case TenantStatus.ARCHIVED:
      return 'Tenant is archived.';
    default:
      return `Action not permitted for tenants in status '${status}'.`;
  }
}
