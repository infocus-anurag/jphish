import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ParseEnumPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsageService } from '../services/usage.service';
import { UsageMetric } from '../enums/usage-metric.enum';
import { ResetUsageDto } from '../dto/usage.dto';
import { UserRole } from '@/modules/auth/enums/user-role.enum';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';

@ApiTags('Tenant Usage')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'tenants/:id', version: '1' })
export class TenantUsageController {
  constructor(private readonly usage: UsageService) {}

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('usage')
  @ApiOperation({ summary: 'Per-metric usage vs plan limits for the tenant' })
  getUsage(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usage.getUsageSummary(id);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('usage/:metric/can-create')
  @ApiOperation({ summary: 'Check whether the tenant can create more of a resource' })
  canCreate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('metric', new ParseEnumPipe(UsageMetric)) metric: UsageMetric,
    @Query('amount') amount = '1',
  ) {
    return this.usage.canCreateResource(id, metric, parseInt(amount, 10));
  }

  // Resetting quotas is an operator override → super-admin only.
  @Roles(UserRole.SUPER_ADMIN)
  @Post('usage/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset usage counters (one metric, or all when metric omitted)' })
  reset(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: ResetUsageDto) {
    return this.usage.resetUsage(id, dto.metric);
  }
}
