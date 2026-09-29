import { createHash } from 'node:crypto';
import type {
  Difficulty,
  QuestionOption,
  TaskKind,
  TaskLanguage,
  TaskRuntime,
} from '@jsskillup/shared';

/** Описание роадмапа в seed-файлах. id темы совпадает со slug, id подтемы — `${slug}--${n}`. */
export interface SeedTopic {
  slug: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  subtopics: string[];
}

export interface SeedStage {
  id: string;
  title: string;
  description: string;
  icon: string;
  topics: SeedTopic[];
}

interface SeedQuestionBase {
  /** Slug темы из роадмапа. */
  topic: string;
  difficulty: Difficulty;
  promptMd: string;
  /** Код рядом с вопросом. Для kind: 'output' обязателен. */
  code?: string;
  explanationMd: string;
  tags?: string[];
}

export interface SeedMcQuestion extends SeedQuestionBase {
  kind: 'mc';
  options: QuestionOption[];
  /** id верных вариантов; больше одного — множественный выбор. */
  correct: string[];
}

export interface SeedOutputQuestion extends SeedQuestionBase {
  kind: 'output';
  code: string;
  /** Ожидаемый вывод построчно. */
  expectedOutput: string[];
  /** Если заданы варианты, вопрос превращается в выбор, а не в свободный ввод. */
  options?: QuestionOption[];
  correct?: string[];
}

export interface SeedOpenQuestion extends SeedQuestionBase {
  kind: 'open';
  referenceAnswerMd: string;
  /** Пункты, которые должны прозвучать в сильном ответе. */
  rubric: string[];
}

export type SeedQuestion = SeedMcQuestion | SeedOutputQuestion | SeedOpenQuestion;

export interface SeedFlashcard {
  topic: string;
  front: string;
  back: string;
  tags?: string[];
}

/**
 * Идентификатор контента выводится из его содержимого, а не из порядка в массиве.
 * Так вставка нового вопроса в середину файла не перемешивает историю попыток
 * и состояние SM-2 у соседей.
 */
export function contentId(prefix: string, ...parts: Array<string | undefined>): string {
  const hash = createHash('sha1').update(parts.filter(Boolean).join('\u0000')).digest('hex');
  return `${prefix}-${hash.slice(0, 12)}`;
}

export interface SeedTaskTest {
  name: string;
  code: string;
  /** Скрытый тест не показывается в UI до прогона. */
  hidden?: boolean;
}

export interface SeedTask {
  slug: string;
  /** Slug темы роадмапа; null для задач, не привязанных к теме. */
  topic?: string;
  title: string;
  kind: TaskKind;
  difficulty: Difficulty;
  statementMd: string;
  starterCode: string;
  solutionCode: string;
  solutionNotesMd?: string;
  language?: TaskLanguage;
  runtime?: TaskRuntime;
  timeLimitMs?: number;
  tags?: string[];
  /** Подсказки по уровням: level = индекс + 1. */
  hints: string[];
  tests: SeedTaskTest[];
}

/** Значения по умолчанию для полей задачи. React-задачи (runtime: 'preview') — TSX и больший лимит. */
export function taskRuntimeOf(task: SeedTask): {
  language: TaskLanguage;
  runtime: TaskRuntime;
  timeLimitMs: number;
} {
  const runtime = task.runtime ?? 'worker';
  return {
    runtime,
    language: task.language ?? (runtime === 'preview' ? 'tsx' : 'ts'),
    timeLimitMs: task.timeLimitMs ?? (runtime === 'preview' ? 3000 : 2000),
  };
}
