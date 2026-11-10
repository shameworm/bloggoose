import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UsersService } from '../users/users.service.js';
import { CreatePostDto } from './dtos/create-post.dto.js';
import { PatchPostDto } from './dtos/patch-post.dto.js';
import { PostsQueryDto } from './dtos/posts-query.dto.js';
import { Post } from './entities/post.entity.js';

@Injectable()
export class PostsService {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

  public findAll({ authorId, limit, page }: PostsQueryDto): Promise<Post[]> {
    return this.postRepository.find({
      where: authorId ? { authorId } : {},
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  public findById(id: string): Promise<Post> {
    return this.getPostOrThrow(id);
  }

  public async create({
    authorId,
    title,
    content,
    featuredImageUrl,
    publish,
  }: CreatePostDto): Promise<Post> {
    // Throws NotFoundException if the author doesn't exist.
    await this.usersService.findById(authorId);

    const post = this.postRepository.create({
      authorId,
      title,
      slug: await this.uniqueSlug(title),
      content,
      featuredImageUrl: featuredImageUrl ?? null,
      publishedAt: publish ? new Date() : null,
    });

    return this.postRepository.save(post);
  }

  public async update(
    id: string,
    { publish, ...fields }: PatchPostDto,
  ): Promise<Post> {
    const post = await this.getPostOrThrow(id);

    // The slug stays the same when the title changes, so links keep working.
    this.postRepository.merge(post, fields);
    if (publish !== undefined) {
      post.publishedAt = publish ? (post.publishedAt ?? new Date()) : null;
    }

    return this.postRepository.save(post);
  }

  public async remove(id: string): Promise<void> {
    const post = await this.getPostOrThrow(id);
    await this.postRepository.remove(post);
  }

  private async getPostOrThrow(id: string): Promise<Post> {
    const post = await this.postRepository.findOneBy({ id });
    if (!post) {
      throw new NotFoundException(`Post with id ${id} not found`);
    }
    return post;
  }

  // "My First Post!" -> "my-first-post", or "my-first-post-2" if taken.
  private async uniqueSlug(title: string): Promise<string> {
    const base =
      title
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-|-$/g, '') || 'post';

    let slug = base;
    for (let n = 2; await this.postRepository.existsBy({ slug }); n++) {
      slug = `${base}-${n}`;
    }
    return slug;
  }
}
