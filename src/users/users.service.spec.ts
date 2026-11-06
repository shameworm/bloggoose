import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Not } from 'typeorm';

import { AuthService } from '../auth/auth.service.js';
import { User } from './entities/user.entity.js';
import { UsersService } from './users.service.js';

const id = '11111111-1111-4111-8111-111111111111';

const john = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'johndoe@example.com',
  username: 'makarena',
  password: 'Veryoriginal1!',
};

// What the database would hold for john.
const storedJohn = (): User => ({
  id,
  avatarUrl: null,
  ...john,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('UsersService', () => {
  let service: UsersService;
  let authService: { isAuth: boolean };
  let repository: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    existsBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    merge: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authService = { isAuth: false };
    repository = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
      findOneBy: vi.fn().mockResolvedValue(null),
      existsBy: vi.fn().mockResolvedValue(false),
      create: vi.fn((dto: Partial<User>) => ({ ...dto })),
      merge: vi.fn((user: User, dto: Partial<User>) =>
        Object.assign(user, dto),
      ),
      save: vi.fn((user: Partial<User>) =>
        Promise.resolve(Object.assign(storedJohn(), user)),
      ),
      remove: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: AuthService, useValue: authService },
        { provide: getRepositoryToken(User), useValue: repository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('creates a user without exposing the password', async () => {
    const user = await service.create(john);

    expect(repository.save).toHaveBeenCalledWith(john);
    expect(user).toMatchObject({ id, email: john.email });
    expect(user).not.toHaveProperty('password');
  });

  it('rejects a taken email', async () => {
    repository.existsBy.mockImplementation(({ email }: Partial<User>) =>
      Promise.resolve(email !== undefined),
    );

    await expect(service.create(john)).rejects.toThrow(
      'Email is already taken',
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects a taken username', async () => {
    repository.existsBy.mockImplementation(({ username }: Partial<User>) =>
      Promise.resolve(username !== undefined),
    );

    await expect(service.create(john)).rejects.toThrow(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects listing users when not logged in', async () => {
    await expect(service.findAll({ limit: 10, page: 1 })).rejects.toThrow(
      UnauthorizedException,
    );
    expect(repository.find).not.toHaveBeenCalled();
  });

  it('paginates users by creation time', async () => {
    authService.isAuth = true;

    await service.findAll({ limit: 2, page: 3 });

    expect(repository.find).toHaveBeenCalledWith({
      order: { createdAt: 'ASC' },
      skip: 4,
      take: 2,
    });
  });

  it('finds a user by id without the password', async () => {
    repository.findOneBy.mockResolvedValue(storedJohn());

    const user = await service.findById(id);

    expect(repository.findOneBy).toHaveBeenCalledWith({ id });
    expect(user.email).toBe(john.email);
    expect(user).not.toHaveProperty('password');
  });

  it('throws NotFoundException for an unknown id', async () => {
    await expect(service.findById(id)).rejects.toThrow(NotFoundException);
  });

  it('looks a user up by email or username, password included', async () => {
    await service.findByLogin('makarena');

    expect(repository.findOne).toHaveBeenCalledWith({
      where: [{ email: 'makarena' }, { username: 'makarena' }],
      select: { id: true, email: true, username: true, password: true },
    });
  });

  it('updates only the given fields, ignoring the user in the uniqueness check', async () => {
    repository.findOneBy.mockResolvedValue(storedJohn());

    const updated = await service.update(id, {
      firstName: 'Johnny',
      email: john.email,
    });

    expect(repository.existsBy).toHaveBeenCalledWith({
      id: Not(id),
      email: john.email,
    });
    expect(updated.firstName).toBe('Johnny');
    expect(updated.lastName).toBe(john.lastName);
    expect(updated).not.toHaveProperty('password');
  });

  it('throws NotFoundException when updating an unknown user', async () => {
    await expect(service.update(id, { firstName: 'Johnny' })).rejects.toThrow(
      NotFoundException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('removes a user', async () => {
    const user = storedJohn();
    repository.findOneBy.mockResolvedValue(user);

    await service.remove(id);

    expect(repository.remove).toHaveBeenCalledWith(user);
  });

  it('throws NotFoundException when removing an unknown user', async () => {
    await expect(service.remove(id)).rejects.toThrow(NotFoundException);
    expect(repository.remove).not.toHaveBeenCalled();
  });
});
