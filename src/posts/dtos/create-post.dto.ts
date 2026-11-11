import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUrl, IsUUID, Length } from 'class-validator';

export class CreatePostDto {
  // Taken from the logged-in user once auth has per-client tokens.
  @IsUUID()
  authorId: string;

  // 1-500 characters, matching the posts.body column. Trimmed first, so a
  // body of only spaces fails the length check.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 500)
  body: string;

  // Set to reply to another post.
  @IsOptional()
  @IsUUID()
  replyToId?: string;

  @IsOptional()
  @IsUrl()
  featuredImageUrl?: string;
}
