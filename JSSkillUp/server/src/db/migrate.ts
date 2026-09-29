import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getDb } from './client.js';

const MIGRATIONS_DIR = resolve(import.meta.dirname, 'migrations');

interface Migration {
  id: number;
  name: string;
  sql: string;
}

function loadMigrations(): Migration[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => {
      const id = Number.parseInt(file.slice(0, file.indexOf('_')), 10);
      if (!Number.isInteger(id)) {
        throw new Error(`Миграция "${file}" должна начинаться с номера, например 002_add_x.sql`);
      }
      return { id, name: file, sql: readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8') };
    });
}

/** Прогоняет непринятые миграции по порядку. Идемпотентна: повторный вызов ничего не делает. */
export function runMigrations(): { applied: string[]; skipped: number } {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);

  const alreadyApplied = new Set(
    (db.prepare('SELECT id FROM _migrations').all() as unknown as Array<{ id: number }>).map(
      (row) => row.id,
    ),
  );

  const applied: string[] = [];
  let skipped = 0;

  for (const migration of loadMigrations()) {
    if (alreadyApplied.has(migration.id)) {
      skipped += 1;
      continue;
    }
    db.exec('BEGIN');
    try {
      db.exec(migration.sql);
      db.prepare('INSERT INTO _migrations (id, name, applied_at) VALUES (?, ?, ?)').run(
        migration.id,
        migration.name,
        new Date().toISOString(),
      );
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw new Error(`Миграция ${migration.name} упала: ${(error as Error).message}`, {
        cause: error,
      });
    }
    applied.push(migration.name);
  }

  return { applied, skipped };
}

// Запуск напрямую: npm run db:migrate
if (process.argv[1] && import.meta.filename === resolve(process.argv[1])) {
  const { applied, skipped } = runMigrations();
  if (applied.length === 0) {
    console.log(`Миграции актуальны (применено ранее: ${skipped}).`);
  } else {
    console.log(`Применены миграции:\n${applied.map((n) => `  + ${n}`).join('\n')}`);
  }
}
