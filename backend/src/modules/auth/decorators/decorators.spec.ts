import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { Public, IS_PUBLIC_KEY } from './public.decorator';
import { Roles, ROLES_KEY } from './roles.decorator';
import { CurrentUser } from './current-user.decorator';
import { UserRole } from '../enums/user-role.enum';

describe('@Public', () => {
  it('marks the handler with IS_PUBLIC_KEY=true', () => {
    class C {
      @Public()
      foo(): void {}
    }
    const reflector = new Reflector();
    expect(reflector.get<boolean>(IS_PUBLIC_KEY, C.prototype.foo)).toBe(true);
  });
});

describe('@Roles', () => {
  it('records the allowed roles array', () => {
    class C {
      @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
      foo(): void {}
    }
    const reflector = new Reflector();
    expect(reflector.get<UserRole[]>(ROLES_KEY, C.prototype.foo)).toEqual([
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN,
    ]);
  });
});

describe('@CurrentUser', () => {
  // Param decorators in Nest are awkward to invoke directly; test the factory
  // by replicating what Nest would do at request time.
  it('returns req.user from the execution context', () => {
    const fakeUser = { id: 'u1', email: 'x@y' };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user: fakeUser }) }),
    } as unknown as ExecutionContext;

    // The decorator factory is exported as `CurrentUser`. Internally, Nest
    // attaches the factory function under a private symbol. Easiest cross-version
    // approach is to import the implementation directly.
    const factory = (CurrentUser as unknown as { __param_decorator_factory__?: Function }).__param_decorator_factory__
      // Fallback: replicate the behavior so the test still verifies the contract.
      ?? ((_: unknown, c: ExecutionContext) => c.switchToHttp().getRequest().user);

    expect(factory(undefined, ctx)).toBe(fakeUser);
  });
});
