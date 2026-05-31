import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TokensService } from './tokens.service';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';

const ACCESS_SECRET = 'unit-test-access-secret-32-bytes-long-string';

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'u@test',
    firstName: 'A',
    lastName: 'B',
    passwordHash: 'h',
    role: UserRole.ADMIN,
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    lastLoginIp: null,
    passwordChangedAt: new Date('2025-01-01T00:00:00Z'),
    mustChangePassword: false,
    refreshTokens: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

function makeRepoMock() {
  // Lightweight in-memory store keyed by id.
  const rows = new Map<string, RefreshToken>();
  let nextId = 1;
  return {
    rows,
    findOne: jest.fn(async ({ where }: { where: Partial<RefreshToken> }) => {
      for (const r of rows.values()) {
        let match = true;
        for (const [k, v] of Object.entries(where)) {
          if ((r as any)[k] !== v) {
            match = false;
            break;
          }
        }
        if (match) return r;
      }
      return null;
    }),
    insert: jest.fn(async (row: Partial<RefreshToken>) => {
      const id = String(nextId++);
      rows.set(id, { id, ...row } as RefreshToken);
      return { identifiers: [{ id }] };
    }),
    update: jest.fn(async (criteriaOrId: any, patch: Partial<RefreshToken>) => {
      if (typeof criteriaOrId === 'string') {
        const cur = rows.get(criteriaOrId);
        if (cur) rows.set(criteriaOrId, { ...cur, ...patch });
      } else {
        for (const [id, r] of rows) {
          let m = true;
          for (const [k, v] of Object.entries(criteriaOrId)) {
            if (k === 'revokedAt') {
              const want = (v as any)?._type === 'isNull' ? null : v;
              if ((r as any)[k] !== want) m = false;
            } else if ((r as any)[k] !== v) {
              m = false;
            }
          }
          if (m) rows.set(id, { ...r, ...patch });
        }
      }
      return { affected: 1 };
    }),
    createQueryBuilder: jest.fn(() => ({
      delete: () => ({ where: () => ({ execute: async () => ({ affected: 0 }) }) }),
    })),
  };
}

// IsNull from typeorm — replace it for the mock with a tagged sentinel.
jest.mock('typeorm', () => {
  const actual = jest.requireActual('typeorm');
  return { ...actual, IsNull: () => ({ _type: 'isNull' }) };
});

describe('TokensService', () => {
  let service: TokensService;
  let repo: ReturnType<typeof makeRepoMock>;
  let jwt: JwtService;

  beforeEach(async () => {
    repo = makeRepoMock();
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: ACCESS_SECRET, signOptions: { algorithm: 'HS256' } })],
      providers: [
        TokensService,
        {
          provide: ConfigService,
          useValue: {
            get: (k: string, fallback?: string) => {
              if (k === 'JWT_ACCESS_EXPIRY') return '15m';
              if (k === 'JWT_REFRESH_EXPIRY') return '7d';
              return fallback;
            },
            getOrThrow: (k: string) => {
              if (k === 'JWT_ACCESS_SECRET') return ACCESS_SECRET;
              throw new Error(`missing ${k}`);
            },
          },
        },
        { provide: getRepositoryToken(RefreshToken), useValue: repo },
      ],
    }).compile();

    service = moduleRef.get(TokensService);
    jwt = moduleRef.get(JwtService);
  });

  it('signs an access token whose pwdAt matches the user passwordChangedAt', () => {
    const user = fakeUser();
    const token = service.signAccessToken(user);
    const payload = jwt.verify<{ sub: string; pwdAt: number; role: string }>(token, {
      secret: ACCESS_SECRET,
      algorithms: ['HS256'],
    });
    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe(UserRole.ADMIN);
    expect(payload.pwdAt).toBe(Math.floor(user.passwordChangedAt!.getTime() / 1000));
  });

  it('issues a fresh family with a 96-byte (base64url) refresh token and a future expiry', async () => {
    const user = fakeUser();
    const { refreshToken, expiresAt } = await service.issueRefreshFamily(user, {
      ip: '1.1.1.1',
      userAgent: 'jest',
    });
    expect(refreshToken).toMatch(/^[A-Za-z0-9_-]{60,}$/);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(repo.insert).toHaveBeenCalledTimes(1);
  });

  it('rotateRefresh returns null when the token is unknown', async () => {
    const result = await service.rotateRefresh('does-not-exist', { ip: null, userAgent: null });
    expect(result).toBeNull();
  });

  it('rotateRefresh issues a new token and revokes the previous one', async () => {
    const user = fakeUser();
    const initial = await service.issueRefreshFamily(user, { ip: null, userAgent: null });
    // The mock has no relation hydration; patch the row's user manually.
    for (const r of repo.rows.values()) (r as any).user = user;

    const rotated = await service.rotateRefresh(initial.refreshToken, { ip: null, userAgent: null });
    expect(rotated).not.toBeNull();
    expect(rotated!.reuseDetected).toBe(false);
    expect(rotated!.refreshToken).not.toEqual(initial.refreshToken);
    // Previous row revoked.
    const previous = [...repo.rows.values()][0];
    expect(previous.revokedAt).toBeInstanceOf(Date);
  });

  it('rotateRefresh signals reuseDetected if a revoked token is presented again', async () => {
    const user = fakeUser();
    const initial = await service.issueRefreshFamily(user, { ip: null, userAgent: null });
    for (const r of repo.rows.values()) (r as any).user = user;
    await service.rotateRefresh(initial.refreshToken, { ip: null, userAgent: null });
    // Reuse the original (now revoked) token.
    const reuse = await service.rotateRefresh(initial.refreshToken, { ip: null, userAgent: null });
    expect(reuse?.reuseDetected).toBe(true);
  });

  it('rotateRefresh returns null when the token is past its expiry', async () => {
    const user = fakeUser();
    const initial = await service.issueRefreshFamily(user, { ip: null, userAgent: null });
    for (const r of repo.rows.values()) {
      (r as any).user = user;
      (r as any).expiresAt = new Date(Date.now() - 1000);
    }
    expect(await service.rotateRefresh(initial.refreshToken, { ip: null, userAgent: null })).toBeNull();
  });

  it('rotateRefresh returns null when the user has been deactivated', async () => {
    const user = fakeUser({ isActive: false });
    const initial = await service.issueRefreshFamily(user, { ip: null, userAgent: null });
    for (const r of repo.rows.values()) (r as any).user = user;
    expect(await service.rotateRefresh(initial.refreshToken, { ip: null, userAgent: null })).toBeNull();
  });

  it('parseExpiry rejects malformed durations', () => {
    // ConfigService in this test returns '7d' for JWT_REFRESH_EXPIRY, so to
    // exercise the failure branch we point at an unknown env that falls
    // back to a malformed value.
    expect(() => (service as any).parseExpiry('UNKNOWN_DURATION', 'abc')).toThrow();
  });

  it('parseExpiry parses each unit (s, m, h, d) into milliseconds', () => {
    const fn = (env: string, fallback: string): number =>
      (service as any).parseExpiry(env, fallback);
    expect(fn('U_S', '30s')).toBe(30_000);
    expect(fn('U_M', '5m')).toBe(300_000);
    expect(fn('U_H', '2h')).toBe(7_200_000);
    expect(fn('U_D', '1d')).toBe(86_400_000);
  });
});
