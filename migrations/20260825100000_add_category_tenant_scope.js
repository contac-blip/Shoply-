export const up = function(knex) {
  return knex.schema.alterTable('categories', table => {
    table.uuid('tenant_id').nullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.index(['tenant_id']);
  });
};

export const down = function(knex) {
  return knex.schema.alterTable('categories', table => {
    table.dropIndex(['tenant_id']);
    table.dropColumn('tenant_id');
  });
};