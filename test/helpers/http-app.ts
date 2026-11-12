import cookieParser from 'cookie-parser';
import type { INestApplication, Provider, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';

import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard.js';
import type { AccessTokenPayload } from '../../src/auth/types/jwt-payload.type.js';
import { createValidationPipe } from '../../src/common/pipes/validation.pipe.js';
import { USER_ROLES } from '../../src/users/entities/user-role.enum.js';

export const testEnv: Record<string, string | number> = {
  NODE_ENV: 'test',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'r'.repeat(32),
  JWT_ACCESS_TTL: 900,
  JWT_REFRESH_TTL_DAYS: 30,
};

export const testUser: AccessTokenPayload = {
  sub: '11111111-1111-4111-8111-111111111111',
  username: 'makarena',
  role: USER_ROLES.USER,
};

// A real Nest app around the given controllers: the real JwtAuthGuard,
// ValidationPipe and cookie parser, so status codes, @Public(), validation
// and cookies behave as in production. Services are whatever mocks the test
// passes in, so no database is needed.
export async function createHttpApp(options: {
  controllers: Type[];
  providers: Provider[];
  env?: Record<string, string | number>;
}): Promise<INestApplication<App>> {
  const env = { ...testEnv, ...options.env };

  const module = await Test.createTestingModule({
    controllers: options.controllers,
    providers: [
      ...options.providers,
      JwtService,
      { provide: ConfigService, useValue: { get: (key: string) => env[key] } },
      { provide: APP_GUARD, useClass: JwtAuthGuard },
    ],
  }).compile();

  const app = module.createNestApplication<INestApplication<App>>();
  app.useGlobalPipes(createValidationPipe());
  app.use(cookieParser());
  return app.init();
}

// "Bearer <token>" for the Authorization header, signed like the real
// access token.
export async function bearer(
  payload: AccessTokenPayload = testUser,
): Promise<string> {
  const token = await new JwtService().signAsync(payload, {
    secret: testEnv.JWT_ACCESS_SECRET as string,
  });
  return `Bearer ${token}`;
}
