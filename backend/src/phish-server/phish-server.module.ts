import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PublicTrackingController } from './controllers/public-tracking.controller';
import { PublicLandingController } from './controllers/public-landing.controller';

import { EmailTrackingService } from '@/modules/email/services/email-tracking.service';
import { LandingPageService } from '@/modules/landing/services/landing-page.service';

import { CampaignTrackingEvent } from '@/modules/email/entities/campaign-tracking-event.entity';
import { LandingPage } from '@/modules/landing/entities/landing-page.entity';
import { Campaign } from '@/modules/campaigns/entities/campaign.entity';
import { CampaignRecipient } from '@/modules/campaigns/entities/campaign-recipient.entity';

// Dedicated NestJS app that serves ONLY the public surface a phishing target
// can reach: landing pages and tracking endpoints. Runs on its own port
// (PHISH_PORT, default 3002) so the admin API never shares an origin with
// the phish surface.
@Module({
  imports: [
    // This module is bootstrapped as its own standalone Nest app, so it must
    // load .env itself rather than relying on the admin app's ConfigModule.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get('DB_PORT'),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        // Load every entity in the project so relations resolve. The
        // phish-server reads a few tables, but the entity graph (Campaign
        // → User, etc.) is interconnected — TypeORM needs all metadata
        // to compile any single relation.
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: false,
      }),
    }),
    TypeOrmModule.forFeature([
      CampaignTrackingEvent,
      LandingPage,
      Campaign,
      CampaignRecipient,
    ]),
  ],
  controllers: [PublicTrackingController, PublicLandingController],
  providers: [EmailTrackingService, LandingPageService],
})
export class PhishServerModule {}
