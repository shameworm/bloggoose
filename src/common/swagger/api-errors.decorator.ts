import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

import { ErrorResponseDto } from './error-response.dto.js';

const ERRORS = {
  400: {
    error: 'Bad Request',
    description: 'The body, query or path failed validation',
    message: ['body must be shorter than or equal to 500 characters'] as
      string | string[],
  },
  401: {
    error: 'Unauthorized',
    description: 'No access token, or it is invalid or expired',
    message: 'Missing access token' as string | string[],
  },
  404: {
    error: 'Not Found',
    description: 'Nothing with this id',
    message: 'Not found' as string | string[],
  },
  409: {
    error: 'Conflict',
    description: 'Email or username is already taken',
    message: 'Email is already taken' as string | string[],
  },
};

export type ApiErrorStatus = keyof typeof ERRORS;

// Documents error responses with an example body:
//   @ApiErrors(400, 401)
//   @ApiErrors(400, [404, 'Post with id ... not found'])
export function ApiErrors(
  ...errors: (ApiErrorStatus | [ApiErrorStatus, string])[]
) {
  return applyDecorators(
    ...errors.map((entry) => {
      const [status, message] = Array.isArray(entry) ? entry : [entry];
      const known = ERRORS[status];
      return ApiResponse({
        status,
        description: message ?? known.description,
        type: ErrorResponseDto,
        example: {
          statusCode: status,
          message: message ?? known.message,
          error: known.error,
        },
      });
    }),
  );
}
