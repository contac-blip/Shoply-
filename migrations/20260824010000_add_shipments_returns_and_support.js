export const up = function(knex) {
  return knex.schema
    .createTable('shipments', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('order_id').references('id').inTable('orders').onDelete('CASCADE');
      table.uuid('warehouse_id').nullable();
      table.uuid('courier_id').nullable();
      table.string('tracking_number');
      table.string('status').notNullable().defaultTo('pending');
      table.timestamps(true, true);
    })
    .createTable('tracking_events', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('shipment_id').references('id').inTable('shipments').onDelete('CASCADE');
      table.string('status').notNullable();
      table.text('description');
      table.timestamps(true, true);
    })
    .createTable('return_requests', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('order_id').references('id').inTable('orders').onDelete('CASCADE');
      table.text('reason');
      table.string('status').notNullable().defaultTo('requested');
      table.decimal('refund_amount', 10, 2).defaultTo(0);
      table.timestamp('requested_at').defaultTo(knex.fn.now());
      table.timestamp('processed_at');
      table.timestamps(true, true);
    })
    .createTable('support_tickets', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.string('subject').notNullable();
      table.text('message').notNullable();
      table.string('status').notNullable().defaultTo('open');
      table.string('priority').defaultTo('normal');
      table.timestamps(true, true);
    })
    .createTable('fraud_flags', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('order_id').references('id').inTable('orders').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('rule').notNullable();
      table.string('severity').defaultTo('medium');
      table.text('details');
      table.boolean('is_resolved').defaultTo(false);
      table.timestamps(true, true);
    });
};

export const down = function(knex) {
  return knex.schema
    .dropTableIfExists('fraud_flags')
    .dropTableIfExists('support_tickets')
    .dropTableIfExists('return_requests')
    .dropTableIfExists('tracking_events')
    .dropTableIfExists('shipments');
};
