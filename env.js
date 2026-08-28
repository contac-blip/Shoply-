import { cleanEnv, str, port, url } from 'envalid';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Only load .env file in development/test
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, '.env') });
}

const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
  PORT: port({ default: 3000 }),
  DATABASE_URL: url({ desc: 'PostgreSQL connection string - required on Render' }),
  JWT_SECRET: str({ desc: 'JWT secret key for authentication' }),
  SUPABASE_URL: url({ default: 'https://example.supabase.co' }),
  SUPABASE_ANON_KEY: str({ default: 'placeholder-key' }),
  EMAIL_HOST: str({ default: 'smtp.mailtrap.io' }),
  EMAIL_PORT: port({ default: 2525 }),
  EMAIL_USER: str({ default: 'user' }),
  EMAIL_PASS: str({ default: 'pass' }),
}, {
  reporter: ({ errors, env: _env }) => {
    if (Object.keys(errors).length) {
      console.error('❌ Environment validation error:');
      Object.entries(errors).forEach(([key, value]) => {
        console.error(`  ${key}: ${value}`);
      });
      process.exit(1);
    }
  }
});

export default env;
