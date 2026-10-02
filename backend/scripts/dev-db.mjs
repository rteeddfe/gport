// Boots a user-space PostgreSQL (no Docker, no admin rights) for local dev.
// Usage: node scripts/dev-db.mjs  — keep the process running while developing.
import EmbeddedPostgres from 'embedded-postgres';

const port = 55432;

const pg = new EmbeddedPostgres({
  databaseDir: './.pgdata',
  user: 'postgres',
  password: 'postgres',
  port,
  persistent: true,
  // Force a UTF-8 cluster regardless of the host system locale.
  initdbFlags: ['--locale=C', '--encoding=UTF8'],
});

try {
  await pg.initialise();
  console.log('Postgres data directory initialised.');
} catch (error) {
  if (!String(error).includes('already exists')) {
    throw error;
  }
  console.log('Data directory already initialised.');
}

await pg.start();
try {
  await pg.createDatabase('marketplace');
  console.log('Database "marketplace" created.');
} catch {
  console.log('Database "marketplace" already exists.');
}

console.log(`PostgreSQL ready on localhost:${port}`);
// Keep the process alive so the server keeps running.
process.on('SIGINT', async () => {
  await pg.stop();
  process.exit(0);
});
setInterval(() => {}, 1 << 30);
