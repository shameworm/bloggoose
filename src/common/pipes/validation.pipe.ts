import { ValidationPipe } from '@nestjs/common';

// The app's global pipe. In its own file so tests validate requests exactly
// the way the running app does.
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    // Drop properties without a decorator, and reject the request if there
    // were any (so a client can't send authorId, likeCount, role, ...).
    whitelist: true,
    forbidNonWhitelisted: true,
    // Turn the plain JSON into DTO instances (runs @Transform and @Type).
    transform: true,
  });
}
