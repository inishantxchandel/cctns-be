import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { District } from '../../districts/entities/district.entity';
import { IssueType } from '../../issue-types/entities/issue-type.entity';
import { PoliceStation } from '../../police-stations/entities/police-station.entity';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';
import { TicketStatus } from '../enums/ticket-status.enum';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    enumName: 'ticket_status_enum',
    default: TicketStatus.PENDING,
  })
  status: TicketStatus;

  @ManyToOne(() => District, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'district_id' })
  district: District;

  @ManyToOne(() => PoliceStation, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'police_station_id' })
  policeStation: PoliceStation;

  @ManyToOne(() => IssueType, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'issue_type_id' })
  issueType: IssueType;

  /** Owning / current team (same values as `User.role`). */
  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role_enum',
  })
  teamAssigned: UserRole;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
