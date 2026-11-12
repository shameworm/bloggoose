import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import {
  bearer,
  createHttpApp,
  testUser,
} from '../../test/helpers/http-app.js';
import { PostsController } from './posts.controller.js';
import { PostsService } from './posts.service.js';

const id = '22222222-2222-4222-8222-222222222222';
const parentId = '33333333-3333-4333-8333-333333333333';
const post = { id, authorId: testUser.sub, body: 'Hello, BlogGoose!' };

describe('PostsController (HTTP)', () => {
  let app: INestApplication<App>;
  let auth: string;
  let postsService: {
    findAll: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    postsService = {
      findAll: vi.fn().mockResolvedValue([post]),
      findById: vi.fn().mockResolvedValue(post),
      create: vi.fn().mockResolvedValue(post),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    app = await createHttpApp({
      controllers: [PostsController],
      providers: [{ provide: PostsService, useValue: postsService }],
    });
    auth = await bearer();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /posts', () => {
    it('is public and paginates by default', async () => {
      const res = await request(app.getHttpServer()).get('/posts').expect(200);

      expect(postsService.findAll).toHaveBeenCalledWith({ limit: 10, page: 1 });
      expect(res.body).toEqual([post]);
    });

    it('filters by author', async () => {
      await request(app.getHttpServer())
        .get(`/posts?authorId=${testUser.sub}&limit=5`)
        .expect(200);

      expect(postsService.findAll).toHaveBeenCalledWith({
        authorId: testUser.sub,
        limit: 5,
        page: 1,
      });
    });

    it('rejects an authorId that is not a UUID', async () => {
      await request(app.getHttpServer()).get('/posts?authorId=abc').expect(400);
    });
  });

  describe('GET /posts/:id', () => {
    it('is public', async () => {
      await request(app.getHttpServer()).get(`/posts/${id}`).expect(200);

      expect(postsService.findById).toHaveBeenCalledWith(id);
    });

    it('rejects an id that is not a UUID', async () => {
      await request(app.getHttpServer()).get('/posts/abc').expect(400);
    });
  });

  describe('POST /posts', () => {
    it('needs an access token', async () => {
      await request(app.getHttpServer())
        .post('/posts')
        .send({ body: 'Hello' })
        .expect(401);

      expect(postsService.create).not.toHaveBeenCalled();
    });

    it('takes the author from the access token', async () => {
      await request(app.getHttpServer())
        .post('/posts')
        .set('Authorization', auth)
        .send({ body: 'Hello', replyToId: parentId })
        .expect(201);

      expect(postsService.create).toHaveBeenCalledWith(testUser.sub, {
        body: 'Hello',
        replyToId: parentId,
      });
    });

    it('trims the body', async () => {
      await request(app.getHttpServer())
        .post('/posts')
        .set('Authorization', auth)
        .send({ body: '  Hello  ' })
        .expect(201);

      expect(postsService.create).toHaveBeenCalledWith(testUser.sub, {
        body: 'Hello',
      });
    });

    it('accepts exactly 500 characters', async () => {
      await request(app.getHttpServer())
        .post('/posts')
        .set('Authorization', auth)
        .send({ body: 'a'.repeat(500) })
        .expect(201);
    });

    it.each([
      ['an authorId (the token decides)', { body: 'Hi', authorId: id }],
      ['a body of only spaces', { body: '   ' }],
      ['a body over 500 characters', { body: 'a'.repeat(501) }],
      ['a body that is not a string', { body: 42 }],
      ['a replyToId that is not a UUID', { body: 'Hi', replyToId: 'abc' }],
      ['an invalid image URL', { body: 'Hi', featuredImageUrl: 'nope' }],
      ['a server-owned counter', { body: 'Hi', likeCount: 1000 }],
      ['an empty body', {}],
    ])('rejects %s', async (_name, body) => {
      await request(app.getHttpServer())
        .post('/posts')
        .set('Authorization', auth)
        .send(body)
        .expect(400);

      expect(postsService.create).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /posts/:id', () => {
    it('needs an access token', async () => {
      await request(app.getHttpServer()).delete(`/posts/${id}`).expect(401);

      expect(postsService.remove).not.toHaveBeenCalled();
    });

    it('answers 204', async () => {
      await request(app.getHttpServer())
        .delete(`/posts/${id}`)
        .set('Authorization', auth)
        .expect(204);

      expect(postsService.remove).toHaveBeenCalledWith(id);
    });
  });
});
