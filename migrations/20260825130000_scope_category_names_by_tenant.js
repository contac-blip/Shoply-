export const up = async function(knex) {
  await knex.schema.alterTable('categories', table => {
    table.dropUnique(['name']);
  });

  await knex.schema.alterTable('categories', table => {
    table.unique(['tenant_id', 'name']);
  });
};

export const down = async function(knex) {
  await knex.schema.alterTable('categories', table => {
    table.dropUnique(['tenant_id', 'name']);
  });

  await knex.schema.alterTable('categories', table => {
    table.unique(['name']);
  });
};
