import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { EmailTrackingService } from '../services/email-tracking.service';

// Admin-side stats readers. The public-facing tracking endpoints (pixel,
// click, report, form submission) live on the dedicated phish-server.
@ApiTags('Tracking')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'tracking', version: '1' })
export class TrackingController {
  constructor(private readonly tracking: EmailTrackingService) {}

  @Get('campaigns/:campaignId/stats')
  getCampaignStats(@Param('campaignId') campaignId: string) {
    return this.tracking.getCampaignStats(campaignId);
  }

  @Get('campaigns/:campaignId/events')
  getCampaignEvents(
    @Param('campaignId') campaignId: string,
    @Query('skip') skip = '0',
    @Query('take') take = '50',
  ) {
    return this.tracking.getCampaignEvents(
      campaignId,
      parseInt(skip, 10),
      parseInt(take, 10),
    );
  }

  @Get('campaigns/:campaignId/recipients/:email')
  getRecipientEvents(
    @Param('campaignId') campaignId: string,
    @Param('email') email: string,
  ) {
    return this.tracking.getRecipientEvents(campaignId, email);
  }
}
