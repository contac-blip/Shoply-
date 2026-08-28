import knex from 'knex';
import knexConfig from '../knexfile.js';
import dotenv from 'dotenv';

dotenv.config();

const environment = process.env.NODE_ENV || 'development';

const createFallbackDb = () => {
  const fakeDb = (table) => {
    const chain = {
      where() { return chain; },
      whereNull() { return chain; },
      first: async () => undefined,
      insert: async () => [],
      returning() { return chain; },
      then: undefined,
      catch: undefined,
    };
    return chain;
  };

  return Object.assign(fakeDb, {
    destroy: async () => undefined,
    raw: async () => undefined,
  });
};

const config = knexConfig[environment] || knexConfig.development;
const db = environment === 'test' && !process.env.DATABASE_URL ? createFallbackDb() : knex(config);

export default db;
