import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { SmtpProfile } from './entities/smtp-profile.entity';
import { EmailTemplate } from './entities/email-template.entity';
import { CampaignTrackingEvent } from './entities/campaign-tracking-event.entity';

import { EmailService } from './services/email.service';
import { SmtpProfileService } from './services/smtp-profile.service';
import { EmailTemplateService } from './services/email-template.service';
import { EmailTrackingService } from './services/email-tracking.service';

import { SmtpProfilesController } from './controllers/smtp-profiles.controller';
import { EmailTemplatesController } from './controllers/email-templates.controller';
import { TrackingController } from './controllers/tracking.controller';

import { CampaignProcessor } from './processors/campaign.processor';

import { AuthModule } from '../auth/auth.module';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { CampaignRecipient } from '../campaigns/entities/campaign-recipient.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SmtpProfile,
      EmailTemplate,
      CampaignTrackingEvent,
      Campaign,
      CampaignRecipient,
    ]),
    BullModule.registerQueue({ name: 'campaigns' }),
    AuthModule,
  ],
  controllers: [SmtpProfilesController, EmailTemplatesController, TrackingController],
  providers: [
    EmailService,
    SmtpProfileService,
    EmailTemplateService,
    EmailTrackingService,
    CampaignProcessor,
  ],
  exports: [
    EmailService,
    SmtpProfileService,
    EmailTemplateService,
    EmailTrackingService,
    TypeOrmModule,
  ],
})
export class EmailModule {}
