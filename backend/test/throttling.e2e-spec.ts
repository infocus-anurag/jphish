import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createTestApp, destroyTestApp } from './test-app';

describe('Rate limiting (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const ctx = await createTestApp({ enableThrottle: true });
    app = ctx.app;
    dataSource = ctx.dataSource;
  });

  afterAll(async () => {
    await destroyTestApp(app, dataSource);
  });

  it('returns 429 once the per-route /auth/login throttle (5/min) is exceeded', async () => {
    let last = 0;
    for (let i = 0; i < 8; i += 1) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@nowhere.test', password: 'whatever' });
      last = res.status;
      if (last === 429) break;
    }
    expect(last).toBe(429);
  });
});
