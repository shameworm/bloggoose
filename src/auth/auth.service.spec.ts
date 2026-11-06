import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

const credentials = {
  email: 'johndoe@example.com',
  password: 'Veryoriginal1!',
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, UsersService],
    }).compile();

    service = module.get<AuthService>(AuthService);
    service.signup({ ...credentials, username: 'makarena' });
  });

  it('logs in with the right credentials without exposing the password', () => {
    const user = service.login(credentials);

    expect(user.email).toBe(credentials.email);
    expect(user).not.toHaveProperty('password');
    expect(service.isAuth).toBe(true);
  });

  it('rejects a wrong password', () => {
    expect(() =>
      service.login({ ...credentials, password: 'Wrongpassword1!' }),
    ).toThrow(UnauthorizedException);
    expect(service.isAuth).toBe(false);
  });

  it('rejects an unknown email with the same error', () => {
    expect(() =>
      service.login({ ...credentials, email: 'nobody@example.com' }),
    ).toThrow('Invalid email or password');
  });

  it('logs out', () => {
    service.login(credentials);

    service.logout();

    expect(service.isAuth).toBe(false);
  });
});
