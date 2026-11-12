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
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import type { AccessTokenPayload } from '../auth/types/jwt-payload.type.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { ApiErrors } from '../common/swagger/api-errors.decorator.js';
import { EXAMPLE } from '../common/swagger/examples.js';
import { CreatePostDto } from './dtos/create-post.dto.js';
import { PostsQueryDto } from './dtos/posts-query.dto.js';
import { PostsService } from './posts.service.js';
import { Post as PostEntity } from './entities/post.entity.js';

const POST_ID = ApiParam({
  name: 'id',
  format: 'uuid',
  example: EXAMPLE.postId,
});
const POST_NOT_FOUND: [404, string] = [404, 'Post with id ... not found'];

// Posts can't be edited: delete and post again instead.
@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List posts, newest first' })
  @ApiOkResponse({ type: [PostEntity] })
  @ApiErrors(400)
  public findAll(@Query() postsQuery: PostsQueryDto): Promise<PostEntity[]> {
    return this.postsService.findAll(postsQuery);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'One post' })
  @POST_ID
  @ApiOkResponse({ type: PostEntity })
  @ApiErrors(400, POST_NOT_FOUND)
  public async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PostEntity> {
    return this.postsService.findById(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Write a post or a reply',
    description:
      'The author is the logged-in user. Set replyToId to reply; the parent post gets replyCount + 1.',
  })
  // Named examples, so "Try it out" doesn't send a made-up replyToId.
  @ApiBody({
    type: CreatePostDto,
    examples: {
      post: { summary: 'A post', value: { body: 'Hello, BlogGoose!' } },
      reply: {
        summary: 'A reply (paste a real post id)',
        value: { body: 'Nice post!', replyToId: EXAMPLE.parentPostId },
      },
      image: {
        summary: 'A post with an image',
        value: {
          body: 'Look at this goose',
          featuredImageUrl: 'https://cdn.bloggoose.dev/posts/goose.jpg',
        },
      },
    },
  })
  @ApiCreatedResponse({ type: PostEntity })
  @ApiErrors(400, 401, [404, 'Post with id ... not found (replyToId)'])
  public async create(
    @CurrentUser() user: AccessTokenPayload,
    @Body() createPostDto: CreatePostDto,
  ): Promise<PostEntity> {
    return this.postsService.create(user.sub, createPostDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a post',
    description: 'Soft delete: replies keep their parent id.',
  })
  @POST_ID
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiErrors(400, 401, POST_NOT_FOUND)
  public remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.postsService.remove(id);
  }
}
