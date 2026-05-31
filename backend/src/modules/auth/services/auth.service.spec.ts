import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { TokensService } from './tokens.service';
import { AuditService } from './audit.service';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';

const PASSWORD = 'CorrectHorse1!Battery';

async function passwordHash(): Promise<string> {
  return bcrypt.hash(PASSWORD, 4);
}

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'good@example.test',
    firstName: 'A',
    lastName: 'B',
    passwordHash: '',
    role: UserRole.ANALYST,
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

describe('AuthService.login', () => {
  let service: AuthService;
  let userRepo: { findOne: jest.Mock; update: jest.Mock };
  let tokens: { signAccessToken: jest.Mock; issueRefreshFamily: jest.Mock };
  let audit: { record: jest.Mock };

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    tokens = {
      signAccessToken: jest.fn().mockReturnValue('access.jwt'),
      issueRefreshFamily: jest.fn().mockResolvedValue({
        refreshToken: 'refresh-raw',
        expiresAt: new Date(Date.now() + 60_000),
      }),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: TokensService, useValue: tokens },
        { provide: AuditService, useValue: audit },
        {
          provide: ConfigService,
          useValue: {
            get: (k: string, fallback?: string | number) => {
              if (k === 'AUTH_MAX_FAILED_ATTEMPTS') return 3;
              if (k === 'AUTH_LOCKOUT_MINUTES') return 15;
              if (k === 'BCRYPT_ROUNDS') return 4;
              return fallback;
            },
          },
        },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('rejects unknown email with a generic message and audits the failure', async () => {
    userRepo.findOne.mockResolvedValueOnce(null);
    await expect(
      service.login('nope@example.test', 'whatever', { ip: null, userAgent: null }),
    ).rejects.toThrow(UnauthorizedException);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.login.failed',
        metadata: expect.objectContaining({ reason: 'unknown_user' }),
      }),
    );
  });

  it('rejects an inactive account with the same generic message (no enumeration)', async () => {
    userRepo.findOne.mockResolvedValueOnce(fakeUser({ isActive: false, passwordHash: await passwordHash() }));
    await expect(
      service.login('good@example.test', PASSWORD, { ip: null, userAgent: null }),
    ).rejects.toThrow(UnauthorizedException);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ reason: 'inactive' }) }),
    );
  });

  it('refuses to authenticate when the account is currently locked', async () => {
    userRepo.findOne.mockResolvedValueOnce(
      fakeUser({
        passwordHash: await passwordHash(),
        lockedUntil: new Date(Date.now() + 60_000),
      }),
    );
    await expect(
      service.login('good@example.test', PASSWORD, { ip: null, userAgent: null }),
    ).rejects.toThrow(/locked/i);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login.locked' }),
    );
  });

  it('locks the account after AUTH_MAX_FAILED_ATTEMPTS bad passwords', async () => {
    const user = fakeUser({
      passwordHash: await passwordHash(),
      failedLoginAttempts: 2, // next failure → lock (max=3)
    });
    userRepo.findOne.mockResolvedValueOnce(user);

    await expect(
      service.login('good@example.test', 'wrong-password', { ip: null, userAgent: null }),
    ).rejects.toThrow(UnauthorizedException);

    const patch = userRepo.update.mock.calls[0][1];
    expect(patch.lockedUntil).toBeInstanceOf(Date);
    expect(patch.failedLoginAttempts).toBe(0);
  });

  it('returns access + refresh tokens on a successful login and resets fail counters', async () => {
    const user = fakeUser({ passwordHash: await passwordHash(), failedLoginAttempts: 1 });
    userRepo.findOne.mockResolvedValueOnce(user);
    const result = await service.login('good@example.test', PASSWORD, {
      ip: '9.9.9.9',
      userAgent: 'jest',
    });
    expect(result.accessToken).toBe('access.jwt');
    expect(result.refreshToken).toBe('refresh-raw');
    expect(userRepo.update).toHaveBeenCalledWith(
      user.id,
      expect.objectContaining({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginIp: '9.9.9.9',
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login.success' }),
    );
  });

  it('lower-cases and trims the email before lookup', async () => {
    userRepo.findOne.mockResolvedValueOnce(null);
    await expect(
      service.login('  GOOD@Example.Test ', 'x', { ip: null, userAgent: null }),
    ).rejects.toThrow();
    expect(userRepo.findOne).toHaveBeenCalledWith({ where: { email: 'good@example.test' } });
  });
});

