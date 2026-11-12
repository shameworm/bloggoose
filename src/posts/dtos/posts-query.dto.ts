import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

import { EXAMPLE } from '../../common/swagger/examples.js';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto.js';

export class PostsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    example: EXAMPLE.userId,
    description: "Only this user's posts",
  })
  @IsOptional()
  @IsUUID()
  authorId?: string;
}
