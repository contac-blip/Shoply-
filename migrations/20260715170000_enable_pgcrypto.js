export const up = function(knex) {
  return knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
};

export const down = function() {
  return Promise.resolve();
};
