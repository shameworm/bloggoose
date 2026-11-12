import { ApiProperty } from '@nestjs/swagger';

// The body Nest sends for every error (HttpException's default shape).
export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({
    description:
      'One message, or a list with one entry per failed validation rule',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  message: string | string[];

  @ApiProperty({ example: 'Bad Request' })
  error: string;
}
