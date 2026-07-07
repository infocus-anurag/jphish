import { Plan } from '../entities/plan.entity';
import { TenantUsage } from '../entities/tenant-usage.entity';

/**
 * A metered resource. Each metric maps to a counter column on TenantUsage and to
 * the corresponding limit field on Plan (where -1 = unlimited).
 *
 * Storage is measured in **megabytes** so it compares directly against
 * `Plan.storageQuota` (also MB); all other metrics are plain counts.
 */
export enum UsageMetric {
  USERS = 'users',
  CAMPAIGNS = 'campaigns',
  TEMPLATES = 'templates',
  LANDING_PAGES = 'landing_pages',
  SENDING_PROFILES = 'sending_profiles',
  EMAILS_SENT = 'emails_sent',
  STORAGE = 'storage',
}

interface UsageMetricConfig {
  // Counter column on TenantUsage.
  readonly column: keyof Pick<
    TenantUsage,
    | 'users'
    | 'campaigns'
    | 'templates'
    | 'landingPages'
    | 'sendingProfiles'
    | 'emailsSent'
    | 'storageMb'
  >;
  // Limit field on Plan.
  readonly limit: keyof Pick<
    Plan,
    | 'maxUsers'
    | 'maxCampaigns'
    | 'maxTemplates'
    | 'maxLandingPages'
    | 'maxSendingProfiles'
    | 'emailQuota'
    | 'storageQuota'
  >;
  readonly label: string;
}

export const USAGE_METRIC_CONFIG: Record<UsageMetric, UsageMetricConfig> = {
  [UsageMetric.USERS]: { column: 'users', limit: 'maxUsers', label: 'Users' },
  [UsageMetric.CAMPAIGNS]: { column: 'campaigns', limit: 'maxCampaigns', label: 'Campaigns' },
  [UsageMetric.TEMPLATES]: { column: 'templates', limit: 'maxTemplates', label: 'Templates' },
  [UsageMetric.LANDING_PAGES]: {
    column: 'landingPages',
    limit: 'maxLandingPages',
    label: 'Landing Pages',
  },
  [UsageMetric.SENDING_PROFILES]: {
    column: 'sendingProfiles',
    limit: 'maxSendingProfiles',
    label: 'Sending Profiles',
  },
  [UsageMetric.EMAILS_SENT]: { column: 'emailsSent', limit: 'emailQuota', label: 'Emails Sent' },
  [UsageMetric.STORAGE]: { column: 'storageMb', limit: 'storageQuota', label: 'Storage (MB)' },
};

export const ALL_USAGE_METRICS: UsageMetric[] = Object.values(UsageMetric);

// Sentinel used by Plan limit fields to mean "no cap".
export const UNLIMITED = -1;
