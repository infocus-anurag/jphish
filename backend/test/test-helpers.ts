import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { User } from '../src/modules/auth/entities/user.entity';
import { UserRole } from '../src/modules/auth/enums/user-role.enum';

export interface SeededUser {
  id: string;
  email: string;
  password: string;
  role: UserRole;
}

export async function seedUser(
  dataSource: DataSource,
  overrides: Partial<{
    email: string;
    password: string;
    role: UserRole;
    isActive: boolean;
    mustChangePassword: boolean;
  }> = {},
): Promise<SeededUser> {
  const repo = dataSource.getRepository(User);
  const password = overrides.password ?? 'CorrectHorse1!Battery';
  // BCRYPT_ROUNDS=4 in tests, so this is fast.
  const passwordHash = await bcrypt.hash(password, 4);
  const email = overrides.email ?? `user-${Math.random().toString(36).slice(2, 10)}@example.test`;

  const user = await repo.save(
    repo.create({
      email,
      firstName: 'Test',
      lastName: 'User',
      passwordHash,
      role: overrides.role ?? UserRole.ANALYST,
      isActive: overrides.isActive ?? true,
      mustChangePassword: overrides.mustChangePassword ?? false,
      passwordChangedAt: new Date(),
    }),
  );
  return { id: user.id, email, password, role: user.role };
}

export async function login(
  app: INestApplication,
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshCookie: string }> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);

  const setCookie = res.headers['set-cookie'];
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const refresh = cookies.find((c) => c.startsWith('jphish_rt='));
  if (!refresh) throw new Error('No refresh cookie set on login response');
  return { accessToken: res.body.accessToken as string, refreshCookie: refresh.split(';')[0] };
}
