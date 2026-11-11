import bcrypt from 'bcrypt';
import { Injectable, UnauthorizedException } from '@nestjs/common';

import { CreateUserDto } from '../users/dtos/create-user.dto.js';
import type { PublicUser } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dtos/login.dto.js';
import { TokensService } from './tokens.service.js';
import type { TokenPair } from './types/jwt-payload.type.js';

export interface AuthResult extends TokenPair {
  user: PublicUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly tokensService: TokensService,
  ) {}

  public async signup(
    createUserDto: CreateUserDto,
    deviceName: string | null,
  ): Promise<AuthResult> {
    const user = await this.userService.create(createUserDto);
    return { user, ...(await this.tokensService.issue(user, deviceName)) };
  }

  public async login(
    { login, password }: LoginDto,
    deviceName: string | null,
  ): Promise<AuthResult> {
    const found = await this.userService.findByLogin(login);

    if (!found || !(await bcrypt.compare(password, found.password))) {
      throw new UnauthorizedException('Invalid login or password');
    }

    const user = await this.userService.findById(found.id);
    return { user, ...(await this.tokensService.issue(user, deviceName)) };
  }

  public async refresh(refreshToken: string): Promise<TokenPair> {
    return this.tokensService.rotate(refreshToken);
  }

  public async logout(refreshToken: string): Promise<void> {
    return this.tokensService.revoke(refreshToken);
  }

  public me(userId: string): Promise<PublicUser> {
    return this.userService.findById(userId);
  }
}
