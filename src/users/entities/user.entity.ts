import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  USER_ROLES,
  USER_ROLE_VALUES,
  type UserRole,
} from './user-role.enum.js';
import { EXAMPLE } from '../../common/swagger/examples.js';

@Entity('users')
export class User {
  @ApiProperty({ format: 'uuid', example: EXAMPLE.userId })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'alice' })
  @Column({ unique: true, length: 25 })
  username: string;

  @ApiProperty({ example: 'alice@bloggoose.dev' })
  @Column({ unique: true })
  email: string;

  // Never sent to clients, so not in the docs either.
  @ApiHideProperty()
  @Column({ select: false })
  password: string;

  @ApiProperty({ type: String, nullable: true, example: 'Alice' })
  @Column({ type: 'varchar', nullable: true })
  displayName: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Backend dev. Writes about NestJS.',
  })
  @Column({ type: 'varchar', length: 160, nullable: true })
  bio: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'https://cdn.bloggoose.dev/avatars/alice.png',
  })
  @Column({ type: 'varchar', nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ type: String, nullable: true, example: null })
  @Column({ type: 'varchar', nullable: true })
  bannerUrl: string | null;

  @ApiProperty({ example: EXAMPLE.date })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({ example: 128 })
  @Column({ type: 'int', default: 0 })
  followersCount: number;

  @ApiProperty({ example: 64 })
  @Column({ type: 'int', default: 0 })
  followingCount: number;

  @ApiProperty({ example: 42 })
  @Column({ type: 'int', default: 0 })
  postCount: number;

  @ApiProperty({ example: EXAMPLE.date })
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ApiProperty({ enum: USER_ROLE_VALUES, example: USER_ROLES.USER })
  @Column({
    type: 'enum',
    enum: USER_ROLE_VALUES,
    enumName: 'user_role',
    default: USER_ROLES.USER,
  })
  role: UserRole;
}

export type PublicUser = Omit<User, 'password'>;
