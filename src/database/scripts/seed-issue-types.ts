import 'reflect-metadata';
import dataSource from '../data-source';
import { IssueType } from '../../issue-types/entities/issue-type.entity';

/**
 * Reference issue types (CIA / NOC). Re-running skips names that already exist.
 */
const ISSUE_TYPE_NAMES: readonly string[] = [
  'CIA Mapping/DB Changes',
  'Unable to Assign officer In-Charge',
  'No Id has Officer In-charge role',
  'ID not showing in I/O list while assigning FIR',
  'ID to be mapped but showing pending tasks in PS',
  'Bubble in FIR',
  'Connection Pool/PS Blocked',
  'Recently mapped UID need to be synced',
  'Data synced but ID not synced.',
  'Want next FIR counter',
  'Wrong GD no.',
  'DB Counters set to zero',
  'Time changed by system',
  'FIR not visible in I/O account',
  'IIF-2 in interim save mode',
  'IIF-3 in interim save mode',
  'IIF-4 in interim save mode',
  'IIF-5 in interim save mode',
  'Unable to submit FIR/IIF forms.',
  'IIF 5 not syncing offline to online even data is synced',
  'Rank updated in online by not reflected despite of data sync.',
  'Update User ID Info',
  'I/O unable to access account',
  'I/O trying to login but Directed to home page again',
  'Act or Section is available in online but not in offline',
  'Act or Section is neither available online nor offline',
  'Property seized/Recovered, not showing in list of IIF-4',
  'Accused not showing in IIF-2',
  'Accused not showing in IIF-3',
  'Error in IIF form',
  'Online Site Not Working',
  'Unable to view IIF forms',
  'Double IO Account',
  'Menu bar(Icons) not showing/working',
  'Interrogation form issue',
  'Want to fill Dossier but FIR not showing.',
  'Trial added but not visible in dossier list.',
  'Accused Photo visible in offline but not synced online',
  'FIR No. skipped',
  'Unable to E-sign FIR',
  'GD Skip',
];

async function seed(): Promise<void> {
  await dataSource.initialize();
  const repo = dataSource.getRepository(IssueType);

  try {
    for (const name of ISSUE_TYPE_NAMES) {
      const exists = await repo.exist({ where: { name } });
      if (exists) {
        console.log(`Skip (exists): ${name}`);
        continue;
      }
      await repo.insert({ name });
      console.log(`Created: ${name}`);
    }
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
