import { z } from 'zod';
import { CONTENT_SOURCES, DIFFICULTIES, TASK_KINDS, TASK_LANGUAGES, TASK_RUNTIMES } from '@jsskillup/shared';
import type {
  CodeReview,
  Difficulty,
  Task,
  TaskAttempt,
  TaskFacets,
  TaskHint,
  TaskKind,
  TaskLanguage,
  TaskListItem,
  TaskRuntime,
  TaskTest,
  TestResult,
} from '@jsskillup/shared';
import {
  bool,
  enumColumn,
  execute,
  getDb,
  jsonColumn,
  jsonColumnOrNull,
  num,
  queryAll,
  queryOne,
  str,
  strOrNull,
  transaction,
  type Row,
  type SqlValue,
} from '../client.js';

const stringsSchema = z.array(z.string());

const testResultSchema = z.array(
  z.object({
    name: z.string(),
    visibility: z.enum(['visible', 'hidden']),
    passed: z.boolean(),
    message: z.string().nullable(),
    durationMs: z.number(),
  }),
);

// Ревью от AI проверяется схемой при сохранении, здесь достаточно распарсить.
const reviewSchema: z.ZodType<CodeReview> = z.object({
  correctness: z.object({ score: z.number(), comment: z.string() }),
  complexity: z.object({ time: z.string(), space: z.string(), comment: z.string() }),
  readability: z.object({ score: z.number(), comment: z.string() }),
  improvements: z.array(z.string()),
  rewrittenCode: z.string().nullable(),
  interviewerFollowUps: z.array(z.string()),
});

const TASK_SELECT = `
  SELECT id, topic_id, slug, title, kind, difficulty, statement_md, starter_code,
         language, runtime, time_limit_ms, tags_json, source, created_at
  FROM tasks
`;

function mapTask(row: Row): Omit<Task, 'tests' | 'hintCount'> {
  return {
    id: str(row['id'], 'id'),
    topicId: strOrNull(row['topic_id'], 'topic_id'),
    slug: str(row['slug'], 'slug'),
    title: str(row['title'], 'title'),
    kind: enumColumn(row['kind'], 'kind', TASK_KINDS),
    difficulty: enumColumn(row['difficulty'], 'difficulty', DIFFICULTIES),
    statementMd: str(row['statement_md'], 'statement_md'),
    starterCode: str(row['starter_code'], 'starter_code'),
    language: enumColumn(row['language'], 'language', TASK_LANGUAGES),
    runtime: enumColumn(row['runtime'], 'runtime', TASK_RUNTIMES),
    timeLimitMs: num(row['time_limit_ms'], 'time_limit_ms'),
    tags: jsonColumn(row['tags_json'], 'tags_json', stringsSchema),
    source: enumColumn(row['source'], 'source', CONTENT_SOURCES),
    createdAt: str(row['created_at'], 'created_at'),
  };
}

function getTests(taskId: string): TaskTest[] {
  return queryAll(
    'SELECT id, name, visibility, code, order_index FROM task_tests WHERE task_id = ? ORDER BY order_index',
    [taskId],
    (row) => ({
      id: num(row['id'], 'id'),
      name: str(row['name'], 'name'),
      visibility: enumColumn(row['visibility'], 'visibility', ['visible', 'hidden'] as const),
      code: str(row['code'], 'code'),
      orderIndex: num(row['order_index'], 'order_index'),
    }),
  );
}

export function getTaskBySlug(slug: string): Task | null {
  const base = queryOne(`${TASK_SELECT} WHERE slug = ?`, [slug], mapTask);
  if (!base) return null;

  const hintCount = queryOne(
    'SELECT COUNT(*) AS total FROM task_hints WHERE task_id = ?',
    [base.id],
    (row) => num(row['total'], 'total'),
  );

  return { ...base, tests: getTests(base.id), hintCount: hintCount ?? 0 };
}

export function getSolution(slug: string): { solutionCode: string; solutionNotesMd: string } | null {
  return queryOne(
    'SELECT solution_code, solution_notes_md FROM tasks WHERE slug = ?',
    [slug],
    (row) => ({
      solutionCode: str(row['solution_code'], 'solution_code'),
      solutionNotesMd: str(row['solution_notes_md'], 'solution_notes_md'),
    }),
  );
}

