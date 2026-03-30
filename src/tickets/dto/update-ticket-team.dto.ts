import { IsEnum } from 'class-validator';
import { UserRole } from '../../users/enums/user-role.enum';

export class UpdateTicketTeamDto {
  @IsEnum(UserRole)
  teamAssigned: UserRole;
}

