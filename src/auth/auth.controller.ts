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
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { ApiErrors } from '../common/swagger/api-errors.decorator.js';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { CreateUserDto } from '../users/dtos/create-user.dto.js';
import { User, type PublicUser } from '../users/entities/user.entity.js';
import { REFRESH_COOKIE_AUTH } from '../swagger.js';
import { AuthService } from './auth.service.js';
import {
  AccessTokenResponseDto,
  AuthResponseDto,
} from './dtos/auth-response.dto.js';
import { LoginDto } from './dtos/login.dto.js';
import { TokensService } from './tokens.service.js';
import type { AccessTokenPayload } from './types/jwt-payload.type.js';

const REFRESH_COOKIE = 'refresh_token';
// The browser sends the cookie only to /auth/* routes, not with every
// request. Update this when the API gets the /api/v1 prefix.
const REFRESH_COOKIE_PATH = '/auth';

const SET_REFRESH_COOKIE = {
  'Set-Cookie': {
    description: 'The refresh token, as an httpOnly cookie for /auth',
    schema: {
      type: 'string',
      example:
        'refresh_token=eyJhbGciOi...; Max-Age=2592000; Path=/auth; HttpOnly; SameSite=Lax',
    },
  },
};

// The refresh token never appears in a response body: it lives only in an
// httpOnly cookie that page JavaScript (and so an XSS attack) can't read.
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokensService: TokensService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  @Public()
  @Post('signup')
  @ApiOperation({ summary: 'Create an account and log in' })
  @ApiCreatedResponse({ type: AuthResponseDto, headers: SET_REFRESH_COOKIE })
  @ApiErrors(400, 409)
  public async signup(
    @Body() createUserDto: CreateUserDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
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
  @ApiOperation({
    summary: 'Log in with an email or username',
    description: 'Seeded users: alice, bob, carol, dave, erin / password123.',
  })
  @ApiOkResponse({ type: AuthResponseDto, headers: SET_REFRESH_COOKIE })
  @ApiErrors(400, [401, 'Invalid login or password'])
  public async login(
    @Body() loginDto: LoginDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
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
  @ApiCookieAuth(REFRESH_COOKIE_AUTH)
  @ApiOperation({
    summary: 'Get a new access token',
    description:
      'Uses the refresh_token cookie and replaces it with a new one. Reusing an old refresh token logs the user out everywhere.',
  })
  @ApiOkResponse({ type: AccessTokenResponseDto, headers: SET_REFRESH_COOKIE })
  @ApiErrors([401, 'Missing, invalid or reused refresh token'])
  public async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponseDto> {
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
  @ApiCookieAuth(REFRESH_COOKIE_AUTH)
  @ApiOperation({
    summary: 'Log out this device',
    description:
      'Revokes the refresh token and clears the cookie. Always 204, even without a cookie.',
  })
  @ApiNoContentResponse({ description: 'Logged out' })
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
  @ApiOperation({ summary: 'The logged-in user' })
  @ApiOkResponse({ type: User })
  @ApiErrors(401)
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
