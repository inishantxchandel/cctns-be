import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'node:path';

export default registerAs('database', (): TypeOrmModuleOptions => {
  const synchronize = process.env.DB_SYNCHRONIZE === 'true';
  const migrationsRun = process.env.DB_MIGRATIONS_RUN === 'true';
  const host = process.env.DB_HOST ?? 'localhost';
  const sslEnabled =
    process.env.DB_SSL === 'true' ||
    process.env.DB_SSL === '1' ||
    process.env.DB_SSL === 'yes' ||
    host.endsWith('render.com');
  // For managed Postgres (Render, Heroku, etc.) you may need SSL with/without cert validation.
  // Defaulting to `false` keeps local/dev working out of the box.
  const rejectUnauthorized =
    process.env.DB_SSL_REJECT_UNAUTHORIZED === undefined
      ? false
      : process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true';

  return {
    type: 'postgres',
    host,
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_NAME ?? 'noc',
    autoLoadEntities: true,
    synchronize,
    ssl: sslEnabled ? { rejectUnauthorized } : undefined,
    migrations: [join(__dirname, '..', 'database', 'migrations', '*.js')],
    migrationsRun,
  };
});
