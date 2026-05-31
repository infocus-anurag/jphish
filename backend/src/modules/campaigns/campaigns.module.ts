import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { CampaignsService } from './services/campaigns.service';
import { CampaignsController } from './controllers/campaigns.controller';
import { Campaign } from './entities/campaign.entity';
import { CampaignRecipient } from './entities/campaign-recipient.entity';
import { CampaignExecution } from './entities/campaign-execution.entity';

import { AuthModule } from '../auth/auth.module';
import { GroupsModule } from '../groups/groups.module';
import { LandingModule } from '../landing/landing.module';
import { EmailTemplate } from '../email/entities/email-template.entity';
import { SmtpProfile } from '../email/entities/smtp-profile.entity';
import { CampaignTrackingEvent } from '../email/entities/campaign-tracking-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Campaign,
      CampaignRecipient,
      CampaignExecution,
      EmailTemplate,
      SmtpProfile,
      CampaignTrackingEvent,
    ]),
    BullModule.registerQueue({ name: 'campaigns' }),
    AuthModule,
    GroupsModule,
    LandingModule,
  ],
  providers: [CampaignsService],
  controllers: [CampaignsController],
  exports: [CampaignsService, TypeOrmModule],
})
export class CampaignsModule {}
