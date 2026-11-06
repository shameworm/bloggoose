import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  // Email or username.
  @IsString()
  @IsNotEmpty()
  login: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
