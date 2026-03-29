import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';

/**
 * Local/dev mock users — one per role. Re-running skips emails that already exist.
 *
 * Plain password: set SEED_MOCK_PASSWORD in .env or use the default below (not for production).
 */
const DEFAULT_PLAIN_PASSWORD =
  process.env.SEED_MOCK_PASSWORD ?? 'NocDev#2026';

const BCRYPT_ROUNDS = 12;

const MOCK_USERS: Array<{
  email: string;
  role: UserRole;
  /** Override DEFAULT_PLAIN_PASSWORD for this row */
  plainPassword?: string;
}> = [
  {
    email: 'system.admin@noc.local',
    role: UserRole.SYSTEM_ADMIN,
  },
  {
    email: 'cctns.incharge.district@noc.local',
    role: UserRole.CCTNS_INCHARGE_DISTRICT,
  },
  {
    email: 'noc.team.punjab@noc.local',
    role: UserRole.NOC_TEAM_PUNJAB_POLICE,
  },
  {
    email: 'dba.weexcel@noc.local',
    role: UserRole.DBA_TEAM_WEEXCEL,
  },
  {
    email: 'noc.incharge.hq@noc.local',
    role: UserRole.NOC_INCHARGE_HQ,
  },
];

async function seed(): Promise<void> {
  await dataSource.initialize();
  const repo = dataSource.getRepository(User);

  try {
    for (const row of MOCK_USERS) {
      const exists = await repo.exist({ where: { email: row.email } });
      if (exists) {
        console.log(`Skip (exists): ${row.email}`);
        continue;
      }

      const plain = row.plainPassword ?? DEFAULT_PLAIN_PASSWORD;
      const password = await bcrypt.hash(plain, BCRYPT_ROUNDS);

      await repo.insert({
        email: row.email,
        password,
        role: row.role,
      });

      console.log(`Created: ${row.email} (${row.role})`);
    }
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
