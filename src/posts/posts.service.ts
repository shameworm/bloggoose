import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { CreatePostDto } from './dtos/create-post.dto.js';
import { PostsQueryDto } from './dtos/posts-query.dto.js';
import { Post } from './entities/post.entity.js';

@Injectable()
export class PostsService {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

  // Newest first. Soft-deleted posts are skipped by find() automatically.
  public findAll({ authorId, limit, page }: PostsQueryDto): Promise<Post[]> {
    return this.postRepository.find({
      where: authorId ? { authorId } : {},
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  public findById(id: string): Promise<Post> {
    return this.getPostOrThrow(id);
  }

  public async create({
    authorId,
    body,
    replyToId,
    featuredImageUrl,
  }: CreatePostDto): Promise<Post> {
    // Throws NotFoundException if the author doesn't exist.
    await this.usersService.findById(authorId);

    // The post and the counters it changes are written together or not at all.
    return this.postRepository.manager.transaction(async (manager) => {
      if (replyToId && !(await manager.existsBy(Post, { id: replyToId }))) {
        throw new NotFoundException(`Post with id ${replyToId} not found`);
      }

      const post = await manager.save(
        manager.create(Post, {
          authorId,
          body,
          replyToId: replyToId ?? null,
          featuredImageUrl: featuredImageUrl ?? null,
        }),
      );

      if (replyToId) {
        await manager.increment(Post, { id: replyToId }, 'replyCount', 1);
      }
      await manager.increment(User, { id: authorId }, 'postCount', 1);

      return post;
    });
  }

  public async remove(id: string): Promise<void> {
    const post = await this.getPostOrThrow(id);

    await this.postRepository.manager.transaction(async (manager) => {
      // Soft delete: the row stays so replies keep their parent.
      // "deletedAt IS NULL" makes a second, parallel delete a no-op, so the
      // counters below are only changed once.
      const { affected } = await manager.softDelete(Post, {
        id,
        deletedAt: IsNull(),
      });
      if (!affected) {
        return;
      }

      if (post.replyToId) {
        await manager.decrement(Post, { id: post.replyToId }, 'replyCount', 1);
      }
      if (post.repostOfId) {
        await manager.decrement(
          Post,
          { id: post.repostOfId },
          'repostCount',
          1,
        );
      }
      await manager.decrement(User, { id: post.authorId }, 'postCount', 1);
    });
  }

  private async getPostOrThrow(id: string): Promise<Post> {
    const post = await this.postRepository.findOneBy({ id });
    if (!post) {
      throw new NotFoundException(`Post with id ${id} not found`);
    }
    return post;
  }
}
