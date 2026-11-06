import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { UsersService } from '../users/users.service.js';
import { PostsService } from './posts.service.js';

const text = 'A post long enough to pass the thirty character minimum.';

describe('PostsService', () => {
  let service: PostsService;
  let userId: number;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostsService, UsersService],
    }).compile();

    service = module.get<PostsService>(PostsService);
    ({ id: userId } = module.get<UsersService>(UsersService).create({
      email: 'johndoe@example.com',
      username: 'makarena',
      password: 'Veryoriginal1!',
    }));
  });

  it('creates a post with a generated id and publication date', () => {
    const post = service.create({ userId, text });

    expect(post).toMatchObject({ id: 1, userId, text });
    expect(post.dateOfPublication).toBeInstanceOf(Date);
  });

  it('rejects a post from an unknown user', () => {
    expect(() => service.create({ userId: 42, text })).toThrow(
      NotFoundException,
    );
  });

  it('paginates posts', () => {
    for (let i = 0; i < 3; i++) {
      service.create({ userId, text });
    }

    expect(service.findAll({ limit: 2, page: 1 }).map((p) => p.id)).toEqual([
      1, 2,
    ]);
    expect(service.findAll({ limit: 2, page: 2 }).map((p) => p.id)).toEqual([
      3,
    ]);
  });

  it('finds posts by user id', () => {
    service.create({ userId, text });
    service.create({ userId, text });

    expect(service.findByUserId(userId).map((p) => p.id)).toEqual([1, 2]);
  });

  it('returns an empty list for a user without posts', () => {
    expect(service.findByUserId(userId)).toEqual([]);
  });

  it('throws NotFoundException when finding posts of an unknown user', () => {
    expect(() => service.findByUserId(42)).toThrow(NotFoundException);
  });

  it('throws NotFoundException for an unknown id', () => {
    expect(() => service.findById(42)).toThrow(NotFoundException);
  });

  it('updates the text', () => {
    const { id } = service.create({ userId, text });
    const newText = 'An edited post that is still over thirty characters.';

    expect(service.update(id, { text: newText }).text).toBe(newText);
  });

  it('removes a post', () => {
    const { id } = service.create({ userId, text });

    service.remove(id);

    expect(() => service.findById(id)).toThrow(NotFoundException);
  });
});
