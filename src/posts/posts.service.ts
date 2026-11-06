import { Injectable, NotFoundException } from '@nestjs/common';

import { UsersService } from '../users/users.service.js';
import { CreatePostDto } from './dtos/create-post.dto.js';
import { PatchPostDto } from './dtos/patch-post.dto.js';
import { PostsQueryDto } from './dtos/posts-query.dto.js';
import type { Post } from './interfaces/post.interface.js';

// In-memory store until a database is wired in.
@Injectable()
export class PostsService {
  private readonly posts: Post[] = [];
  private nextId = 1;

  constructor(private readonly usersService: UsersService) {}

  public findAll({ authorId, limit, page }: PostsQueryDto): Post[] {
    const posts =
      authorId === undefined
        ? this.posts
        : this.posts.filter((p) => p.authorId === authorId);

    const start = (page - 1) * limit;
    return posts.slice(start, start + limit);
  }

  public findById(id: number): Post {
    return this.getPostOrThrow(id);
  }

  public create({ authorId, title, content, publish }: CreatePostDto): Post {
    // Throws NotFoundException if the author doesn't exist.
    this.usersService.findById(authorId);

    const now = new Date();
    const post: Post = {
      id: this.nextId++,
      authorId,
      title,
      slug: this.uniqueSlug(title),
      content,
      publishedAt: publish ? now : null,
      createdAt: now,
      updatedAt: now,
    };
    this.posts.push(post);

    return post;
  }

  public update(id: number, { publish, ...fields }: PatchPostDto): Post {
    const post = this.getPostOrThrow(id);

    // The slug stays the same when the title changes, so links keep working.
    Object.assign(post, fields);
    if (publish !== undefined) {
      post.publishedAt = publish ? (post.publishedAt ?? new Date()) : null;
    }
    post.updatedAt = new Date();

    return post;
  }

  public remove(id: number): void {
    const post = this.getPostOrThrow(id);
    this.posts.splice(this.posts.indexOf(post), 1);
  }

  private getPostOrThrow(id: number): Post {
    const post = this.posts.find((p) => p.id === id);
    if (!post) {
      throw new NotFoundException(`Post with id ${id} not found`);
    }
    return post;
  }

  // "My First Post!" -> "my-first-post", or "my-first-post-2" if taken.
  private uniqueSlug(title: string): string {
    const base =
      title
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-|-$/g, '') || 'post';

    let slug = base;
    for (let n = 2; this.posts.some((p) => p.slug === slug); n++) {
      slug = `${base}-${n}`;
    }
    return slug;
  }
}
