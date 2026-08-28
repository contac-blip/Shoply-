export const up = function(knex) {
  return knex.schema.createTable('audit_logs', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('action').notNullable();
    table.string('resource').notNullable();
    table.string('resource_id');
    table.jsonb('old_value');
    table.jsonb('new_value');
    table.string('ip_address');
    table.string('user_agent');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

export const down = function(knex) {
  return knex.schema.dropTableIfExists('audit_logs');
};
