import {
  Column,
  Index,
  PrimaryColumn,
  Entity,
  ManyToOne,
  JoinColumn,
  type Relation,
  CreateDateColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity.js';

@Index(['userId'])
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: Relation<User>;

  @Column({ type: 'char', length: 64 })
  tokenHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deviceName: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
