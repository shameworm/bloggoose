import bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

const id = '11111111-1111-4111-8111-111111111111';
const email = 'johndoe@example.com';
const username = 'makarena';
const password = 'Veryoriginal1!';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    findByLogin: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };

  // What the database stores; a low cost factor keeps the tests fast.
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(password, 4);
  });

  beforeEach(async () => {
    usersService = {
      findByLogin: vi.fn((login: string) =>
        Promise.resolve(
          login === email || login === username
            ? { id, email, username, password: passwordHash }
            : null,
        ),
      ),
      findById: vi.fn().mockResolvedValue({ id, email, username }),
      create: vi.fn().mockResolvedValue({ id, email, username }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('logs in with an email without exposing the password', async () => {
    const user = await service.login({ login: email, password });

    expect(user.email).toBe(email);
    expect(user).not.toHaveProperty('password');
    expect(service.isAuth).toBe(true);
  });

  it('logs in with a username', async () => {
    const user = await service.login({ login: username, password });

    expect(user.username).toBe(username);
  });

  it('rejects a wrong password', async () => {
    await expect(
      service.login({ login: email, password: 'Wrongpassword1!' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(service.isAuth).toBe(false);
  });

  it('rejects an unknown login with the same error', async () => {
    await expect(
      service.login({ login: 'nobody@example.com', password }),
    ).rejects.toThrow('Invalid login or password');
    await expect(
      service.login({ login: 'nobodyatall', password }),
    ).rejects.toThrow('Invalid login or password');
  });

  it('signs up through the users service', async () => {
    const dto = { email, username, password };

    await service.signup(dto);

    expect(usersService.create).toHaveBeenCalledWith(dto);
  });

  it('logs out', async () => {
    await service.login({ login: email, password });

    service.logout();

    expect(service.isAuth).toBe(false);
  });
});
