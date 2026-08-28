export const up = function(knex) {
  return knex.schema
    .createTable('ticket_events', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('ticket_id').references('id').inTable('support_tickets').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('event_type').notNullable();
      table.text('message');
      table.timestamps(true, true);
    })
    .createTable('fraud_audit_logs', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('order_id').references('id').inTable('orders').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('rule').notNullable();
      table.integer('risk_score').notNullable().defaultTo(0);
      table.string('severity').defaultTo('medium');
      table.text('details');
      table.timestamps(true, true);
    })
    .createTable('risk_reviews', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('order_id').references('id').inTable('orders').onDelete('CASCADE');
      table.uuid('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
      table.string('status').notNullable().defaultTo('pending');
      table.text('notes');
      table.timestamps(true, true);
    })
    .createTable('invoices', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('order_id').references('id').inTable('orders').onDelete('SET NULL');
      table.decimal('amount', 12, 2).defaultTo(0);
      table.string('status').notNullable().defaultTo('draft');
      table.timestamp('issued_at');
      table.timestamps(true, true);
    })
    .createTable('settlements', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.decimal('amount', 12, 2).defaultTo(0);
      table.string('status').notNullable().defaultTo('pending');
      table.timestamp('settled_at');
      table.timestamps(true, true);
    });
};

export const down = function(knex) {
  return knex.schema
    .dropTableIfExists('settlements')
    .dropTableIfExists('invoices')
    .dropTableIfExists('risk_reviews')
    .dropTableIfExists('fraud_audit_logs')
    .dropTableIfExists('ticket_events');
};
