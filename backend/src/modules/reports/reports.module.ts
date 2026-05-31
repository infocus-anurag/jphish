import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './services/reports.service';
import { ReportsController } from './controllers/reports.controller';
import { AuthModule } from '../auth/auth.module';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { CampaignRecipient } from '../campaigns/entities/campaign-recipient.entity';
import { CampaignTrackingEvent } from '../email/entities/campaign-tracking-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, CampaignRecipient, CampaignTrackingEvent]),
    AuthModule,
  ],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
