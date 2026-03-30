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
import { ListTicketCommentsQueryDto } from './dto/list-ticket-comments-query.dto';
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { UpdateTicketTeamDto } from './dto/update-ticket-team.dto';
import { TicketComment } from './entities/ticket-comment.entity';
import {
  TicketsService,
  type PaginatedTicketComments,
  type PaginatedTickets,
} from './tickets.service';

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

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ticketsService.findOneById(id, user.userId, user.role);
  }

  @Get(':id/comments')
  @UseGuards(JwtAuthGuard)
  findComments(
    @Param('id', ParseUUIDPipe) ticketId: string,
    @Query() query: ListTicketCommentsQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PaginatedTicketComments> {
    return this.ticketsService.findCommentsPaginated(
      ticketId,
      query,
      user.userId,
      user.role,
    );
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
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.UPDATE_TICKET_STATUS)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') actorId: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.ticketsService.updateStatus(id, dto.status, actorId);
  }

  @Patch(':id/team')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.UPDATE_TICKET_TEAM)
  updateTeam(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') actorId: string,
    @Body() dto: UpdateTicketTeamDto,
  ) {
    return this.ticketsService.updateTeam(id, dto, actorId);
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
