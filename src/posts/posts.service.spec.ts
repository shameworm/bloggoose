import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { UsersService } from '../users/users.service.js';
import { PostsService } from './posts.service.js';

const text = 'A post long enough to pass the thirty character minimum.';

describe('PostsService', () => {
  let service: PostsService;
  let authorId: number;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostsService, UsersService],
    }).compile();

    service = module.get<PostsService>(PostsService);
    ({ id: authorId } = module.get<UsersService>(UsersService).create({
      email: 'johndoe@example.com',
      username: 'makarena',
      password: 'Veryoriginal1!',
    }));
  });

  it('creates a post with a generated id and publication date', () => {
    const post = service.create({ authorId, text });

    expect(post).toMatchObject({ id: 1, authorId, text });
    expect(post.dateOfPublication).toBeInstanceOf(Date);
  });

  it('rejects a post from an unknown author', () => {
    expect(() => service.create({ authorId: 42, text })).toThrow(
      NotFoundException,
    );
  });

  it('paginates posts', () => {
    for (let i = 0; i < 3; i++) {
      service.create({ authorId, text });
    }

    expect(service.findAll({ limit: 2, page: 1 }).map((p) => p.id)).toEqual([
      1, 2,
    ]);
    expect(service.findAll({ limit: 2, page: 2 }).map((p) => p.id)).toEqual([
      3,
    ]);
  });

  it('throws NotFoundException for an unknown id', () => {
    expect(() => service.findById(42)).toThrow(NotFoundException);
  });

  it('updates the text', () => {
    const { id } = service.create({ authorId, text });
    const newText = 'An edited post that is still over thirty characters.';

    expect(service.update(id, { text: newText }).text).toBe(newText);
  });

  it('removes a post', () => {
    const { id } = service.create({ authorId, text });

    service.remove(id);

    expect(() => service.findById(id)).toThrow(NotFoundException);
  });
});
