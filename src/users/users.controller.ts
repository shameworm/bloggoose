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
  Headers,
  Ip,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get('/:id')
  public getUser(
    @Param('id', ParseIntPipe) id: number | undefined,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    console.log(id);
    console.log(typeof id);
    console.log(limit);
    console.log(typeof limit);
    console.log(page);
    console.log(typeof page);
    return 'You sent a get request to User endpoints';
  }

  @Post()
  public createUser(
    @Body() request: any,
    @Headers() headers: any,
    @Ip() ip: any,
  ) {
    console.log(request);
    console.log(headers);
    console.log(ip);
    return 'You sent a post request to User endpoints';
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
  public updateUser() {
    return 'You sent a patch request to User endpoints';
  }
}
