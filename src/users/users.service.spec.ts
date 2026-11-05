import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { UsersService } from './users.service.js';

const john = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'johndoe@example.com',
  username: 'makarena',
  password: 'Veryoriginal1!',
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('creates a user without exposing the password', () => {
    const user = service.create(john);

    expect(user).toEqual({
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'johndoe@example.com',
      username: 'makarena',
    });
    expect(user).not.toHaveProperty('password');
  });

  it('rejects a duplicate email or username', () => {
    service.create(john);

    expect(() => service.create({ ...john, username: 'otheruser' })).toThrow(
      ConflictException,
    );
    expect(() =>
      service.create({ ...john, email: 'other@example.com' }),
    ).toThrow(ConflictException);
  });

  it('paginates users', () => {
    for (let i = 0; i < 3; i++) {
      service.create({
        ...john,
        email: `user${i}@example.com`,
        username: `username${i}`,
      });
    }

    expect(service.findAll({ limit: 2, page: 1 }).map((u) => u.id)).toEqual([
      1, 2,
    ]);
    expect(service.findAll({ limit: 2, page: 2 }).map((u) => u.id)).toEqual([
      3,
    ]);
  });

  it('throws NotFoundException for an unknown id', () => {
    expect(() => service.findById(42)).toThrow(NotFoundException);
  });

  it('updates only the given fields', () => {
    const { id } = service.create(john);

    const updated = service.update(id, { firstName: 'Johnny' });

    expect(updated.firstName).toBe('Johnny');
    expect(updated.email).toBe(john.email);
  });

  it('removes a user', () => {
    const { id } = service.create(john);

    service.remove(id);

    expect(() => service.findById(id)).toThrow(NotFoundException);
  });
});
