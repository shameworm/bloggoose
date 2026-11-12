import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  // Email or username. The example is a seeded user (bun run db:seed).
  @ApiProperty({ example: 'alice', description: 'Email or username' })
  @IsString()
  @IsNotEmpty()
  login: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
