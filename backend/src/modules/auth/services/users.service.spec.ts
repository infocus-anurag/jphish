import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { TokensService } from './tokens.service';
import { AuditService } from './audit.service';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'a@b.test',
    firstName: 'A',
    lastName: 'B',
    passwordHash: 'h',
    role: UserRole.ANALYST,
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    lastLoginIp: null,
    passwordChangedAt: new Date(),
    mustChangePassword: false,
    refreshTokens: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

describe('UsersService', () => {
  let service: UsersService;
  let users: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  let tokens: { revokeAllForUser: jest.Mock };
  let audit: { record: jest.Mock };

  beforeEach(async () => {
    users = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((row) => row),
      save: jest.fn(async (row) => ({ id: 'new-id', ...row })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      count: jest.fn().mockResolvedValue(2),
    };
    tokens = { revokeAllForUser: jest.fn().mockResolvedValue(undefined) };
    audit = { record: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: users },
        { provide: TokensService, useValue: tokens },
        { provide: AuditService, useValue: audit },
        {
          provide: ConfigService,
          useValue: { get: (k: string, fb?: any) => (k === 'BCRYPT_ROUNDS' ? 4 : fb) },
        },
      ],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  describe('findById', () => {
    it('throws NotFound when the user does not exist', async () => {
      users.findOne.mockResolvedValueOnce(null);
      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('forbids a non-super-admin from minting another super-admin', async () => {
      const actor = fakeUser({ role: UserRole.ADMIN });
      await expect(
        service.create(
          { email: 'x@x.test', firstName: 'X', lastName: 'Y', role: UserRole.SUPER_ADMIN },
          actor,
          {},
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects duplicate emails with Conflict', async () => {
      users.findOne.mockResolvedValueOnce(fakeUser({ email: 'x@x.test' }));
      const actor = fakeUser({ role: UserRole.ADMIN });
      await expect(
        service.create(
          { email: 'x@x.test', firstName: 'X', lastName: 'Y', role: UserRole.ANALYST },
          actor,
          {},
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('returns a generated temp password when none was provided', async () => {
      users.findOne.mockResolvedValueOnce(null);
      const actor = fakeUser({ role: UserRole.ADMIN });
      const result = await service.create(
        { email: 'new@x.test', firstName: 'N', lastName: 'U', role: UserRole.ANALYST },
        actor,
        {},
      );
      expect(result.tempPassword).toBeDefined();
      expect(result.tempPassword!.length).toBeGreaterThan(8);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'user.created' }),
      );
    });

    it('does not return a temp password when caller supplied one', async () => {
      users.findOne.mockResolvedValueOnce(null);
      const actor = fakeUser({ role: UserRole.ADMIN });
      const result = await service.create(
        {
          email: 'new@x.test',
          firstName: 'N',
          lastName: 'U',
          role: UserRole.ANALYST,
          password: 'CallerSetPass1!',
        },
        actor,
        {},
      );
      expect(result.tempPassword).toBeUndefined();
    });
  });

  describe('update', () => {
    it('forbids non-super-admin from editing a super-admin', async () => {
      users.findOne.mockResolvedValueOnce(fakeUser({ role: UserRole.SUPER_ADMIN }));
      const actor = fakeUser({ role: UserRole.ADMIN });
      await expect(service.update('uid', { firstName: 'X' }, actor, {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('revokes refresh tokens and audits when a user is deactivated', async () => {
      users.findOne.mockResolvedValueOnce(fakeUser({ id: 'target', isActive: true }));
      const actor = fakeUser({ role: UserRole.ADMIN });
      await service.update('target', { isActive: false }, actor, {});
      expect(tokens.revokeAllForUser).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'user.deactivated' }),
      );
    });

    it('does not revoke tokens when reactivating', async () => {
      users.findOne.mockResolvedValueOnce(fakeUser({ id: 'target', isActive: false }));
      const actor = fakeUser({ role: UserRole.ADMIN });
      await service.update('target', { isActive: true }, actor, {});
      expect(tokens.revokeAllForUser).not.toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'user.activated' }),
      );
    });
  });

  describe('setRole', () => {
    it('forbids changing your own role', async () => {
      const actor = fakeUser({ id: 'self', role: UserRole.SUPER_ADMIN });
      await expect(service.setRole('self', UserRole.ADMIN, actor, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('forbids non-super-admin from minting a super-admin', async () => {
      users.findOne.mockResolvedValueOnce(fakeUser({ id: 'target', role: UserRole.ADMIN }));
      const actor = fakeUser({ id: 'actor', role: UserRole.ADMIN });
      await expect(service.setRole('target', UserRole.SUPER_ADMIN, actor, {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('refuses to demote the last remaining active super-admin', async () => {
      users.findOne.mockResolvedValueOnce(fakeUser({ id: 'target', role: UserRole.SUPER_ADMIN }));
      users.count.mockResolvedValueOnce(1);
      const actor = fakeUser({ id: 'actor', role: UserRole.SUPER_ADMIN });
      await expect(service.setRole('target', UserRole.ADMIN, actor, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rotates role, revokes tokens, and audits with from/to metadata', async () => {
      users.findOne.mockResolvedValueOnce(fakeUser({ id: 'target', role: UserRole.ANALYST }));
      const actor = fakeUser({ id: 'actor', role: UserRole.SUPER_ADMIN });
      await service.setRole('target', UserRole.ADMIN, actor, {});
      expect(tokens.revokeAllForUser).toHaveBeenCalledWith('target');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user.role.updated',
          metadata: expect.objectContaining({ from: UserRole.ANALYST, to: UserRole.ADMIN }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('forbids deleting yourself', async () => {
      const actor = fakeUser({ id: 'self', role: UserRole.SUPER_ADMIN });
      await expect(service.remove('self', actor, {})).rejects.toThrow(BadRequestException);
    });

    it('refuses to delete the last super-admin', async () => {
      users.findOne.mockResolvedValueOnce(fakeUser({ id: 'target', role: UserRole.SUPER_ADMIN }));
      users.count.mockResolvedValueOnce(1);
      const actor = fakeUser({ id: 'actor', role: UserRole.SUPER_ADMIN });
      await expect(service.remove('target', actor, {})).rejects.toThrow(BadRequestException);
    });

    it('deletes, revokes tokens, and audits the removal', async () => {
      users.findOne.mockResolvedValueOnce(fakeUser({ id: 'target', role: UserRole.ANALYST }));
      const actor = fakeUser({ id: 'actor', role: UserRole.SUPER_ADMIN });
      await service.remove('target', actor, {});
      expect(users.delete).toHaveBeenCalledWith('target');
      expect(tokens.revokeAllForUser).toHaveBeenCalledWith('target');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'user.deleted' }),
      );
    });
  });
});
