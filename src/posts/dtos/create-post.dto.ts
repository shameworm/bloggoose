import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class CreatePostDto {
  @IsInt()
  @Min(1)
  authorId: number;

  @IsString()
  @MinLength(30)
  text: string;
}
