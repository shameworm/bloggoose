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
  @IsString()
  @IsOptional()
  @MaxLength(255)
  displayName?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  bio?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsUrl()
  bannerUrl?: string;

  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(25)
  // Login accepts an email or a username, so a username must never look
  // like an email.
  @Matches(/^[^@]+$/, { message: 'Username must not contain @' })
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).+$/, {
    message:
      'Password must contain at least one uppercase letter, one number and one special character',
  })
  password: string;
}
