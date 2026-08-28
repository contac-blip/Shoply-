/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema
    .createTable('users', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('email').unique().notNullable();
      table.string('password_hash').notNullable();
      table.string('first_name');
      table.string('last_name');
      table.string('phone_number').unique();
      table.timestamps(true, true);
    })
    .createTable('addresses', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('address_line1').notNullable();
      table.string('address_line2');
      table.string('city').notNullable();
      table.string('state').notNullable();
      table.string('postal_code').notNullable();
      table.string('country').notNullable();
      table.boolean('is_default').defaultTo(false);
      table.timestamps(true, true);
    })
    .createTable('categories', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').unique().notNullable();
      table.string('image_url');
      table.string('svg_src');
      table.uuid('parent_id').references('id').inTable('categories').onDelete('SET NULL');
      table.timestamps(true, true);
    })
    .createTable('products', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.text('description');
      table.string('brand_name').notNullable();
      table.decimal('price', 10, 2).notNullable();
      table.decimal('price_after_discount', 10, 2);
      table.integer('discount_percent');
      table.specificType('image_urls', 'text[]');
      table.uuid('category_id').references('id').inTable('categories').onDelete('RESTRICT');
      table.integer('stock_quantity').defaultTo(0);
      table.timestamps(true, true);
    })
    .createTable('product_variants', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('product_id').references('id').inTable('products').onDelete('CASCADE');
      table.string('color');
      table.string('size');
      table.string('sku').unique();
      table.decimal('additional_price', 10, 2).defaultTo(0);
      table.integer('stock_quantity').defaultTo(0);
      table.timestamps(true, true);
    })
    .createTable('reviews', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('product_id').references('id').inTable('products').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.integer('rating').notNullable();
      table.text('comment');
      table.timestamps(true, true);
    })
    .createTable('carts', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').unique().references('id').inTable('users').onDelete('CASCADE');
      table.timestamps(true, true);
    })
    .createTable('cart_items', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('cart_id').references('id').inTable('carts').onDelete('CASCADE');
      table.uuid('product_id').references('id').inTable('products').onDelete('CASCADE');
      table.uuid('variant_id').references('id').inTable('product_variants').onDelete('SET NULL');
      table.integer('quantity').notNullable().defaultTo(1);
      table.timestamps(true, true);
    })
    .createTable('orders', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('shipping_address_id').references('id').inTable('addresses').onDelete('RESTRICT');
      table.decimal('total_amount', 10, 2).notNullable();
      table.string('status').notNullable().defaultTo('pending');
      table.timestamps(true, true);
    })
    .createTable('order_items', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('order_id').references('id').inTable('orders').onDelete('CASCADE');
      table.uuid('product_id').references('id').inTable('products').onDelete('RESTRICT');
      table.uuid('variant_id').references('id').inTable('product_variants').onDelete('SET NULL');
      table.integer('quantity').notNullable();
      table.decimal('price_at_purchase', 10, 2).notNullable();
      table.timestamps(true, true);
    })
    .createTable('wishlists', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('product_id').references('id').inTable('products').onDelete('CASCADE');
      table.timestamps(true, true);
      table.unique(['user_id', 'product_id']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema
    .dropTableIfExists('wishlists')
    .dropTableIfExists('order_items')
    .dropTableIfExists('orders')
    .dropTableIfExists('cart_items')
    .dropTableIfExists('carts')
    .dropTableIfExists('reviews')
    .dropTableIfExists('product_variants')
    .dropTableIfExists('products')
    .dropTableIfExists('categories')
    .dropTableIfExists('addresses')
    .dropTableIfExists('users');
};
