import { z } from 'zod';
import { DIFFICULTIES, TOPIC_STATUSES } from './roadmap.js';
import type { StageWithTopics, TopicWithProgress } from './roadmap.js';
import type { Dashboard } from './stats.js';
import type { TheoryArticle } from './theory.js';
import type { FlashcardWithState, ReviewQueue, Sm2State } from './flashcards.js';
import { QUESTION_KINDS } from './questions.js';
import type {
  OpenAnswerGrade,
  PublicQuestion,
  QuestionCheckResult,
  QuestionOutcome,
  QuizStats,
} from './questions.js';
import type {
  CodeReview,
  Task,
  TaskAttempt,
  TaskFacets,
  TaskHint,
  TaskListItem,
} from './tasks.js';
import { INTERVIEW_FORMATS, INTERVIEW_MAX_MINUTES, INTERVIEW_MIN_MINUTES } from './interview.js';
import type { InterviewSession, InterviewSessionWithTurns } from './interview.js';

/** Единый формат ошибки от бэкенда. */
export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    /** Для RATE_LIMIT — через сколько секунд можно повторить. */
    retryAfterSec?: number;
    details?: unknown;
  };
}

export const API_ERROR_CODES = [
  'BAD_REQUEST',
  'NOT_FOUND',
  'RATE_LIMIT',
  'AI_UNAVAILABLE',
  'AI_BAD_RESPONSE',
  'INTERNAL',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

// --- GET /api/roadmap ---
export interface RoadmapResponse {
  stages: StageWithTopics[];
}

// --- GET /api/topics/:slug ---
export interface TopicResponse {
  topic: TopicWithProgress;
  stage: { id: string; title: string; icon: string };
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}

// --- PATCH /api/topics/:id/progress ---
export const updateProgressSchema = z
  .object({
    status: z.enum(TOPIC_STATUSES).optional(),
    manualPercent: z.number().int().min(0).max(100).nullable().optional(),
    notes: z.string().max(20_000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Нужно передать хотя бы одно поле',
  });
export type UpdateProgressRequest = z.infer<typeof updateProgressSchema>;

export interface UpdateProgressResponse {
  topic: TopicWithProgress;
}

// --- GET /api/dashboard ---
export type DashboardResponse = Dashboard;

// --- GET /api/health ---
export interface HealthResponse {
  ok: true;
  nodeVersion: string;
  sqliteVersion: string;
  aiConfigured: boolean;
  model: string | null;
}

// --- GET /api/topics/:slug/theory ---
export interface TheoryResponse {
  articles: TheoryArticle[];
}

// --- POST /api/theory/:id/read ---
export const markReadSchema = z.object({ read: z.boolean() });
export type MarkReadRequest = z.infer<typeof markReadSchema>;

export interface MarkReadResponse {
  article: TheoryArticle;
  topicPercent: number;
}

// --- GET /api/topics/:slug/questions ---
export interface QuestionsResponse {
  questions: PublicQuestion[];
  outcomes: QuestionOutcome[];
  stats: QuizStats;
}

// --- POST /api/questions/:id/check ---
export const questionAnswerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('mc'), optionIds: z.array(z.string()).min(1) }),
  z.object({ kind: z.literal('output'), optionIds: z.array(z.string()), text: z.string() }),
  z.object({ kind: z.literal('open'), text: z.string().min(1, 'Ответ не может быть пустым') }),
]);
export type CheckAnswerRequest = z.infer<typeof questionAnswerSchema>;

export interface CheckAnswerResponse extends QuestionCheckResult {
  /** Эталон и рубрика для открытого вопроса — приходят только после ответа. */
  referenceAnswerMd: string | null;
  rubric: string[] | null;
  topicPercent: number;
}

// --- POST /api/attempts/:id/self-grade ---
export const selfGradeSchema = z.object({ score: z.number().int().min(0).max(10) });
export type SelfGradeRequest = z.infer<typeof selfGradeSchema>;

export interface SelfGradeResponse {
  topicPercent: number;
}

// --- GET /api/cards/queue ---
export interface CardQueueResponse extends ReviewQueue {
  /** Разбивка очереди по темам — чтобы видеть, что именно всплыло на повторение. */
  byTopic: Array<{ topicId: string; title: string; slug: string; count: number }>;
}

