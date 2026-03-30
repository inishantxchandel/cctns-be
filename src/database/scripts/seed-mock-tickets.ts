import 'reflect-metadata';
import dataSource from '../data-source';
import { District } from '../../districts/entities/district.entity';
import { IssueType } from '../../issue-types/entities/issue-type.entity';
import { PoliceStation } from '../../police-stations/entities/police-station.entity';
import { TicketComment } from '../../tickets/entities/ticket-comment.entity';
import { TicketLog } from '../../tickets/entities/ticket-log.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { TicketStatus } from '../../tickets/enums/ticket-status.enum';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';
import { Like } from 'typeorm';

const TARGET_COUNT = parseInt(process.env.SEED_MOCK_TICKETS_COUNT ?? '180', 10);
const TITLE_PREFIX = process.env.SEED_MOCK_TICKETS_PREFIX ?? 'MOCK-TICKET';

function buildCreatedAt(seedIndex: number): Date {
  const now = new Date();
  const daysBack = seedIndex % 90;
  const hour = (seedIndex * 7) % 24;
  const minute = (seedIndex * 13) % 60;
  const created = new Date(now);
  created.setUTCDate(created.getUTCDate() - daysBack);
  created.setUTCHours(hour, minute, 0, 0);
  return created;
}

function extractSerialFromTitle(title: string): number | null {
  // Example: "MOCK-TICKET #12: CIA Mapping/DB Changes"
  const match = title.match(/#(\d+)\s*:/);
  if (!match?.[1]) return null;
  const serial = parseInt(match[1], 10);
  return Number.isFinite(serial) ? serial : null;
}

function buildResolvedAt(createdAt: Date, serial: number): Date {
  // Resolution between createdAt + [2..73] hours
  const hours = 2 + (serial % 72);
  const candidate = new Date(createdAt.getTime() + hours * 3600_000);
  const now = new Date();
  // Clamp to "now - 5 minutes" to avoid future resolution times
  const max = new Date(now.getTime() - 5 * 60_000);
  return candidate.getTime() > max.getTime() ? max : candidate;
}

function pickPreviousStatus(status: TicketStatus): TicketStatus {
  if (status === TicketStatus.CLOSED) return TicketStatus.RESOLVED;
  // TicketStatus.RESOLVED -> previous should be in-progress-ish
  return TicketStatus.IN_PROGRESS;
}

async function seed(): Promise<void> {
  if (!Number.isFinite(TARGET_COUNT) || TARGET_COUNT < 1) {
    throw new Error('SEED_MOCK_TICKETS_COUNT must be a positive integer');
  }

  await dataSource.initialize();
  const usersRepo = dataSource.getRepository(User);
  const issueTypesRepo = dataSource.getRepository(IssueType);
  const districtsRepo = dataSource.getRepository(District);
  const policeStationsRepo = dataSource.getRepository(PoliceStation);
  const ticketsRepo = dataSource.getRepository(Ticket);
  const ticketLogsRepo = dataSource.getRepository(TicketLog);
  const ticketCommentsRepo = dataSource.getRepository(TicketComment);

  try {
    const [users, issueTypes, districts, policeStations] = await Promise.all([
      usersRepo.find({ order: { createdAt: 'ASC' } }),
      issueTypesRepo.find({ order: { name: 'ASC' } }),
      districtsRepo.find({ order: { name: 'ASC' } }),
      policeStationsRepo.find({
        relations: ['district'],
        order: { name: 'ASC' },
      }),
    ]);

    if (!users.length) {
      throw new Error(
        'No users found. Run seed:mock-users before seed:mock-tickets.',
      );
    }
    if (!issueTypes.length) {
      throw new Error(
        'No issue types found. Run seed:issue-types before seed:mock-tickets.',
      );
    }
    if (!districts.length || !policeStations.length) {
      throw new Error(
        'Districts/police stations missing. Run seed:districts-police-stations first.',
      );
    }

    const policeStationsByDistrict = new Map<string, PoliceStation[]>();
    for (const ps of policeStations) {
      const districtId = ps.district?.id;
      if (!districtId) continue;
      const arr = policeStationsByDistrict.get(districtId) ?? [];
      arr.push(ps);
      policeStationsByDistrict.set(districtId, arr);
    }

    const districtsWithStations = districts.filter((d) =>
      policeStationsByDistrict.has(d.id),
    );
    if (!districtsWithStations.length) {
      throw new Error('No district has any police station. Nothing to seed.');
    }

    const statuses = Object.values(TicketStatus);
    const teams = Object.values(UserRole);

    const existingCount = await ticketsRepo
      .createQueryBuilder('ticket')
      .where('ticket.title LIKE :prefix', { prefix: `${TITLE_PREFIX} #%` })
      .getCount();

    // Ensure CCTNS incharge has an operating district for analytics access.
    const cctnsIncharge = users.find(
      (u) => u.role === UserRole.CCTNS_INCHARGE_DISTRICT,
    );
    if (cctnsIncharge) {
      // Assign the first district that has police stations.
      await usersRepo.save({
        id: cctnsIncharge.id,
        district: districtsWithStations[0],
      } as User);
    }

    let createdCount = 0;
    const resolvedStatuses: TicketStatus[] = [
      TicketStatus.RESOLVED,
      TicketStatus.CLOSED,
    ];

    // 1) Backfill missing STATUS_CHANGED logs for already seeded tickets
    const existingTickets = await ticketsRepo.find({
      where: { title: Like(`${TITLE_PREFIX} #%`) } as any,
      relations: ['createdBy'],
    });

    let backfilledResolvedLogs = 0;
    for (const ticket of existingTickets) {
      if (!resolvedStatuses.includes(ticket.status)) continue;
      const serial = extractSerialFromTitle(ticket.title);
      if (serial === null) continue;
      if (!ticket.createdBy?.id) continue;

      const resolvedAt = buildResolvedAt(ticket.createdAt, serial);
      const previousStatus = pickPreviousStatus(ticket.status);

      const existingResolvedLogCount = await ticketLogsRepo
        .createQueryBuilder('log')
        .leftJoin('log.ticket', 't')
        .where('t.id = :ticketId', { ticketId: ticket.id })
        .andWhere('log.action = :action', { action: 'STATUS_CHANGED' })
        .andWhere(`log.metadata->>'newStatus' = :newStatus`, {
          newStatus: ticket.status,
        })
        .getCount();

      if (existingResolvedLogCount > 0) continue;

      await ticketLogsRepo.insert({
        ticket: { id: ticket.id },
        actor: { id: ticket.createdBy.id },
        action: 'STATUS_CHANGED',
        details: `Status changed to "${ticket.status}"`,
        metadata: {
          previousStatus,
          newStatus: ticket.status,
          seeded: true,
          serial,
        },
        createdAt: resolvedAt,
      });
      backfilledResolvedLogs += 1;
    }

    // 2) Seed new tickets (if needed), plus create logs used by analytics
    const startSerial = existingCount + 1;
    if (startSerial <= TARGET_COUNT) {
      for (
        let serial = startSerial;
        serial <= TARGET_COUNT;
        serial += 1
      ) {
      const i = serial - 1;
      const district = districtsWithStations[i % districtsWithStations.length];
      const districtStations = policeStationsByDistrict.get(district.id)!;
      const policeStation = districtStations[i % districtStations.length];
      const issueType = issueTypes[(i * 3) % issueTypes.length];
      const createdBy = users[i % users.length];
      const status = statuses[i % statuses.length];
      const teamAssigned = teams[(i * 2) % teams.length];
      const createdAt = buildCreatedAt(i);

      const title = `${TITLE_PREFIX} #${serial}: ${issueType.name}`;
      const description = [
        `Auto-generated test ticket #${serial} for filters/pagination.`,
        `District: ${district.name}; Police Station: ${policeStation.name}.`,
        `Status: ${status}; Team: ${teamAssigned}; Reporter: ${createdBy.email}.`,
      ].join(' ');

      const insertResult = await ticketsRepo.insert({
        title,
        description,
        createdBy: { id: createdBy.id },
        status,
        district: { id: district.id },
        policeStation: { id: policeStation.id },
        issueType: { id: issueType.id },
        teamAssigned,
        createdAt,
        updatedAt: createdAt,
      });

      const ticketId = insertResult.identifiers[0]?.id as string | undefined;
      if (!ticketId) {
        continue;
      }

      await ticketLogsRepo.insert({
        ticket: { id: ticketId },
        actor: { id: createdBy.id },
        action: 'CREATED',
        details: 'Seeded mock ticket',
        metadata: { seeded: true, serial },
        createdAt,
      });

      if (resolvedStatuses.includes(status)) {
        const resolvedAt = buildResolvedAt(createdAt, serial);
        await ticketLogsRepo.insert({
          ticket: { id: ticketId },
          actor: { id: createdBy.id },
          action: 'STATUS_CHANGED',
          details: `Status changed to "${status}"`,
          metadata: {
            previousStatus: pickPreviousStatus(status),
            newStatus: status,
            seeded: true,
            serial,
          },
          createdAt: resolvedAt,
        });
      }

      if (serial % 3 === 0) {
        const commenter = users[(i + 1) % users.length];
        const commentTime = new Date(createdAt);
        commentTime.setUTCMinutes(commentTime.getUTCMinutes() + 15);

        await ticketCommentsRepo.insert({
          ticket: { id: ticketId },
          author: { id: commenter.id },
          body: `Seed comment for ${TITLE_PREFIX} #${serial}`,
          createdAt: commentTime,
        });
      }

      createdCount += 1;
      }
    }

    console.log(
      `Mock tickets seeded: ${createdCount} created.`,
    );
    console.log(
      `Backfilled resolution logs for ${backfilledResolvedLogs} existing resolved/closed tickets.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
