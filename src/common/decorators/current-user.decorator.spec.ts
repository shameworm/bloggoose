import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants.js';

import { USER_ROLES } from '../../users/entities/user-role.enum.js';
import { CurrentUser } from './current-user.decorator.js';

// Nest stores a param decorator's function in route metadata; dig it out so
// it can be called directly with a fake request.
function currentUserFactory() {
  class Controller {
    handler(@CurrentUser() _user: unknown) {}
  }
  const args = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    Controller,
    'handler',
  ) as Record<
    string,
    { factory: (data: unknown, ctx: ExecutionContext) => unknown }
  >;
  return Object.values(args)[0].factory;
}

const contextWith = (user?: unknown) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('@CurrentUser()', () => {
  const factory = currentUserFactory();

  it('returns request.user set by the guard', () => {
    const user = { sub: 'id', username: 'makarena', role: USER_ROLES.USER };

    expect(factory(undefined, contextWith(user))).toBe(user);
  });

  it('throws on a route the guard did not check (@Public)', () => {
    expect(() => factory(undefined, contextWith())).toThrow(
      UnauthorizedException,
    );
  });
});
