import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execute, getDb, transaction } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';
import { today } from '../services/date.js';
import { roadmapSeed } from './roadmap.js';
import { questionsSeed } from './questions/index.js';
import { flashcardsSeed } from './flashcards/index.js';
import { tasksSeed } from './tasks/index.js';
import { contentId, taskRuntimeOf, type SeedQuestion } from './types.js';

export interface SeedStats {
  stages: number;
  topics: number;
  subtopics: number;
  theory: number;
  questions: number;
  flashcards: number;
  tasks: number;
}

const THEORY_DIR = resolve(import.meta.dirname, 'theory');

function seedRoadmap(now: string): { topics: number; subtopics: number } {
  const db = getDb();
  let topicCount = 0;
  let subtopicCount = 0;

  const upsertStage = db.prepare(`
    INSERT INTO stages (id, title, description, order_index, icon)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title, description = excluded.description,
      order_index = excluded.order_index, icon = excluded.icon
  `);

  const upsertTopic = db.prepare(`
    INSERT INTO topics (id, stage_id, slug, title, summary, order_index, estimated_minutes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      stage_id = excluded.stage_id, slug = excluded.slug, title = excluded.title,
      summary = excluded.summary, order_index = excluded.order_index,
      estimated_minutes = excluded.estimated_minutes
  `);

  const upsertSubtopic = db.prepare(`
    INSERT INTO subtopics (id, topic_id, title, order_index)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      topic_id = excluded.topic_id, title = excluded.title, order_index = excluded.order_index
  `);

  const initProgress = db.prepare(`
    INSERT INTO topic_progress (topic_id, status, computed_percent, notes, updated_at)
    VALUES (?, 'not_started', 0, '', ?)
    ON CONFLICT(topic_id) DO NOTHING
  `);

  const dropStaleSubtopics = db.prepare(
    'DELETE FROM subtopics WHERE topic_id = ? AND id NOT IN (SELECT value FROM json_each(?))',
  );

  for (const [stageIndex, stage] of roadmapSeed.entries()) {
    upsertStage.run(stage.id, stage.title, stage.description, stageIndex, stage.icon);

    for (const [topicIndex, topic] of stage.topics.entries()) {
      upsertTopic.run(
        topic.slug,
        stage.id,
        topic.slug,
        topic.title,
        topic.summary,
        topicIndex,
        topic.estimatedMinutes,
      );
      initProgress.run(topic.slug, now);
      topicCount += 1;

      const ids = topic.subtopics.map((_, index) => `${topic.slug}--${index + 1}`);
      for (const [index, title] of topic.subtopics.entries()) {
        upsertSubtopic.run(`${topic.slug}--${index + 1}`, topic.slug, title, index);
        subtopicCount += 1;
      }
      dropStaleSubtopics.run(topic.slug, JSON.stringify(ids));
    }
  }

  const keptTopicIds = roadmapSeed.flatMap((stage) => stage.topics.map((topic) => topic.slug));
  execute('DELETE FROM topics WHERE id NOT IN (SELECT value FROM json_each(?))', [
    JSON.stringify(keptTopicIds),
  ]);
  execute('DELETE FROM stages WHERE id NOT IN (SELECT value FROM json_each(?))', [
    JSON.stringify(roadmapSeed.map((stage) => stage.id)),
  ]);

  return { topics: topicCount, subtopics: subtopicCount };
}

/**
 * Теория лежит в seed/theory/<slug темы>.md. Первый заголовок первого уровня
 * становится названием статьи и из тела вырезается — на странице он выводится отдельно.
 */
