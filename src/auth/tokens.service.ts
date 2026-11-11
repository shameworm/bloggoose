import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import type { EnvironmentVariables } from '../config/env.validation.js';
import type { PublicUser } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { RefreshToken } from './entities/refresh-token.entity.js';
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
  TokenPair,
} from './types/jwt-payload.type.js';

const DAY_SECONDS = 24 * 60 * 60;

@Injectable()
export class TokensService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly usersService: UsersService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
  ) {}

  public get refreshTtlSeconds(): number {
    return (
      this.config.get('JWT_REFRESH_TTL_DAYS', { infer: true }) * DAY_SECONDS
    );
  }

  public async issue(
    user: Pick<PublicUser, 'id' | 'username' | 'role'>,
    deviceName: string | null = null,
  ): Promise<TokenPair> {
    const id = randomUUID();
    const refreshPayload: RefreshTokenPayload = { sub: user.id, jti: id };
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      expiresIn: this.refreshTtlSeconds,
    });

    await this.refreshTokens.insert({
      id,
      userId: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + this.refreshTtlSeconds * 1000),
      deviceName: deviceName?.slice(0, 255) ?? null,
    });

    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.config.get('JWT_ACCESS_TTL', { infer: true }),
    });

    return { accessToken, refreshToken };
  }

  public async rotate(refreshToken: string): Promise<TokenPair> {
    const payload = await this.verify(refreshToken);
    const row = await this.refreshTokens.findOneBy({ id: payload.jti });

    if (
      !row ||
      row.userId !== payload.sub ||
      !sameHash(row.tokenHash, sha256(refreshToken))
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (row.revokedAt) {
      await this.revokeAllForUser(row.userId);
      throw new UnauthorizedException('Refresh token reused');
    }

    const { affected } = await this.refreshTokens.update(
      { id: row.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    if (!affected) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(row.userId).catch(() => {
      throw new UnauthorizedException('Invalid refresh token');
    });

    return this.issue(user, row.deviceName);
  }

  public async revoke(refreshToken: string): Promise<void> {
    const payload = await this.verify(refreshToken).catch(() => null);
    if (!payload) {
      return;
    }
    await this.refreshTokens.update(
      { id: payload.jti, userId: payload.sub, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  public async revokeAllForUser(userId: string): Promise<void> {
    await this.refreshTokens.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private async verify(refreshToken: string): Promise<RefreshTokenPayload> {
    try {
      return await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        { secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }) },
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function sameHash(a: string, b: string): boolean {
  return (
    a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))
  );
}
