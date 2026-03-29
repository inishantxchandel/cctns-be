import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from '../users/entities/user.entity';
import { District } from '../districts/entities/district.entity';
import { IssueType } from '../issue-types/entities/issue-type.entity';
import { PoliceStation } from '../police-stations/entities/police-station.entity';
import { TicketComment } from './entities/ticket-comment.entity';
import { TicketLog } from './entities/ticket-log.entity';
import { Ticket } from './entities/ticket.entity';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Ticket,
      TicketLog,
      TicketComment,
      District,
      IssueType,
      PoliceStation,
      User,
    ]),
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TypeOrmModule, TicketsService],
})
export class TicketsModule {}
