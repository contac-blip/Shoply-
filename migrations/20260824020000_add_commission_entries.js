export const up = function(knex) {
  return knex.schema
    .createTable('commission_entries', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.decimal('gross_sales', 12, 2).defaultTo(0);
      table.decimal('commission_rate', 5, 2).defaultTo(0);
      table.decimal('commission_amount', 12, 2).defaultTo(0);
      table.decimal('net_payout', 12, 2).defaultTo(0);
      table.timestamps(true, true);
    });
};

export const down = function(knex) {
  return knex.schema.dropTableIfExists('commission_entries');
};
