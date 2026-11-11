import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { USER_ROLES } from '../users/entities/user-role.enum.js';
import { UsersService } from '../users/users.service.js';
import { RefreshToken } from './entities/refresh-token.entity.js';
import { TokensService } from './tokens.service.js';
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
} from './types/jwt-payload.type.js';

const env: Record<string, string | number> = {
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'r'.repeat(32),
  JWT_ACCESS_TTL: 900,
  JWT_REFRESH_TTL_DAYS: 30,
};

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  username: 'makarena',
  role: USER_ROLES.USER,
};

// A real JwtService signs real tokens; only the database is faked: an
// in-memory table of refresh_tokens rows.
describe('TokensService', () => {
  let service: TokensService;
  let jwt: JwtService;
  let rows: Map<string, RefreshToken>;
  let usersService: { findById: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    rows = new Map();
    const matches = (row: RefreshToken, where: Partial<RefreshToken>) =>
      Object.entries(where).every(([key, value]) =>
        // IsNull() is a FindOperator object; treat it as "is null".
        typeof value === 'object' && value !== null
          ? row[key as keyof RefreshToken] === null
          : row[key as keyof RefreshToken] === value,
      );

    const repository = {
      insert: vi.fn((row: RefreshToken) => {
        // insert() leaves out revokedAt; the database default is NULL.
        rows.set(
          row.id,
          Object.assign(new RefreshToken(), row, {
            revokedAt: row.revokedAt ?? null,
          }),
        );
        return Promise.resolve();
      }),
      findOneBy: vi.fn(({ id }: { id: string }) =>
        Promise.resolve(rows.get(id) ?? null),
      ),
      update: vi.fn(
        (where: Partial<RefreshToken>, changes: Partial<RefreshToken>) => {
          let affected = 0;
          for (const row of rows.values()) {
            if (matches(row, where)) {
              Object.assign(row, changes);
              affected++;
            }
          }
          return Promise.resolve({ affected });
        },
      ),
    };
    usersService = { findById: vi.fn().mockResolvedValue(user) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokensService,
        JwtService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => env[key] },
        },
        { provide: UsersService, useValue: usersService },
        { provide: getRepositoryToken(RefreshToken), useValue: repository },
      ],
    }).compile();

    service = module.get(TokensService);
    jwt = module.get(JwtService);
  });

  it('issues an access token with the user and a refresh token with a row', async () => {
    const { accessToken, refreshToken } = await service.issue(user, 'vitest');

    const access = await jwt.verifyAsync<AccessTokenPayload>(accessToken, {
      secret: env.JWT_ACCESS_SECRET as string,
    });
    expect(access).toMatchObject({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    const refresh = await jwt.verifyAsync<RefreshTokenPayload>(refreshToken, {
      secret: env.JWT_REFRESH_SECRET as string,
    });
    const row = rows.get(refresh.jti);
    expect(row).toMatchObject({ userId: user.id, deviceName: 'vitest' });
    // Only the hash is stored.
    expect(row?.tokenHash).toHaveLength(64);
    expect(row?.tokenHash).not.toBe(refreshToken);
  });

  it('signs the two tokens with different secrets', async () => {
    const { accessToken } = await service.issue(user);

    await expect(
      jwt.verifyAsync(accessToken, {
        secret: env.JWT_REFRESH_SECRET as string,
      }),
    ).rejects.toThrow();
  });

  it('rotates: a new pair works, the old refresh token is revoked', async () => {
    const first = await service.issue(user);

    const second = await service.rotate(first.refreshToken);

    expect(second.refreshToken).not.toBe(first.refreshToken);
    await expect(service.rotate(second.refreshToken)).resolves.toBeDefined();
  });

  it('treats reuse of a rotated token as theft and ends every session', async () => {
    const stolen = await service.issue(user);
    const other = await service.issue(user, 'phone');
    await service.rotate(stolen.refreshToken);

    await expect(service.rotate(stolen.refreshToken)).rejects.toThrow(
      'Refresh token reused',
    );
    // The other device is logged out too.
    await expect(service.rotate(other.refreshToken)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a token after logout', async () => {
    const { refreshToken } = await service.issue(user);

    await service.revoke(refreshToken);

    await expect(service.rotate(refreshToken)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects garbage and access tokens as refresh tokens', async () => {
    const { accessToken } = await service.issue(user);

    await expect(service.rotate('not-a-jwt')).rejects.toThrow(
      'Invalid refresh token',
    );
    await expect(service.rotate(accessToken)).rejects.toThrow(
      'Invalid refresh token',
    );
  });

  it('rejects a refresh when the user no longer exists', async () => {
    const { refreshToken } = await service.issue(user);
    usersService.findById.mockRejectedValue(new Error('not found'));

    await expect(service.rotate(refreshToken)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('ignores an invalid token on logout', async () => {
    await expect(service.revoke('not-a-jwt')).resolves.toBeUndefined();
  });
});
