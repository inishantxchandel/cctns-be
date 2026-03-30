import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListContactDirectoryQueryDto } from './dto/list-contact-directory-query.dto';
import {
  PaginatedContactDirectory,
  UsersService,
} from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('contact-directory')
  @UseGuards(JwtAuthGuard)
  listContactDirectory(
    @Query() query: ListContactDirectoryQueryDto,
  ): Promise<PaginatedContactDirectory> {
    return this.usersService.listContactDirectory(query);
  }
}
