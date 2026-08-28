export const up = function(knex) {
  return knex.schema.alterTable('users', table => {
    table.timestamp('email_verified_at', { useTz: true });
    table.string('email_verification_code_hash');
    table.timestamp('email_verification_expires_at', { useTz: true });
  });
};

export const down = function(knex) {
  return knex.schema.alterTable('users', table => {
    table.dropColumn('email_verified_at');
    table.dropColumn('email_verification_code_hash');
    table.dropColumn('email_verification_expires_at');
  });
};