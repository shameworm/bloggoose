import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePostDto {
  // Taken from the logged-in user once auth has per-client tokens.
  @IsUUID()
  authorId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(30)
  @MaxLength(50_000)
  content: string;

  // The server sets publishedAt; the client only decides whether to publish.
  @IsOptional()
  @IsBoolean()
  publish?: boolean;
}
