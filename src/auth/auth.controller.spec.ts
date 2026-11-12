import { type INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import {
  bearer,
  createHttpApp,
  testUser,
} from '../../test/helpers/http-app.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { TokensService } from './tokens.service.js';

const user = { id: testUser.sub, username: testUser.username };
const signupBody = {
  email: 'johndoe@example.com',
  username: 'makarena',
  password: 'Veryoriginal1!',
};
const THIRTY_DAYS = 30 * 24 * 60 * 60;

// All Set-Cookie headers of a response, as one string.
function setCookie(res: request.Response): string {
  const header = res.headers['set-cookie'] as string[] | string | undefined;
  return ([] as string[]).concat(header ?? []).join('\n');
}

describe('AuthController (HTTP)', () => {
  let app: INestApplication<App>;
  let authService: {
    signup: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    me: ReturnType<typeof vi.fn>;
  };

  async function start(env?: Record<string, string>) {
    app = await createHttpApp({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        // Only the cookie lifetime is read from TokensService here.
        {
          provide: TokensService,
          useValue: { refreshTtlSeconds: THIRTY_DAYS },
        },
      ],
      env,
    });
  }

  beforeEach(async () => {
    authService = {
      signup: vi.fn().mockResolvedValue({
        user,
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
      }),
      login: vi.fn().mockResolvedValue({
        user,
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
      }),
      refresh: vi
        .fn()
        .mockResolvedValue({
          accessToken: 'access-2',
          refreshToken: 'refresh-2',
        }),
      logout: vi.fn().mockResolvedValue(undefined),
      me: vi.fn().mockResolvedValue(user),
    };
    await start();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /auth/signup', () => {
    it('returns the access token and puts the refresh token in a cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('User-Agent', 'vitest')
        .send(signupBody)
        .expect(201);

      expect(res.body).toEqual({ accessToken: 'access-1', user });
      // The refresh token is only in the cookie, never in the body.
      expect(JSON.stringify(res.body)).not.toContain('refresh-1');
      expect(authService.signup).toHaveBeenCalledWith(signupBody, 'vitest');

      const cookie = setCookie(res);
      expect(cookie).toContain('refresh_token=refresh-1');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Path=/auth');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).toContain(`Max-Age=${THIRTY_DAYS}`);
      // Not in production, so plain http works locally.
      expect(cookie).not.toContain('Secure');
    });

    it('rejects an invalid body before reaching the service', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ ...signupBody, email: 'not-an-email' })
        .expect(400);

      expect(authService.signup).not.toHaveBeenCalled();
    });

    it('rejects fields the client must not set, like role', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ ...signupBody, role: 'admin' })
        .expect(400);

      expect(authService.signup).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/login', () => {
    it('answers 200 with the access token and sets the cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ login: 'makarena', password: 'Veryoriginal1!' })
        .expect(200);

      expect(res.body).toEqual({ accessToken: 'access-1', user });
      expect(setCookie(res)).toContain('refresh_token=refresh-1');
    });

    it('passes null as the device when there is no User-Agent', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .unset('User-Agent')
        .send({ login: 'makarena', password: 'Veryoriginal1!' })
        .expect(200);

      expect(authService.login).toHaveBeenCalledWith(
        { login: 'makarena', password: 'Veryoriginal1!' },
        null,
      );
    });

    it('answers 401 and sets no cookie for wrong credentials', async () => {
      authService.login.mockRejectedValue(
        new UnauthorizedException('Invalid login or password'),
      );

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ login: 'makarena', password: 'wrong' })
        .expect(401);

      expect(setCookie(res)).toBe('');
    });

    it('rejects an empty body', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(400);

      expect(authService.login).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/refresh', () => {
    it('swaps the cookie for a new one and returns a new access token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', 'refresh_token=refresh-1')
        .expect(200);

      expect(authService.refresh).toHaveBeenCalledWith('refresh-1');
      expect(res.body).toEqual({ accessToken: 'access-2' });
      expect(setCookie(res)).toContain('refresh_token=refresh-2');
    });

    it('answers 401 without a cookie', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').expect(401);

      expect(authService.refresh).not.toHaveBeenCalled();
    });

    it('clears the cookie when the refresh token is dead', async () => {
      authService.refresh.mockRejectedValue(
        new UnauthorizedException('Refresh token reused'),
      );

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', 'refresh_token=stolen')
        .expect(401);

      // Clearing = the same cookie, empty, already expired, same path.
      const cookie = setCookie(res);
      expect(cookie).toContain('refresh_token=;');
      expect(cookie).toContain('Path=/auth');
      expect(cookie).toContain('Expires=Thu, 01 Jan 1970');
    });
  });

  describe('POST /auth/logout', () => {
    it('revokes the token and clears the cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', 'refresh_token=refresh-1')
        .expect(204);

      expect(authService.logout).toHaveBeenCalledWith('refresh-1');
      expect(setCookie(res)).toContain('refresh_token=;');
    });

    it('still answers 204 without a cookie', async () => {
      await request(app.getHttpServer()).post('/auth/logout').expect(204);

      expect(authService.logout).not.toHaveBeenCalled();
    });
  });

  describe('GET /auth/me', () => {
    it('answers 401 without an access token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('returns the user from the access token', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', await bearer())
        .expect(200);

      expect(authService.me).toHaveBeenCalledWith(testUser.sub);
      expect(res.body).toEqual(user);
    });
  });

  it('marks the cookie Secure in production', async () => {
    await app.close();
    await start({ NODE_ENV: 'production' });

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'makarena', password: 'Veryoriginal1!' })
      .expect(200);

    expect(setCookie(res)).toContain('Secure');
  });
});
