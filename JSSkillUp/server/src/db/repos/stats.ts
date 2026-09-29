import { num, numOrNull, queryAll, queryOne, str, type Row } from '../client.js';
import { today } from '../../services/date.js';

export interface ActivityDay {
  day: string;
  questions: number;
  tasks: number;
  cards: number;
}

export function getActivity(limitDays: number): ActivityDay[] {
  return queryAll(
    'SELECT day, questions, tasks, cards FROM daily_activity ORDER BY day DESC LIMIT ?',
    [limitDays],
    (row) => ({
      day: str(row['day'], 'day'),
      questions: num(row['questions'], 'questions'),
      tasks: num(row['tasks'], 'tasks'),
      cards: num(row['cards'], 'cards'),
    }),
  );
}

export interface TopicAccuracy {
  topicId: string;
  slug: string;
  title: string;
  stageTitle: string;
  status: string;
  attempts: number;
  /** Доля верных ответов 0–1; для открытых вопросов — оценка (AI, иначе своя) / 10. */
  accuracy: number | null;
}

/**
 * Точность по темам. Для оценки берутся все попытки: `is_correct` для закрытых вопросов
 * и `ai_score / 10` (или `self_score / 10`, если AI не оценивал) для открытых.
 */
export function getTopicAccuracy(): TopicAccuracy[] {
  return queryAll(
    `SELECT
       t.id                              AS topic_id,
       t.slug                            AS slug,
       t.title                           AS title,
       s.title                           AS stage_title,
       COALESCE(p.status, 'not_started') AS status,
       COUNT(a.id)                       AS attempts,
       AVG(COALESCE(a.is_correct * 1.0, COALESCE(a.ai_score, a.self_score) / 10.0)) AS accuracy
     FROM topics t
     JOIN stages s ON s.id = t.stage_id
     LEFT JOIN topic_progress p ON p.topic_id = t.id
     LEFT JOIN questions q ON q.topic_id = t.id
     LEFT JOIN question_attempts a ON a.question_id = q.id
     GROUP BY t.id
     ORDER BY s.order_index, t.order_index`,
    [],
    (row: Row): TopicAccuracy => ({
      topicId: str(row['topic_id'], 'topic_id'),
      slug: str(row['slug'], 'slug'),
      title: str(row['title'], 'title'),
      stageTitle: str(row['stage_title'], 'stage_title'),
      status: str(row['status'], 'status'),
      attempts: num(row['attempts'], 'attempts'),
      accuracy: numOrNull(row['accuracy'], 'accuracy'),
    }),
  );
}

export interface TodayCounts {
  dueCards: number;
  unansweredQuestions: number;
  unsolvedTasks: number;
}

export function getTodayCounts(): TodayCounts {
  const counts = queryOne(
    `SELECT
       (SELECT COUNT(*) FROM card_state WHERE due_date <= ?) AS due_cards,
       (SELECT COUNT(*) FROM questions q
          WHERE NOT EXISTS (SELECT 1 FROM question_attempts a WHERE a.question_id = q.id)
       ) AS unanswered,
       (SELECT COUNT(*) FROM tasks t
          WHERE NOT EXISTS (
            SELECT 1 FROM task_attempts ta
            WHERE ta.task_id = t.id AND ta.total > 0 AND ta.passed = ta.total
          )
       ) AS unsolved`,
    [today()],
    (row) => ({
      dueCards: num(row['due_cards'], 'due_cards'),
      unansweredQuestions: num(row['unanswered'], 'unanswered'),
      unsolvedTasks: num(row['unsolved'], 'unsolved'),
    }),
  );
  return counts ?? { dueCards: 0, unansweredQuestions: 0, unsolvedTasks: 0 };
}
