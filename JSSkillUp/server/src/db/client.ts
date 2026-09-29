import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { z } from 'zod';
import { env } from '../env.js';

export type SqlValue = null | number | bigint | string | Uint8Array;
export type Row = Record<string, SqlValue | undefined>;
export type SqlParams = readonly SqlValue[];

let instance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (instance) return instance;
  mkdirSync(dirname(env.dbPath), { recursive: true });
  const db = new DatabaseSync(env.dbPath);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');
  instance = db;
  return db;
}

export function closeDb(): void {
  instance?.close();
  instance = null;
}

/** Выборка списка строк. Каждая строка превращается в доменный объект через `map`. */
export function queryAll<T>(sql: string, params: SqlParams, map: (row: Row) => T): T[] {
  const rows = getDb().prepare(sql).all(...params) as unknown as Row[];
  return rows.map(map);
}

/** Выборка одной строки. Возвращает null, если ничего не нашлось. */
export function queryOne<T>(sql: string, params: SqlParams, map: (row: Row) => T): T | null {
  const row = getDb().prepare(sql).get(...params) as unknown as Row | undefined;
  return row ? map(row) : null;
}

export function execute(sql: string, params: SqlParams = []): void {
  getDb().prepare(sql).run(...params);
}

let transactionDepth = 0;

/**
 * Выполняет `fn` в транзакции; при исключении откатывает всё целиком.
 * Реентерабельна: вложенный вызов просто выполняется внутри внешней транзакции
 * (SQLite не умеет вложенные BEGIN), так что функции репозиториев можно
 * свободно комбинировать в одной атомарной операции.
 */
export function transaction<T>(fn: () => T): T {
  if (transactionDepth > 0) return fn();

  const db = getDb();
  db.exec('BEGIN');
  transactionDepth += 1;
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  } finally {
    transactionDepth -= 1;
  }
}

export function sqliteVersion(): string {
  const row = getDb().prepare('SELECT sqlite_version() AS v').get() as unknown as Row;
  return str(row['v'], 'sqlite_version');
}

// --- Типобезопасное чтение колонок -------------------------------------------------

function fail(field: string, value: unknown, expected: string): never {
  throw new Error(`Колонка "${field}": ожидалось ${expected}, получено ${JSON.stringify(value)}`);
}

export function str(value: SqlValue | undefined, field: string): string {
  if (typeof value === 'string') return value;
  return fail(field, value, 'string');
}

export function strOrNull(value: SqlValue | undefined, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  return fail(field, value, 'string | null');
}

export function num(value: SqlValue | undefined, field: string): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  return fail(field, value, 'number');
}

export function numOrNull(value: SqlValue | undefined, field: string): number | null {
  if (value === null || value === undefined) return null;
  return num(value, field);
}

export function bool(value: SqlValue | undefined, field: string): boolean {
  return num(value, field) !== 0;
}

export function boolOrNull(value: SqlValue | undefined, field: string): boolean | null {
  if (value === null || value === undefined) return null;
  return bool(value, field);
}

/** Разбирает JSON-колонку и проверяет её схемой — БД может хранить что угодно. */
export function jsonColumn<T>(value: SqlValue | undefined, field: string, schema: z.ZodType<T>): T {
  const text = str(value, field);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return fail(field, text, 'валидный JSON');
  }
  const result = schema.safeParse(parsed);
  if (!result.success) return fail(field, text, `JSON по схеме (${result.error.issues[0]?.message})`);
  return result.data;
}

export function jsonColumnOrNull<T>(
  value: SqlValue | undefined,
  field: string,
  schema: z.ZodType<T>,
): T | null {
  if (value === null || value === undefined) return null;
  return jsonColumn(value, field, schema);
}

/** Одна из перечисленных строк — для колонок с CHECK(... IN (...)). */
export function enumColumn<const T extends readonly string[]>(
  value: SqlValue | undefined,
  field: string,
  allowed: T,
): T[number] {
  const text = str(value, field);
  if ((allowed as readonly string[]).includes(text)) return text;
  return fail(field, text, `одно из [${allowed.join(', ')}]`);
}
