export const up = function(knex) {
  return knex.schema.table('orders', table => {
    table.string('promo_code');
    table.decimal('promo_discount', 10, 2).defaultTo(0);
  });
};

export const down = function(knex) {
  return knex.schema.table('orders', table => {
    table.dropColumn('promo_code');
    table.dropColumn('promo_discount');
  });
};