import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { Plan } from './entities/plan.entity';
import { TenantUsage } from './entities/tenant-usage.entity';
import { TenantsService } from './services/tenants.service';
import { PlansService } from './services/plans.service';
import { TenantSubscriptionService } from './services/tenant-subscription.service';
import { UsageService } from './services/usage.service';
import { TenantContextService } from './access/tenant-context.service';
import { TenantAccessGuard } from './guards/tenant-access.guard';
import { QuotaGuard } from './guards/quota.guard';
import { TenantsController } from './controllers/tenants.controller';
import { PlansController } from './controllers/plans.controller';
import { TenantSubscriptionController } from './controllers/tenant-subscription.controller';
import { TenantUsageController } from './controllers/tenant-usage.controller';
import { PlansBootstrap } from './plans.bootstrap';
import { TenantsBootstrap } from './tenants.bootstrap';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, Plan, TenantUsage]), AuthModule],
  providers: [
    TenantsService,
    PlansService,
    TenantSubscriptionService,
    UsageService,
    TenantContextService,
    TenantAccessGuard,
    QuotaGuard,
    PlansBootstrap,
    TenantsBootstrap,
  ],
  controllers: [
    TenantsController,
    PlansController,
    TenantSubscriptionController,
    TenantUsageController,
  ],
  exports: [
    TenantsService,
    PlansService,
    TenantSubscriptionService,
    UsageService,
    TenantContextService,
    TenantAccessGuard,
    QuotaGuard,
    TypeOrmModule,
  ],
})
export class TenantsModule {}
