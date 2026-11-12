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
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { CreateUserDto } from './dtos/create-user.dto.js';
import { PaginationQueryDto } from '../common/dtos/pagination-query.dto.js';
import { PatchUserDto } from './dtos/patch-user.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { ApiErrors } from '../common/swagger/api-errors.decorator.js';
import { EXAMPLE } from '../common/swagger/examples.js';
import { User, type PublicUser } from './entities/user.entity.js';
import { UsersService } from './users.service.js';

const USER_ID = ApiParam({
  name: 'id',
  format: 'uuid',
  example: EXAMPLE.userId,
});

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users, oldest first' })
  @ApiOkResponse({ type: [User] })
  @ApiErrors(400, 401)
  public findAll(
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PublicUser[]> {
    return this.usersService.findAll(paginationQuery);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: "A user's profile" })
  @USER_ID
  @ApiOkResponse({ type: User })
  @ApiErrors(400, [404, 'User with id ... not found'])
  public findById(@Param('id', ParseUUIDPipe) id: string): Promise<PublicUser> {
    return this.usersService.findById(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a user',
    description: 'To register, use POST /auth/signup: it also logs in.',
  })
  @ApiCreatedResponse({ type: User })
  @ApiErrors(400, 401, 409)
  public create(@Body() createUserDto: CreateUserDto): Promise<PublicUser> {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Change some profile fields' })
  // Only the fields that are sent change.
  @ApiBody({
    type: PatchUserDto,
    examples: {
      profile: {
        summary: 'Profile',
        value: { displayName: 'Alice B.', bio: 'Now writing about Postgres.' },
      },
      password: {
        summary: 'Password',
        value: { password: 'Newpassword1!' },
      },
    },
  })
  @USER_ID
  @ApiOkResponse({ type: User })
  @ApiErrors(400, 401, [404, 'User with id ... not found'], 409)
  public update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() patchUserDto: PatchUserDto,
  ): Promise<PublicUser> {
    return this.usersService.update(id, patchUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user and their posts' })
  @USER_ID
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiErrors(400, 401, [404, 'User with id ... not found'])
  public remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.usersService.remove(id);
  }
}
