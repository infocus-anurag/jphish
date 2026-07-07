import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  ParseEnumPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantSubscriptionService } from '../services/tenant-subscription.service';
import { AssignPlanDto, SetFeatureOverridesDto } from '../dto/subscription.dto';
import { TenantFeature } from '../enums/tenant-feature.enum';
import { UserRole } from '@/modules/auth/enums/user-role.enum';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';

@ApiTags('Tenant Subscription')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'tenants/:id', version: '1' })
export class TenantSubscriptionController {
  constructor(private readonly subscription: TenantSubscriptionService) {}

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('subscription')
  @ApiOperation({ summary: 'Get the tenant entitlements (plan limits + effective features)' })
  getEntitlements(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.subscription.getEntitlements(id);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Put('plan')
  @ApiOperation({ summary: 'Assign a plan to the tenant' })
  assignPlan(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: AssignPlanDto) {
    return this.subscription.assignPlan(id, dto.planId);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Patch('features')
  @ApiOperation({ summary: 'Set per-tenant feature overrides (null clears an override)' })
  setFeatureOverrides(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SetFeatureOverridesDto,
  ) {
    return this.subscription.setFeatureOverrides(id, dto.overrides);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('features/:feature')
  @ApiOperation({ summary: 'Check a single feature: entitlement + usable-now' })
  async checkFeature(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('feature', new ParseEnumPipe(TenantFeature)) feature: TenantFeature,
  ) {
    const [hasFeature, canUseFeature] = await Promise.all([
      this.subscription.hasFeature(id, feature),
      this.subscription.canUseFeature(id, feature),
    ]);
    return { feature, hasFeature, canUseFeature };
  }
}
