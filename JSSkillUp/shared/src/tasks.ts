import type { ContentSource, Difficulty } from './roadmap.js';

export const TASK_KINDS = ['algo', 'react', 'review'] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export const TASK_KIND_LABELS: Record<TaskKind, string> = {
  algo: 'Логика и алгоритмы',
  react: 'React',
  review: 'Code review',
};

/** Где исполняется решение: Web Worker, iframe-превью или нигде (ответ текстом). */
export const TASK_RUNTIMES = ['worker', 'preview', 'none'] as const;
export type TaskRuntime = (typeof TASK_RUNTIMES)[number];

export const TASK_LANGUAGES = ['js', 'ts', 'tsx'] as const;
export type TaskLanguage = (typeof TASK_LANGUAGES)[number];

export type TestVisibility = 'visible' | 'hidden';

export interface TaskTest {
  id: number;
  name: string;
  visibility: TestVisibility;
  /** Тело теста: код, который вызывает решение и проверяет его через expect(). */
  code: string;
  orderIndex: number;
}

export interface TaskHint {
  id: number;
  level: number;
  bodyMd: string;
}

export interface Task {
  id: string;
  topicId: string | null;
  slug: string;
  title: string;
  kind: TaskKind;
  difficulty: Difficulty;
  statementMd: string;
  starterCode: string;
  language: TaskLanguage;
  runtime: TaskRuntime;
  timeLimitMs: number;
  tags: string[];
  source: ContentSource;
  createdAt: string;
  /** Скрытые тесты приходят на клиент без кода — только имя. */
  tests: TaskTest[];
  hintCount: number;
}

/** Задача вместе с решением. Отдаётся только по явному запросу («показать решение»). */
export interface TaskSolution {
  solutionCode: string;
  solutionNotesMd: string;
}

export interface TestResult {
  name: string;
  visibility: TestVisibility;
  passed: boolean;
  /** Сообщение об ошибке или расхождение ожидаемого и полученного. */
  message: string | null;
  durationMs: number;
}

export type RunStatus = 'passed' | 'failed' | 'error' | 'timeout';

export interface RunResult {
  status: RunStatus;
  passed: number;
  total: number;
  results: TestResult[];
  /** Ошибка компиляции или падение вне тестов. */
  error: string | null;
  logs: string[];
  durationMs: number;
}

export interface CodeReview {
  correctness: { score: number; comment: string };
  complexity: { time: string; space: string; comment: string };
  readability: { score: number; comment: string };
  improvements: string[];
  rewrittenCode: string | null;
  interviewerFollowUps: string[];
}

export interface TaskAttempt {
  id: number;
  taskId: string;
  code: string;
  passed: number;
  total: number;
  results: TestResult[];
  durationMs: number;
  aiReview: CodeReview | null;
  createdAt: string;
}

/** Строка списка задач: без условия, тестов и решения. */
export interface TaskListItem {
  id: string;
  slug: string;
  title: string;
  kind: TaskKind;
  difficulty: Difficulty;
  topicId: string | null;
  topicTitle: string | null;
  tags: string[];
  source: ContentSource;
  /** Была ли хоть одна попытка, где прошли все тесты. */
  solved: boolean;
  attempts: number;
  /** Лучший результат: сколько тестов прошло из скольких. */
  bestPassed: number;
  testCount: number;
}

export type TaskFilterStatus = 'all' | 'solved' | 'unsolved' | 'attempted';

export interface TaskFacets {
  total: number;
  solved: number;
  byKind: Record<TaskKind, number>;
  byDifficulty: Record<Difficulty, number>;
}
