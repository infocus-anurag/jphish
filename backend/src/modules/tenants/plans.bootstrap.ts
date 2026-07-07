import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './entities/plan.entity';
import { PlanTier } from './enums/plan-tier.enum';
import { TenantFeature } from './enums/tenant-feature.enum';

const UNLIMITED = -1;

// Seed definitions for the three built-in tiers. CUSTOM is intentionally not
// seeded — operators create CUSTOM plans on demand.
const DEFAULT_PLANS: Array<Partial<Plan> & { tier: PlanTier }> = [
  {
    tier: PlanTier.STARTER,
    name: 'Starter',
    description: 'Entry tier for small teams getting started with awareness training.',
    maxUsers: 3,
    maxCampaigns: 5,
    maxTemplates: 10,
    maxLandingPages: 5,
    maxSendingProfiles: 1,
    emailQuota: 1_000,
    storageQuota: 512,
    defaultFeatures: [
      TenantFeature.CAMPAIGNS,
      TenantFeature.TEMPLATES,
      TenantFeature.LANDING_PAGES,
      TenantFeature.SENDING_PROFILES,
    ],
  },
  {
    tier: PlanTier.PROFESSIONAL,
    name: 'Professional',
    description: 'Growing programs that need analytics and API access.',
    maxUsers: 15,
    maxCampaigns: 50,
    maxTemplates: 100,
    maxLandingPages: 50,
    maxSendingProfiles: 5,
    emailQuota: 25_000,
    storageQuota: 5_120,
    defaultFeatures: [
      TenantFeature.CAMPAIGNS,
      TenantFeature.TEMPLATES,
      TenantFeature.LANDING_PAGES,
      TenantFeature.SENDING_PROFILES,
      TenantFeature.ANALYTICS,
      TenantFeature.API_ACCESS,
    ],
  },
  {
    tier: PlanTier.ENTERPRISE,
    name: 'Enterprise',
    description: 'Unlimited scale with every feature, including AI and custom branding.',
    maxUsers: UNLIMITED,
    maxCampaigns: UNLIMITED,
    maxTemplates: UNLIMITED,
    maxLandingPages: UNLIMITED,
    maxSendingProfiles: UNLIMITED,
    emailQuota: UNLIMITED,
    storageQuota: UNLIMITED,
    defaultFeatures: [
      TenantFeature.CAMPAIGNS,
      TenantFeature.TEMPLATES,
      TenantFeature.LANDING_PAGES,
      TenantFeature.SENDING_PROFILES,
      TenantFeature.ANALYTICS,
      TenantFeature.AI_FEATURES,
      TenantFeature.API_ACCESS,
      TenantFeature.CUSTOM_BRANDING,
    ],
  },
];

/**
 * On startup, ensure the three built-in plan tiers exist. Idempotent: only the
 * missing tiers are inserted, so operator edits to existing plans are preserved.
 */
@Injectable()
export class PlansBootstrap implements OnModuleInit {
  private readonly logger = new Logger(PlansBootstrap.name);

  constructor(@InjectRepository(Plan) private readonly plans: Repository<Plan>) {}

  async onModuleInit(): Promise<void> {
    for (const seed of DEFAULT_PLANS) {
      const exists = await this.plans.findOne({ where: { tier: seed.tier } });
      if (exists) continue;
      await this.plans.save(this.plans.create(seed));
      this.logger.log(`Seeded default plan: ${seed.name}`);
    }
  }
}
