import { toUserView } from './user.serializer';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';

describe('toUserView', () => {
  it('omits passwordHash and serializes dates as ISO strings', () => {
    const created = new Date('2025-01-02T03:04:05.000Z');
    const lastLogin = new Date('2025-02-02T00:00:00.000Z');
    const u = {
      id: 'uuid-1',
      email: 'u@example.test',
      firstName: 'A',
      lastName: 'B',
      passwordHash: 'super-secret-hash',
      role: UserRole.ADMIN,
      isActive: true,
      mustChangePassword: false,
      lastLoginAt: lastLogin,
      createdAt: created,
    } as unknown as User;

    const view = toUserView(u);
    expect(view).toEqual({
      id: 'uuid-1',
      email: 'u@example.test',
      firstName: 'A',
      lastName: 'B',
      role: UserRole.ADMIN,
      isActive: true,
      mustChangePassword: false,
      lastLoginAt: lastLogin.toISOString(),
      createdAt: created.toISOString(),
    });
    expect((view as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it('returns null for lastLoginAt when user has never signed in', () => {
    const u = {
      id: 'uuid-2',
      email: 'never@example.test',
      firstName: 'N',
      lastName: 'V',
      passwordHash: 'h',
      role: UserRole.ANALYST,
      isActive: true,
      mustChangePassword: true,
      lastLoginAt: null,
      createdAt: new Date('2025-03-01T00:00:00.000Z'),
    } as unknown as User;

    expect(toUserView(u).lastLoginAt).toBeNull();
  });
});
