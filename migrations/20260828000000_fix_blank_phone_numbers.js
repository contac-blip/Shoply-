export const up = function(knex) {
  return knex('users')
    .whereRaw("phone_number IS NULL OR TRIM(phone_number) = ''")
    .update({ phone_number: null });
};

export const down = function() {
  return Promise.resolve();
};
