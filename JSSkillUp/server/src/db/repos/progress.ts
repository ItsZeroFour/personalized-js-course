import type { TopicStatus } from '@jsskillup/shared';
import { execute, transaction } from '../client.js';
import { today } from '../../services/date.js';

export interface ProgressPatch {
  status?: TopicStatus;
  manualPercent?: number | null;
  notes?: string;
}

/** Точечное обновление прогресса темы: меняются только переданные поля. */
export function updateTopicProgress(topicId: string, patch: ProgressPatch): void {
  transaction(() => {
    execute(
      `INSERT INTO topic_progress (topic_id, status, computed_percent, notes, updated_at)
       VALUES (?, 'not_started', 0, '', ?)
       ON CONFLICT(topic_id) DO NOTHING`,
      [topicId, new Date().toISOString()],
    );

    if (patch.status !== undefined) {
      execute('UPDATE topic_progress SET status = ?, updated_at = ? WHERE topic_id = ?', [
        patch.status,
        new Date().toISOString(),
        topicId,
      ]);
    }
    if (patch.manualPercent !== undefined) {
      execute('UPDATE topic_progress SET manual_percent = ?, updated_at = ? WHERE topic_id = ?', [
        patch.manualPercent,
        new Date().toISOString(),
        topicId,
      ]);
    }
    if (patch.notes !== undefined) {
      execute('UPDATE topic_progress SET notes = ?, updated_at = ? WHERE topic_id = ?', [
        patch.notes,
        new Date().toISOString(),
        topicId,
      ]);
    }
  });
}

/** Помечает темы статусом «повторить» — вызывается из отчёта mock interview. */
export function markTopicsForReview(topicIds: readonly string[]): void {
  if (topicIds.length === 0) return;
  transaction(() => {
    for (const topicId of topicIds) {
      updateTopicProgress(topicId, { status: 'review' });
    }
  });
}

export type ActivityKind = 'questions' | 'tasks' | 'cards';

/** Инкремент дневной активности — из него считается streak. */
export function recordActivity(kind: ActivityKind, amount = 1, minutes = 0): void {
  execute(
    `INSERT INTO daily_activity (day, questions, tasks, cards, minutes)
     VALUES (?, 0, 0, 0, 0)
     ON CONFLICT(day) DO NOTHING`,
    [today()],
  );
  execute(`UPDATE daily_activity SET ${kind} = ${kind} + ?, minutes = minutes + ? WHERE day = ?`, [
    amount,
    minutes,
    today(),
  ]);
}
