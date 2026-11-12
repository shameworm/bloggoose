import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsUrl,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  displayName?: string | null;

  @ApiPropertyOptional({ example: 'Backend dev. Writes about NestJS.' })
  @IsString()
  @IsOptional()
  @MaxLength(160)
  bio?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.bloggoose.dev/avatars/johndoe.png',
  })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.bloggoose.dev/banners/johndoe.png',
  })
  @IsOptional()
  @IsUrl()
  bannerUrl?: string;

  @ApiProperty({ example: 'johndoe@example.com' })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'johndoe42',
    description: '8-25 characters, no @',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(25)
  // Login accepts an email or a username, so a username must never look
  // like an email.
  @Matches(/^[^@]+$/, { message: 'Username must not contain @' })
  username: string;

  @ApiProperty({
    example: 'Veryoriginal1!',
    description:
      'At least 8 characters, with an uppercase letter, a number and a special character',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).+$/, {
    message:
      'Password must contain at least one uppercase letter, one number and one special character',
  })
  password: string;
}