function seedTheory(knownTopics: ReadonlySet<string>): number {
  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO theory (id, topic_id, subtopic_id, title, body_md, order_index, source)
    VALUES (?, ?, NULL, ?, ?, 0, 'seed')
    ON CONFLICT(id) DO UPDATE SET
      topic_id = excluded.topic_id, title = excluded.title, body_md = excluded.body_md
  `);

  const ids: string[] = [];
  const files = readdirSync(THEORY_DIR).filter((file) => file.endsWith('.md')).sort();

  for (const file of files) {
    const topicId = file.slice(0, -3);
    if (!knownTopics.has(topicId)) {
      throw new Error(`seed/theory/${file}: темы "${topicId}" нет в роадмапе`);
    }

    const raw = readFileSync(resolve(THEORY_DIR, file), 'utf8');
    const match = /^#\s+(.+)\n/.exec(raw);
    const title = match?.[1]?.trim() ?? topicId;
    const body = match ? raw.slice(match[0].length).trimStart() : raw;

    const id = `${topicId}--theory`;
    upsert.run(id, topicId, title, body);
    ids.push(id);
  }

  execute(
    `DELETE FROM theory WHERE source = 'seed' AND id NOT IN (SELECT value FROM json_each(?))`,
    [JSON.stringify(ids)],
  );
  return ids.length;
}

function questionId(question: SeedQuestion): string {
  return contentId('q', question.topic, question.promptMd, question.code);
}

function seedQuestions(knownTopics: ReadonlySet<string>): number {
  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO questions (
      id, topic_id, subtopic_id, kind, difficulty, prompt_md, code,
      options_json, correct_json, expected_output_json, explanation_md,
      reference_answer_md, rubric_json, tags_json, source, created_at
    ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'seed', ?)
    ON CONFLICT(id) DO UPDATE SET
      topic_id = excluded.topic_id, kind = excluded.kind, difficulty = excluded.difficulty,
      prompt_md = excluded.prompt_md, code = excluded.code,
      options_json = excluded.options_json, correct_json = excluded.correct_json,
      expected_output_json = excluded.expected_output_json,
      explanation_md = excluded.explanation_md,
      reference_answer_md = excluded.reference_answer_md, rubric_json = excluded.rubric_json,
      tags_json = excluded.tags_json
  `);

  const now = new Date().toISOString();
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const question of questionsSeed) {
    if (!knownTopics.has(question.topic)) {
      throw new Error(`Вопрос для неизвестной темы "${question.topic}": ${question.promptMd}`);
    }
    const id = questionId(question);
    if (seen.has(id)) {
      throw new Error(`Дубль вопроса в seed (одинаковые тема и формулировка): ${question.promptMd}`);
    }
    seen.add(id);

    const options =
      question.kind === 'open' ? null : JSON.stringify(question.options ?? []);
    const correct = question.kind === 'open' ? null : JSON.stringify(question.correct ?? []);
    const expected =
      question.kind === 'output' ? JSON.stringify(question.expectedOutput) : null;

    upsert.run(
      id,
      question.topic,
      question.kind,
      question.difficulty,
      question.promptMd,
      question.code ?? null,
      options,
      correct,
      expected,
      question.explanationMd,
      question.kind === 'open' ? question.referenceAnswerMd : null,
      question.kind === 'open' ? JSON.stringify(question.rubric) : null,
      JSON.stringify(question.tags ?? []),
      now,
    );
    ids.push(id);
  }

  execute(
    `DELETE FROM questions WHERE source = 'seed' AND id NOT IN (SELECT value FROM json_each(?))`,
    [JSON.stringify(ids)],
  );
  return ids.length;
}

