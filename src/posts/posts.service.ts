import { Injectable, NotFoundException } from '@nestjs/common';

import { PaginationQueryDto } from '../common/dtos/pagination-query.dto.js';
import { UsersService } from '../users/users.service.js';
import { CreatePostDto } from './dtos/create-post.dto.js';
import { PatchPostDto } from './dtos/patch-post.dto.js';
import type { Post } from './interfaces/post.interface.js';

// In-memory store until a database is wired in.
@Injectable()
export class PostsService {
  private readonly posts: Post[] = [];
  private nextId = 1;

  constructor(private readonly usersService: UsersService) {}

  public findAll({ limit, page }: PaginationQueryDto): Post[] {
    const start = (page - 1) * limit;
    return this.posts.slice(start, start + limit);
  }

  public findById(id: number): Post {
    return this.getPostOrThrow(id);
  }

  public findByUserId(userId: number): Post[] {
    // Throws NotFoundException if the user doesn't exist.
    this.usersService.findById(userId);

    return this.posts.filter((p) => p.userId === userId);
  }

  public create({ userId, text }: CreatePostDto): Post {
    // Throws NotFoundException if the user doesn't exist.
    this.usersService.findById(userId);

    const post: Post = {
      id: this.nextId++,
      userId,
      text,
      dateOfPublication: new Date(),
    };
    this.posts.push(post);

    return post;
  }

  public update(id: number, patchPostDto: PatchPostDto): Post {
    const post = this.getPostOrThrow(id);
    Object.assign(post, patchPostDto);
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
}
