export const up = function(knex) {
  return knex.schema.alterTable('users', table => {
    table.string('role').defaultTo('user');
    table.string('google_id').unique();
  });
};

export const down = function(knex) {
  return knex.schema.alterTable('users', table => {
    table.dropColumn('role');
  });
};