function seedFlashcards(knownTopics: ReadonlySet<string>): number {
  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO flashcards (id, topic_id, front_md, back_md, tags_json, source, created_at)
    VALUES (?, ?, ?, ?, ?, 'seed', ?)
    ON CONFLICT(id) DO UPDATE SET
      topic_id = excluded.topic_id, front_md = excluded.front_md,
      back_md = excluded.back_md, tags_json = excluded.tags_json
  `);
  // Состояние SM-2 создаётся один раз: у существующих карточек интервалы не сбрасываются.
  const initState = db.prepare(`
    INSERT INTO card_state (card_id, due_date) VALUES (?, ?)
    ON CONFLICT(card_id) DO NOTHING
  `);

  const now = new Date().toISOString();
  const dueDate = today();
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const card of flashcardsSeed) {
    if (!knownTopics.has(card.topic)) {
      throw new Error(`Карточка для неизвестной темы "${card.topic}": ${card.front}`);
    }
    const id = contentId('c', card.topic, card.front);
    if (seen.has(id)) {
      throw new Error(`Дубль карточки в seed: ${card.front}`);
    }
    seen.add(id);

    upsert.run(id, card.topic, card.front, card.back, JSON.stringify(card.tags ?? []), now);
    initState.run(id, dueDate);
    ids.push(id);
  }

  execute(
    `DELETE FROM flashcards WHERE source = 'seed' AND id NOT IN (SELECT value FROM json_each(?))`,
    [JSON.stringify(ids)],
  );
  return ids.length;
}


function seedTasks(knownTopics: ReadonlySet<string>): number {
  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO tasks (
      id, topic_id, slug, title, kind, difficulty, statement_md, starter_code,
      solution_code, solution_notes_md, language, runtime, time_limit_ms,
      tags_json, source, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'seed', ?)
    ON CONFLICT(id) DO UPDATE SET
      topic_id = excluded.topic_id, title = excluded.title, kind = excluded.kind,
      difficulty = excluded.difficulty, statement_md = excluded.statement_md,
      starter_code = excluded.starter_code, solution_code = excluded.solution_code,
      solution_notes_md = excluded.solution_notes_md, language = excluded.language,
      runtime = excluded.runtime, time_limit_ms = excluded.time_limit_ms,
      tags_json = excluded.tags_json
  `);

  const insertTest = db.prepare(
    'INSERT INTO task_tests (task_id, name, visibility, code, order_index) VALUES (?, ?, ?, ?, ?)',
  );
  const insertHint = db.prepare(
    'INSERT INTO task_hints (task_id, level, body_md) VALUES (?, ?, ?)',
  );
  // Тесты и подсказки ни на что не ссылаются, поэтому проще пересоздать их целиком,
  // чем сверять по одному: история попыток при этом не страдает.
  const clearTests = db.prepare('DELETE FROM task_tests WHERE task_id = ?');
  const clearHints = db.prepare('DELETE FROM task_hints WHERE task_id = ?');

  const now = new Date().toISOString();
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const task of tasksSeed) {
    if (task.topic !== undefined && !knownTopics.has(task.topic)) {
      throw new Error(`Задача "${task.slug}" ссылается на неизвестную тему "${task.topic}"`);
    }
    if (seen.has(task.slug)) throw new Error(`Дубль slug задачи: ${task.slug}`);
    seen.add(task.slug);

    upsert.run(
      task.slug,
      task.topic ?? null,
      task.slug,
      task.title,
      task.kind,
      task.difficulty,
      task.statementMd,
      task.starterCode,
      task.solutionCode,
      task.solutionNotesMd ?? '',
      taskRuntimeOf(task).language,
      taskRuntimeOf(task).runtime,
      taskRuntimeOf(task).timeLimitMs,
      JSON.stringify(task.tags ?? []),
      now,
    );

    clearTests.run(task.slug);
    for (const [index, test] of task.tests.entries()) {
      insertTest.run(task.slug, test.name, test.hidden ? 'hidden' : 'visible', test.code, index);
    }

    clearHints.run(task.slug);
    for (const [index, hint] of task.hints.entries()) {
      insertHint.run(task.slug, index + 1, hint);
    }

    ids.push(task.slug);
  }

  execute(`DELETE FROM tasks WHERE source = 'seed' AND id NOT IN (SELECT value FROM json_each(?))`, [
    JSON.stringify(ids),
  ]);
  return ids.length;
}

/**
 * Загружает статический контент из seed-файлов в SQLite.
 * Идемпотентна: тексты обновляются, а прогресс, заметки, попытки и состояние карточек
 * сохраняются. Контент с source = 'ai' не трогается.
 */
export function runSeed(): SeedStats {
  return transaction(() => {
    const now = new Date().toISOString();
    const roadmap = seedRoadmap(now);
    const knownTopics = new Set(
      roadmapSeed.flatMap((stage) => stage.topics.map((topic) => topic.slug)),
    );

    return {
      stages: roadmapSeed.length,
      topics: roadmap.topics,
      subtopics: roadmap.subtopics,
      theory: seedTheory(knownTopics),
      questions: seedQuestions(knownTopics),
      flashcards: seedFlashcards(knownTopics),
      tasks: seedTasks(knownTopics),
    };
  });
}

// Запуск напрямую: npm run db:seed
if (process.argv[1] && import.meta.filename === resolve(process.argv[1])) {
  runMigrations();
  const stats = runSeed();
  console.log(
    `Seed загружен: этапов ${stats.stages}, тем ${stats.topics}, подтем ${stats.subtopics}, ` +
      `статей теории ${stats.theory}, вопросов ${stats.questions}, карточек ${stats.flashcards}, ` +
      `задач ${stats.tasks}.`,
  );
}
