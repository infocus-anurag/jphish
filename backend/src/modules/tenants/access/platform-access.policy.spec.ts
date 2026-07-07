import {
  accessDenialReason,
  canLogin,
  capabilitiesFor,
  tenantCan,
} from './platform-access.policy';
import { TenantStatus } from '../enums/tenant-status.enum';
import { TenantCapability } from '../enums/tenant-capability.enum';

describe('platform-access.policy', () => {
  describe('login gating', () => {
    it('blocks login for PENDING, DISABLED and ARCHIVED', () => {
      expect(canLogin(TenantStatus.PENDING)).toBe(false);
      expect(canLogin(TenantStatus.DISABLED)).toBe(false);
      expect(canLogin(TenantStatus.ARCHIVED)).toBe(false);
    });

    it('allows login for TRIAL, ACTIVE, SUSPENDED and EXPIRED', () => {
      expect(canLogin(TenantStatus.TRIAL)).toBe(true);
      expect(canLogin(TenantStatus.ACTIVE)).toBe(true);
      expect(canLogin(TenantStatus.SUSPENDED)).toBe(true);
      expect(canLogin(TenantStatus.EXPIRED)).toBe(true);
    });
  });

  describe('write / launch gating', () => {
    it('ACTIVE and TRIAL can write and launch campaigns', () => {
      for (const status of [TenantStatus.ACTIVE, TenantStatus.TRIAL]) {
        expect(tenantCan(status, TenantCapability.WRITE)).toBe(true);
        expect(tenantCan(status, TenantCapability.LAUNCH_CAMPAIGN)).toBe(true);
      }
    });

    it('SUSPENDED is read-only and cannot launch campaigns', () => {
      expect(tenantCan(TenantStatus.SUSPENDED, TenantCapability.READ)).toBe(true);
      expect(tenantCan(TenantStatus.SUSPENDED, TenantCapability.WRITE)).toBe(false);
      expect(tenantCan(TenantStatus.SUSPENDED, TenantCapability.LAUNCH_CAMPAIGN)).toBe(false);
    });

    it('EXPIRED can view but not write', () => {
      expect(tenantCan(TenantStatus.EXPIRED, TenantCapability.READ)).toBe(true);
      expect(tenantCan(TenantStatus.EXPIRED, TenantCapability.WRITE)).toBe(false);
    });

    it('DISABLED and ARCHIVED grant nothing', () => {
      expect(capabilitiesFor(TenantStatus.DISABLED)).toEqual([]);
      expect(capabilitiesFor(TenantStatus.ARCHIVED)).toEqual([]);
    });
  });

  describe('accessDenialReason', () => {
    it('distinguishes suspended launch vs read', () => {
      expect(accessDenialReason(TenantStatus.SUSPENDED, TenantCapability.LAUNCH_CAMPAIGN)).toMatch(
        /cannot be launched/,
      );
      expect(accessDenialReason(TenantStatus.SUSPENDED, TenantCapability.WRITE)).toMatch(
        /read-only/,
      );
    });

    it('has a distinct message per terminal-ish status', () => {
      expect(accessDenialReason(TenantStatus.EXPIRED, TenantCapability.WRITE)).toMatch(/expired/);
      expect(accessDenialReason(TenantStatus.DISABLED, TenantCapability.READ)).toMatch(/disabled/);
      expect(accessDenialReason(TenantStatus.ARCHIVED, TenantCapability.READ)).toMatch(/archived/);
      expect(accessDenialReason(TenantStatus.PENDING, TenantCapability.LOGIN)).toMatch(/pending/);
    });
  });
});
