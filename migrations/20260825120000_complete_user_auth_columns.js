export const up = async function(knex) {
  const hasGoogleId = await knex.schema.hasColumn('users', 'google_id');
  const hasImageUrl = await knex.schema.hasColumn('users', 'image_url');

  if (!hasGoogleId || !hasImageUrl) {
    await knex.schema.alterTable('users', table => {
      if (!hasGoogleId) {
        table.string('google_id').unique();
      }
      if (!hasImageUrl) {
        table.text('image_url');
      }
    });
  }

  return knex.schema.alterTable('users', table => {
    table.string('password_hash').nullable().alter();
  });
};

export const down = function(knex) {
  return knex.schema.alterTable('users', table => {
    table.dropUnique(['google_id']);
    table.dropColumn('google_id');
    table.dropColumn('image_url');
    table.string('password_hash').notNullable().alter();
  });
};
