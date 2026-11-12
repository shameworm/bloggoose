import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiExtension } from '@nestjs/swagger';

export const IS_PUBLIC_KEY = 'isPublic';

// Marks the route for Swagger too: setupSwagger() turns this extension into
// "no auth needed", so the route shows no lock icon.
export const PUBLIC_SWAGGER_EXTENSION = 'x-public';

export const Public = () =>
  applyDecorators(
    SetMetadata(IS_PUBLIC_KEY, true),
    ApiExtension(PUBLIC_SWAGGER_EXTENSION, true),
  );
