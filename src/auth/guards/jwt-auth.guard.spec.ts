import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import { Public } from '../../common/decorators/public.decorator.js';
import { USER_ROLES } from '../../users/entities/user-role.enum.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

const secret = 'a'.repeat(32);
const payload = {
  sub: '11111111-1111-4111-8111-111111111111',
  username: 'makarena',
  role: USER_ROLES.USER,
};

// Real decorated classes, read by a real Reflector: the test fails if the
// guard looks for @Public() in the wrong place.
class PrivateController {
  closed() {}

  @Public()
  open() {}
}

@Public()
class PublicController {
  anything() {}
}

type AnyController = typeof PrivateController | typeof PublicController;

// A fake ExecutionContext for a call to controller[method] with the given
// request headers.
function contextFor(
  controller: AnyController,
  method: string,
  headers: Record<string, string> = {},
) {
  const request: { headers: Record<string, string>; user?: unknown } = {
    headers,
  };
  const prototype = controller.prototype as unknown as Record<string, unknown>;
  const context = {
    getHandler: () => prototype[method],
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

// A protected route called with "Authorization: <value>".
const protectedWith = (authorization: string) =>
  contextFor(PrivateController, 'closed', { authorization }).context;

describe('JwtAuthGuard', () => {
  const jwt = new JwtService();
  const config = { get: () => secret } as unknown as ConfigService<never, true>;
  const guard = new JwtAuthGuard(jwt, new Reflector(), config);

  describe('@Public()', () => {
    it('lets a @Public() method through without a token', async () => {
      await expect(
        guard.canActivate(contextFor(PrivateController, 'open').context),
      ).resolves.toBe(true);
    });

    it('lets every method of a @Public() controller through', async () => {
      await expect(
        guard.canActivate(contextFor(PublicController, 'anything').context),
      ).resolves.toBe(true);
    });

    it('protects methods without @Public()', async () => {
      await expect(
        guard.canActivate(contextFor(PrivateController, 'closed').context),
      ).rejects.toThrow('Missing access token');
    });
  });

  it('puts only the known claims on request.user', async () => {
    // iat/exp and anything extra in the token are not copied.
    const token = await jwt.signAsync({ ...payload, extra: 'x' }, { secret });
    const { context, request } = contextFor(PrivateController, 'closed', {
      authorization: `Bearer ${token}`,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(payload);
  });

  it.each([
    ['no "Bearer" prefix', (token: string) => token],
    ['another scheme', (token: string) => `Basic ${token}`],
    ['"Bearer" with nothing after it', () => 'Bearer '],
  ])('rejects %s', async (_name, header) => {
    const token = await jwt.signAsync(payload, { secret });

    await expect(
      guard.canActivate(protectedWith(header(token))),
    ).rejects.toThrow('Missing access token');
  });

  it('rejects a token signed with another secret', async () => {
    const token = await jwt.signAsync(payload, { secret: 'b'.repeat(32) });

    await expect(
      guard.canActivate(protectedWith(`Bearer ${token}`)),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an expired token', async () => {
    const token = await jwt.signAsync(payload, { secret, expiresIn: -1 });

    await expect(
      guard.canActivate(protectedWith(`Bearer ${token}`)),
    ).rejects.toThrow('Invalid or expired access token');
  });

  it('rejects a token that is not a JWT', async () => {
    await expect(
      guard.canActivate(protectedWith('Bearer not-a-jwt')),
    ).rejects.toThrow('Invalid or expired access token');
  });
});
