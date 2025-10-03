import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import { db } from './client.js';

await migrate(db, { migrationsFolder: './src/db/migrations' });
console.log('Migration complete');
