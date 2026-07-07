import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { Plan } from './entities/plan.entity';
import { TenantStatus } from './enums/tenant-status.enum';
import { PlanTier } from './enums/plan-tier.enum';

/**
 * Ensure a default organization exists so a fresh install is immediately usable
 * (the bootstrap super-admin can assign new users to it). Idempotent: does
 * nothing once any tenant exists. Runs after PlansBootstrap has seeded plans;
 * falls back to no plan if the Enterprise plan isn't present yet.
 */
@Injectable()
export class TenantsBootstrap implements OnModuleInit {
  private readonly logger = new Logger(TenantsBootstrap.name);

  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(Plan) private readonly plans: Repository<Plan>,
  ) {}

  async onModuleInit(): Promise<void> {
    if ((await this.tenants.count()) > 0) return;

    const enterprise = await this.plans.findOne({ where: { tier: PlanTier.ENTERPRISE } });
    await this.tenants.save(
      this.tenants.create({
        name: 'Default Organization',
        slug: 'default',
        contactEmail: 'admin@localhost',
        timezone: 'UTC',
        status: TenantStatus.ACTIVE,
        planId: enterprise?.id ?? null,
        featureOverrides: {},
      }),
    );
    this.logger.log('Seeded default tenant (slug: default, status: active).');
  }
}
