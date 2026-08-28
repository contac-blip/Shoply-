/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('wishlists').del();
  await knex('order_items').del();
  await knex('orders').del();
  await knex('cart_items').del();
  await knex('carts').del();
  await knex('reviews').del();
  await knex('product_variants').del();
  await knex('products').del();
  await knex('categories').del();
  await knex('addresses').del();
  await knex('users').del();

  // Inserts seed entries
  const [womanCat] = await knex('categories').insert({ name: "Woman's", image_url: "https://i.imgur.com/5M89G2P.png" }).returning('id');
  const [manCat] = await knex('categories').insert({ name: "Man's", image_url: "https://i.imgur.com/UM3GdWg.png" }).returning('id');
  const [kidCat] = await knex('categories').insert({ name: "Kid's", image_url: "https://i.imgur.com/Lp0D6k5.png" }).returning('id');

  await knex('products').insert([
    {
      name: "Mountain Warehouse for Women",
      brand_name: "Lipsy london",
      price: 540,
      price_after_discount: 420,
      discount_percent: 20,
      image_urls: ['https://i.imgur.com/tXyOMMG.png'],
      category_id: womanCat.id,
      stock_quantity: 50
    },
    {
      name: "Mountain Beta Warehouse",
      brand_name: "Lipsy london",
      price: 800,
      image_urls: ['https://i.imgur.com/h2LqppX.png'],
      category_id: manCat.id,
      stock_quantity: 30
    }
  ]);
};
