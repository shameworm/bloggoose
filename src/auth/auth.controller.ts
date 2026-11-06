import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { CreateUserDto } from '../users/dtos/create-user.dto.js';
import type { PublicUser } from '../users/interfaces/user.interface.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dtos/login.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  public signup(@Body() createUserDto: CreateUserDto): PublicUser {
    return this.authService.signup(createUserDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  public login(@Body() loginDto: LoginDto): PublicUser {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  public logout(): void {
    this.authService.logout();
  }
}
