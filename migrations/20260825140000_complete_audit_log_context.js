export const up = function(knex) {
  return knex.schema.alterTable('audit_logs', table => {
    table.uuid('tenant_id').nullable().references('id').inTable('tenants').onDelete('SET NULL');
    table.string('request_id');
    table.index(['tenant_id', 'created_at']);
  });
};

export const down = function(knex) {
  return knex.schema.alterTable('audit_logs', table => {
    table.dropIndex(['tenant_id', 'created_at']);
    table.dropColumn('tenant_id');
    table.dropColumn('request_id');
  });
};