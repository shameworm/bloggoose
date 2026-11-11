import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';

import type { AccessTokenPayload } from '../auth/types/jwt-payload.type.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CreatePostDto } from './dtos/create-post.dto.js';
import { PostsQueryDto } from './dtos/posts-query.dto.js';
import { PostsService } from './posts.service.js';
import { Post as PostEntity } from './entities/post.entity.js';

// Posts can't be edited: delete and post again instead.
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Public()
  @Get()
  public findAll(@Query() postsQuery: PostsQueryDto): Promise<PostEntity[]> {
    return this.postsService.findAll(postsQuery);
  }

  @Public()
  @Get(':id')
  public async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PostEntity> {
    return this.postsService.findById(id);
  }

  @Post()
  public async create(
    @CurrentUser() user: AccessTokenPayload,
    @Body() createPostDto: CreatePostDto,
  ): Promise<PostEntity> {
    return this.postsService.create(user.sub, createPostDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  public remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.postsService.remove(id);
  }
}
