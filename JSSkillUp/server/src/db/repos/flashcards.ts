import { z } from 'zod';
import { CONTENT_SOURCES } from '@jsskillup/shared';
import type { FlashcardWithState, ReviewGrade, Sm2State } from '@jsskillup/shared';
import {
  enumColumn,
  execute,
  jsonColumn,
  num,
  numOrNull,
  queryAll,
  queryOne,
  str,
  strOrNull,
  transaction,
  type Row,
} from '../client.js';
import { addDays, today } from '../../services/date.js';
import { MATURE_INTERVAL_DAYS } from '../../services/srs.js';

const stringsSchema = z.array(z.string());

const SELECT = `
  SELECT f.id            AS id,
         f.topic_id      AS topic_id,
         f.front_md      AS front_md,
         f.back_md       AS back_md,
         f.tags_json     AS tags_json,
         f.source        AS source,
         f.created_at    AS created_at,
         s.ease          AS ease,
         s.interval_days AS interval_days,
         s.repetitions   AS repetitions,
         s.lapses        AS lapses,
         s.due_date      AS due_date,
         s.last_grade    AS last_grade,
         s.last_reviewed_at AS last_reviewed_at
  FROM flashcards f
  JOIN card_state s ON s.card_id = f.id
`;

const GRADES = new Set<number>([0, 1, 2, 3, 4, 5]);

function toGrade(value: number | null): ReviewGrade | null {
  if (value === null || !GRADES.has(value)) return null;
  return value as ReviewGrade;
}

function mapCard(row: Row): FlashcardWithState {
  const id = str(row['id'], 'id');
  return {
    id,
    topicId: str(row['topic_id'], 'topic_id'),
    frontMd: str(row['front_md'], 'front_md'),
    backMd: str(row['back_md'], 'back_md'),
    tags: jsonColumn(row['tags_json'], 'tags_json', stringsSchema),
    source: enumColumn(row['source'], 'source', CONTENT_SOURCES),
    createdAt: str(row['created_at'], 'created_at'),
    state: {
      cardId: id,
      ease: num(row['ease'], 'ease'),
      intervalDays: num(row['interval_days'], 'interval_days'),
      repetitions: num(row['repetitions'], 'repetitions'),
      lapses: num(row['lapses'], 'lapses'),
      dueDate: str(row['due_date'], 'due_date'),
      lastGrade: toGrade(numOrNull(row['last_grade'], 'last_grade')),
      lastReviewedAt: strOrNull(row['last_reviewed_at'], 'last_reviewed_at'),
    },
  };
}

// Новые карточки (ещё ни разу не показанные) идут первыми, дальше самые просроченные.
const QUEUE_ORDER = 'ORDER BY s.repetitions = 0 DESC, s.due_date, f.id';

export function getDueCards(limit: number, topicId?: string): FlashcardWithState[] {
  const where = topicId
    ? 'WHERE s.due_date <= ? AND f.topic_id = ?'
    : 'WHERE s.due_date <= ?';
  const params = topicId ? [today(), topicId] : [today()];
  return queryAll(`${SELECT} ${where} ${QUEUE_ORDER} LIMIT ?`, [...params, limit], mapCard);
}

export function getCardById(id: string): FlashcardWithState | null {
  return queryOne(`${SELECT} WHERE f.id = ?`, [id], mapCard);
}

export function getCardsByTopic(topicId: string): FlashcardWithState[] {
  return queryAll(`${SELECT} WHERE f.topic_id = ? ${QUEUE_ORDER}`, [topicId], mapCard);
}

export interface QueueCounts {
  dueCount: number;
  newCount: number;
  tomorrowCount: number;
}

export function getQueueCounts(): QueueCounts {
  const row = queryOne(
    `SELECT
       SUM(CASE WHEN due_date <= ? THEN 1 ELSE 0 END)                        AS due_count,
       SUM(CASE WHEN repetitions = 0 AND due_date <= ? THEN 1 ELSE 0 END)    AS new_count,
       SUM(CASE WHEN due_date > ? AND due_date <= ? THEN 1 ELSE 0 END)       AS tomorrow_count
     FROM card_state`,
    [today(), today(), today(), addDays(today(), 1)],
    (r) => ({
      dueCount: numOrNull(r['due_count'], 'due_count') ?? 0,
      newCount: numOrNull(r['new_count'], 'new_count') ?? 0,
      tomorrowCount: numOrNull(r['tomorrow_count'], 'tomorrow_count') ?? 0,
    }),
  );
  return row ?? { dueCount: 0, newCount: 0, tomorrowCount: 0 };
}


export interface QueueTopicRow {
  topicId: string;
  title: string;
  slug: string;
  count: number;
}

export function getQueueByTopic(): QueueTopicRow[] {
  return queryAll(
    `SELECT t.id AS topic_id, t.title AS title, t.slug AS slug, COUNT(*) AS cnt
     FROM card_state s
     JOIN flashcards f ON f.id = s.card_id
     JOIN topics t ON t.id = f.topic_id
     WHERE s.due_date <= ?
     GROUP BY t.id
     ORDER BY cnt DESC, t.title`,
    [today()],
    (row) => ({
      topicId: str(row['topic_id'], 'topic_id'),
      title: str(row['title'], 'title'),
      slug: str(row['slug'], 'slug'),
      count: num(row['cnt'], 'cnt'),
    }),
  );
}

export function saveState(state: Sm2State, grade: ReviewGrade): void {
  transaction(() => {
    execute(
      `UPDATE card_state
       SET ease = ?, interval_days = ?, repetitions = ?, lapses = ?,
           due_date = ?, last_grade = ?, last_reviewed_at = ?
       WHERE card_id = ?`,
      [
        state.ease,
        state.intervalDays,
        state.repetitions,
        state.lapses,
        state.dueDate,
        grade,
        state.lastReviewedAt,
        state.cardId,
      ],
    );
    execute(
      'INSERT INTO card_reviews (card_id, grade, interval_days, reviewed_at) VALUES (?, ?, ?, ?)',
      [state.cardId, grade, state.intervalDays, state.lastReviewedAt ?? new Date().toISOString()],
    );
  });
}

export interface CardProgress {
  total: number;
  mature: number;
}

export function getCardProgress(topicId: string): CardProgress {
  const row = queryOne(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN s.interval_days >= ? THEN 1 ELSE 0 END) AS mature
     FROM flashcards f JOIN card_state s ON s.card_id = f.id
     WHERE f.topic_id = ?`,
    [MATURE_INTERVAL_DAYS, topicId],
    (r) => ({
      total: num(r['total'], 'total'),
      mature: numOrNull(r['mature'], 'mature') ?? 0,
    }),
  );
  return row ?? { total: 0, mature: 0 };
}
