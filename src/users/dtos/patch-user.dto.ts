import { PartialType } from '@nestjs/mapped-types';

import { CreateUserDto } from './create-user.dto.js';

export class PatchUserDto extends PartialType(CreateUserDto) {}
