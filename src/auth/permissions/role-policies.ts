import { UserRole } from '../../users/enums/user-role.enum';
import { Permission } from './permission.enum';

/**
 * Single place to configure which roles may perform each permission.
 * Later: load from DB/cache and merge with this fallback, or replace entirely.
 */
export const ROLE_POLICIES: Record<
  Permission,
  readonly UserRole[]
> = {
  [Permission.CREATE_TICKET]: [
    UserRole.SYSTEM_ADMIN,
    UserRole.CCTNS_INCHARGE_DISTRICT,
    UserRole.NOC_INCHARGE_HQ,
  ],
};

export function rolesForPermission(
  permission: Permission,
): readonly UserRole[] {
  const roles = ROLE_POLICIES[permission];
  if (!roles) {
    throw new Error(`No role policy registered for permission: ${permission}`);
  }
  return roles;
}