export function getHint(taskId: string, level: number): TaskHint | null {
  return queryOne(
    'SELECT id, level, body_md FROM task_hints WHERE task_id = ? AND level = ?',
    [taskId, level],
    (row) => ({
      id: num(row['id'], 'id'),
      level: num(row['level'], 'level'),
      bodyMd: str(row['body_md'], 'body_md'),
    }),
  );
}

export interface TaskFilters {
  kind?: TaskKind;
  difficulty?: Difficulty;
  topic?: string;
  status?: 'all' | 'solved' | 'unsolved' | 'attempted';
  search?: string;
}

const LIST_SELECT = `
  SELECT
    t.id            AS id,
    t.slug          AS slug,
    t.title         AS title,
    t.kind          AS kind,
    t.difficulty    AS difficulty,
    t.topic_id      AS topic_id,
    topics.title    AS topic_title,
    t.tags_json     AS tags_json,
    t.source        AS source,
    (SELECT COUNT(*) FROM task_tests tt WHERE tt.task_id = t.id) AS test_count,
    (SELECT COUNT(*) FROM task_attempts a WHERE a.task_id = t.id) AS attempts,
    COALESCE((SELECT MAX(a.passed) FROM task_attempts a WHERE a.task_id = t.id), 0) AS best_passed,
    EXISTS (
      SELECT 1 FROM task_attempts a
      WHERE a.task_id = t.id AND a.total > 0 AND a.passed = a.total
    ) AS solved
  FROM tasks t
  LEFT JOIN topics ON topics.id = t.topic_id
`;

function mapListItem(row: Row): TaskListItem {
  return {
    id: str(row['id'], 'id'),
    slug: str(row['slug'], 'slug'),
    title: str(row['title'], 'title'),
    kind: enumColumn(row['kind'], 'kind', TASK_KINDS),
    difficulty: enumColumn(row['difficulty'], 'difficulty', DIFFICULTIES),
    topicId: strOrNull(row['topic_id'], 'topic_id'),
    topicTitle: strOrNull(row['topic_title'], 'topic_title'),
    tags: jsonColumn(row['tags_json'], 'tags_json', stringsSchema),
    source: enumColumn(row['source'], 'source', CONTENT_SOURCES),
    solved: bool(row['solved'], 'solved'),
    attempts: num(row['attempts'], 'attempts'),
    bestPassed: num(row['best_passed'], 'best_passed'),
    testCount: num(row['test_count'], 'test_count'),
  };
}

