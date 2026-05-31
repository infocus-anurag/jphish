import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createTestApp, destroyTestApp } from './test-app';
import { seedUser, login } from './test-helpers';
import { AuditLog } from '../src/modules/auth/entities/audit-log.entity';
import { RefreshToken } from '../src/modules/auth/entities/refresh-token.entity';
import { User } from '../src/modules/auth/entities/user.entity';
import { UserRole } from '../src/modules/auth/enums/user-role.enum';

describe('Auth flows (e2e)', () => {
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
    // Order matters: refresh_tokens FKs users, so child first.
    await dataSource.query('DELETE FROM "audit_logs"');
    await dataSource.query('DELETE FROM "refresh_tokens"');
    await dataSource.query('DELETE FROM "users"');
  });

  describe('POST /auth/login', () => {
    it('issues an access token + sets a refresh cookie on valid credentials', async () => {
      const u = await seedUser(dataSource, { role: UserRole.ADMIN });
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: u.email, password: u.password })
        .expect(200);

      expect(res.body.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
      expect(res.body.user.email).toBe(u.email);
      expect(res.body.user.passwordHash).toBeUndefined();
      const setCookie = res.headers['set-cookie'] as unknown as string[] | undefined;
      const cookies = Array.isArray(setCookie) ? setCookie : [setCookie ?? ''];
      const rt = cookies.find((c) => c?.startsWith('jphish_rt='));
      expect(rt).toBeDefined();
      expect(rt).toMatch(/HttpOnly/i);
      expect(rt).toMatch(/SameSite=Strict/i);
    });

    it('returns 401 with a generic message for an unknown email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@nowhere.test', password: 'anything' })
        .expect(401);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it('returns 401 (same message) for a wrong password', async () => {
      const u = await seedUser(dataSource);
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: u.email, password: 'WrongPassword123!' })
        .expect(401);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it('writes an audit row for failed and successful logins', async () => {
      const u = await seedUser(dataSource);
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: u.email, password: 'wrong' })
        .expect(401);
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: u.email, password: u.password })
        .expect(200);

      const logs = await dataSource.getRepository(AuditLog).find();
      const actions = logs.map((l) => l.action).sort();
      expect(actions).toEqual(['auth.login.failed', 'auth.login.success']);
    });

    it('locks the account after AUTH_MAX_FAILED_ATTEMPTS (=3) bad attempts', async () => {
      const u = await seedUser(dataSource);
      for (let i = 0; i < 3; i += 1) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: u.email, password: 'wrong' })
          .expect(401);
      }
      // Right password but locked → still 401 with the locked message.
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: u.email, password: u.password })
        .expect(401);
      expect(res.body.message).toMatch(/locked/i);
    });

    it('rejects payloads that fail validation with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: '' })
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('returns a new access token + rotates the refresh cookie', async () => {
      const u = await seedUser(dataSource);
      const { refreshCookie } = await login(app, u.email, u.password);
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshCookie)
        .expect(200);
      expect(res.body.accessToken).toBeDefined();
      const setCookie = res.headers['set-cookie'] as unknown as string[] | undefined;
      const newRt = (Array.isArray(setCookie) ? setCookie : [setCookie ?? ''])
        .find((c) => c?.startsWith('jphish_rt='));
      expect(newRt).toBeDefined();
      // It must be a *different* cookie value than the one we presented.
      expect(newRt!.split(';')[0]).not.toEqual(refreshCookie);
    });

    it('returns 401 when no refresh cookie is sent', async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/refresh').expect(401);
    });

    it('detects token reuse: replaying a previously-rotated refresh token kills the family', async () => {
      const u = await seedUser(dataSource);
      const { refreshCookie } = await login(app, u.email, u.password);
      // First rotation succeeds and revokes the old token.
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshCookie)
        .expect(200);
      // Replaying the now-revoked token must be rejected.
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshCookie)
        .expect(401);
      expect(res.body.message).toMatch(/reuse/i);
    });
  });

  describe('GET /auth/me', () => {
    it('returns 401 without a Bearer token', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('returns the current user view when authenticated', async () => {
      const u = await seedUser(dataSource, { role: UserRole.ADMIN });
      const { accessToken } = await login(app, u.email, u.password);
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body).toMatchObject({ email: u.email, role: UserRole.ADMIN });
      expect(res.body.passwordHash).toBeUndefined();
    });
  });

  describe('POST /auth/logout', () => {
    it('clears the refresh cookie and revokes the refresh token row', async () => {
      const u = await seedUser(dataSource);
      const { accessToken, refreshCookie } = await login(app, u.email, u.password);
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', refreshCookie)
        .expect(204);

      const rows = await dataSource.getRepository(RefreshToken).find();
      expect(rows.every((r) => r.revokedAt !== null)).toBe(true);
    });
  });

  describe('PATCH /auth/me/password', () => {
    it('changes the password and revokes every existing refresh token', async () => {
      const u = await seedUser(dataSource);
      const { accessToken } = await login(app, u.email, u.password);

      await request(app.getHttpServer())
        .patch('/api/v1/auth/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: u.password, newPassword: 'NewlyMinted123!Pwd' })
        .expect(204);

      const rows = await dataSource.getRepository(RefreshToken).find();
      expect(rows.every((r) => r.revokedAt !== null)).toBe(true);

      // Old password must no longer work.
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: u.email, password: u.password })
        .expect(401);
      // New password must work.
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: u.email, password: 'NewlyMinted123!Pwd' })
        .expect(200);
    });

    it('rejects a weak new password with 400', async () => {
      const u = await seedUser(dataSource);
      const { accessToken } = await login(app, u.email, u.password);
      await request(app.getHttpServer())
        .patch('/api/v1/auth/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: u.password, newPassword: 'weak' })
        .expect(400);
    });
  });

  describe('JWT strategy', () => {
    it('rejects an access token after the password has been changed (pwdAt mismatch)', async () => {
      const u = await seedUser(dataSource);
      const { accessToken } = await login(app, u.email, u.password);
      const second = await login(app, u.email, u.password);
      // pwdAt is unix-second precision: sleep so the new passwordChangedAt
      // falls into a later second than the old token's claim.
      await new Promise((r) => setTimeout(r, 1100));
      await request(app.getHttpServer())
        .patch('/api/v1/auth/me/password')
        .set('Authorization', `Bearer ${second.accessToken}`)
        .send({ currentPassword: u.password, newPassword: 'CompletelyNew99!X' })
        .expect(204);

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
      expect(res.body.message).toMatch(/superseded/i);
    });
  });
});
