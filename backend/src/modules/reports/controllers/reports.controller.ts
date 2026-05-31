import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { ReportsService } from '../services/reports.service';

@ApiTags('Reports')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Aggregate platform-wide phishing simulation stats' })
  dashboard() {
    return this.reports.dashboard();
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Per-campaign report with funnel + recent events' })
  campaign(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.reports.campaignReport(id);
  }
}
