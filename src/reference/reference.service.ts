import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { District } from '../districts/entities/district.entity';
import { IssueType } from '../issue-types/entities/issue-type.entity';
import { PoliceStation } from '../police-stations/entities/police-station.entity';
import { TicketStatus } from '../tickets/enums/ticket-status.enum';
import { UserRole, USER_ROLE_LABELS } from '../users/enums/user-role.enum';

export type DropdownOption = {
  value: string;
  label: string;
};

export type ReferenceDropdownsResponse = {
  issueTypes: DropdownOption[];
  districts: DropdownOption[];
  policeStations: DropdownOption[];
  statuses: DropdownOption[];
  teams: DropdownOption[];
};

@Injectable()
export class ReferenceService {
  constructor(
    @InjectRepository(IssueType)
    private readonly issueTypesRepo: Repository<IssueType>,
    @InjectRepository(District)
    private readonly districtsRepo: Repository<District>,
    @InjectRepository(PoliceStation)
    private readonly policeStationsRepo: Repository<PoliceStation>,
  ) {}

  async getDropdowns(districtId?: string): Promise<ReferenceDropdownsResponse> {
    const [issueTypes, districts] = await Promise.all([
      this.issueTypesRepo.find({
        order: { name: 'ASC' },
        select: ['id', 'name'],
      }),
      this.districtsRepo.find({
        order: { name: 'ASC' },
        select: ['id', 'name'],
      }),
    ]);

    let policeStations: PoliceStation[] = [];
    if (districtId) {
      policeStations = await this.policeStationsRepo.find({
        where: { district: { id: districtId } },
        order: { name: 'ASC' },
        select: ['id', 'name'],
      });
    }

    const toOptions = (rows: { id: string; name: string }[]): DropdownOption[] =>
      rows.map((row) => ({ value: row.id, label: row.name }));

    return {
      issueTypes: toOptions(issueTypes),
      districts: toOptions(districts),
      policeStations: toOptions(policeStations),
      statuses: Object.values(TicketStatus).map((status) => ({
        value: status,
        label: status,
      })),
      teams: Object.values(UserRole).map((role) => ({
        value: role,
        label: USER_ROLE_LABELS[role],
      })),
    };
  }
}
