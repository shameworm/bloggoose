import { OmitType, PartialType } from '@nestjs/swagger';

import { CreatePostDto } from './create-post.dto.js';

export class PatchPostDto extends PartialType(
  OmitType(CreatePostDto, ['userId'] as const),
) {}
