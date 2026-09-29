import { rmSync } from 'node:fs';
import { closeDb } from './client.js';
import { env } from '../env.js';
import { runMigrations } from './migrate.js';
import { runSeed } from '../seed/index.js';

/** Полностью пересоздаёт БД: удаляет файл, накатывает миграции и seed. Прогресс теряется. */
closeDb();
for (const suffix of ['', '-wal', '-shm']) {
  rmSync(`${env.dbPath}${suffix}`, { force: true });
}
console.log(`Удалена база ${env.dbPath}`);

runMigrations();
const stats = runSeed();
console.log('База пересоздана.', stats);
