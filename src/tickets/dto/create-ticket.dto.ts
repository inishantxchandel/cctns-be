import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '../../users/enums/user-role.enum';

export class CreateTicketDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title: string;

  @IsString()
  @MinLength(1)
  description: string;

  @IsUUID()
  districtId: string;

  @IsUUID()
  policeStationId: string;

  @IsUUID()
  issueTypeId: string;

  @IsOptional()
  @IsEnum(UserRole)
  teamAssigned?: UserRole;
}