// --- POST /api/cards/:id/review ---
export const reviewCardSchema = z.object({
  grade: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
});
export type ReviewCardRequest = z.infer<typeof reviewCardSchema>;

export interface ReviewCardResponse {
  state: Sm2State;
  /** Сколько карточек осталось в очереди на сегодня. */
  remaining: number;
  topicPercent: number;
}

// --- GET /api/topics/:slug/cards ---
export interface TopicCardsResponse {
  cards: FlashcardWithState[];
}

// --- GET /api/tasks ---
export interface TasksResponse {
  tasks: TaskListItem[];
  facets: TaskFacets;
}

// --- GET /api/tasks/:slug ---
export interface TaskResponse {
  task: Task;
  topic: { slug: string; title: string } | null;
  attempts: TaskAttempt[];
}

// --- GET /api/tasks/:slug/hints/:level ---
export interface HintResponse {
  hint: TaskHint;
}

// --- GET /api/tasks/:slug/solution ---
export interface SolutionResponse {
  solutionCode: string;
  solutionNotesMd: string;
}

// --- POST /api/tasks/:slug/attempts ---
export const testResultSchema = z.object({
  name: z.string(),
  visibility: z.enum(['visible', 'hidden']),
  passed: z.boolean(),
  message: z.string().nullable(),
  durationMs: z.number().nonnegative(),
});

export const submitAttemptSchema = z.object({
  code: z.string().max(200_000),
  status: z.enum(['passed', 'failed', 'error', 'timeout']),
  passed: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  results: z.array(testResultSchema),
  durationMs: z.number().nonnegative(),
});
export type SubmitAttemptRequest = z.infer<typeof submitAttemptSchema>;

export interface SubmitAttemptResponse {
  attempt: TaskAttempt;
  /** Новый процент темы; null — задача не привязана к теме. */
  topicPercent: number | null;
  solved: boolean;
}

// --- GET /api/ai/status ---
export interface AiStatusResponse {
  configured: boolean;
  model: string | null;
}

// --- POST /api/attempts/:id/ai-grade ---
export interface AiGradeResponse {
  grade: OpenAnswerGrade;
  topicPercent: number;
}

// --- POST /api/tasks/:slug/attempts/:attemptId/review ---
export interface AiReviewResponse {
  review: CodeReview;
}

// --- POST /api/ai/questions ---
export const generateQuestionsSchema = z.object({
  topic: z.string().min(1),
  count: z.number().int().min(1).max(5).default(3),
  difficulty: z.enum(DIFFICULTIES).optional(),
  kind: z.enum(QUESTION_KINDS).optional(),
});
export type GenerateQuestionsRequest = z.infer<typeof generateQuestionsSchema>;

export interface GenerateQuestionsResponse {
  created: number;
  /** Отброшенные моделью варианты с причиной — чтобы было видно, что происходит. */
  rejected: string[];
}

// --- POST /api/ai/tasks ---
export const generateTaskSchema = z.object({
  /** Slug задачи, «похожую на которую» нужно сгенерировать. */
  similarTo: z.string().min(1).optional(),
  topic: z.string().min(1).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
});
export type GenerateTaskRequest = z.infer<typeof generateTaskSchema>;

export interface GenerateTaskResponse {
  slug: string;
  title: string;
  /** Сколько тестов прошло эталонное решение при проверке перед сохранением. */
  verifiedTests: number;
}

// --- Mock interview ---

// POST /api/interviews
export const startInterviewSchema = z.object({
  format: z.enum(INTERVIEW_FORMATS),
  plannedMinutes: z.number().int().min(INTERVIEW_MIN_MINUTES).max(INTERVIEW_MAX_MINUTES),
});
export type StartInterviewRequest = z.infer<typeof startInterviewSchema>;

// POST /api/interviews/:id/answer
export const interviewAnswerSchema = z.object({
  content: z.string().trim().min(1, 'Ответ пустой').max(8000, 'Слишком длинный ответ'),
  code: z.string().max(20000, 'Слишком много кода').nullable().default(null),
});
export type InterviewAnswerRequest = z.input<typeof interviewAnswerSchema>;

/** Ответ start / answer / finish / abort / get — сессия целиком. */
export interface InterviewResponse {
  session: InterviewSessionWithTurns;
}

// GET /api/interviews
export interface InterviewsResponse {
  sessions: InterviewSession[];
}
