import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
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

import { EXAMPLE } from '../../common/swagger/examples.js';
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
  @ApiProperty({ format: 'uuid', example: EXAMPLE.postId })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ format: 'uuid', example: EXAMPLE.userId })
  @Column()
  authorId: string;

  // Deleting a user deletes their posts.
  // Relations aren't loaded in responses, so they're left out of the docs.
  @ApiHideProperty()
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author?: Relation<User>;

  // null only for a plain repost; a repost with a body is a quote.
  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Hello, BlogGoose! My first post.',
    description: 'null only for a plain repost',
  })
  @Column({ type: 'varchar', length: 500, nullable: true })
  body: string | null;

  @ApiProperty({ type: String, nullable: true, example: null })
  @Column({ type: 'varchar', nullable: true })
  featuredImageUrl: string | null;

  // Set = this post is a reply. If the parent is hard-deleted the reply stays.
  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    example: EXAMPLE.parentPostId,
    description: 'The post this one replies to',
  })
  @Column({ type: 'uuid', nullable: true })
  replyToId: string | null;

  @ApiHideProperty()
  @ManyToOne(() => Post, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reply_to_id' })
  replyTo?: Relation<Post>;

  // Set = this post is a repost (or a quote, when body is set).
  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    example: null,
    description: 'The post this one reposts',
  })
  @Column({ type: 'uuid', nullable: true })
  repostOfId: string | null;

  @ApiHideProperty()
  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'repost_of_id' })
  repostOf?: Relation<Post>;

  // Counters are changed in the same transaction as the rows they count.
  @ApiProperty({ example: 12 })
  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @ApiProperty({ example: 3 })
  @Column({ type: 'int', default: 0 })
  replyCount: number;

  @ApiProperty({ example: 1 })
  @Column({ type: 'int', default: 0 })
  repostCount: number;

  @ApiProperty({ example: EXAMPLE.date })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  // Soft delete: find* skips these rows, threads keep their shape.
  @ApiProperty({ type: Date, nullable: true, example: null })
  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
