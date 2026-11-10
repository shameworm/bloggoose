import {
  Inject,
  Injectable,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';

import type { ForwardRef } from '../common/types/forward-ref.type.js';
import { CreateUserDto } from '../users/dtos/create-user.dto.js';
import type { PublicUser } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dtos/login.dto.js';

@Injectable()
export class AuthService {
  // Dummy auth: one flag shared by the whole app, so if anyone logs in,
  // everyone is logged in. Replace with per-client tokens (e.g. JWT) later.
  public isAuth = false;

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: ForwardRef<UsersService>,
  ) {}

  public async login({ login, password }: LoginDto): Promise<PublicUser> {
    const user = await this.usersService.findByLogin(login);

    // Same error for an unknown login and a wrong password, so the response
    // doesn't reveal which emails or usernames are registered.
    if (!user || user.password !== password) {
      throw new UnauthorizedException('Invalid login or password');
    }

    this.isAuth = true;
    return this.usersService.findById(user.id);
  }

  public signup(createUserDto: CreateUserDto): Promise<PublicUser> {
    return this.usersService.create(createUserDto);
  }

  public logout(): void {
    this.isAuth = false;
  }
}
