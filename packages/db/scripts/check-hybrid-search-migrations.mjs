/**
 * Fail if any migration AFTER the last restore touches hybrid-search objects destructively.
 * Protects against prisma migrate dev auto-dropping search_vector / GIN / HNSW.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, '../prisma/migrations');

const RESTORE_PREFIX = '20260710100000_restore_hybrid_search_indexes';

const DESTRUCTIVE = [
  /DROP\s+COLUMN\s+"?search_vector"?/i,
  /DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?(?:"public"\.)?"?posts_search_vector_idx"?/i,
  /DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?(?:"public"\.)?"?post_embeddings_embedding_hnsw_idx"?/i,
  /ALTER\s+COLUMN\s+"?search_vector"?\s+DROP\s+DEFAULT/i,
];

const dirs = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const restoreIdx = dirs.indexOf(RESTORE_PREFIX);
if (restoreIdx === -1) {
  console.error(`check-hybrid-search-migrations: missing restore migration ${RESTORE_PREFIX}`);
  process.exit(1);
}

const restoreSql = fs.readFileSync(path.join(migrationsDir, RESTORE_PREFIX, 'migration.sql'), 'utf8');
if (!/ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+"search_vector"/i.test(restoreSql)) {
  console.error('check-hybrid-search-migrations: restore migration must ADD search_vector');
  process.exit(1);
}

let failed = false;
for (const name of dirs.slice(restoreIdx + 1)) {
  const sqlPath = path.join(migrationsDir, name, 'migration.sql');
  if (!fs.existsSync(sqlPath)) continue;
  const sql = fs.readFileSync(sqlPath, 'utf8');
  for (const pattern of DESTRUCTIVE) {
    if (pattern.test(sql)) {
      console.error(`check-hybrid-search-migrations: ${name} contains destructive hybrid-search SQL:`);
      console.error(`  matched: ${pattern}`);
      failed = true;
    }
  }
}

if (failed) {
  console.error(
    'Refuse migrations that drop search_vector / GIN / HNSW after restore. Review with migrate --create-only.',
  );
  process.exit(1);
}

console.log('check-hybrid-search-migrations: ok');
