import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { CreateUserDto } from '../users/dtos/create-user.dto.js';
import type { PublicUser } from '../users/entities/user.entity.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dtos/login.dto.js';
import { TokensService } from './tokens.service.js';
import type { AccessTokenPayload } from './types/jwt-payload.type.js';

const REFRESH_COOKIE = 'refresh_token';
// The browser sends the cookie only to /auth/* routes, not with every
// request. Update this when the API gets the /api/v1 prefix.
const REFRESH_COOKIE_PATH = '/auth';

interface AccessTokenResponse {
  accessToken: string;
}

// The refresh token never appears in a response body: it lives only in an
// httpOnly cookie that page JavaScript (and so an XSS attack) can't read.
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokensService: TokensService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  @Public()
  @Post('signup')
  public async signup(
    @Body() createUserDto: CreateUserDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponse & { user: PublicUser }> {
    const { user, accessToken, refreshToken } = await this.authService.signup(
      createUserDto,
      userAgent ?? null,
    );
    this.setRefreshCookie(res, refreshToken);
    return { accessToken, user };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  public async login(
    @Body() loginDto: LoginDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponse & { user: PublicUser }> {
    const { user, accessToken, refreshToken } = await this.authService.login(
      loginDto,
      userAgent ?? null,
    );
    this.setRefreshCookie(res, refreshToken);
    return { accessToken, user };
  }

  // Public: the access token has usually expired by the time this is called.
  // The refresh cookie is the credential here.
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  public async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponse> {
    const token = readRefreshCookie(req);
    if (!token) {
      throw new UnauthorizedException('Missing refresh token');
    }

    try {
      const { accessToken, refreshToken } =
        await this.authService.refresh(token);
      this.setRefreshCookie(res, refreshToken);
      return { accessToken };
    } catch (error) {
      // A dead refresh token is useless: tell the browser to drop it.
      this.clearRefreshCookie(res);
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const token = readRefreshCookie(req);
    if (token) {
      await this.authService.logout(token);
    }
    this.clearRefreshCookie(res);
  }

  @Get('me')
  public me(@CurrentUser() user: AccessTokenPayload): Promise<PublicUser> {
    return this.authService.me(user.sub);
  }

  private setRefreshCookie(res: Response, refreshToken: string): void {
    res.cookie(REFRESH_COOKIE, refreshToken, {
      ...this.cookieOptions(),
      maxAge: this.tokensService.refreshTtlSeconds * 1000,
    });
  }
  private clearRefreshCookie(res: Response): void {
    // Must use the same path/flags as when it was set, or the browser keeps it.
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  private cookieOptions() {
    return {
      httpOnly: true, // not readable from page JavaScript
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production', // HTTPS only in prod
      sameSite: 'lax' as const, // not sent on cross-site POSTs (CSRF)
      path: REFRESH_COOKIE_PATH,
    };
  }
}

function readRefreshCookie(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, string> | undefined;
  return cookies?.[REFRESH_COOKIE];
}
