import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUrl, IsUUID, Length } from 'class-validator';

import { EXAMPLE } from '../../common/swagger/examples.js';

// The author is the logged-in user (from the access token), never the body.
export class CreatePostDto {
  // 1-500 characters, matching the posts.body column. Trimmed first, so a
  // body of only spaces fails the length check.
  @ApiProperty({
    example: 'Hello, BlogGoose! My first post.',
    description: '1-500 characters after trimming spaces',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 500)
  body: string;

  // Set to reply to another post.
  @ApiPropertyOptional({
    example: EXAMPLE.parentPostId,
    description: 'Set to reply to this post',
  })
  @IsOptional()
  @IsUUID()
  replyToId?: string;

  @ApiPropertyOptional({ example: 'https://cdn.bloggoose.dev/posts/goose.jpg' })
  @IsOptional()
  @IsUrl()
  featuredImageUrl?: string;
}
