import { ApiProperty } from '@nestjs/swagger';

import { EXAMPLE } from '../../common/swagger/examples.js';
import { User } from '../../users/entities/user.entity.js';

export class AccessTokenResponseDto {
  @ApiProperty({
    example: EXAMPLE.accessToken,
    description: 'Send as "Authorization: Bearer <token>". Lives 15 minutes.',
  })
  accessToken: string;
}

// The refresh token is not here: it comes as the refresh_token cookie.
export class AuthResponseDto extends AccessTokenResponseDto {
  // User without the password (the entity hides it from the docs).
  @ApiProperty({ type: () => User })
  user: Omit<User, 'password'>;
}