describe('AuthService.refresh', () => {
  let service: AuthService;
  let tokens: {
    signAccessToken: jest.Mock;
    issueRefreshFamily: jest.Mock;
    rotateRefresh: jest.Mock;
  };
  let audit: { record: jest.Mock };

  beforeEach(async () => {
    tokens = {
      signAccessToken: jest.fn().mockReturnValue('new.access'),
      issueRefreshFamily: jest.fn(),
      rotateRefresh: jest.fn(),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn(), update: jest.fn() } },
        { provide: TokensService, useValue: tokens },
        { provide: AuditService, useValue: audit },
        {
          provide: ConfigService,
          useValue: { get: (_: string, fb?: any) => fb },
        },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('throws Unauthorized when the refresh token is unknown', async () => {
    tokens.rotateRefresh.mockResolvedValueOnce(null);
    await expect(service.refresh('bad', { ip: null, userAgent: null })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('audits and throws when token reuse is detected', async () => {
    tokens.rotateRefresh.mockResolvedValueOnce({
      user: fakeUser(),
      reuseDetected: true,
      refreshToken: '',
      expiresAt: new Date(0),
    });
    await expect(service.refresh('reused', { ip: null, userAgent: null })).rejects.toThrow(
      /reuse/i,
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.refresh.reuse_detected' }),
    );
  });

  it('refuses to refresh for an inactive account', async () => {
    tokens.rotateRefresh.mockResolvedValueOnce({
      user: fakeUser({ isActive: false }),
      reuseDetected: false,
      refreshToken: 'rt',
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(service.refresh('rt', { ip: null, userAgent: null })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('returns a new access token and audits success', async () => {
    const u = fakeUser();
    tokens.rotateRefresh.mockResolvedValueOnce({
      user: u,
      reuseDetected: false,
      refreshToken: 'rt-new',
      expiresAt: new Date(Date.now() + 60_000),
    });
    const result = await service.refresh('old-rt', { ip: null, userAgent: null });
    expect(result.accessToken).toBe('new.access');
    expect(result.refreshToken).toBe('rt-new');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.refresh.success' }),
    );
  });
});

describe('AuthService.changePassword', () => {
  let service: AuthService;
  let userRepo: { update: jest.Mock };
  let tokens: { revokeAllForUser: jest.Mock };
  let audit: { record: jest.Mock };

  beforeEach(async () => {
    userRepo = { update: jest.fn().mockResolvedValue(undefined) };
    tokens = { revokeAllForUser: jest.fn().mockResolvedValue(undefined) };
    audit = { record: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn(), ...userRepo } },
        { provide: TokensService, useValue: tokens },
        { provide: AuditService, useValue: audit },
        {
          provide: ConfigService,
          useValue: { get: (_: string, fb?: any) => fb },
        },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('rejects when the current password is wrong', async () => {
    const user = fakeUser({ passwordHash: await bcrypt.hash('OLD-pass-12!', 4) });
    await expect(
      service.changePassword(
        user,
        { currentPassword: 'WRONG', newPassword: 'NEW-pass-12!' },
        { ip: null, userAgent: null },
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects when new password equals current password', async () => {
    const user = fakeUser({ passwordHash: await bcrypt.hash('SAME-pass-12!', 4) });
    await expect(
      service.changePassword(
        user,
        { currentPassword: 'SAME-pass-12!', newPassword: 'SAME-pass-12!' },
        { ip: null, userAgent: null },
      ),
    ).rejects.toThrow(/differ/i);
  });

  it('rotates hash, clears mustChangePassword, and revokes every refresh token', async () => {
    const user = fakeUser({
      passwordHash: await bcrypt.hash('OLD-pass-12!', 4),
      mustChangePassword: true,
    });
    await service.changePassword(
      user,
      { currentPassword: 'OLD-pass-12!', newPassword: 'NEW-pass-12!' },
      { ip: null, userAgent: null },
    );
    expect(userRepo.update).toHaveBeenCalledWith(
      user.id,
      expect.objectContaining({ mustChangePassword: false }),
    );
    expect(tokens.revokeAllForUser).toHaveBeenCalledWith(user.id);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.password.changed' }),
    );
  });
});
