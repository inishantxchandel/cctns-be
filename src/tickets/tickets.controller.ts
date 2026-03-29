import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permission } from '../auth/permissions/permission.enum';
import type { AuthUser } from '../auth/strategies/jwt.strategy';
import { CreateTicketCommentDto } from './dto/create-ticket-comment.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { TicketComment } from './entities/ticket-comment.entity';
import { TicketsService, type PaginatedTickets } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query() query: ListTicketsQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PaginatedTickets> {
    return this.ticketsService.findPaginated(query, user.userId, user.role);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.CREATE_TICKET)
  create(
    @CurrentUser('userId') createdById: string,
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketsService.create(dto, createdById);
  }

  /** Any authenticated user may update status (tighten with @RequirePermission later). */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') actorId: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.ticketsService.updateStatus(id, dto.status, actorId);
  }

  /** Flat, chronological comments (no threading). Any authenticated user. */
  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  async addComment(
    @Param('id', ParseUUIDPipe) ticketId: string,
    @CurrentUser('userId') authorId: string,
    @Body() dto: CreateTicketCommentDto,
  ): Promise<TicketComment> {
    return await this.ticketsService.addComment(ticketId, dto, authorId);
  }
}
