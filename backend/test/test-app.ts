import 'reflect-metadata';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { DataType, newDb } from 'pg-mem';
import { randomUUID } from 'crypto';
import cookieParser from 'cookie-parser';

import { AuthModule } from '../src/modules/auth/auth.module';
import { HealthModule } from '../src/modules/health/health.module';
import { User } from '../src/modules/auth/entities/user.entity';
import { RefreshToken } from '../src/modules/auth/entities/refresh-token.entity';
import { AuditLog } from '../src/modules/auth/entities/audit-log.entity';

const TEST_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  JWT_ACCESS_SECRET: 'test-access-secret-please-change-me-32-bytes',
  JWT_ACCESS_EXPIRY: '15m',
  JWT_REFRESH_EXPIRY: '7d',
  BCRYPT_ROUNDS: '4',
  AUTH_MAX_FAILED_ATTEMPTS: '3',
  AUTH_LOCKOUT_MINUTES: '15',
  COOKIE_SECURE: 'false',
  // Don't auto-bootstrap a super-admin in tests; each test seeds its own users.
  BOOTSTRAP_SUPERADMIN_EMAIL: '',
  BOOTSTRAP_SUPERADMIN_PASSWORD: '',
};

interface TestAppOptions {
  /** When true, leave the per-route @Throttle limits intact so 429 tests can run. */
  enableThrottle?: boolean;
}

/**
 * Build a Nest application backed by an in-memory Postgres (pg-mem) so the
 * full HTTP + DB + JWT stack runs without external services. By default
 * the throttler guard is replaced with a no-op so tests don't have to
 * worry about per-route 5/min limits — opt back in with
 * `{ enableThrottle: true }` when you specifically want to verify rate
 * limiting.
 */
export async function createTestApp(opts: TestAppOptions = {}): Promise<{
  app: INestApplication;
  dataSource: DataSource;
}> {
  for (const [k, v] of Object.entries(TEST_ENV)) {
    process.env[k] = v;
  }

  // pg-mem datasource — public schema, real Postgres dialect.
  const db = newDb({ autoCreateForeignKeyIndices: true });
  // TypeORM's Postgres driver issues these on connect; pg-mem doesn't ship
  // them, so register stubs that return whatever the driver expects to parse.
  db.public.registerFunction({
    name: 'version',
    returns: DataType.text,
    implementation: () => 'PostgreSQL 15.0 (pg-mem)',
  });
  db.public.registerFunction({
    name: 'current_database',
    returns: DataType.text,
    implementation: () => 'test',
  });
  db.public.registerFunction({
    name: 'obj_description',
    args: [DataType.text, DataType.text],
    returns: DataType.text,
    implementation: () => '',
  });
  // TypeORM uses uuid_generate_v4() in CREATE TABLE defaults — pg-mem doesn't
  // ship the uuid-ossp extension automatically, so register a stand-in.
  db.public.registerFunction({
    name: 'uuid_generate_v4',
    returns: DataType.uuid,
    implementation: () => randomUUID(),
    impure: true,
  });
  db.registerExtension('uuid-ossp', () => undefined);

  const dataSource = (await db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities: [User, RefreshToken, AuditLog],
    synchronize: true,
  })) as DataSource;
  await dataSource.initialize();

  // The real ThrottlerGuard caps /login at 5/min etc. via per-route @Throttle
  // decorators — useful in prod, painful in tests. Register a passthrough
  // guard under APP_GUARD unless this test specifically opts into throttling.
  const guardProvider = opts.enableThrottle
    ? { provide: APP_GUARD, useClass: ThrottlerGuard }
    : { provide: APP_GUARD, useValue: { canActivate: (): boolean => true } };

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [() => ({ ...TEST_ENV })],
      }),
      ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1000 }]),
      TypeOrmModule.forRootAsync({
        useFactory: () => ({
          type: 'postgres',
          entities: [User, RefreshToken, AuditLog],
          synchronize: true,
        }),
        // Bypass the real `pg` driver entirely — return the pg-mem-backed
        // DataSource we already initialized.
        dataSourceFactory: async () => dataSource,
      }),
      HealthModule,
      AuthModule,
    ],
    providers: [guardProvider],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();

  return { app, dataSource };
}

export async function destroyTestApp(app: INestApplication, dataSource: DataSource): Promise<void> {
  await app.close();
  if (dataSource.isInitialized) await dataSource.destroy();
}
