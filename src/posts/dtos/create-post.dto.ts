import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePostDto {
  // Taken from the logged-in user once auth has per-client tokens.
  @IsInt()
  @Min(1)
  authorId: number;

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