export function listTasks(filters: TaskFilters): TaskListItem[] {
  const conditions: string[] = [];
  const params: SqlValue[] = [];

  if (filters.kind) {
    conditions.push('t.kind = ?');
    params.push(filters.kind);
  }
  if (filters.difficulty) {
    conditions.push('t.difficulty = ?');
    params.push(filters.difficulty);
  }
  if (filters.topic) {
    conditions.push('t.topic_id = ?');
    params.push(filters.topic);
  }
  if (filters.search) {
    conditions.push('LOWER(t.title) LIKE ?');
    params.push(`%${filters.search.toLowerCase()}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const order = `ORDER BY
    CASE t.difficulty WHEN 'easy' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
    topics.order_index, t.title`;

  const rows = queryAll(`${LIST_SELECT} ${where} ${order}`, params, mapListItem);

  switch (filters.status) {
    case 'solved':
      return rows.filter((task) => task.solved);
    case 'unsolved':
      return rows.filter((task) => !task.solved);
    case 'attempted':
      return rows.filter((task) => task.attempts > 0 && !task.solved);
    default:
      return rows;
  }
}

export function getFacets(): TaskFacets {
  const all = queryAll(LIST_SELECT, [], mapListItem);

  const byKind = { algo: 0, react: 0, review: 0 };
  const byDifficulty = { easy: 0, medium: 0, hard: 0 };

  for (const task of all) {
    byKind[task.kind] += 1;
    byDifficulty[task.difficulty] += 1;
  }

  return {
    total: all.length,
    solved: all.filter((task) => task.solved).length,
    byKind,
    byDifficulty,
  };
}

function mapAttempt(row: Row): TaskAttempt {
  return {
    id: num(row['id'], 'id'),
    taskId: str(row['task_id'], 'task_id'),
    code: str(row['code'], 'code'),
    passed: num(row['passed'], 'passed'),
    total: num(row['total'], 'total'),
    results: jsonColumn(row['results_json'], 'results_json', testResultSchema),
    durationMs: num(row['duration_ms'], 'duration_ms'),
    aiReview: jsonColumnOrNull(row['ai_review_json'], 'ai_review_json', reviewSchema),
    createdAt: str(row['created_at'], 'created_at'),
  };
}

export function getAttempts(taskId: string, limit = 20): TaskAttempt[] {
  return queryAll(
    `SELECT id, task_id, code, passed, total, results_json, duration_ms, ai_review_json, created_at
     FROM task_attempts WHERE task_id = ? ORDER BY id DESC LIMIT ?`,
    [taskId, limit],
    mapAttempt,
  );
}

export interface NewAttempt {
  taskId: string;
  code: string;
  passed: number;
  total: number;
  results: TestResult[];
  durationMs: number;
}

export function saveAttempt(attempt: NewAttempt): TaskAttempt {
  const statement = getDb().prepare(
    `INSERT INTO task_attempts (task_id, code, passed, total, results_json, duration_ms, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  const result = statement.run(
    attempt.taskId,
    attempt.code,
    attempt.passed,
    attempt.total,
    JSON.stringify(attempt.results),
    Math.round(attempt.durationMs),
    new Date().toISOString(),
  );

  const saved = queryOne(
    `SELECT id, task_id, code, passed, total, results_json, duration_ms, ai_review_json, created_at
     FROM task_attempts WHERE id = ?`,
    [Number(result.lastInsertRowid)],
    mapAttempt,
  );

  if (!saved) throw new Error('Не удалось прочитать сохранённую попытку');
  return saved;
}

export function isSolved(taskId: string): boolean {
  const row = queryOne(
    `SELECT EXISTS (
       SELECT 1 FROM task_attempts WHERE task_id = ? AND total > 0 AND passed = total
     ) AS solved`,
    [taskId],
    (r) => bool(r['solved'], 'solved'),
  );
  return row ?? false;
}

export function getAttemptById(id: number): TaskAttempt | null {
  return queryOne(
    `SELECT id, task_id, code, passed, total, results_json, duration_ms, ai_review_json, created_at
     FROM task_attempts WHERE id = ?`,
    [id],
    mapAttempt,
  );
}

export function saveAiReview(attemptId: number, review: CodeReview): void {
  execute('UPDATE task_attempts SET ai_review_json = ? WHERE id = ?', [
    JSON.stringify(review),
    attemptId,
  ]);
}

export interface GeneratedTaskInsert {
  slug: string;
  topicId: string | null;
  kind: TaskKind;
  language: TaskLanguage;
  runtime: TaskRuntime;
  timeLimitMs: number;
  title: string;
  difficulty: Difficulty;
  statementMd: string;
  starterCode: string;
  solutionCode: string;
  solutionNotesMd: string;
  tags: string[];
  hints: string[];
  tests: Array<{ name: string; code: string; hidden: boolean }>;
}

/** Сохраняет задачу от AI. Вызывается только после успешной проверки эталонного решения. */
export function insertGeneratedTask(task: GeneratedTaskInsert): void {
  transaction(() => {
    execute(
      `INSERT INTO tasks (
         id, topic_id, slug, title, kind, difficulty, statement_md, starter_code,
         solution_code, solution_notes_md, language, runtime, time_limit_ms,
         tags_json, source, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ai', ?)`,
      [
        task.slug,
        task.topicId,
        task.slug,
        task.title,
        task.kind,
        task.difficulty,
        task.statementMd,
        task.starterCode,
        task.solutionCode,
        task.solutionNotesMd,
        task.language,
        task.runtime,
        task.timeLimitMs,
        JSON.stringify(task.tags),
        new Date().toISOString(),
      ],
    );

    for (const [index, test] of task.tests.entries()) {
      execute(
        'INSERT INTO task_tests (task_id, name, visibility, code, order_index) VALUES (?, ?, ?, ?, ?)',
        [task.slug, test.name, test.hidden ? 'hidden' : 'visible', test.code, index],
      );
    }

    for (const [index, hint] of task.hints.entries()) {
      execute('INSERT INTO task_hints (task_id, level, body_md) VALUES (?, ?, ?)', [
        task.slug,
        index + 1,
        hint,
      ]);
    }
  });
}

export function getAllSlugsAndTitles(): { slugs: string[]; titles: string[] } {
  const rows = queryAll('SELECT slug, title FROM tasks ORDER BY created_at DESC LIMIT 80', [], (row) => ({
    slug: str(row['slug'], 'slug'),
    title: str(row['title'], 'title'),
  }));
  return { slugs: rows.map((row) => row.slug), titles: rows.map((row) => row.title) };
}
