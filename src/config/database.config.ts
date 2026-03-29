import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'node:path';

export default registerAs('database', (): TypeOrmModuleOptions => {
  const synchronize = process.env.DB_SYNCHRONIZE === 'true';
  const migrationsRun = process.env.DB_MIGRATIONS_RUN === 'true';

  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_NAME ?? 'noc',
    autoLoadEntities: true,
    synchronize,
    migrations: [join(__dirname, '..', 'database', 'migrations', '*.js')],
    migrationsRun,
  };
});
