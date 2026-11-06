import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { CreateUserDto } from './dtos/create-user.dto.js';
import { PaginationQueryDto } from '../common/dtos/pagination-query.dto.js';
import { PatchUserDto } from './dtos/patch-user.dto.js';
import type { PublicUser } from './interfaces/user.interface.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  public findAll(@Query() paginationQuery: PaginationQueryDto): PublicUser[] {
    return this.usersService.findAll(paginationQuery);
  }

  @Get(':id')
  public findById(@Param('id', ParseUUIDPipe) id: string): PublicUser {
    return this.usersService.findById(id);
  }

  @Post()
  public create(@Body() createUserDto: CreateUserDto): PublicUser {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  public update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() patchUserDto: PatchUserDto,
  ): PublicUser {
    return this.usersService.update(id, patchUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  public remove(@Param('id', ParseUUIDPipe) id: string): void {
    this.usersService.remove(id);
  }
}
