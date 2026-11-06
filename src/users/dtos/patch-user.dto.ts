import { PartialType } from '@nestjs/swagger';

import { CreateUserDto } from './create-user.dto.js';

export class PatchUserDto extends PartialType(CreateUserDto) {}
