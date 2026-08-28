export const up = function(knex) {
  return knex.schema.createTable('store_follows', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('tenant_id').nullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('brand_name').notNullable();
    table.timestamps(true, true);
    table.unique(['user_id', 'tenant_id', 'brand_name']);
  });
};

export const down = function(knex) {
  return knex.schema.dropTableIfExists('store_follows');
};
