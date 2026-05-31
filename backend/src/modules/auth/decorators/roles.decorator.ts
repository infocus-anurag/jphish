import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enums/user-role.enum';

export const ROLES_KEY = 'roles';
/**
 * Restrict a route to one or more roles. Combine with RolesGuard.
 * Pass the *minimum* role(s) required — the guard does an exact match against
 * the listed set; use multiple values to allow any of them.
 */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
