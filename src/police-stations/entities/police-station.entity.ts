import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { District } from '../../districts/entities/district.entity';

@Entity('police_stations')
@Index('UQ_police_station_district_name', ['district', 'name'], { unique: true })
export class PoliceStation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ManyToOne(() => District, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'district_id' })
  district: District;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
