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

import { SmtpProfileService } from '../services/smtp-profile.service';
import { CreateSmtpProfileDto, UpdateSmtpProfileDto, TestSmtpProfileDto } from '../dto';

@Controller('smtp-profiles')
@UseGuards(JwtAuthGuard)
export class SmtpProfilesController {
  constructor(private smtpProfileService: SmtpProfileService) {}

  @Post()
  async create(
    @Body() dto: CreateSmtpProfileDto,
    @Request() req: any,
  ) {
    const ctx: AuditContext = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };
    return this.smtpProfileService.create(dto, req.user, ctx);
  }

  @Get()
  async findAll(
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '50',
  ) {
    return this.smtpProfileService.findAll(parseInt(skip, 10), parseInt(take, 10));
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.smtpProfileService.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSmtpProfileDto,
    @Request() req: any,
  ) {
    const ctx: AuditContext = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };
    return this.smtpProfileService.update(id, dto, req.user, ctx);
  }

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
    await this.smtpProfileService.delete(id, req.user, ctx);
  }

  @Post(':id/test')
  async test(
    @Param('id') id: string,
    @Body() dto: TestSmtpProfileDto,
    @Request() req: any,
  ) {
    const ctx: AuditContext = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };
    return this.smtpProfileService.test(id, dto, req.user, ctx);
  }
}
