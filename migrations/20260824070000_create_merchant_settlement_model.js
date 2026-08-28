export const up = function(knex) {
  return knex.schema
    .createTable('merchant_payout_destinations', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('merchant_id').notNullable().references('merchant_id').inTable('merchants').onDelete('CASCADE');
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.string('destination_type').notNullable().defaultTo('bank');
      table.string('provider').notNullable().defaultTo('bank');
      table.string('masked_identifier').notNullable();
      table.jsonb('metadata').notNullable().defaultTo('{}');
      table.boolean('is_default').notNullable().defaultTo(true);
      table.timestamps(true, true);
      table.index(['merchant_id', 'tenant_id']);
    })
    .createTable('merchant_settlement_runs', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('merchant_id').notNullable().references('merchant_id').inTable('merchants').onDelete('CASCADE');
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
      table.decimal('amount', 12, 2).notNullable().defaultTo(0);
      table.string('currency').notNullable().defaultTo('SZL');
      table.string('payout_reference').notNullable();
      table.string('status').notNullable().defaultTo('ELIGIBLE');
      table.timestamp('settlement_date', { useTz: true }).notNullable();
      table.timestamp('paid_at', { useTz: true });
      table.text('failure_reason');
      table.timestamps(true, true);
      table.unique(['merchant_id', 'payout_reference']);
      table.index(['merchant_id', 'status']);
    })
    .createTable('merchant_balance_ledger', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('merchant_id').notNullable().references('merchant_id').inTable('merchants').onDelete('CASCADE');
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
      table.uuid('order_id').references('id').inTable('orders').onDelete('SET NULL');
      table.uuid('settlement_run_id').references('id').inTable('merchant_settlement_runs').onDelete('SET NULL');
      table.string('entry_type').notNullable();
      table.decimal('gross_amount', 12, 2).notNullable().defaultTo(0);
      table.decimal('net_amount', 12, 2).notNullable().defaultTo(0);
      table.decimal('pending_balance_delta', 12, 2).notNullable().defaultTo(0);
      table.decimal('available_balance_delta', 12, 2).notNullable().defaultTo(0);
      table.decimal('paid_out_amount_delta', 12, 2).notNullable().defaultTo(0);
      table.decimal('reserved_amount_delta', 12, 2).notNullable().defaultTo(0);
      table.decimal('refund_adjustment_delta', 12, 2).notNullable().defaultTo(0);
      table.text('notes');
      table.timestamps(true, true);
      table.unique(['order_id', 'entry_type']);
      table.index(['merchant_id', 'created_at']);
    });
};

export const down = function(knex) {
  return knex.schema
    .dropTableIfExists('merchant_balance_ledger')
    .dropTableIfExists('merchant_settlement_runs')
    .dropTableIfExists('merchant_payout_destinations');
};