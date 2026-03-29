import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PoliceStation } from './entities/police-station.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PoliceStation])],
  exports: [TypeOrmModule],
})
export class PoliceStationsModule {}
