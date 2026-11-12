import bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { USER_ROLES } from '../users/entities/user-role.enum.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import { TokensService } from './tokens.service.js';

const id = '11111111-1111-4111-8111-111111111111';
const email = 'johndoe@example.com';
const username = 'makarena';
const password = 'Veryoriginal1!';
const device = 'vitest';

const publicUser = { id, email, username, role: USER_ROLES.USER };
const tokens = { accessToken: 'access', refreshToken: 'refresh' };

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    findByLogin: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  let tokensService: {
    issue: ReturnType<typeof vi.fn>;
    rotate: ReturnType<typeof vi.fn>;
    revoke: ReturnType<typeof vi.fn>;
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
      findById: vi.fn().mockResolvedValue(publicUser),
      create: vi.fn().mockResolvedValue(publicUser),
    };
    tokensService = {
      issue: vi.fn().mockResolvedValue(tokens),
      rotate: vi.fn().mockResolvedValue(tokens),
      revoke: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: TokensService, useValue: tokensService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('logs in with an email and issues tokens', async () => {
    const result = await service.login({ login: email, password }, device);

    expect(result).toEqual({ user: publicUser, ...tokens });
    expect(result.user).not.toHaveProperty('password');
    expect(tokensService.issue).toHaveBeenCalledWith(publicUser, device);
  });

  it('logs in with a username', async () => {
    const result = await service.login({ login: username, password }, device);

    expect(result.user.username).toBe(username);
  });

  it('rejects a wrong password without issuing tokens', async () => {
    await expect(
      service.login({ login: email, password: 'Wrongpassword1!' }, device),
    ).rejects.toThrow(UnauthorizedException);
    expect(tokensService.issue).not.toHaveBeenCalled();
  });

  it('rejects an unknown login with the same error', async () => {
    await expect(
      service.login({ login: 'nobody@example.com', password }, device),
    ).rejects.toThrow('Invalid login or password');
    await expect(
      service.login({ login: 'nobodyatall', password }, device),
    ).rejects.toThrow('Invalid login or password');
  });

  it('signs up through the users service and issues tokens', async () => {
    const dto = { email, username, password };

    const result = await service.signup(dto, device);

    expect(usersService.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ user: publicUser, ...tokens });
  });

  it('refreshes and logs out through the tokens service', async () => {
    await expect(service.refresh('old')).resolves.toEqual(tokens);
    expect(tokensService.rotate).toHaveBeenCalledWith('old');

    await service.logout('old');
    expect(tokensService.revoke).toHaveBeenCalledWith('old');
  });
  it('returns the current user for /auth/me', async () => {
    await expect(service.me(id)).resolves.toEqual(publicUser);
    expect(usersService.findById).toHaveBeenCalledWith(id);
  });

  it('does not issue tokens when signup fails', async () => {
    usersService.create.mockRejectedValue(new Error('Email is already taken'));

    await expect(
      service.signup({ email, username, password }, device),
    ).rejects.toThrow('Email is already taken');
    expect(tokensService.issue).not.toHaveBeenCalled();
  });
});
