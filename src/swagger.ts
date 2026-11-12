import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';

import { PUBLIC_SWAGGER_EXTENSION } from './common/decorators/public.decorator.js';

export const ACCESS_TOKEN_AUTH = 'access-token';
export const REFRESH_COOKIE_AUTH = 'refresh-cookie';

const DESCRIPTION = `
REST API for BlogGoose: short posts (up to 500 characters), replies and user profiles.

### Trying it out
1. \`POST /auth/login\` with a seeded user (\`alice\` / \`password123\`; run \`bun run db:seed\` first).
2. Copy \`accessToken\` from the response, click **Authorize** and paste it.
3. Routes with a lock now work. The token lives 15 minutes.

### Tokens
- **Access token**: sent as \`Authorization: Bearer <token>\` on every protected route.
- **Refresh token**: never in a response body. Login sets it as the httpOnly cookie \`refresh_token\`
  (path \`/auth\`); the browser sends it to \`/auth/refresh\` and \`/auth/logout\` by itself,
  including from this page.

Routes without a lock are public.
`;

// Served at /api (UI) and /api-json (the OpenAPI document).
export function setupSwagger(app: INestApplication, port: number): void {
  const config = new DocumentBuilder()
    .setTitle('BlogGoose')
    .setDescription(DESCRIPTION)
    .setVersion('1.0')
    .addServer(`http://localhost:${port}`)
    .addTag('Auth', 'Sign up, log in, refresh and log out')
    .addTag('Users', 'User profiles')
    .addTag('Posts', 'Posts and replies')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'The accessToken from /auth/login or /auth/signup',
      },
      ACCESS_TOKEN_AUTH,
    )
    .addCookieAuth(
      'refresh_token',
      {
        type: 'apiKey',
        in: 'cookie',
        description: 'Set by /auth/login and /auth/signup',
      },
      REFRESH_COOKIE_AUTH,
    )
    // Every route needs the access token unless it is @Public(), same as
    // the global JwtAuthGuard.
    .addSecurityRequirements(ACCESS_TOKEN_AUTH)
    .build();

  const document = SwaggerModule.createDocument(app, config);
  markPublicOperations(document);

  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'BlogGoose API',
    swaggerOptions: {
      // Keep the pasted token after a page reload.
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  });
}

// "security: []" on an operation overrides the global requirement: no lock.
function markPublicOperations(document: OpenAPIObject): void {
  for (const path of Object.values(document.paths)) {
    for (const operation of Object.values(path)) {
      if (typeof operation !== 'object' || operation === null) {
        continue;
      }
      const op = operation as Record<string, unknown>;
      if (op[PUBLIC_SWAGGER_EXTENSION]) {
        delete op[PUBLIC_SWAGGER_EXTENSION];
        // Routes that take the refresh cookie keep that requirement.
        if (!Array.isArray(op.security) || op.security.length === 0) {
          op.security = [];
        }
      }
    }
  }
}
