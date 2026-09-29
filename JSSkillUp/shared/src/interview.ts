import { z } from 'zod';

export const INTERVIEW_FORMATS = [
  'js_theory',
  'react_theory',
  'live_coding',
  'mixed_tech',
  'behavioral',
] as const;
export type InterviewFormat = (typeof INTERVIEW_FORMATS)[number];

export const INTERVIEW_FORMAT_LABELS: Record<InterviewFormat, string> = {
  js_theory: 'Теория по JavaScript',
  react_theory: 'Теория по React',
  live_coding: 'Live-coding',
  mixed_tech: 'Смешанное техническое интервью',
  behavioral: 'Поведенческое интервью',
};

export const INTERVIEW_FORMAT_DESCRIPTIONS: Record<InterviewFormat, string> = {
  js_theory: 'Closures, this, прототипы, event loop, Promise, «что выведет код» — с углублением в механику',
  react_theory: 'Reconciliation, хуки и их ловушки, мемоизация, Context, state management',
  live_coding: '1–3 задачи в редакторе: интервьюер смотрит код, спрашивает про edge cases и O(n)',
  mixed_tech: 'Как настоящее техническое интервью: JS → React → браузер и сеть → небольшая задача',
  behavioral: 'Проекты, конфликты, оценка задач, ошибки — ответы по STAR с уточнениями',
};

/** Рекомендуемая длительность по формату, минуты. */
export const INTERVIEW_DEFAULT_MINUTES: Record<InterviewFormat, number> = {
  js_theory: 30,
  react_theory: 30,
  live_coding: 45,
  mixed_tech: 60,
  behavioral: 30,
};

export const INTERVIEW_MIN_MINUTES = 10;
export const INTERVIEW_MAX_MINUTES = 90;

export type InterviewStatus = 'active' | 'finished' | 'aborted';
export const INTERVIEW_STATUSES = ['active', 'finished', 'aborted'] as const;

export const TURN_ROLES = ['interviewer', 'candidate', 'system'] as const;
export type TurnRole = (typeof TURN_ROLES)[number];

/**
 * Тип хода интервьюера:
 * question — новый вопрос/тема, follow_up — углубление в ту же тему,
 * coding_task — задача в редактор, code_comment — реакция на присланный код,
 * wrap_up — интервью окончено.
 */
export const INTERVIEW_MOVE_KINDS = [
  'question',
  'follow_up',
  'coding_task',
  'code_comment',
  'wrap_up',
] as const;
export type InterviewMoveKind = (typeof INTERVIEW_MOVE_KINDS)[number];

export const codingTaskSchema = z.object({
  title: z.string().min(3),
  statementMd: z.string().min(10),
  starterCode: z.string().default(''),
});
export type CodingTask = z.infer<typeof codingTaskSchema>;

export const answerAssessmentSchema = z.object({
  score: z.number().min(0).max(10),
  note: z.string().default(''),
});
/** Скрытая оценка ответа кандидата: видна только после завершения интервью. */
export type AnswerAssessment = z.infer<typeof answerAssessmentSchema>;

/** Метаданные реплики в колонке `interview_turns.meta_json`. */
export const turnMetaSchema = z.object({
  codingTask: codingTaskSchema.nullable().default(null),
  assessment: answerAssessmentSchema.nullable().default(null),
});
export type TurnMeta = z.infer<typeof turnMetaSchema>;

export interface InterviewTurn {
  id: number;
  sessionId: string;
  role: TurnRole;
  content: string;
  /** Код, который кандидат прислал из редактора вместе с ответом. */
  code: string | null;
  topicId: string | null;
  /** Только у реплик интервьюера. */
  kind: InterviewMoveKind | null;
  codingTask: CodingTask | null;
  /** Только у реплик кандидата и только после завершения интервью. */
  assessment: AnswerAssessment | null;
  createdAt: string;
}

export interface InterviewTopicScore {
  topicId: string | null;
  /** Для ссылки на тему в роадмапе; null — тема не из роадмапа. */
  slug: string | null;
  topicTitle: string;
  /** 0–10. */
  score: number;
  comment: string;
}

export interface ReviewTopicRef {
  topicId: string;
  slug: string;
  title: string;
}

export interface InterviewReport {
  overallScore: number;
  /** Итог одной фразой: прошёл бы на Middle или нет и почему. */
  verdict: string;
  strengths: string[];
  weaknesses: string[];
  topicScores: InterviewTopicScore[];
  /** Темы, помеченные в роадмапе статусом «повторить». */
  topicsToReview: ReviewTopicRef[];
  advice: string;
  durationMinutes: number;
  answers: number;
}

export interface InterviewSession {
  id: string;
  format: InterviewFormat;
  startedAt: string;
  endedAt: string | null;
  plannedMinutes: number;
  status: InterviewStatus;
  report: InterviewReport | null;
  /** Сколько ответов дал кандидат. */
  answerCount: number;
}

export interface InterviewSessionWithTurns extends InterviewSession {
  turns: InterviewTurn[];
}

// --- Схемы ответов Groq --------------------------------------------------------------

export const interviewerMoveSchema = z.object({
  /** Оценка последнего ответа кандидата; null на первом ходе. */
  assessment: answerAssessmentSchema.nullable().default(null),
  kind: z.enum(INTERVIEW_MOVE_KINDS),
  topicSlug: z.string().nullable().default(null),
  message: z.string().min(1),
  codingTask: codingTaskSchema.nullable().default(null),
});
export type InterviewerMove = z.infer<typeof interviewerMoveSchema>;

export const interviewReportAiSchema = z.object({
  overallScore: z.number().min(0).max(10),
  verdict: z.string().min(1),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  topicScores: z
    .array(
      z.object({
        topicSlug: z.string().nullable().default(null),
        topicTitle: z.string().min(1),
        score: z.number().min(0).max(10),
        comment: z.string().default(''),
      }),
    )
    .default([]),
  topicsToReview: z.array(z.string()).default([]),
  advice: z.string().default(''),
});
export type InterviewReportAi = z.infer<typeof interviewReportAiSchema>;

/** Отчёт в `interview_sessions.report_json`. */
export const interviewReportSchema = z.object({
  overallScore: z.number(),
  verdict: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  topicScores: z.array(
    z.object({
      topicId: z.string().nullable(),
      slug: z.string().nullable(),
      topicTitle: z.string(),
      score: z.number(),
      comment: z.string(),
    }),
  ),
  topicsToReview: z.array(z.object({ topicId: z.string(), slug: z.string(), title: z.string() })),
  advice: z.string(),
  durationMinutes: z.number(),
  answers: z.number(),
});
