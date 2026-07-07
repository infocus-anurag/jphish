import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import { BullModule, getQueueToken } from '@nestjs/bull';
import { DataType, newDb } from 'pg-mem';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';

import { AuthModule } from '../src/modules/auth/auth.module';
import { TenantsModule } from '../src/modules/tenants/tenants.module';
import { CampaignsModule } from '../src/modules/campaigns/campaigns.module';
import { EmailModule } from '../src/modules/email/email.module';
import { GroupsModule } from '../src/modules/groups/groups.module';
import { LandingModule } from '../src/modules/landing/landing.module';
import { ReportsModule } from '../src/modules/reports/reports.module';
import { HealthModule } from '../src/modules/health/health.module';

import { User } from '../src/modules/auth/entities/user.entity';
import { RefreshToken } from '../src/modules/auth/entities/refresh-token.entity';
import { AuditLog } from '../src/modules/auth/entities/audit-log.entity';
import { Tenant } from '../src/modules/tenants/entities/tenant.entity';
import { Plan } from '../src/modules/tenants/entities/plan.entity';
import { TenantUsage } from '../src/modules/tenants/entities/tenant-usage.entity';
import { Campaign } from '../src/modules/campaigns/entities/campaign.entity';
import { CampaignRecipient } from '../src/modules/campaigns/entities/campaign-recipient.entity';
import { CampaignExecution } from '../src/modules/campaigns/entities/campaign-execution.entity';
import { SmtpProfile } from '../src/modules/email/entities/smtp-profile.entity';
import { EmailTemplate } from '../src/modules/email/entities/email-template.entity';
import { CampaignTrackingEvent } from '../src/modules/email/entities/campaign-tracking-event.entity';
import { Group } from '../src/modules/groups/entities/group.entity';
import { GroupMember } from '../src/modules/groups/entities/group-member.entity';
import { LandingPage } from '../src/modules/landing/entities/landing-page.entity';

const ALL_ENTITIES = [
  User, RefreshToken, AuditLog,
  Tenant, Plan, TenantUsage,
  Campaign, CampaignRecipient, CampaignExecution,
  SmtpProfile, EmailTemplate, CampaignTrackingEvent,
  Group, GroupMember, LandingPage,
];

// Verifies the ENTIRE feature-module DI graph resolves once tenant scoping,
// usage tracking and the access/quota guards are wired across modules — i.e. no
// circular module deps and no missing providers. Runs on pg-mem with the Bull
// queue stubbed so no Postgres/Redis is required.
describe('Application DI graph', () => {
  it('boots every feature module together without unresolved dependencies', async () => {
    Object.assign(process.env, {
      NODE_ENV: 'test',
      JWT_ACCESS_SECRET: 'test-access-secret-please-change-me-32-bytes',
      BCRYPT_ROUNDS: '4',
      BOOTSTRAP_SUPERADMIN_EMAIL: '',
      BOOTSTRAP_SUPERADMIN_PASSWORD: '',
    });

    const db = newDb({ autoCreateForeignKeyIndices: true });
    db.public.registerFunction({ name: 'version', returns: DataType.text, implementation: () => 'PostgreSQL 15.0 (pg-mem)' });
    db.public.registerFunction({ name: 'current_database', returns: DataType.text, implementation: () => 'test' });
    db.public.registerFunction({ name: 'obj_description', args: [DataType.text, DataType.text], returns: DataType.text, implementation: () => '' });
    db.public.registerFunction({ name: 'uuid_generate_v4', returns: DataType.uuid, implementation: () => randomUUID(), impure: true });
    db.registerExtension('uuid-ossp', () => undefined);

    const dataSource = (await db.adapters.createTypeormDataSource({
      type: 'postgres',
      entities: ALL_ENTITIES,
      synchronize: true,
    })) as DataSource;
    await dataSource.initialize();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ ...process.env })] }),
        TypeOrmModule.forRootAsync({
          useFactory: () => ({ type: 'postgres', entities: ALL_ENTITIES, synchronize: true }),
          dataSourceFactory: async () => dataSource,
        }),
        BullModule.forRoot({ redis: { host: 'localhost', port: 6379 } }),
        AuthModule,
        TenantsModule,
        CampaignsModule,
        EmailModule,
        GroupsModule,
        LandingModule,
        ReportsModule,
        HealthModule,
      ],
    })
      // Replace the real Bull queue so no Redis connection is attempted.
      .overrideProvider(getQueueToken('campaigns'))
      .useValue({
        add: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        getJobCounts: jest.fn(),
        // BullExplorer attaches the @Processor via these on module init.
        on: jest.fn(),
        process: jest.fn(),
      })
      .compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    // If we got here, every provider resolved and all OnModuleInit bootstraps ran.
    expect(app).toBeDefined();

    await app.close();
    if (dataSource.isInitialized) await dataSource.destroy();
  });
});
