import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import dataSource from '../data-source';
import { District } from '../../districts/entities/district.entity';
import { PoliceStation } from '../../police-stations/entities/police-station.entity';

type MappingRow = {
  District: string;
  'Name of PS': string;
};

const JSON_FILE = join(
  __dirname,
  'distirct_police_station_mapping.json',
);

async function seed(): Promise<void> {
  const raw = readFileSync(JSON_FILE, 'utf8');
  const rows: MappingRow[] = JSON.parse(raw);

  await dataSource.initialize();
  const districtRepo = dataSource.getRepository(District);
  const psRepo = dataSource.getRepository(PoliceStation);

  try {
    const districtIdByName = new Map<string, string>();

    const districtNamesOrdered: string[] = [];
    const seenDistrict = new Set<string>();
    for (const row of rows) {
      const name = row.District?.trim();
      if (!name) continue;
      if (!seenDistrict.has(name)) {
        seenDistrict.add(name);
        districtNamesOrdered.push(name);
      }
    }

    for (const districtName of districtNamesOrdered) {
      let district = await districtRepo.findOne({ where: { name: districtName } });
      if (!district) {
        await districtRepo.insert({ name: districtName });
        district = (await districtRepo.findOne({
          where: { name: districtName },
        }))!;
        console.log(`District created: ${districtName}`);
      } else {
        console.log(`District exists: ${districtName}`);
      }
      districtIdByName.set(districtName, district.id);
    }

    let createdPs = 0;
    let skippedPs = 0;

    for (const row of rows) {
      const districtName = row.District?.trim();
      const psName = row['Name of PS']?.trim();
      if (!districtName || !psName) {
        console.warn('Skip row (missing District or Name of PS):', row);
        continue;
      }

      const districtId = districtIdByName.get(districtName);
      if (!districtId) {
        console.warn(`Skip row (unknown district): ${districtName}`);
        continue;
      }

      const exists = await psRepo.exist({
        where: {
          name: psName,
          district: { id: districtId },
        },
      });

      if (exists) {
        skippedPs += 1;
        continue;
      }

      await psRepo.insert({
        name: psName,
        district: { id: districtId },
      });
      createdPs += 1;
    }

    console.log(
      `Police stations: ${createdPs} created, ${skippedPs} skipped (already present).`,
    );
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
