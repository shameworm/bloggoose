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
} from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  public getUsers(@Param() params: any, @Query() query: any) {
    console.log(params);
    console.log(query);
    return 'You sent a get request to User endpoints(all)';
  }

  @Get('/:id')
  public getUser() {
    return 'You sent a get request to User endpoints(spec)';
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
