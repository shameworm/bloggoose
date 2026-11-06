import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

const email = 'johndoe@example.com';
const username = 'makarena';
const password = 'Veryoriginal1!';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, UsersService],
    }).compile();

    service = module.get<AuthService>(AuthService);
    service.signup({ email, username, password });
  });

  it('logs in with an email without exposing the password', () => {
    const user = service.login({ login: email, password });

    expect(user.email).toBe(email);
    expect(user).not.toHaveProperty('password');
    expect(service.isAuth).toBe(true);
  });

  it('logs in with a username', () => {
    expect(service.login({ login: username, password }).username).toBe(
      username,
    );
  });

  it('rejects a wrong password', () => {
    expect(() =>
      service.login({ login: email, password: 'Wrongpassword1!' }),
    ).toThrow(UnauthorizedException);
    expect(service.isAuth).toBe(false);
  });

  it('rejects an unknown login with the same error', () => {
    expect(() =>
      service.login({ login: 'nobody@example.com', password }),
    ).toThrow('Invalid login or password');
    expect(() => service.login({ login: 'nobodyatall', password })).toThrow(
      'Invalid login or password',
    );
  });

  it('logs out', () => {
    service.login({ login: email, password });

    service.logout();

    expect(service.isAuth).toBe(false);
  });
});
