/**
 * Named permissions for route/feature checks. Policies live in {@link ROLE_POLICIES}
 * (code today; can be replaced by DB-backed config later).
 */
export enum Permission {
  CREATE_TICKET = 'create_ticket',
  UPDATE_TICKET_STATUS = 'update_ticket_status',
  UPDATE_TICKET_TEAM = 'update_ticket_team',
  ACCESS_ANALYTICS_DASHBOARD = 'access_analytics_dashboard',
}
