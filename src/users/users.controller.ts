import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';

import { CreateUserDto } from './dtos/create-user.dto.js';
import { GetUserParamDto } from './dtos/get-users-param.dto.js';
import { PatchUserDto } from './dtos/patch-user.dto.js';

@Controller('users')
export class UsersController {
  @Get(['/', '/:id'])
  public getUser(
    @Param() getUserParamDto: GetUserParamDto,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    console.log(getUserParamDto);
    console.log(limit);
    console.log(typeof limit);
    console.log(page);
    console.log(typeof page);
    return 'You sent a get request to User endpoints';
  }

  @Post()
  public createUser(@Body() createUserDto: CreateUserDto) {
    console.log(createUserDto instanceof CreateUserDto);
    return createUserDto;
  }

  @Delete('/:id')
  public deleteUser() {
    return 'You sent a delete request to User endpoints';
  }

  @Put('/:id')
  public replaceUser() {
    return 'You sent a put request to User endpoints';
  }

  @Patch('/:id')
  public updateUser(@Body() patchUserDto: PatchUserDto) {
    return patchUserDto;
  }
}
