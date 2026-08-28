import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

describe('Environment configuration', () => {
  it('should not default the checked-in env file to test mode', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const envPath = path.join(__dirname, '.env');
    const envContents = fs.readFileSync(envPath, 'utf8');
    const nodeEnvMatch = envContents.match(/^NODE_ENV=(.+)$/m);

    expect(nodeEnvMatch).toBeTruthy();
    expect(nodeEnvMatch[1].trim()).not.toBe('test');
  });
});
