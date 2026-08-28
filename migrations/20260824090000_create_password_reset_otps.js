export const up = function(knex) {
  return knex.schema.createTable('password_reset_otps', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('email').notNullable();
    table.string('code_hash').notNullable();
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('used_at', { useTz: true });
    table.integer('attempts').notNullable().defaultTo(0);
    table.timestamps(true, true);
    table.index(['email', 'expires_at']);
  });
};

export const down = function(knex) {
  return knex.schema.dropTableIfExists('password_reset_otps');
};