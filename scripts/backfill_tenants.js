#!/usr/bin/env node
// Backfill script to assign tenant_id to products, orders and carts.
// WARNING: Draft script — run on staging only after review.

import knexConfig from '../knexfile.cjs';
import Knex from 'knex';

const env = process.env.NODE_ENV || 'development';
const knex = Knex(knexConfig[env]);

async function run() {
  try {
    console.log('Starting tenant backfill...');

    // Create platform tenant if missing
    let [platform] = await knex('tenants').where({ slug: 'platform' }).select('id');
    if (!platform) {
      const inserted = await knex('tenants').insert({ name: 'Platform', slug: 'platform' }).returning('id');
      platform = { id: Array.isArray(inserted) ? inserted[0] : inserted };
      console.log('Created platform tenant:', platform.id);
    }
    const platformId = platform.id;

    // Backfill products
    const productsUpdated = await knex('products').whereNull('tenant_id').update({ tenant_id: platformId });
    console.log('Products backfilled:', productsUpdated);

    // Backfill orders where all order items belong to same tenant
    await knex.raw(`
      WITH order_tenants AS (
        SELECT oi.order_id, array_agg(DISTINCT p.tenant_id) AS tenants
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        GROUP BY oi.order_id
      )
      UPDATE orders o
      SET tenant_id = ot.tenants[1]
      FROM order_tenants ot
      WHERE o.id = ot.order_id AND array_length(ot.tenants,1) = 1 AND o.tenant_id IS NULL;
    `);
    console.log('Orders backfill attempted (check mixed-tenant orders separately)');

    // Backfill carts where items belong to same tenant
    await knex.raw(`
      WITH cart_tenants AS (
        SELECT c.id AS cart_id, array_agg(DISTINCT p.tenant_id) AS tenants
        FROM carts c
        JOIN cart_items ci ON ci.cart_id = c.id
        JOIN products p ON ci.product_id = p.id
        GROUP BY c.id
      )
      UPDATE carts
      SET tenant_id = ct.tenants[1]
      FROM cart_tenants ct
      WHERE carts.id = ct.cart_id AND array_length(ct.tenants,1) = 1 AND carts.tenant_id IS NULL;
    `);
    console.log('Carts backfill attempted (check mixed-tenant carts separately)');

    // Report mixed-tenant orders and carts for manual review
    const mixedOrders = await knex.raw(`
      SELECT o.id FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      GROUP BY o.id
      HAVING COUNT(DISTINCT p.tenant_id) > 1
      LIMIT 100;
    `);
    console.log('Sample mixed-tenant orders:', mixedOrders.rows || mixedOrders);

    const mixedCarts = await knex.raw(`
      SELECT c.id FROM carts c
      JOIN cart_items ci ON ci.cart_id = c.id
      JOIN products p ON ci.product_id = p.id
      GROUP BY c.id
      HAVING COUNT(DISTINCT p.tenant_id) > 1
      LIMIT 100;
    `);
    console.log('Sample mixed-tenant carts:', mixedCarts.rows || mixedCarts);

    console.log('Backfill complete. Review mixed-tenant items before making tenant_id NOT NULL.');
  } catch (err) {
    console.error('Backfill failed:', err);
  } finally {
    await knex.destroy();
  }
}

run();
