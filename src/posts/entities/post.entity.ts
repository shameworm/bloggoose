import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';

import { User } from '../../users/entities/user.entity.js';

// Profile feeds and the home timeline: one author's posts, newest first.
@Index(['authorId', 'createdAt', 'id'])
// Explore: every post, newest first.
@Index(['createdAt', 'id'])
// Threads: the replies to one post.
@Index(['replyToId'])
// Only a plain repost may have no text.
@Check('"body" IS NOT NULL OR "repost_of_id" IS NOT NULL')
@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  authorId: string;

  // Deleting a user deletes their posts.
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author?: Relation<User>;

  // null only for a plain repost; a repost with a body is a quote.
  @Column({ type: 'varchar', length: 500, nullable: true })
  body: string | null;

  @Column({ type: 'varchar', nullable: true })
  featuredImageUrl: string | null;

  // Set = this post is a reply. If the parent is hard-deleted the reply stays.
  @Column({ type: 'uuid', nullable: true })
  replyToId: string | null;

  @ManyToOne(() => Post, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reply_to_id' })
  replyTo?: Relation<Post>;

  // Set = this post is a repost (or a quote, when body is set).
  @Column({ type: 'uuid', nullable: true })
  repostOfId: string | null;

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'repost_of_id' })
  repostOf?: Relation<Post>;

  // Counters are changed in the same transaction as the rows they count.
  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @Column({ type: 'int', default: 0 })
  replyCount: number;

  @Column({ type: 'int', default: 0 })
  repostCount: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  // Soft delete: find* skips these rows, threads keep their shape.
  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
