import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IssueType } from './entities/issue-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([IssueType])],
  exports: [TypeOrmModule],
})
export class IssueTypesModule {}
