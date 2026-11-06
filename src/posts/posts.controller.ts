import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { CreatePostDto } from './dtos/create-post.dto.js';
import { PatchPostDto } from './dtos/patch-post.dto.js';
import { PostsQueryDto } from './dtos/posts-query.dto.js';
import type { Post as PostEntity } from './interfaces/post.interface.js';
import { PostsService } from './posts.service.js';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  public findAll(@Query() postsQuery: PostsQueryDto): PostEntity[] {
    return this.postsService.findAll(postsQuery);
  }

  @Get(':id')
  public findById(@Param('id', ParseIntPipe) id: number): PostEntity {
    return this.postsService.findById(id);
  }

  @Post()
  public create(@Body() createPostDto: CreatePostDto): PostEntity {
    return this.postsService.create(createPostDto);
  }

  @Patch(':id')
  public update(
    @Param('id', ParseIntPipe) id: number,
    @Body() patchPostDto: PatchPostDto,
  ): PostEntity {
    return this.postsService.update(id, patchPostDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  public remove(@Param('id', ParseIntPipe) id: number): void {
    this.postsService.remove(id);
  }
}
