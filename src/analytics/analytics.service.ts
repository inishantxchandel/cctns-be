import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketStatus } from '../tickets/enums/ticket-status.enum';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import {
  AnalyticsDashboardQueryDto,
  AnalyticsGroupBy,
} from './dto/analytics-dashboard-query.dto';

type IssueTypeTrendPoint = { period: string; total: number };

export type AnalyticsDashboardResponse = {
  range: { from: string; to: string };
  issueTrends: {
    groupBy: AnalyticsGroupBy;
    series: Array<{
      issueTypeId: string;
      issueTypeName: string;
      points: IssueTypeTrendPoint[];
    }>;
  };
  frequentProblems: Array<{
    issueTypeId: string;
    issueTypeName: string;
    count: number;
  }>;
  resolutionTime: {
    overall: {
      totalTickets: number;
      resolvedTickets: number;
      unresolvedTickets: number;
      avgResolutionHours: number | null;
      p50ResolutionHours: number | null;
      p90ResolutionHours: number | null;
    };
    byTeam: Array<{
      teamAssigned: UserRole;
      totalTickets: number;
      resolvedTickets: number;
      avgResolutionHours: number | null;
      p50ResolutionHours: number | null;
      p90ResolutionHours: number | null;
    }>;
  };
  teamPerformance: {
    byTeam: Array<{
      teamAssigned: UserRole;
      totalTickets: number;
      resolvedTickets: number;
      statusCounts: Record<TicketStatus, number>;
    }>;
  };
};

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepo: Repository<Ticket>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async getDashboard(
    query: AnalyticsDashboardQueryDto,
    userId: string,
    role: UserRole,
  ): Promise<AnalyticsDashboardResponse> {
    const now = new Date();
    const end = query.to ? new Date(query.to) : now;
    const start = query.from ? new Date(query.from) : new Date(now.getTime() - 90 * 86400_000);

    // Normalize (avoid weird timezone boundaries in charts)
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);

    const fromIso = start.toISOString();
    const toIso = end.toISOString();
    const groupBy = query.groupBy ?? AnalyticsGroupBy.MONTH;
    const topN = query.topN ?? 5;

    const operatingDistrictId = await this.resolveOperatingDistrictId(
      userId,
      role,
    );

    const [frequentProblems, issueTrends] = await Promise.all([
      this.getFrequentProblems({
        fromIso,
        toIso,
        operatingDistrictId,
        role,
        topN,
      }),
      this.getIssueTrends({
        fromIso,
        toIso,
        operatingDistrictId,
        role,
        topN,
        groupBy,
      }),
    ]);

    const [resolutionTimeOverall, resolutionTimeByTeam, teamPerformance] =
      await Promise.all([
        this.getResolutionTimeOverall({
          fromIso,
          toIso,
          operatingDistrictId,
          role,
        }),
        this.getResolutionTimeByTeam({
          fromIso,
          toIso,
          operatingDistrictId,
          role,
        }),
        this.getTeamPerformance({
          fromIso,
          toIso,
          operatingDistrictId,
          role,
        }),
      ]);

    return {
      range: { from: fromIso, to: toIso },
      issueTrends,
      frequentProblems,
      resolutionTime: {
        overall: resolutionTimeOverall,
        byTeam: resolutionTimeByTeam,
      },
      teamPerformance,
    };
  }

  private async resolveOperatingDistrictId(
    userId: string,
    role: UserRole,
  ): Promise<string | undefined> {
    if (role !== UserRole.CCTNS_INCHARGE_DISTRICT) return undefined;

    const row = await this.usersRepo
      .createQueryBuilder('u')
      .select('u.district_id', 'districtId')
      .where('u.id = :id', { id: userId })
      .getRawOne<{ districtId: string | null }>();

    if (!row?.districtId) {
      throw new ForbiddenException(
        'Your account has no operating district assigned. Contact an administrator.',
      );
    }
    return row.districtId;
  }

  private applyTicketScope(
    qb: any,
    userId: string,
    role: UserRole,
    operatingDistrictId?: string,
  ): void {
    switch (role) {
      case UserRole.SYSTEM_ADMIN:
        qb.andWhere('createdBy.id = :scopeUserId', { scopeUserId: userId });
        break;
      case UserRole.CCTNS_INCHARGE_DISTRICT:
        qb.andWhere('district.id = :operatingDistrictId', {
          operatingDistrictId: operatingDistrictId!,
        });
        break;
      case UserRole.NOC_TEAM_PUNJAB_POLICE:
        qb.andWhere('ticket.teamAssigned = :team', {
          team: UserRole.NOC_TEAM_PUNJAB_POLICE,
        });
        break;
      case UserRole.DBA_TEAM_WEEXCEL:
        qb.andWhere('ticket.teamAssigned = :team', {
          team: UserRole.DBA_TEAM_WEEXCEL,
        });
        break;
      case UserRole.NOC_INCHARGE_HQ:
        // no additional scope
        break;
      default:
        break;
    }
  }

  private mapGroupBy(groupBy: AnalyticsGroupBy): 'day' | 'week' | 'month' {
    if (groupBy === AnalyticsGroupBy.DAY) return 'day';
    if (groupBy === AnalyticsGroupBy.WEEK) return 'week';
    return 'month';
  }

  private async getFrequentProblems(args: {
    fromIso: string;
    toIso: string;
    operatingDistrictId?: string;
    role: UserRole;
    topN: number;
  }): Promise<
    Array<{ issueTypeId: string; issueTypeName: string; count: number }>
  > {
    const qb = this.ticketsRepo
      .createQueryBuilder('ticket')
      .leftJoin('ticket.createdBy', 'createdBy')
      .leftJoin('ticket.district', 'district')
      .leftJoin('ticket.issueType', 'issueType')
      .where('ticket.createdAt >= :fromIso', { fromIso: args.fromIso })
      .andWhere('ticket.createdAt <= :toIso', { toIso: args.toIso });

    // For analytics, endpoint is restricted, but we still keep scope consistent.
    this.applyTicketScope(
      qb,
      // userId is not needed for non-system-admin; for SYSTEM_ADMIN we cannot infer here
      // (analytics endpoint is restricted away from system admin), so safe to use empty string.
      '',
      args.role,
      args.operatingDistrictId,
    );

    const rows = await qb
      .select('issueType.id', 'issueTypeId')
      .addSelect('issueType.name', 'issueTypeName')
      .addSelect('COUNT(*)', 'count')
      .groupBy('issueType.id')
      .addGroupBy('issueType.name')
      .orderBy('count', 'DESC')
      .limit(args.topN)
      .getRawMany<{
        issueTypeId: string;
        issueTypeName: string;
        count: string;
      }>();

    return rows.map((r) => ({
      issueTypeId: r.issueTypeId,
      issueTypeName: r.issueTypeName,
      count: parseInt(r.count, 10),
    }));
  }

  private async getIssueTrends(args: {
    fromIso: string;
    toIso: string;
    operatingDistrictId?: string;
    role: UserRole;
    topN: number;
    groupBy: AnalyticsGroupBy;
  }): Promise<AnalyticsDashboardResponse['issueTrends']> {
    const group = this.mapGroupBy(args.groupBy);
    const topIssues = await this.getFrequentProblems({
      fromIso: args.fromIso,
      toIso: args.toIso,
      operatingDistrictId: args.operatingDistrictId,
      role: args.role,
      topN: args.topN,
    });
    const topIds = topIssues.map((x) => x.issueTypeId);

    if (!topIds.length) {
      return { groupBy: args.groupBy, series: [] };
    }

    const qb = this.ticketsRepo
      .createQueryBuilder('ticket')
      .leftJoin('ticket.createdBy', 'createdBy')
      .leftJoin('ticket.district', 'district')
      .leftJoin('ticket.issueType', 'issueType')
      .where('ticket.createdAt >= :fromIso', { fromIso: args.fromIso })
      .andWhere('ticket.createdAt <= :toIso', { toIso: args.toIso })
      .andWhere('issueType.id IN (:...topIds)', { topIds });

    this.applyTicketScope(
      qb,
      '',
      args.role,
      args.operatingDistrictId,
    );

    const periodExpr = `date_trunc('${group}', ticket."createdAt")`;

    const rows = await qb
      .select(periodExpr, 'period')
      .addSelect('issueType.id', 'issueTypeId')
      .addSelect('issueType.name', 'issueTypeName')
      .addSelect('COUNT(*)', 'total')
      .groupBy(periodExpr)
      .addGroupBy('issueType.id')
      .addGroupBy('issueType.name')
      .orderBy('period', 'ASC')
      .getRawMany<{
        period: Date | string;
        issueTypeId: string;
        issueTypeName: string;
        total: string;
      }>();

    const seriesMap = new Map<
      string,
      { issueTypeId: string; issueTypeName: string; points: IssueTypeTrendPoint[] }
    >();
    for (const issue of topIssues) {
      seriesMap.set(issue.issueTypeId, {
        issueTypeId: issue.issueTypeId,
        issueTypeName: issue.issueTypeName,
        points: [],
      });
    }

    for (const row of rows) {
      const key = row.issueTypeId;
      const series = seriesMap.get(key);
      if (!series) continue;
      const periodDate = row.period instanceof Date ? row.period : new Date(row.period);
      series.points.push({
        period: periodDate.toISOString(),
        total: parseInt(row.total, 10),
      });
    }

    return {
      groupBy: args.groupBy,
      series: Array.from(seriesMap.values()),
    };
  }

  private async getResolutionTimeOverall(args: {
    fromIso: string;
    toIso: string;
    operatingDistrictId?: string;
    role: UserRole;
  }): Promise<AnalyticsDashboardResponse['resolutionTime']['overall']> {
    const resolvedStatuses: TicketStatus[] = [
      TicketStatus.RESOLVED,
      TicketStatus.CLOSED,
    ];

    const qb = this.ticketsRepo
      .createQueryBuilder('ticket')
      .leftJoin('ticket.createdBy', 'createdBy')
      .leftJoin('ticket.district', 'district')
      .leftJoin(
        'ticket_logs',
        'log',
        `log.ticket_id = ticket.id AND log.action = :statusChangedAction AND (log.metadata->>'newStatus') IN (:...resolvedStatuses)`,
        { statusChangedAction: 'STATUS_CHANGED', resolvedStatuses },
      )
      .where('ticket.createdAt >= :fromIso', { fromIso: args.fromIso })
      .andWhere('ticket.createdAt <= :toIso', { toIso: args.toIso });

    this.applyTicketScope(qb, '', args.role, args.operatingDistrictId);

    const rows = await qb
      .select('ticket.id', 'ticketId')
      .addSelect('ticket.teamAssigned', 'teamAssigned')
      .addSelect('ticket.createdAt', 'createdAt')
      .addSelect('MIN(log."createdAt")', 'resolvedAt')
      .groupBy('ticket.id')
      .addGroupBy('ticket.teamAssigned')
      .addGroupBy('ticket.createdAt')
      .getRawMany<{
        ticketId: string;
        teamAssigned: UserRole;
        createdAt: Date | string;
        resolvedAt: Date | string | null;
      }>();

    const totalTickets = rows.length;
    const resolvedRows = rows.filter((r) => !!r.resolvedAt);
    const unresolvedTickets = totalTickets - resolvedRows.length;

    const durationsHours: number[] = resolvedRows.map((r) => {
      const created = r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt);
      const resolved = r.resolvedAt instanceof Date ? r.resolvedAt : new Date(r.resolvedAt as any);
      return (resolved.getTime() - created.getTime()) / 3600_000;
    });

    const stats = this.computeDurationStats(durationsHours);

    return {
      totalTickets,
      resolvedTickets: resolvedRows.length,
      unresolvedTickets,
      avgResolutionHours: stats.avg,
      p50ResolutionHours: stats.p50,
      p90ResolutionHours: stats.p90,
    };
  }

  private async getResolutionTimeByTeam(args: {
    fromIso: string;
    toIso: string;
    operatingDistrictId?: string;
    role: UserRole;
  }): Promise<AnalyticsDashboardResponse['resolutionTime']['byTeam']> {
    const resolvedStatuses: TicketStatus[] = [
      TicketStatus.RESOLVED,
      TicketStatus.CLOSED,
    ];

    const qb = this.ticketsRepo
      .createQueryBuilder('ticket')
      .leftJoin('ticket.createdBy', 'createdBy')
      .leftJoin('ticket.district', 'district')
      .leftJoin(
        'ticket_logs',
        'log',
        `log.ticket_id = ticket.id AND log.action = :statusChangedAction AND (log.metadata->>'newStatus') IN (:...resolvedStatuses)`,
        { statusChangedAction: 'STATUS_CHANGED', resolvedStatuses },
      )
      .where('ticket.createdAt >= :fromIso', { fromIso: args.fromIso })
      .andWhere('ticket.createdAt <= :toIso', { toIso: args.toIso });

    this.applyTicketScope(qb, '', args.role, args.operatingDistrictId);

    const rows = await qb
      .select('ticket.teamAssigned', 'teamAssigned')
      .addSelect('ticket.id', 'ticketId')
      .addSelect('ticket.createdAt', 'createdAt')
      .addSelect('MIN(log."createdAt")', 'resolvedAt')
      .groupBy('ticket.teamAssigned')
      .addGroupBy('ticket.id')
      .addGroupBy('ticket.createdAt')
      .getRawMany<{
        teamAssigned: UserRole;
        ticketId: string;
        createdAt: Date | string;
        resolvedAt: Date | string | null;
      }>();

    const byTeam = new Map<
      UserRole,
      {
        total: number;
        resolved: number;
        durations: number[];
      }
    >();

    for (const row of rows) {
      const team = row.teamAssigned;
      const entry = byTeam.get(team) ?? { total: 0, resolved: 0, durations: [] };
      entry.total += 1;
      if (row.resolvedAt) {
        entry.resolved += 1;
        const created = row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt);
        const resolved = row.resolvedAt instanceof Date ? row.resolvedAt : new Date(row.resolvedAt as any);
        entry.durations.push((resolved.getTime() - created.getTime()) / 3600_000);
      }
      byTeam.set(team, entry);
    }

    const teams = Array.from(byTeam.entries()).map(([team, entry]) => {
      const stats = this.computeDurationStats(entry.durations);
      return {
        teamAssigned: team,
        totalTickets: entry.total,
        resolvedTickets: entry.resolved,
        avgResolutionHours: stats.avg,
        p50ResolutionHours: stats.p50,
        p90ResolutionHours: stats.p90,
      };
    });

    // Keep stable order
    teams.sort((a, b) => a.teamAssigned.localeCompare(b.teamAssigned));
    return teams;
  }

  private async getTeamPerformance(args: {
    fromIso: string;
    toIso: string;
    operatingDistrictId?: string;
    role: UserRole;
  }): Promise<AnalyticsDashboardResponse['teamPerformance']> {
    const qb = this.ticketsRepo
      .createQueryBuilder('ticket')
      .leftJoin('ticket.createdBy', 'createdBy')
      .leftJoin('ticket.district', 'district')
      .where('ticket.createdAt >= :fromIso', { fromIso: args.fromIso })
      .andWhere('ticket.createdAt <= :toIso', { toIso: args.toIso });

    this.applyTicketScope(qb, '', args.role, args.operatingDistrictId);

    const rows = await qb
      .select('ticket.teamAssigned', 'teamAssigned')
      .addSelect('ticket.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('ticket.teamAssigned')
      .addGroupBy('ticket.status')
      .getRawMany<{
        teamAssigned: UserRole;
        status: TicketStatus;
        count: string;
      }>();

    const ticketsByTeam = new Map<
      UserRole,
      { total: number; statusCounts: Partial<Record<TicketStatus, number>> }
    >();
    for (const row of rows) {
      const team = row.teamAssigned;
      const entry = ticketsByTeam.get(team) ?? { total: 0, statusCounts: {} };
      entry.total += parseInt(row.count, 10);
      entry.statusCounts[row.status] = parseInt(row.count, 10);
      ticketsByTeam.set(team, entry);
    }

    // resolved ticket counts per team (based on current ticket.status)
    const resolvedTicketsByTeam = await qb
      .clone()
      .select('ticket.teamAssigned', 'teamAssigned')
      .addSelect('COUNT(*)', 'count')
      .andWhere('ticket.status IN (:...resolvedStatuses)', {
        resolvedStatuses: [TicketStatus.RESOLVED, TicketStatus.CLOSED],
      })
      .groupBy('ticket.teamAssigned')
      .getRawMany<{ teamAssigned: UserRole; count: string }>();

    const resolvedMap = new Map<UserRole, number>();
    for (const r of resolvedTicketsByTeam) {
      resolvedMap.set(r.teamAssigned, parseInt(r.count, 10));
    }

    const allTeams = Array.from(ticketsByTeam.entries());
    const byTeam = allTeams.map(([team, entry]) => {
      const statusCounts = {} as Record<TicketStatus, number>;
      for (const s of Object.values(TicketStatus)) {
        statusCounts[s] = entry.statusCounts[s] ?? 0;
      }
      return {
        teamAssigned: team,
        totalTickets: entry.total,
        resolvedTickets: resolvedMap.get(team) ?? 0,
        statusCounts,
      };
    });

    byTeam.sort((a, b) => a.teamAssigned.localeCompare(b.teamAssigned));

    return { byTeam };
  }

  private computeDurationStats(durationsHours: number[]): {
    avg: number | null;
    p50: number | null;
    p90: number | null;
  } {
    if (!durationsHours.length) {
      return { avg: null, p50: null, p90: null };
    }
    const sorted = [...durationsHours].sort((a, b) => a - b);
    const avg = sorted.reduce((sum, v) => sum + v, 0) / sorted.length;
    const p50 = this.percentile(sorted, 0.5);
    const p90 = this.percentile(sorted, 0.9);
    return { avg, p50, p90 };
  }

  private percentile(sorted: number[], p: number): number | null {
    if (!sorted.length) return null;
    if (sorted.length === 1) return sorted[0];
    const idx = (sorted.length - 1) * p;
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return sorted[lower];
    const weight = idx - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
}

