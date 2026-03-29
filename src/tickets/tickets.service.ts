import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { District } from '../districts/entities/district.entity';
import { IssueType } from '../issue-types/entities/issue-type.entity';
import { PoliceStation } from '../police-stations/entities/police-station.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateTicketCommentDto } from './dto/create-ticket-comment.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto';
import { TicketComment } from './entities/ticket-comment.entity';
import { TicketLog } from './entities/ticket-log.entity';
import { Ticket } from './entities/ticket.entity';
import { TicketStatus } from './enums/ticket-status.enum';

export type PaginatedTickets = {
  data: Ticket[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepo: Repository<Ticket>,
    @InjectRepository(TicketLog)
    private readonly ticketLogsRepo: Repository<TicketLog>,
    @InjectRepository(District)
    private readonly districtsRepo: Repository<District>,
    @InjectRepository(IssueType)
    private readonly issueTypesRepo: Repository<IssueType>,
    @InjectRepository(PoliceStation)
    private readonly policeStationsRepo: Repository<PoliceStation>,
    @InjectRepository(TicketComment)
    private readonly ticketCommentsRepo: Repository<TicketComment>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async create(dto: CreateTicketDto, createdById: string): Promise<Ticket> {
    const district = await this.districtsRepo.findOne({
      where: { id: dto.districtId },
    });
    if (!district) {
      throw new NotFoundException('District not found');
    }

    const issueType = await this.issueTypesRepo.findOne({
      where: { id: dto.issueTypeId },
    });
    if (!issueType) {
      throw new NotFoundException('Issue type not found');
    }

    const policeStation = await this.policeStationsRepo.findOne({
      where: { id: dto.policeStationId },
      relations: ['district'],
    });
    if (!policeStation) {
      throw new NotFoundException('Police station not found');
    }

    if (policeStation.district.id !== dto.districtId) {
      throw new BadRequestException(
        'Police station does not belong to the selected district',
      );
    }

    const ticket = this.ticketsRepo.create({
      title: dto.title.trim(),
      description: dto.description.trim(),
      status: TicketStatus.PENDING,
      teamAssigned: dto.teamAssigned ?? UserRole.NOC_TEAM_PUNJAB_POLICE,
      createdBy: { id: createdById },
      district: { id: dto.districtId },
      policeStation: { id: dto.policeStationId },
      issueType: { id: dto.issueTypeId },
    });

    const saved = await this.ticketsRepo.save(ticket);

    await this.ticketLogsRepo.insert({
      ticket: { id: saved.id },
      actor: { id: createdById },
      action: 'CREATED',
      details: `Ticket "${saved.title}" created`,
      metadata: {
        status: saved.status,
        teamAssigned: saved.teamAssigned,
        districtId: dto.districtId,
        policeStationId: dto.policeStationId,
        issueTypeId: dto.issueTypeId,
      },
    });

    const withRelations = await this.ticketsRepo.findOne({
      where: { id: saved.id },
      relations: [
        'createdBy',
        'district',
        'policeStation',
        'policeStation.district',
        'issueType',
      ],
    });

    return withRelations ?? saved;
  }

  async updateStatus(
    ticketId: string,
    status: TicketStatus,
    actorId: string,
  ): Promise<Ticket> {
    const ticket = await this.ticketsRepo.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const previous = ticket.status;
    if (previous === status) {
      const unchanged = await this.ticketsRepo.findOne({
        where: { id: ticketId },
        relations: [
          'createdBy',
          'district',
          'policeStation',
          'policeStation.district',
          'issueType',
        ],
      });
      return unchanged ?? ticket;
    }

    ticket.status = status;
    await this.ticketsRepo.save(ticket);

    await this.ticketLogsRepo.insert({
      ticket: { id: ticketId },
      actor: { id: actorId },
      action: 'STATUS_CHANGED',
      details: `Status changed from "${previous}" to "${status}"`,
      metadata: { previousStatus: previous, newStatus: status },
    });

    const withRelations = await this.ticketsRepo.findOne({
      where: { id: ticketId },
      relations: [
        'createdBy',
        'district',
        'policeStation',
        'policeStation.district',
        'issueType',
      ],
    });

    return withRelations ?? ticket;
  }

  async addComment(
    ticketId: string,
    dto: CreateTicketCommentDto,
    authorId: string,
  ): Promise<TicketComment> {
    const ticketExists = await this.ticketsRepo.exist({
      where: { id: ticketId },
    });
    if (!ticketExists) {
      throw new NotFoundException('Ticket not found');
    }

    const comment = this.ticketCommentsRepo.create({
      ticket: { id: ticketId },
      author: { id: authorId },
      body: dto.body.trim(),
    });
    const saved = await this.ticketCommentsRepo.save(comment);

    await this.ticketLogsRepo.insert({
      ticket: { id: ticketId },
      actor: { id: authorId },
      action: 'COMMENT_ADDED',
      details: 'Comment added',
      metadata: { commentId: saved.id },
    });

    const withAuthor = await this.ticketCommentsRepo.findOne({
      where: { id: saved.id },
      relations: ['author'],
    });

    return withAuthor ?? saved;
  }

  async findPaginated(
    query: ListTicketsQueryDto,
    userId: string,
    role: UserRole,
  ): Promise<PaginatedTickets> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    let operatingDistrictId: string | undefined;
    if (role === UserRole.CCTNS_INCHARGE_DISTRICT) {
      const row = await this.usersRepo
        .createQueryBuilder('u')
        .select('u.district_id', 'districtId')
        .where('u.id = :id', { id: userId })
        .getRawOne<{ districtId: string | null }>();
      if (!row?.districtId) {
        throw new ForbiddenException(
          'Your account has no operating district assigned. Contact an administrator.',
        );
      }
      operatingDistrictId = row.districtId;
    }

    const qb = this.ticketsRepo
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.createdBy', 'createdBy')
      .leftJoinAndSelect('ticket.district', 'district')
      .leftJoinAndSelect('ticket.policeStation', 'policeStation')
      .leftJoinAndSelect('policeStation.district', 'policeStationDistrict')
      .leftJoinAndSelect('ticket.issueType', 'issueType')
      .orderBy('ticket.createdAt', 'DESC');

    this.applyTicketListRoleScope(qb, userId, role, operatingDistrictId);

    if (query.districtId) {
      qb.andWhere('district.id = :filterDistrictId', {
        filterDistrictId: query.districtId,
      });
    }
    if (query.policeStationId) {
      qb.andWhere('policeStation.id = :filterPsId', {
        filterPsId: query.policeStationId,
      });
    }
    if (query.createdFrom) {
      qb.andWhere('ticket.createdAt >= :createdFrom', {
        createdFrom: new Date(query.createdFrom),
      });
    }
    if (query.createdTo) {
      qb.andWhere('ticket.createdAt <= :createdTo', {
        createdTo: new Date(query.createdTo),
      });
    }
    if (query.status !== undefined) {
      qb.andWhere('ticket.status = :filterStatus', {
        filterStatus: query.status,
      });
    }
    if (query.teamAssigned !== undefined) {
      qb.andWhere('ticket.teamAssigned = :filterTeam', {
        filterTeam: query.teamAssigned,
      });
    }

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  private applyTicketListRoleScope(
    qb: SelectQueryBuilder<Ticket>,
    userId: string,
    role: UserRole,
    operatingDistrictId?: string,
  ): void {
    switch (role) {
      case UserRole.SYSTEM_ADMIN:
        qb.andWhere('createdBy.id = :scopeUserId', {
          scopeUserId: userId,
        });
        break;
      case UserRole.CCTNS_INCHARGE_DISTRICT:
        qb.andWhere('district.id = :operatingDistrictId', {
          operatingDistrictId: operatingDistrictId!,
        });
        break;
      case UserRole.DBA_TEAM_WEEXCEL:
        qb.andWhere('ticket.teamAssigned = :dbaTeam', {
          dbaTeam: UserRole.DBA_TEAM_WEEXCEL,
        });
        break;
      default:
        break;
    }
  }
}
