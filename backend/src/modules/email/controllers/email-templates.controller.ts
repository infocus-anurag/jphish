import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { AuditContext } from '@/modules/auth/services/audit.service';
import { TenantAccessGuard } from '@/modules/tenants/guards/tenant-access.guard';
import { QuotaGuard } from '@/modules/tenants/guards/quota.guard';
import {
  RequireCapability,
  EnforceQuota,
} from '@/modules/tenants/decorators/tenant-access.decorators';
import { TenantCapability } from '@/modules/tenants/enums/tenant-capability.enum';
import { UsageMetric } from '@/modules/tenants/enums/usage-metric.enum';

import { EmailTemplateService } from '../services/email-template.service';
import { CreateEmailTemplateDto, UpdateEmailTemplateDto, TestEmailTemplateDto } from '../dto';

@Controller('email-templates')
@UseGuards(JwtAuthGuard, TenantAccessGuard, QuotaGuard)
export class EmailTemplatesController {
  constructor(private emailTemplateService: EmailTemplateService) {}

  @RequireCapability(TenantCapability.WRITE)
  @EnforceQuota(UsageMetric.TEMPLATES)
  @Post()
  async create(
    @Body() dto: CreateEmailTemplateDto,
    @Request() req: any,
  ) {
    const ctx: AuditContext = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };
    return this.emailTemplateService.create(dto, req.user, ctx);
  }

  @Get()
  async findAll(
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '50',
  ) {
    return this.emailTemplateService.findAll(parseInt(skip, 10), parseInt(take, 10));
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.emailTemplateService.findById(id);
  }

  @RequireCapability(TenantCapability.WRITE)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEmailTemplateDto,
    @Request() req: any,
  ) {
    const ctx: AuditContext = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };
    return this.emailTemplateService.update(id, dto, req.user, ctx);
  }

  @RequireCapability(TenantCapability.WRITE)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const ctx: AuditContext = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };
    await this.emailTemplateService.delete(id, req.user, ctx);
  }

  @Post(':id/preview')
  async preview(
    @Param('id') id: string,
    @Body() body: { variables?: Record<string, string> },
  ) {
    const template = await this.emailTemplateService.findById(id);
    const variables = body.variables || {};
    return this.emailTemplateService.renderTemplate(template, variables);
  }

  @Post(':id/test')
  async test(
    @Param('id') id: string,
    @Body() dto: TestEmailTemplateDto,
    @Request() req: any,
  ) {
    const ctx: AuditContext = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };
    return this.emailTemplateService.sendTest(id, dto, req.user, ctx);
  }
}
