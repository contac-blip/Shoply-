export const up = function(knex) {
  return knex.schema
    .createTable('loyalty_redemptions', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.integer('points_used').notNullable().defaultTo(0);
      table.decimal('discount_amount', 10, 2).defaultTo(0);
      table.uuid('order_id').references('id').inTable('orders').onDelete('CASCADE');
      table.string('status').notNullable().defaultTo('applied');
      table.timestamps(true, true);
    })
    .createTable('merchant_dashboard_summary', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.decimal('total_revenue', 12, 2).defaultTo(0);
      table.integer('total_orders').defaultTo(0);
      table.integer('pending_fulfillment').defaultTo(0);
      table.integer('low_stock_items').defaultTo(0);
      table.decimal('return_rate', 5, 2).defaultTo(0);
      table.timestamp('generated_at').defaultTo(knex.fn.now());
      table.timestamps(true, true);
    });
};

export const down = function(knex) {
  return knex.schema
    .dropTableIfExists('merchant_dashboard_summary')
    .dropTableIfExists('loyalty_redemptions');
};
