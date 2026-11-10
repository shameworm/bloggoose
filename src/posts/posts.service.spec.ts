import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { UsersService } from '../users/users.service.js';
import { Post } from './entities/post.entity.js';
import { PostsService } from './posts.service.js';

const id = '22222222-2222-4222-8222-222222222222';
const authorId = '11111111-1111-4111-8111-111111111111';
const unknownId = '00000000-0000-0000-0000-000000000000';

const title = 'My First Post!';
const content = 'A post long enough to pass the thirty character minimum.';

// What the database would hold for a post.
const storedPost = (fields: Partial<Post> = {}): Post =>
  Object.assign(
    {
      id,
      authorId,
      title,
      slug: 'my-first-post',
      content,
      featuredImageUrl: null,
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    fields,
  );

describe('PostsService', () => {
  let service: PostsService;
  let usersService: { findById: ReturnType<typeof vi.fn> };
  let repository: {
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    existsBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    merge: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    usersService = {
      findById: vi.fn((userId: string) =>
        userId === authorId
          ? Promise.resolve({ id: userId })
          : Promise.reject(new NotFoundException()),
      ),
    };
    repository = {
      find: vi.fn().mockResolvedValue([]),
      findOneBy: vi.fn().mockResolvedValue(null),
      existsBy: vi.fn().mockResolvedValue(false),
      create: vi.fn((fields: Partial<Post>) => Object.assign({}, fields)),
      merge: vi.fn((post: Post, fields: Partial<Post>) =>
        Object.assign(post, fields),
      ),
      save: vi.fn((post: Partial<Post>) => Promise.resolve(storedPost(post))),
      remove: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: UsersService, useValue: usersService },
        { provide: getRepositoryToken(Post), useValue: repository },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
  });

  it('creates a draft with a slug from the title', async () => {
    await service.create({ authorId, title, content });

    expect(repository.save).toHaveBeenCalledWith({
      authorId,
      title,
      slug: 'my-first-post',
      content,
      featuredImageUrl: null,
      publishedAt: null,
    });
  });

  it('publishes on create when asked', async () => {
    const post = await service.create({
      authorId,
      title,
      content,
      publish: true,
    });

    expect(post.publishedAt).toBeInstanceOf(Date);
  });

  it('adds a number to the slug when it is taken', async () => {
    repository.existsBy.mockImplementation(({ slug }: Partial<Post>) =>
      Promise.resolve(slug === 'my-first-post' || slug === 'my-first-post-2'),
    );

    const post = await service.create({ authorId, title, content });

    expect(post.slug).toBe('my-first-post-3');
  });

  it('keeps non-latin letters in the slug', async () => {
    const post = await service.create({
      authorId,
      title: 'Привіт, світ',
      content,
    });

    expect(post.slug).toBe('привіт-світ');
  });

  it('rejects a post from an unknown author', async () => {
    await expect(
      service.create({ authorId: unknownId, title, content }),
    ).rejects.toThrow(NotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('paginates posts by creation time', async () => {
    await service.findAll({ limit: 2, page: 3 });

    expect(repository.find).toHaveBeenCalledWith({
      where: {},
      order: { createdAt: 'ASC' },
      skip: 4,
      take: 2,
    });
  });

  it('filters posts by author', async () => {
    await service.findAll({ authorId, limit: 10, page: 1 });

    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { authorId } }),
    );
  });

  it('throws NotFoundException for an unknown id', async () => {
    await expect(service.findById(unknownId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updates fields but keeps the slug', async () => {
    repository.findOneBy.mockResolvedValue(storedPost());

    const updated = await service.update(id, { title: 'A new title' });

    expect(updated.title).toBe('A new title');
    expect(updated.slug).toBe('my-first-post');
  });

  it('publishes, keeps the first publish date, and unpublishes', async () => {
    const post = storedPost();
    repository.findOneBy.mockResolvedValue(post);

    const published = await service.update(id, { publish: true });
    const firstPublishedAt = published.publishedAt;
    expect(firstPublishedAt).toBeInstanceOf(Date);

    const republished = await service.update(id, { publish: true });
    expect(republished.publishedAt).toEqual(firstPublishedAt);

    const unpublished = await service.update(id, { publish: false });
    expect(unpublished.publishedAt).toBeNull();
  });

  it('removes a post', async () => {
    const post = storedPost();
    repository.findOneBy.mockResolvedValue(post);

    await service.remove(id);

    expect(repository.remove).toHaveBeenCalledWith(post);
  });

  it('throws NotFoundException when removing an unknown post', async () => {
    await expect(service.remove(unknownId)).rejects.toThrow(NotFoundException);
    expect(repository.remove).not.toHaveBeenCalled();
  });
});
