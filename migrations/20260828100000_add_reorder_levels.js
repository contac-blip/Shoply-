export const up = async function(knex) {
  const hasProductReorderLevel = await knex.schema.hasColumn('products', 'reorder_level');
  const hasVariantReorderLevel = await knex.schema.hasColumn('product_variants', 'reorder_level');

  if (!hasProductReorderLevel) {
    await knex.schema.alterTable('products', table => {
      table.integer('reorder_level').notNullable().defaultTo(0);
    });
  }

  if (!hasVariantReorderLevel) {
    await knex.schema.alterTable('product_variants', table => {
      table.integer('reorder_level').notNullable().defaultTo(0);
    });
  }
};

export const down = async function(knex) {
  const hasProductReorderLevel = await knex.schema.hasColumn('products', 'reorder_level');
  const hasVariantReorderLevel = await knex.schema.hasColumn('product_variants', 'reorder_level');

  if (hasProductReorderLevel) {
    await knex.schema.alterTable('products', table => {
      table.dropColumn('reorder_level');
    });
  }

  if (hasVariantReorderLevel) {
    await knex.schema.alterTable('product_variants', table => {
      table.dropColumn('reorder_level');
    });
  }
};
