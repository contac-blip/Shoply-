export const seed = async function(knex) {
  // create a test tenant
  // Try to reuse existing test tenant if present
  let tenant = await knex('tenants').where({ slug: 'test-tenant' }).first();
  let tenantId;
  if (!tenant) {
    const inserted = await knex('tenants').insert({ name: 'Test Tenant', slug: 'test-tenant' }).returning('id');
    tenantId = Array.isArray(inserted) ? (inserted[0].id || inserted[0]) : inserted;
  } else {
    tenantId = tenant.id;
  }

  // create platform account if missing
  const existingPlatform = await knex('accounts').where({ type: 'PLATFORM' }).first();
  if (!existingPlatform) {
    await knex('accounts').insert({ type: 'PLATFORM', balance_cents: 0 });
  }

  // create tenant wallet
  const existingTenantAccount = await knex('accounts').where({ tenant_id: tenantId, type: 'TENANT_WALLET' }).first();
  if (!existingTenantAccount) {
    await knex('accounts').insert({ tenant_id: tenantId, type: 'TENANT_WALLET', balance_cents: 0 });
  }
};
