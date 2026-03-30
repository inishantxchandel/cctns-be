import { IsOptional, IsUUID } from 'class-validator';

export class GetDropdownsQueryDto {
  /** When set, `policeStations` lists stations in this district (empty otherwise). */
  @IsOptional()
  @IsUUID()
  districtId?: string;
}
