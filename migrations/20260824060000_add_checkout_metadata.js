export const up = function(knex) {
  return knex.schema.table('orders', table => {
    table.string('shipping_method');
    table.decimal('shipping_amount', 10, 2).defaultTo(0);
    table.string('payment_method');
    table.integer('points_used').defaultTo(0);
    table.decimal('discount_amount', 10, 2).defaultTo(0);
  });
};

export const down = function(knex) {
  return knex.schema.table('orders', table => {
    table.dropColumn('shipping_method');
    table.dropColumn('shipping_amount');
    table.dropColumn('payment_method');
    table.dropColumn('points_used');
    table.dropColumn('discount_amount');
  });
};
