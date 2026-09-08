// Runs an npm/node command with DATABASE_URL forced to the LOCAL database
// from .env.local, so schema/test work never touches the remote .env URL.
// Usage: node scripts/with-local-db.js <cmd...>
const path = require('path');
const dotenv = require('dotenv');
const { spawn } = require('child_process');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
const localEnv = dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const localDbUrl = localEnv.parsed && localEnv.parsed.DATABASE_URL;

if (!localDbUrl) {
  console.error('with-local-db: no DATABASE_URL in .env.local');
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('with-local-db: expected command args, e.g. npm test');
  process.exit(1);
}

const child = spawn(args[0], args.slice(1), {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, DATABASE_URL: localDbUrl },
});

child.on('exit', (code) => process.exit(code ?? 1));
