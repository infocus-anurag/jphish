import { ROLE_HIERARCHY, UserRole, isRoleAtLeast } from './user-role.enum';

describe('user-role enum', () => {
  it('hierarchy ranks super-admin > admin > analyst', () => {
    expect(ROLE_HIERARCHY[UserRole.SUPER_ADMIN]).toBeGreaterThan(ROLE_HIERARCHY[UserRole.ADMIN]);
    expect(ROLE_HIERARCHY[UserRole.ADMIN]).toBeGreaterThan(ROLE_HIERARCHY[UserRole.ANALYST]);
  });

  it.each([
    [UserRole.SUPER_ADMIN, UserRole.ANALYST, true],
    [UserRole.ADMIN, UserRole.ADMIN, true],
    [UserRole.ANALYST, UserRole.ADMIN, false],
    [UserRole.ANALYST, UserRole.SUPER_ADMIN, false],
  ])('isRoleAtLeast(%s, %s) === %s', (actual, required, expected) => {
    expect(isRoleAtLeast(actual, required)).toBe(expected);
  });
});
