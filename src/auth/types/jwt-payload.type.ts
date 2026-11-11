import type { UserRole } from '../../users/entities/user-role.enum.js';

export interface AccessTokenPayload {
  sub: string;
  username: string;
  role: UserRole;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
