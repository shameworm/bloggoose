import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { bearer, createHttpApp } from '../../test/helpers/http-app.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

const id = '22222222-2222-4222-8222-222222222222';
const user = { id, username: 'makarena' };

describe('UsersController (HTTP)', () => {
  let app: INestApplication<App>;
  let auth: string;
  let usersService: {
    findAll: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    usersService = {
      findAll: vi.fn().mockResolvedValue([user]),
      findById: vi.fn().mockResolvedValue(user),
      create: vi.fn().mockResolvedValue(user),
      update: vi.fn().mockResolvedValue(user),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    app = await createHttpApp({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    });
    auth = await bearer();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /users', () => {
    it('needs an access token', async () => {
      await request(app.getHttpServer()).get('/users').expect(401);

      expect(usersService.findAll).not.toHaveBeenCalled();
    });

    it('uses page 1 and 10 per page by default', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', auth)
        .expect(200);

      expect(usersService.findAll).toHaveBeenCalledWith({ limit: 10, page: 1 });
    });

    it('turns query strings into numbers', async () => {
      await request(app.getHttpServer())
        .get('/users?limit=5&page=2')
        .set('Authorization', auth)
        .expect(200);

      expect(usersService.findAll).toHaveBeenCalledWith({ limit: 5, page: 2 });
    });

    it.each(['limit=0', 'limit=101', 'limit=abc', 'page=0', 'page=1.5'])(
      'rejects ?%s',
      async (query) => {
        await request(app.getHttpServer())
          .get(`/users?${query}`)
          .set('Authorization', auth)
          .expect(400);

        expect(usersService.findAll).not.toHaveBeenCalled();
      },
    );
  });

  describe('GET /users/:id', () => {
    it('is public', async () => {
      const res = await request(app.getHttpServer())
        .get(`/users/${id}`)
        .expect(200);

      expect(usersService.findById).toHaveBeenCalledWith(id);
      expect(res.body).toEqual(user);
    });

    it('rejects an id that is not a UUID', async () => {
      await request(app.getHttpServer()).get('/users/abc').expect(400);

      expect(usersService.findById).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /users/:id', () => {
    it('needs an access token', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${id}`)
        .send({ bio: 'hi' })
        .expect(401);
    });

    it('accepts a partial update', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${id}`)
        .set('Authorization', auth)
        .send({ bio: 'hi' })
        .expect(200);

      expect(usersService.update).toHaveBeenCalledWith(id, { bio: 'hi' });
    });

    it.each([
      ['an unknown field', { isAdmin: true }],
      ['a server-owned field', { postCount: 1000 }],
      ['the role', { role: 'admin' }],
      ['a bio over 160 characters', { bio: 'a'.repeat(161) }],
      ['a weak password', { password: 'password' }],
    ])('rejects %s', async (_name, body) => {
      await request(app.getHttpServer())
        .patch(`/users/${id}`)
        .set('Authorization', auth)
        .send(body)
        .expect(400);

      expect(usersService.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /users/:id', () => {
    it('needs an access token', async () => {
      await request(app.getHttpServer()).delete(`/users/${id}`).expect(401);

      expect(usersService.remove).not.toHaveBeenCalled();
    });

    it('answers 204 with no body', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/users/${id}`)
        .set('Authorization', auth)
        .expect(204);

      expect(usersService.remove).toHaveBeenCalledWith(id);
      expect(res.text).toBe('');
    });
  });
});
