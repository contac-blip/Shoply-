export const up = function(knex) {
  return knex.schema
    .createTable('campaigns', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.string('type').notNullable().defaultTo('flash_sale');
      table.string('status').notNullable().defaultTo('draft');
      table.decimal('discount_percent', 5, 2).defaultTo(0);
      table.decimal('min_order_amount', 10, 2).defaultTo(0);
      table.timestamp('start_at');
      table.timestamp('end_at');
      table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamps(true, true);
    })
    .createTable('promotion_usage', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('promo_code_id').references('id').inTable('promo_codes').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('order_id').references('id').inTable('orders').onDelete('CASCADE');
      table.timestamp('used_at').defaultTo(knex.fn.now());
      table.jsonb('metadata');
      table.timestamps(true, true);
    })
    .createTable('loyalty_tiers', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.integer('min_points').notNullable().defaultTo(0);
      table.decimal('discount_percent', 5, 2).defaultTo(0);
      table.timestamps(true, true);
    })
    .createTable('loyalty_points', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.integer('points').notNullable().defaultTo(0);
      table.string('reason').notNullable();
      table.string('source_type').notNullable();
      table.jsonb('metadata');
      table.timestamps(true, true);
    });
};

export const down = function(knex) {
  return knex.schema
    .dropTableIfExists('loyalty_points')
    .dropTableIfExists('loyalty_tiers')
    .dropTableIfExists('promotion_usage')
    .dropTableIfExists('campaigns');
};
