export const up = function(knex) {
  return knex.schema
    .createTable('tenants', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.string('slug').unique();
      table.timestamps(true, true);
    })
    .then(() => knex.schema.table('products', table => {
      table.uuid('tenant_id');
      table.index(['tenant_id']);
    }))
    .then(() => knex.schema.table('orders', table => {
      table.uuid('tenant_id');
      table.string('external_ref').unique();
      table.index(['tenant_id']);
    }))
    .then(() => knex.schema.createTable('transactions', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id');
      table.string('external_ref').unique();
      table.bigInteger('amount_cents').notNullable();
      table.string('currency').defaultTo('SZL');
      table.string('status').defaultTo('PENDING');
      table.timestamps(true, true);
      table.index(['tenant_id']);
    }))
    .then(() => knex.schema.createTable('accounts', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').nullable();
      table.string('type').notNullable(); // PLATFORM | TENANT_WALLET
      table.bigInteger('balance_cents').defaultTo(0);
      table.timestamps(true, true);
      table.unique(['tenant_id', 'type']);
    }))
    .then(() => knex.schema.createTable('ledger_entries', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('transaction_id').references('id').inTable('transactions').onDelete('CASCADE');
      table.uuid('account_id').references('id').inTable('accounts').onDelete('CASCADE');
      table.bigInteger('amount_cents').notNullable();
      table.string('direction').notNullable(); // CREDIT | DEBIT
      table.timestamps(true, true);
    }));
};

export const down = function(knex) {
  return knex.schema
    .dropTableIfExists('ledger_entries')
    .dropTableIfExists('accounts')
    .dropTableIfExists('transactions')
    .table('orders', table => {
      table.dropColumn('tenant_id');
      table.dropColumn('external_ref');
    })
    .table('products', table => {
      table.dropColumn('tenant_id');
    })
    .dropTableIfExists('tenants');
};
