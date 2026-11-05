import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CreateUserDto } from './dtos/create-user.dto.js';
import { PaginationQueryDto } from './dtos/pagination-query.dto.js';
import { PatchUserDto } from './dtos/patch-user.dto.js';
import type { PublicUser, User } from './interfaces/user.interface.js';

// In-memory store until a database is wired in.
@Injectable()
export class UsersService {
  private readonly users: User[] = [];
  private nextId = 1;

  public findAll({ limit, page }: PaginationQueryDto): PublicUser[] {
    const start = (page - 1) * limit;
    return this.users.slice(start, start + limit).map(toPublicUser);
  }

  public findById(id: number): PublicUser {
    return toPublicUser(this.getUserOrThrow(id));
  }

  public create(createUserDto: CreateUserDto): PublicUser {
    this.assertUnique(createUserDto);

    const user: User = Object.assign({ id: this.nextId++ }, createUserDto);
    this.users.push(user);

    return toPublicUser(user);
  }

  public update(id: number, patchUserDto: PatchUserDto): PublicUser {
    const user = this.getUserOrThrow(id);
    this.assertUnique(patchUserDto, id);

    Object.assign(user, patchUserDto);

    return toPublicUser(user);
  }

  public remove(id: number): void {
    const user = this.getUserOrThrow(id);
    this.users.splice(this.users.indexOf(user), 1);
  }

  private getUserOrThrow(id: number): User {
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  private assertUnique(
    { email, username }: Partial<Pick<User, 'email' | 'username'>>,
    excludeId?: number,
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
