import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { District } from '../districts/entities/district.entity';
import { IssueType } from '../issue-types/entities/issue-type.entity';
import { PoliceStation } from '../police-stations/entities/police-station.entity';
import { ReferenceController } from './reference.controller';
import { ReferenceService } from './reference.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([IssueType, District, PoliceStation]),
  ],
  controllers: [ReferenceController],
  providers: [ReferenceService],
})
export class ReferenceModule {}
