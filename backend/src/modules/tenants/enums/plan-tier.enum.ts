export enum PlanTier {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
  CUSTOM = 'custom',
}

export const PLAN_TIER_LABELS: Record<PlanTier, string> = {
  [PlanTier.STARTER]: 'Starter',
  [PlanTier.PROFESSIONAL]: 'Professional',
  [PlanTier.ENTERPRISE]: 'Enterprise',
  [PlanTier.CUSTOM]: 'Custom',
};
