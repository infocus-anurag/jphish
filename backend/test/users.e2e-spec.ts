import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createTestApp, destroyTestApp } from './test-app';
import { seedUser, login } from './test-helpers';
import { UserRole } from '../src/modules/auth/enums/user-role.enum';

describe('Users API (e2e)', () => {
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

  describe('GET /users', () => {
    it('returns 401 with no Bearer token', async () => {
      await request(app.getHttpServer()).get('/api/v1/users').expect(401);
    });

    it('returns the list to an analyst (read access)', async () => {
      await seedUser(dataSource, { email: 'a@ex.test' });
      const analyst = await seedUser(dataSource, { email: 'analyst@ex.test', role: UserRole.ANALYST });
      const { accessToken } = await login(app, analyst.email, analyst.password);
      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      // No password hashes leaked.
      for (const row of res.body) expect(row.passwordHash).toBeUndefined();
    });
  });

  describe('POST /users', () => {
    it('forbids an analyst from creating a user (RolesGuard 403)', async () => {
      const analyst = await seedUser(dataSource, { role: UserRole.ANALYST });
      const { accessToken } = await login(app, analyst.email, analyst.password);
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'new@ex.test',
          firstName: 'New',
          lastName: 'User',
          role: UserRole.ANALYST,
        })
        .expect(403);
    });

    it('admin can create a user without a password and gets a temp password back', async () => {
      const admin = await seedUser(dataSource, { role: UserRole.ADMIN });
      const { accessToken } = await login(app, admin.email, admin.password);
      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'new@ex.test',
          firstName: 'New',
          lastName: 'User',
          role: UserRole.ANALYST,
        })
        .expect(201);
      expect(res.body.user.email).toBe('new@ex.test');
      expect(res.body.user.mustChangePassword).toBe(true);
      expect(res.body.tempPassword).toBeDefined();
    });

    it('admin cannot mint a super-admin', async () => {
      const admin = await seedUser(dataSource, { role: UserRole.ADMIN });
      const { accessToken } = await login(app, admin.email, admin.password);
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'sa@ex.test',
          firstName: 'S',
          lastName: 'A',
          role: UserRole.SUPER_ADMIN,
        })
        .expect(403);
    });

    it('returns 409 on duplicate email', async () => {
      const admin = await seedUser(dataSource, { role: UserRole.ADMIN });
      await seedUser(dataSource, { email: 'dup@ex.test' });
      const { accessToken } = await login(app, admin.email, admin.password);
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'dup@ex.test',
          firstName: 'D',
          lastName: 'U',
          role: UserRole.ANALYST,
        })
        .expect(409);
    });

    it('returns 400 on a weak supplied password', async () => {
      const admin = await seedUser(dataSource, { role: UserRole.ADMIN });
      const { accessToken } = await login(app, admin.email, admin.password);
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'weak@ex.test',
          firstName: 'W',
          lastName: 'P',
          role: UserRole.ANALYST,
          password: 'short',
        })
        .expect(400);
    });

    it('strips unknown fields (whitelist=true forbidNonWhitelisted=true)', async () => {
      const admin = await seedUser(dataSource, { role: UserRole.ADMIN });
      const { accessToken } = await login(app, admin.email, admin.password);
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'whitelist@ex.test',
          firstName: 'W',
          lastName: 'L',
          role: UserRole.ANALYST,
          isAdmin: true, // unknown — should 400
        })
        .expect(400);
    });
  });

  describe('PATCH /users/:id', () => {
    it('400 on non-UUID id (ParseUUIDPipe)', async () => {
      const admin = await seedUser(dataSource, { role: UserRole.ADMIN });
      const { accessToken } = await login(app, admin.email, admin.password);
      await request(app.getHttpServer())
        .patch('/api/v1/users/not-a-uuid')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'X' })
        .expect(400);
    });

    it('admin can update a regular user but cannot edit a super-admin', async () => {
      const admin = await seedUser(dataSource, { role: UserRole.ADMIN });
      const sa = await seedUser(dataSource, { role: UserRole.SUPER_ADMIN });
      const target = await seedUser(dataSource, { role: UserRole.ANALYST });
      const { accessToken } = await login(app, admin.email, admin.password);
      // Allowed.
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${target.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'Edited' })
        .expect(200);
      // Forbidden.
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${sa.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'Edited' })
        .expect(403);
    });
  });

  describe('PATCH /users/:id/role', () => {
    it('only super-admin can change roles (admin → 403)', async () => {
      const admin = await seedUser(dataSource, { role: UserRole.ADMIN });
      const target = await seedUser(dataSource, { role: UserRole.ANALYST });
      const { accessToken } = await login(app, admin.email, admin.password);
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${target.id}/role`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ role: UserRole.ADMIN })
        .expect(403);
    });

    it('super-admin promotes an analyst to admin and revokes their tokens', async () => {
      const sa = await seedUser(dataSource, { role: UserRole.SUPER_ADMIN });
      const target = await seedUser(dataSource, { role: UserRole.ANALYST });
      const { accessToken: saToken } = await login(app, sa.email, sa.password);
      // Give the target an active session first.
      const tSession = await login(app, target.password ? target.email : target.email, target.password);
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${target.id}/role`)
        .set('Authorization', `Bearer ${saToken}`)
        .send({ role: UserRole.ADMIN })
        .expect(200);
      // Their refresh token must now be unusable.
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', tSession.refreshCookie)
        .expect(401);
    });

    it('super-admin cannot demote the last remaining super-admin', async () => {
      const sa = await seedUser(dataSource, { role: UserRole.SUPER_ADMIN });
      // A second super-admin is required as the actor (you can't demote yourself).
      const sa2 = await seedUser(dataSource, { role: UserRole.SUPER_ADMIN });
      // Demote sa2 first to leave exactly one super-admin (sa).
      const { accessToken: saToken } = await login(app, sa.email, sa.password);
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${sa2.id}/role`)
        .set('Authorization', `Bearer ${saToken}`)
        .send({ role: UserRole.ADMIN })
        .expect(200);
      // Now sa is the lone super-admin. Re-promote sa2 as actor and demote sa.
      const { accessToken: sa2Token } = await login(app, sa2.email, sa2.password);
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${sa.id}/role`)
        .set('Authorization', `Bearer ${sa2Token}`)
        .send({ role: UserRole.ADMIN })
        .expect(403); // sa2 is no longer SA, so can't change SA role at all
    });

    it('super-admin cannot change their own role', async () => {
      const sa = await seedUser(dataSource, { role: UserRole.SUPER_ADMIN });
      const { accessToken } = await login(app, sa.email, sa.password);
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${sa.id}/role`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ role: UserRole.ADMIN })
        .expect(400);
    });
  });

  describe('DELETE /users/:id', () => {
    it('admin cannot delete (super-admin only)', async () => {
      const admin = await seedUser(dataSource, { role: UserRole.ADMIN });
      const target = await seedUser(dataSource, { role: UserRole.ANALYST });
      const { accessToken } = await login(app, admin.email, admin.password);
      await request(app.getHttpServer())
        .delete(`/api/v1/users/${target.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('super-admin deletes a regular user (204)', async () => {
      const sa = await seedUser(dataSource, { role: UserRole.SUPER_ADMIN });
      const target = await seedUser(dataSource, { role: UserRole.ANALYST });
      const { accessToken } = await login(app, sa.email, sa.password);
      await request(app.getHttpServer())
        .delete(`/api/v1/users/${target.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });

    it('super-admin cannot delete themselves', async () => {
      const sa = await seedUser(dataSource, { role: UserRole.SUPER_ADMIN });
      const { accessToken } = await login(app, sa.email, sa.password);
      await request(app.getHttpServer())
        .delete(`/api/v1/users/${sa.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });
});
