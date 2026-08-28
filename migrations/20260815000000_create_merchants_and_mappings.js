export const up = function(knex) {
  return knex.schema
    .createTable('merchants', table => {
      table.uuid('merchant_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('business_name');
      table.string('status').defaultTo('pending');
      table.jsonb('kyc_data');
      table.timestamps(true, true);
    })
    .then(() => knex.schema.createTable('merchant_stores', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('merchant_id').notNullable().references('merchant_id').inTable('merchants').onDelete('CASCADE');
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.string('role').defaultTo('owner');
      table.timestamps(true, true);
      table.unique(['merchant_id', 'tenant_id']);
    }))
    .then(() => knex.schema.createTable('store_admins', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('store_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('role').defaultTo('admin');
      table.timestamps(true, true);
      table.unique(['store_id', 'user_id']);
    }));
};

export const down = function(knex) {
  return knex.schema
    .dropTableIfExists('store_admins')
    .dropTableIfExists('merchant_stores')
    .dropTableIfExists('merchants');
};
