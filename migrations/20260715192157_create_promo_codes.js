export const up = function(knex) {
  return knex.schema.createTable('promo_codes', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('code').unique().notNullable();
    table.enum('type', ['percentage', 'fixed']).notNullable();
    table.decimal('value', 10, 2).notNullable();
    table.decimal('min_order_amount', 10, 2).defaultTo(0);
    table.timestamp('expires_at');
    table.integer('usage_limit');
    table.integer('used_count').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });
};

export const down = function(knex) {
  return knex.schema.dropTableIfExists('promo_codes');
};
