/** Статус изучения темы. Проставляется вручную или автоматически (по итогам mock interview). */
export const TOPIC_STATUSES = ['not_started', 'in_progress', 'learned', 'review'] as const;
export type TopicStatus = (typeof TOPIC_STATUSES)[number];

export const TOPIC_STATUS_LABELS: Record<TopicStatus, string> = {
  not_started: 'Не начато',
  in_progress: 'В процессе',
  learned: 'Изучено',
  review: 'Повторить',
};

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Лёгкая',
  medium: 'Средняя',
  hard: 'Сложная',
};

/** Откуда взялся контент: из seed-файлов репозитория или сгенерирован через Groq. */
export const CONTENT_SOURCES = ['seed', 'ai'] as const;
export type ContentSource = (typeof CONTENT_SOURCES)[number];

export interface Stage {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  icon: string;
}

export interface Subtopic {
  id: string;
  topicId: string;
  title: string;
  orderIndex: number;
}

export interface Topic {
  id: string;
  stageId: string;
  slug: string;
  title: string;
  summary: string;
  orderIndex: number;
  estimatedMinutes: number;
}

/**
 * Прогресс по теме. `computedPercent` пересчитывается из квизов, задач и карточек;
 * `manualPercent`, если задан, перебивает расчёт в UI.
 */
export interface TopicProgress {
  topicId: string;
  status: TopicStatus;
  manualPercent: number | null;
  computedPercent: number;
  notes: string;
  updatedAt: string;
}

export interface TopicWithProgress extends Topic {
  progress: TopicProgress;
  subtopics: Subtopic[];
  /** Итоговый процент: manualPercent ?? computedPercent. */
  percent: number;
  counts: TopicContentCounts;
}

export interface TopicContentCounts {
  theory: number;
  questions: number;
  tasks: number;
  flashcards: number;
}

export interface StageWithTopics extends Stage {
  topics: TopicWithProgress[];
  percent: number;
}

export interface Roadmap {
  stages: StageWithTopics[];
}
