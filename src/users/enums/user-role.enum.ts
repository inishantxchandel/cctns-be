export enum UserRole {
  /** System Admin (SA) */
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  /** CCTNS Incharge (District) */
  CCTNS_INCHARGE_DISTRICT = 'CCTNS_INCHARGE_DISTRICT',
  /** NOC Team (Punjab Police) */
  NOC_TEAM_PUNJAB_POLICE = 'NOC_TEAM_PUNJAB_POLICE',
  /** DBA Team (Weexcel) */
  DBA_TEAM_WEEXCEL = 'DBA_TEAM_WEEXCEL',
  /** NOC Incharge (HQ) */
  NOC_INCHARGE_HQ = 'NOC_INCHARGE_HQ',
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SYSTEM_ADMIN]: 'System Admin (SA)',
  [UserRole.CCTNS_INCHARGE_DISTRICT]: 'CCTNS Incharge (District)',
  [UserRole.NOC_TEAM_PUNJAB_POLICE]: 'NOC Team (Punjab Police)',
  [UserRole.DBA_TEAM_WEEXCEL]: 'DBA Team (Weexcel)',
  [UserRole.NOC_INCHARGE_HQ]: 'NOC Incharge (HQ)',
};
