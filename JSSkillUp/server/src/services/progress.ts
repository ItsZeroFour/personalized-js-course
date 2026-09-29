import { execute, num, numOrNull, queryOne, str } from '../db/client.js';
import { getTheoryProgress } from '../db/repos/theory.js';
import { getQuizStats } from '../db/repos/questions.js';
import { getCardProgress } from '../db/repos/flashcards.js';

interface Bucket {
  weight: number;
  done: number;
  total: number;
}

function getTaskProgress(topicId: string): { total: number; solved: number } {
  const row = queryOne(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN EXISTS (
              SELECT 1 FROM task_attempts a
              WHERE a.task_id = t.id AND a.total > 0 AND a.passed = a.total
            ) THEN 1 ELSE 0 END) AS solved
     FROM tasks t WHERE t.topic_id = ?`,
    [topicId],
    (r) => ({
      total: num(r['total'], 'total'),
      solved: numOrNull(r['solved'], 'solved') ?? 0,
    }),
  );
  return row ?? { total: 0, solved: 0 };
}

/**
 * Процент по теме: теория 30, квизы 35, задачи 25, карточки 10.
 * Пустые блоки (например, задач по теме ещё нет) исключаются, а их вес
 * распределяется между остальными — иначе тема никогда не дошла бы до 100%.
 */
export function computeTopicPercent(topicId: string): number {
  const theory = getTheoryProgress(topicId);
  const quiz = getQuizStats(topicId);
  const tasks = getTaskProgress(topicId);
  const cards = getCardProgress(topicId);

  const buckets: Bucket[] = [
    { weight: 30, done: theory.read, total: theory.total },
    { weight: 35, done: quiz.correct, total: quiz.total },
    { weight: 25, done: tasks.solved, total: tasks.total },
    { weight: 10, done: cards.mature, total: cards.total },
  ].filter((bucket) => bucket.total > 0);

  if (buckets.length === 0) return 0;

  const totalWeight = buckets.reduce((acc, bucket) => acc + bucket.weight, 0);
  const score = buckets.reduce((acc, bucket) => acc + bucket.weight * (bucket.done / bucket.total), 0);

  return Math.round((score / totalWeight) * 100);
}

/**
 * Пересчитывает процент и при необходимости двигает статус.
 * Статус «повторить» проставляется вручную или отчётом интервью и автоматикой не сбрасывается.
 */
export function recomputeTopicProgress(topicId: string): number {
  const percent = computeTopicPercent(topicId);

  const current = queryOne(
    'SELECT status FROM topic_progress WHERE topic_id = ?',
    [topicId],
    (row) => str(row['status'], 'status'),
  );

  execute('UPDATE topic_progress SET computed_percent = ?, updated_at = ? WHERE topic_id = ?', [
    percent,
    new Date().toISOString(),
    topicId,
  ]);

  if (current === 'not_started' && percent > 0) {
    execute('UPDATE topic_progress SET status = ? WHERE topic_id = ?', ['in_progress', topicId]);
  } else if (current === 'in_progress' && percent >= 100) {
    execute('UPDATE topic_progress SET status = ? WHERE topic_id = ?', ['learned', topicId]);
  }

  const manual = queryOne(
    'SELECT manual_percent FROM topic_progress WHERE topic_id = ?',
    [topicId],
    (row) => numOrNull(row['manual_percent'], 'manual_percent'),
  );

  return manual ?? percent;
}
