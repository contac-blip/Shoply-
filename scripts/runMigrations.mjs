import { createRequire } from 'module';
import knex from 'knex';
const require = createRequire(import.meta.url);
const config = require('../knexfile.cjs');
const env = 'development';
const db = knex(config[env]);

console.log('Running migrations using config for', env);
console.log('Config client:', config[env]?.client);

try {
  const res = await db.migrate.latest();
  console.log('Migrations result:', res);
} catch (err) {
  console.error('Migrations error:', err);
  process.exit(1);
} finally {
  await db.destroy();
}
