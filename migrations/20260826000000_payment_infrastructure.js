export async function up(knex) {
  return knex.schema
    .createTable('webhook_queue', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.string('event_type').notNullable(); // 'payment.success', 'payment.failed', etc.
      table.jsonb('payload').notNullable(); // Original webhook payload
      table.string('status').notNullable().defaultTo('pending'); // pending, processing, completed, failed
      table.integer('retry_count').defaultTo(0);
      table.integer('max_retries').defaultTo(5);
      table.timestamp('next_retry_at', { useTz: true });
      table.string('error_message');
      table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
      table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
      table.index(['status', 'next_retry_at']);
      table.index(['tenant_id', 'event_type']);
    })
    .createTable('payment_disputes', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('transaction_id').references('id').inTable('transactions').onDelete('SET NULL');
      table.uuid('order_id').references('id').inTable('orders').onDelete('SET NULL');
      table.string('dispute_type').notNullable(); // 'chargeback', 'refund_dispute', 'fraud_claim'
      table.string('status').notNullable().defaultTo('open'); // open, investigation, resolved, lost
      table.decimal('dispute_amount', 12, 2).notNullable();
      table.text('reason').notNullable();
      table.uuid('merchant_id').references('id').inTable('merchant_stores').onDelete('CASCADE');
      table.uuid('customer_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('external_dispute_id'); // From payment provider
      table.jsonb('evidence'); // Evidence submission
      table.timestamp('dispute_date', { useTz: true });
      table.timestamp('resolution_date', { useTz: true });
      table.string('resolution_details');
      table.decimal('settlement_amount', 12, 2); // Final settlement amount
      table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
      table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
      table.index(['tenant_id', 'status']);
      table.index(['merchant_id', 'status']);
    })
    .createTable('payment_analytics_cache', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE').unique();
      table.decimal('total_revenue', 14, 2).defaultTo(0);
      table.decimal('total_successful_payments', 14, 2).defaultTo(0);
      table.integer('total_transactions').defaultTo(0);
      table.integer('successful_transactions').defaultTo(0);
      table.integer('failed_transactions').defaultTo(0);
      table.decimal('total_refunds', 14, 2).defaultTo(0);
      table.decimal('total_chargebacks', 14, 2).defaultTo(0);
      table.decimal('payment_provider_fees', 14, 2).defaultTo(0);
      table.decimal('platform_commission', 14, 2).defaultTo(0);
      table.jsonb('payment_method_breakdown'); // { momo: amount, stripe: amount, etc }
      table.decimal('refund_rate', 5, 2).defaultTo(0); // Percentage
      table.decimal('chargeback_rate', 5, 2).defaultTo(0); // Percentage
      table.timestamp('last_calculated_at', { useTz: true });
      table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
      table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    });
}

export async function down(knex) {
  return knex.schema
    .dropTableIfExists('payment_analytics_cache')
    .dropTableIfExists('payment_disputes')
    .dropTableIfExists('webhook_queue');
}
