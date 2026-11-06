import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AuthService } from '../auth/auth.service.js';
import { UsersService } from '../users/users.service.js';
import { PostsService } from './posts.service.js';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const title = 'My First Post!';
const content = 'A post long enough to pass the thirty character minimum.';

describe('PostsService', () => {
  let service: PostsService;
  let authorId: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostsService, UsersService, AuthService],
    }).compile();

    service = module.get<PostsService>(PostsService);
    ({ id: authorId } = module.get<UsersService>(UsersService).create({
      email: 'johndoe@example.com',
      username: 'makarena',
      password: 'Veryoriginal1!',
    }));
  });

  it('creates a draft with server-set fields', () => {
    const post = service.create({ authorId, title, content });

    expect(post).toMatchObject({
      id: expect.stringMatching(UUID),
      authorId,
      title,
      slug: 'my-first-post',
      content,
      publishedAt: null,
    });
    expect(post.createdAt).toBeInstanceOf(Date);
    expect(post.updatedAt).toEqual(post.createdAt);
  });

  it('publishes on create when asked', () => {
    const post = service.create({ authorId, title, content, publish: true });

    expect(post.publishedAt).toEqual(post.createdAt);
  });

  it('makes slugs unique and keeps non-latin letters', () => {
    expect(service.create({ authorId, title, content }).slug).toBe(
      'my-first-post',
    );
    expect(service.create({ authorId, title, content }).slug).toBe(
      'my-first-post-2',
    );
    expect(
      service.create({ authorId, title: 'Привіт, світ', content }).slug,
    ).toBe('привіт-світ');
  });

  it('rejects a post from an unknown author', () => {
    expect(() =>
      service.create({
        authorId: '00000000-0000-0000-0000-000000000000',
        title,
        content,
      }),
    ).toThrow(NotFoundException);
  });

  it('paginates posts', () => {
    const ids = [0, 1, 2].map(
      () => service.create({ authorId, title, content }).id,
    );

    expect(service.findAll({ limit: 2, page: 1 }).map((p) => p.id)).toEqual(
      ids.slice(0, 2),
    );
    expect(service.findAll({ limit: 2, page: 2 }).map((p) => p.id)).toEqual(
      ids.slice(2),
    );
  });

  it('filters posts by author', () => {
    service.create({ authorId, title, content });

    expect(service.findAll({ authorId, limit: 10, page: 1 })).toHaveLength(1);
    expect(
      service.findAll({
        authorId: '00000000-0000-0000-0000-000000000000',
        limit: 10,
        page: 1,
      }),
    ).toEqual([]);
  });

  it('throws NotFoundException for an unknown id', () => {
    expect(() =>
      service.findById('00000000-0000-0000-0000-000000000000'),
    ).toThrow(NotFoundException);
  });

  it('updates fields and bumps updatedAt but keeps the slug', () => {
    const post = service.create({ authorId, title, content });
    const createdAt = post.createdAt;
    post.updatedAt = new Date(0);

    const updated = service.update(post.id, { title: 'A new title' });

    expect(updated.title).toBe('A new title');
    expect(updated.slug).toBe('my-first-post');
    expect(updated.createdAt).toBe(createdAt);
    expect(updated.updatedAt.getTime()).toBeGreaterThan(0);
  });

  it('publishes and unpublishes', () => {
    const { id } = service.create({ authorId, title, content });

    const published = service.update(id, { publish: true });
    expect(published.publishedAt).toBeInstanceOf(Date);

    const firstPublishedAt = published.publishedAt;
    expect(service.update(id, { publish: true }).publishedAt).toBe(
      firstPublishedAt,
    );

    expect(service.update(id, { publish: false }).publishedAt).toBeNull();
  });

  it('removes a post', () => {
    const { id } = service.create({ authorId, title, content });

    service.remove(id);

    expect(() => service.findById(id)).toThrow(NotFoundException);
  });
});
