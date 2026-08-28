import bcrypt from 'bcryptjs';

export const seed = async function(knex) {
  // Delete existing admin if exists
  await knex('users').where({ email: 'admin@example.com' }).del();
  
  // Create new admin with valid bcrypt hash
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash('admin123', salt);
  
  await knex('users').insert({
    email: 'admin@example.com',
    password_hash,
    first_name: 'Admin',
    last_name: 'User',
    role: 'admin'
  });
  
  console.log('✅ Admin user created successfully');
  console.log('📧 Email: admin@example.com');
  console.log('🔐 Password: admin123');
};
