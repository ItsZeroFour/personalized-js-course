import { z } from 'zod';
import { DIFFICULTIES } from './roadmap.js';

/**
 * Схемы ответов Groq. Модель отвечает строкой, поэтому распарсенный JSON —
 * это `unknown`, и единственный способ безопасно с ним работать — прогнать через схему.
 * Всё, что не прошло валидацию, отбрасывается: лучше показать ошибку, чем сохранить мусор.
 */

// --- Оценка открытого ответа ---------------------------------------------------------

export const openAnswerGradeSchema = z.object({
  score: z.number().min(0).max(10),
  summary: z.string().min(1),
  covered: z.array(z.string()).default([]),
  missed: z.array(z.string()).default([]),
  mistakes: z.array(z.string()).default([]),
  referenceAnswerMd: z.string().default(''),
  strongCandidateAnswerMd: z.string().default(''),
  followUpQuestions: z.array(z.string()).default([]),
});

// --- Ревью кода ----------------------------------------------------------------------

export const codeReviewSchema = z.object({
  correctness: z.object({ score: z.number().min(0).max(10), comment: z.string() }),
  complexity: z.object({ time: z.string(), space: z.string(), comment: z.string() }),
  readability: z.object({ score: z.number().min(0).max(10), comment: z.string() }),
  improvements: z.array(z.string()).default([]),
  rewrittenCode: z.string().nullable().default(null),
  interviewerFollowUps: z.array(z.string()).default([]),
});

// --- Сгенерированные вопросы ---------------------------------------------------------

const questionOptionSchema = z.object({ id: z.string().min(1), text: z.string().min(1) });

const generatedQuestionBase = {
  difficulty: z.enum(DIFFICULTIES),
  promptMd: z.string().min(10),
  explanationMd: z.string().min(10),
  tags: z.array(z.string()).default([]),
};

export const generatedQuestionSchema = z.discriminatedUnion('kind', [
  z.object({
    ...generatedQuestionBase,
    kind: z.literal('mc'),
    code: z.string().nullable().default(null),
    options: z.array(questionOptionSchema).min(3),
    correct: z.array(z.string()).min(1),
  }),
  z.object({
    ...generatedQuestionBase,
    kind: z.literal('output'),
    code: z.string().min(1),
    expectedOutput: z.array(z.string()).min(1),
  }),
  z.object({
    ...generatedQuestionBase,
    kind: z.literal('open'),
    code: z.string().nullable().default(null),
    referenceAnswerMd: z.string().min(20),
    rubric: z.array(z.string()).min(2),
  }),
]);

export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

export const generatedQuestionsSchema = z.object({
  questions: z.array(generatedQuestionSchema).min(1),
});

// --- Сгенерированные задачи ----------------------------------------------------------

export const generatedTaskSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug только из латиницы, цифр и дефисов'),
  title: z.string().min(3),
  difficulty: z.enum(DIFFICULTIES),
  statementMd: z.string().min(30),
  starterCode: z.string().min(5),
  solutionCode: z.string().min(5),
  solutionNotesMd: z.string().default(''),
  tags: z.array(z.string()).default([]),
  hints: z.array(z.string()).min(1).max(3),
  tests: z
    .array(
      z.object({
        name: z.string().min(1),
        code: z.string().min(1),
        hidden: z.boolean().default(false),
      }),
    )
    .min(3),
});

export type GeneratedTask = z.infer<typeof generatedTaskSchema>;
