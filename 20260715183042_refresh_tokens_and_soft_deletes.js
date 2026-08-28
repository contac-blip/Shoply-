/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema
    .createTable('refresh_tokens', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('token').unique().notNullable();
      table.timestamp('expires_at').notNullable();
      table.timestamps(true, true);
    })
    .alterTable('products', table => {
      table.timestamp('deleted_at');
    })
    .alterTable('users', table => {
      table.timestamp('deleted_at');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema
    .dropTableIfExists('refresh_tokens')
    .alterTable('products', table => {
      table.dropColumn('deleted_at');
    })
    .alterTable('users', table => {
      table.dropColumn('deleted_at');
    });
};
