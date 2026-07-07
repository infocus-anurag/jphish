export enum TenantFeature {
  CAMPAIGNS = 'campaigns',
  TEMPLATES = 'templates',
  LANDING_PAGES = 'landing_pages',
  SENDING_PROFILES = 'sending_profiles',
  ANALYTICS = 'analytics',
  AI_FEATURES = 'ai_features',
  API_ACCESS = 'api_access',
  CUSTOM_BRANDING = 'custom_branding',
}

export const TENANT_FEATURE_LABELS: Record<TenantFeature, string> = {
  [TenantFeature.CAMPAIGNS]: 'Campaigns',
  [TenantFeature.TEMPLATES]: 'Templates',
  [TenantFeature.LANDING_PAGES]: 'Landing Pages',
  [TenantFeature.SENDING_PROFILES]: 'Sending Profiles',
  [TenantFeature.ANALYTICS]: 'Analytics',
  [TenantFeature.AI_FEATURES]: 'AI Features',
  [TenantFeature.API_ACCESS]: 'API Access',
  [TenantFeature.CUSTOM_BRANDING]: 'Custom Branding',
};

export const ALL_TENANT_FEATURES: TenantFeature[] = Object.values(TenantFeature);
