import type { ContentSource, Difficulty } from './roadmap.js';

export const QUESTION_KINDS = ['mc', 'output', 'open'] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

export const QUESTION_KIND_LABELS: Record<QuestionKind, string> = {
  mc: 'Выбор варианта',
  output: 'Что выведет код',
  open: 'Открытый вопрос',
};

export interface QuestionOption {
  id: string;
  text: string;
}

interface QuestionBase {
  id: string;
  topicId: string;
  subtopicId: string | null;
  difficulty: Difficulty;
  /** Формулировка вопроса в Markdown. */
  promptMd: string;
  /** Код, который показывается рядом с вопросом (обязателен для kind === 'output'). */
  code: string | null;
  explanationMd: string;
  tags: string[];
  source: ContentSource;
  createdAt: string;
}

export interface McQuestion extends QuestionBase {
  kind: 'mc';
  options: QuestionOption[];
  /** Идентификаторы верных вариантов. Больше одного — вопрос с множественным выбором. */
  correctOptionIds: string[];
}

export interface OutputQuestion extends QuestionBase {
  kind: 'output';
  /** Ожидаемый вывод построчно — как если бы это печатал console.log. */
  expectedOutput: string[];
  /** Варианты ответа, если вопрос задан как выбор. Пусто — значит ввод свободный. */
  options: QuestionOption[];
  correctOptionIds: string[];
}

export interface OpenQuestion extends QuestionBase {
  kind: 'open';
  /** Эталонный ответ, который показывается после оценки. */
  referenceAnswerMd: string;
  /** Пункты, которые должны прозвучать в сильном ответе — рубрика для AI-оценки. */
  rubric: string[];
}

export type Question = McQuestion | OutputQuestion | OpenQuestion;

/** Ответ пользователя: набор опций, свободный текст или предсказанный вывод. */
export type QuestionAnswer =
  | { kind: 'mc'; optionIds: string[] }
  | { kind: 'output'; optionIds: string[]; text: string }
  | { kind: 'open'; text: string };

/** Оценка открытого ответа, которую возвращает Groq. */
export interface OpenAnswerGrade {
  /** 0–10. */
  score: number;
  summary: string;
  covered: string[];
  missed: string[];
  mistakes: string[];
  referenceAnswerMd: string;
  strongCandidateAnswerMd: string;
  followUpQuestions: string[];
}

export interface QuestionAttempt {
  id: number;
  questionId: string;
  answer: QuestionAnswer;
  isCorrect: boolean | null;
  aiScore: number | null;
  aiFeedback: OpenAnswerGrade | null;
  createdAt: string;
}

export interface QuestionCheckResult {
  attemptId: number;
  isCorrect: boolean | null;
  correctOptionIds: string[];
  expectedOutput: string[] | null;
  explanationMd: string;
  grade: OpenAnswerGrade | null;
}

// --- Версия вопроса для клиента --------------------------------------------------
// Правильные ответы, эталон и объяснение не уходят на фронт, пока вопрос не отвечен.

export type PublicMcQuestion = Omit<McQuestion, 'correctOptionIds' | 'explanationMd'>;
export type PublicOutputQuestion = Omit<
  OutputQuestion,
  'correctOptionIds' | 'expectedOutput' | 'explanationMd'
>;
export type PublicOpenQuestion = Omit<
  OpenQuestion,
  'referenceAnswerMd' | 'rubric' | 'explanationMd'
>;

export type PublicQuestion = PublicMcQuestion | PublicOutputQuestion | PublicOpenQuestion;

/** Итог последней попытки по вопросу — чтобы показать в списке, что уже пройдено. */
export interface QuestionOutcome {
  questionId: string;
  isCorrect: boolean | null;
  aiScore: number | null;
  attempts: number;
  lastAnsweredAt: string;
}

export interface QuizStats {
  total: number;
  answered: number;
  correct: number;
  /** Доля верных ответов 0–1 по отвеченным вопросам; null — данных нет. */
  accuracy: number | null;
}
