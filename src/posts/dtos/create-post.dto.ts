import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class CreatePostDto {
  @IsInt()
  @Min(1)
  userId: number;

  @IsString()
  @MinLength(30)
  text: string;
}
