import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createTestApp, destroyTestApp } from './test-app';
import { seedUser, login } from './test-helpers';
import { UserRole } from '../src/modules/auth/enums/user-role.enum';

describe('Audit logs (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    dataSource = ctx.dataSource;
  });

  afterAll(async () => {
    await destroyTestApp(app, dataSource);
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM "audit_logs"');
    await dataSource.query('DELETE FROM "refresh_tokens"');
    await dataSource.query('DELETE FROM "users"');
  });

  it('rejects analysts (admin/super-admin only)', async () => {
    const analyst = await seedUser(dataSource, { role: UserRole.ANALYST });
    const { accessToken } = await login(app, analyst.email, analyst.password);
    await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('admin can list and the most recent action comes back first', async () => {
    const admin = await seedUser(dataSource, { role: UserRole.ADMIN });
    const { accessToken } = await login(app, admin.email, admin.password);
    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Login itself should have produced an audit row.
    expect(res.body[0].action).toBe('auth.login.success');
  });

  it('caps the limit at the service default (≤500) even on huge query', async () => {
    const admin = await seedUser(dataSource, { role: UserRole.ADMIN });
    const { accessToken } = await login(app, admin.email, admin.password);
    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs?limit=99999')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.length).toBeLessThanOrEqual(500);
  });
});
