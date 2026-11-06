import { randomUUID } from 'node:crypto';

import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';

import type { ForwardRef } from '../common/types/forward-ref.type.js';
import { AuthService } from '../auth/auth.service.js';
import { CreateUserDto } from './dtos/create-user.dto.js';
import { PaginationQueryDto } from '../common/dtos/pagination-query.dto.js';
import { PatchUserDto } from './dtos/patch-user.dto.js';
import type { PublicUser, User } from './interfaces/user.interface.js';

// In-memory store until a database is wired in.
@Injectable()
export class UsersService {
  private readonly users: User[] = [];

  constructor(
    @Inject(forwardRef(() => AuthService))
    private readonly authService: ForwardRef<AuthService>,
  ) {}

  public findAll({ limit, page }: PaginationQueryDto): PublicUser[] {
    if (!this.authService.isAuth) {
      throw new UnauthorizedException('You are not logged in');
    }

    const start = (page - 1) * limit;
    return this.users.slice(start, start + limit).map(toPublicUser);
  }

  public findById(id: string): PublicUser {
    return toPublicUser(this.getUserOrThrow(id));
  }

  // Returns the full user, password included. Only for internal checks like
  // login; never send the result to a client.
  public findByLogin(login: string): User | undefined {
    return this.users.find((u) => u.email === login || u.username === login);
  }

  public create(createUserDto: CreateUserDto): PublicUser {
    this.assertUnique(createUserDto);

    const user: User = Object.assign({ id: randomUUID() }, createUserDto);
    this.users.push(user);

    return toPublicUser(user);
  }

  public update(id: string, patchUserDto: PatchUserDto): PublicUser {
    const user = this.getUserOrThrow(id);
    this.assertUnique(patchUserDto, id);

    Object.assign(user, patchUserDto);

    return toPublicUser(user);
  }

  public remove(id: string): void {
    const user = this.getUserOrThrow(id);
    this.users.splice(this.users.indexOf(user), 1);
  }

  private getUserOrThrow(id: string): User {
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  private assertUnique(
    { email, username }: Partial<Pick<User, 'email' | 'username'>>,
    excludeId?: string,
  ): void {
    const others = this.users.filter((u) => u.id !== excludeId);
    if (email && others.some((u) => u.email === email)) {
      throw new ConflictException('Email is already taken');
    }
    if (username && others.some((u) => u.username === username)) {
      throw new ConflictException('Username is already taken');
    }
  }
}

function toPublicUser({ password: _password, ...user }: User): PublicUser {
  return user;
}
