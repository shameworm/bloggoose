import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';

import { AppModule, ObserveInstrument } from './app.module.js';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from './config/env.validation.js';
import { createValidationPipe } from './common/pipes/validation.pipe.js';
import { setupSwagger } from './swagger.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  const port = config.get('PORT', { infer: true });
  app.useGlobalPipes(createValidationPipe());

  // UI at /api, OpenAPI JSON at /api-json.
  setupSwagger(app, port);

  // Fills request.cookies; the refresh token arrives as a cookie.
  app.use(cookieParser());

  app.enableCors({ origin: config.get('CORS_ORIGIN'), credentials: true });
  app.enableShutdownHooks();

  await app.listen(port);
}
await bootstrap();
