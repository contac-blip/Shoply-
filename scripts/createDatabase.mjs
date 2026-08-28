import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const match = databaseUrl.match(/^(postgres(?:ql)?:\/\/[^/]+)\/(.+)$/);
if (!match) {
  console.error('DATABASE_URL is not a valid postgres URL:', databaseUrl);
  process.exit(1);
}

const [, baseUrl, dbName] = match;
const client = new Client({ connectionString: `${baseUrl}/postgres` });

try {
  await client.connect();
  console.log('Connected to postgres server');
  const result = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
  if (result.rowCount > 0) {
    console.log(`Database ${dbName} already exists`);
  } else {
    await client.query(`CREATE DATABASE \"${dbName}\"`);
    console.log(`Created database ${dbName}`);
  }
} catch (err) {
  console.error('Failed to create database:', err);
  process.exit(1);
} finally {
  await client.end();
}
