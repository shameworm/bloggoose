import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';

import { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { Post } from './entities/post.entity.js';
import { PostsService } from './posts.service.js';

const id = '22222222-2222-4222-8222-222222222222';
const parentId = '33333333-3333-4333-8333-333333333333';
const originalId = '44444444-4444-4444-8444-444444444444';
const authorId = '11111111-1111-4111-8111-111111111111';
const unknownId = '00000000-0000-0000-0000-000000000000';

const body = 'Hello, BlogGoose!';

// What the database would hold for a post.
const storedPost = (fields: Partial<Post> = {}): Post =>
  Object.assign(
    {
      id,
      authorId,
      body,
      featuredImageUrl: null,
      replyToId: null,
      repostOfId: null,
      likeCount: 0,
      replyCount: 0,
      repostCount: 0,
      createdAt: new Date(),
      deletedAt: null,
    },
    fields,
  );

describe('PostsService', () => {
  let service: PostsService;
  let usersService: { findById: ReturnType<typeof vi.fn> };
  // The EntityManager used inside transactions.
  let manager: {
    existsBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    increment: ReturnType<typeof vi.fn>;
    decrement: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
  };
  let repository: {
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    manager: { transaction: ReturnType<typeof vi.fn> };
  };

  beforeEach(async () => {
    usersService = {
      findById: vi.fn((userId: string) =>
        userId === authorId
          ? Promise.resolve({ id: userId })
          : Promise.reject(new NotFoundException()),
      ),
    };
    manager = {
      existsBy: vi.fn((_entity: unknown, { id: postId }: { id: string }) =>
        Promise.resolve(postId === parentId),
      ),
      create: vi.fn((_entity: unknown, fields: Partial<Post>) =>
        Object.assign({}, fields),
      ),
      save: vi.fn((post: Partial<Post>) => Promise.resolve(storedPost(post))),
      increment: vi.fn().mockResolvedValue(undefined),
      decrement: vi.fn().mockResolvedValue(undefined),
      softDelete: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    repository = {
      find: vi.fn().mockResolvedValue([]),
      findOneBy: vi.fn().mockResolvedValue(null),
      // Runs the callback right away with the mocked manager.
      manager: {
        transaction: vi.fn((work: (m: typeof manager) => unknown) =>
          work(manager),
        ),
      },
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

  describe('create', () => {
    it('saves the post and counts it for the author', async () => {
      await service.create(authorId, { body });

      expect(manager.save).toHaveBeenCalledWith({
        authorId,
        body,
        replyToId: null,
        featuredImageUrl: null,
      });
      expect(manager.increment).toHaveBeenCalledWith(
        User,
        { id: authorId },
        'postCount',
        1,
      );
      expect(manager.increment).toHaveBeenCalledTimes(1);
    });

    it('counts a reply on its parent', async () => {
      const post = await service.create(authorId, {
        body,
        replyToId: parentId,
      });

      expect(post.replyToId).toBe(parentId);
      expect(manager.increment).toHaveBeenCalledWith(
        Post,
        { id: parentId },
        'replyCount',
        1,
      );
    });

    it('rejects a reply to an unknown post', async () => {
      await expect(
        service.create(authorId, { body, replyToId: unknownId }),
      ).rejects.toThrow(NotFoundException);
      expect(manager.save).not.toHaveBeenCalled();
      expect(manager.increment).not.toHaveBeenCalled();
    });

    it('rejects a post from an unknown author', async () => {
      await expect(service.create(unknownId, { body })).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.manager.transaction).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('paginates posts newest first', async () => {
      await service.findAll({ limit: 2, page: 3 });

      expect(repository.find).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC', id: 'DESC' },
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
  });

  describe('findById', () => {
    it('throws NotFoundException for an unknown id', async () => {
      await expect(service.findById(unknownId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('soft deletes a post and uncounts it for the author', async () => {
      repository.findOneBy.mockResolvedValue(storedPost());

      await service.remove(id);

      expect(manager.softDelete).toHaveBeenCalledWith(Post, {
        id,
        deletedAt: IsNull(),
      });
      expect(manager.decrement).toHaveBeenCalledWith(
        User,
        { id: authorId },
        'postCount',
        1,
      );
      expect(manager.decrement).toHaveBeenCalledTimes(1);
    });

    it('uncounts a reply on its parent and a repost on its original', async () => {
      repository.findOneBy.mockResolvedValue(
        storedPost({ replyToId: parentId, repostOfId: originalId }),
      );

      await service.remove(id);

      expect(manager.decrement).toHaveBeenCalledWith(
        Post,
        { id: parentId },
        'replyCount',
        1,
      );
      expect(manager.decrement).toHaveBeenCalledWith(
        Post,
        { id: originalId },
        'repostCount',
        1,
      );
    });

    it('leaves counters alone when the post was already deleted', async () => {
      repository.findOneBy.mockResolvedValue(storedPost());
      manager.softDelete.mockResolvedValue({ affected: 0 });

      await service.remove(id);

      expect(manager.decrement).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when removing an unknown post', async () => {
      await expect(service.remove(unknownId)).rejects.toThrow(
        NotFoundException,
      );
      expect(manager.softDelete).not.toHaveBeenCalled();
    });
  });
});
