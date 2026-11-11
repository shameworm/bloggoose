import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import { USER_ROLES } from '../../users/entities/user-role.enum.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

const secret = 'a'.repeat(32);
const payload = {
  sub: '11111111-1111-4111-8111-111111111111',
  username: 'makarena',
  role: USER_ROLES.USER,
};

// A fake ExecutionContext around a request with the given headers.
function contextWith(headers: Record<string, string>) {
  const request: { headers: Record<string, string>; user?: unknown } = {
    headers,
  };
  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('JwtAuthGuard', () => {
  const jwt = new JwtService();
  const config = { get: () => secret } as unknown as ConfigService<never, true>;
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };
  let guard: JwtAuthGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) };
    guard = new JwtAuthGuard(jwt, reflector as unknown as Reflector, config);
  });

  it('lets @Public() routes through without a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(guard.canActivate(contextWith({}).context)).resolves.toBe(
      true,
    );
  });

  it('puts the token payload on request.user', async () => {
    const token = await jwt.signAsync(payload, { secret });
    const { context, request } = contextWith({
      authorization: `Bearer ${token}`,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(payload);
  });

  it('rejects a missing token', async () => {
    await expect(guard.canActivate(contextWith({}).context)).rejects.toThrow(
      'Missing access token',
    );
  });

  it('rejects a token signed with another secret', async () => {
    const token = await jwt.signAsync(payload, { secret: 'b'.repeat(32) });

    await expect(
      guard.canActivate(
        contextWith({ authorization: `Bearer ${token}` }).context,
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an expired token', async () => {
    const token = await jwt.signAsync(payload, { secret, expiresIn: -1 });

    await expect(
      guard.canActivate(
        contextWith({ authorization: `Bearer ${token}` }).context,
      ),
    ).rejects.toThrow('Invalid or expired access token');
  });
});
