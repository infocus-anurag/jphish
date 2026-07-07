import { TenantStatus } from './tenant-status.enum';

/**
 * Discrete capabilities a tenant may hold. Guards check for the capability a
 * route needs rather than switching on status directly — so the status→access
 * policy lives in exactly one place (TENANT_STATUS_CAPABILITIES below).
 */
export enum TenantCapability {
  // Members of the tenant may authenticate / hold a session at all.
  LOGIN = 'login',
  // Read existing tenant data.
  READ = 'read',
  // Create or modify resources (templates, landing pages, groups, profiles…).
  WRITE = 'write',
  // Launch/resume a campaign (a stricter action than general write).
  LAUNCH_CAMPAIGN = 'launch_campaign',
}

/**
 * The single source of truth for what each lifecycle status permits:
 *
 *   PENDING   — no login (awaiting activation).
 *   TRIAL     — full access; resource limits come from the plan/quota layer.
 *   ACTIVE    — full access.
 *   SUSPENDED — login + read only; cannot write or launch campaigns.
 *   EXPIRED   — login + read only (view existing data).
 *   DISABLED  — no access.
 *   ARCHIVED  — no access (hidden and immutable).
 */
export const TENANT_STATUS_CAPABILITIES: Record<TenantStatus, TenantCapability[]> = {
  [TenantStatus.PENDING]: [],
  [TenantStatus.TRIAL]: [
    TenantCapability.LOGIN,
    TenantCapability.READ,
    TenantCapability.WRITE,
    TenantCapability.LAUNCH_CAMPAIGN,
  ],
  [TenantStatus.ACTIVE]: [
    TenantCapability.LOGIN,
    TenantCapability.READ,
    TenantCapability.WRITE,
    TenantCapability.LAUNCH_CAMPAIGN,
  ],
  [TenantStatus.SUSPENDED]: [TenantCapability.LOGIN, TenantCapability.READ],
  [TenantStatus.EXPIRED]: [TenantCapability.LOGIN, TenantCapability.READ],
  [TenantStatus.DISABLED]: [],
  [TenantStatus.ARCHIVED]: [],
};
