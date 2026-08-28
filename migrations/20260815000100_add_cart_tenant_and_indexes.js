export const up = function(knex) {
  return knex.schema
    .table('carts', table => {
      table.uuid('tenant_id');
      table.index(['tenant_id']);
    })
    .then(() => knex.schema.table('products', table => {
      if (!table.hasColumn) {
        // Note: knex doesn't support hasColumn checks inside migration function in all dialects; keep additive
      }
    }))
    .then(() => knex.raw(`CREATE INDEX IF NOT EXISTS products_tenant_idx ON products(tenant_id);`))
    .then(() => knex.raw(`CREATE INDEX IF NOT EXISTS orders_tenant_idx ON orders(tenant_id);`));
};

export const down = function(knex) {
  return knex.schema
    .table('carts', table => {
      table.dropIndex(['tenant_id']);
      table.dropColumn('tenant_id');
    });
};
