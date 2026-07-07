export enum TenantStatus {
  // Organization record created but not yet activated (e.g. awaiting verification).
  PENDING = 'pending',
  // Time-limited evaluation access.
  TRIAL = 'trial',
  // Fully activated, in good standing.
  ACTIVE = 'active',
  // Temporarily blocked (e.g. abuse, payment hold) — reversible.
  SUSPENDED = 'suspended',
  // Trial/subscription window elapsed — reversible by reactivation.
  EXPIRED = 'expired',
  // Turned off by an operator — reversible.
  DISABLED = 'disabled',
  // Retired and read-only; terminal state.
  ARCHIVED = 'archived',
}

export const TENANT_STATUS_LABELS: Record<TenantStatus, string> = {
  [TenantStatus.PENDING]: 'Pending',
  [TenantStatus.TRIAL]: 'Trial',
  [TenantStatus.ACTIVE]: 'Active',
  [TenantStatus.SUSPENDED]: 'Suspended',
  [TenantStatus.EXPIRED]: 'Expired',
  [TenantStatus.DISABLED]: 'Disabled',
  [TenantStatus.ARCHIVED]: 'Archived',
};

// Statuses in which a tenant may actively use the product. Other states
// (PENDING/SUSPENDED/EXPIRED/DISABLED/ARCHIVED) still hold entitlements but are
// gated from using them — see TenantSubscriptionService.canUseFeature().
export const USABLE_TENANT_STATUSES: TenantStatus[] = [TenantStatus.ACTIVE, TenantStatus.TRIAL];

export function isUsableStatus(status: TenantStatus): boolean {
  return USABLE_TENANT_STATUSES.includes(status);
}

// Allowed lifecycle transitions. A tenant may always stay in its current state
// (no-op updates are ignored before this map is consulted). ARCHIVED is terminal.
export const TENANT_STATUS_TRANSITIONS: Record<TenantStatus, TenantStatus[]> = {
  [TenantStatus.PENDING]: [
    TenantStatus.TRIAL,
    TenantStatus.ACTIVE,
    TenantStatus.DISABLED,
    TenantStatus.ARCHIVED,
  ],
  [TenantStatus.TRIAL]: [
    TenantStatus.ACTIVE,
    TenantStatus.EXPIRED,
    TenantStatus.SUSPENDED,
    TenantStatus.DISABLED,
    TenantStatus.ARCHIVED,
  ],
  [TenantStatus.ACTIVE]: [
    TenantStatus.SUSPENDED,
    TenantStatus.EXPIRED,
    TenantStatus.DISABLED,
    TenantStatus.ARCHIVED,
  ],
  [TenantStatus.SUSPENDED]: [
    TenantStatus.ACTIVE,
    TenantStatus.EXPIRED,
    TenantStatus.DISABLED,
    TenantStatus.ARCHIVED,
  ],
  [TenantStatus.EXPIRED]: [
    TenantStatus.ACTIVE,
    TenantStatus.TRIAL,
    TenantStatus.DISABLED,
    TenantStatus.ARCHIVED,
  ],
  [TenantStatus.DISABLED]: [
    TenantStatus.ACTIVE,
    TenantStatus.ARCHIVED,
  ],
  [TenantStatus.ARCHIVED]: [],
};
