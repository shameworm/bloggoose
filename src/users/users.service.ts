import bcrypt from 'bcrypt';
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

import { Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User, PublicUser } from './entities/user.entity.js';

// bcrypt cost factor: each +1 doubles the time to hash (and to brute-force).
const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @Inject(forwardRef(() => AuthService))
    private readonly authService: ForwardRef<AuthService>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  public async findAll({
    limit,
    page,
  }: PaginationQueryDto): Promise<PublicUser[]> {
    if (!this.authService.isAuth) {
      throw new UnauthorizedException('You are not logged in');
    }

    const start = (page - 1) * limit;
    return this.usersRepository.find({
      order: { createdAt: 'ASC' },
      skip: start,
      take: limit,
    });
  }

  public async findById(id: string): Promise<PublicUser> {
    return toPublicUser(await this.getUserOrThrow(id));
  }

  // Returns the full user, password included. Only for internal checks like
  // login; never send the result to a client.
  public findByLogin(login: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: [{ email: login }, { username: login }],
      select: { id: true, email: true, username: true, password: true },
    });
  }

  public async create(createUserDto: CreateUserDto): Promise<PublicUser> {
    await this.assertUnique(createUserDto);

    const user = this.usersRepository.create(createUserDto);
    user.password = await bcrypt.hash(user.password, SALT_ROUNDS);

    return toPublicUser(await this.usersRepository.save(user));
  }

  public async update(
    id: string,
    patchUserDto: PatchUserDto,
  ): Promise<PublicUser> {
    const user = await this.getUserOrThrow(id);
    await this.assertUnique(patchUserDto, id);

    this.usersRepository.merge(user, patchUserDto);
    if (patchUserDto.password) {
      user.password = await bcrypt.hash(patchUserDto.password, SALT_ROUNDS);
    }

    return toPublicUser(await this.usersRepository.save(user));
  }

  public async remove(id: string): Promise<void> {
    await this.usersRepository.remove(await this.getUserOrThrow(id));
  }

  private async getUserOrThrow(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  private async assertUnique(
    { email, username }: Partial<Pick<User, 'email' | 'username'>>,
    excludeId?: string,
  ): Promise<void> {
    const others = excludeId ? { id: Not(excludeId) } : {};
    if (email && (await this.usersRepository.existsBy({ ...others, email }))) {
      throw new ConflictException('Email is already taken');
    }
    if (
      username &&
      (await this.usersRepository.existsBy({ ...others, username }))
    ) {
      throw new ConflictException('Username is already taken');
    }
  }
}

function toPublicUser({ password: _password, ...user }: User): PublicUser {
  return user;
}
