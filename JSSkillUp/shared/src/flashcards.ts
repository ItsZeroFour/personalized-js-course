import type { ContentSource } from './roadmap.js';

export interface Flashcard {
  id: string;
  topicId: string;
  frontMd: string;
  backMd: string;
  tags: string[];
  source: ContentSource;
  createdAt: string;
}

/**
 * Состояние карточки в алгоритме SM-2.
 * `ease` — фактор лёгкости (минимум 1.3), `intervalDays` — текущий интервал,
 * `repetitions` — число подряд успешных повторений.
 */
export interface Sm2State {
  cardId: string;
  ease: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  /** Дата следующего показа, формат YYYY-MM-DD. */
  dueDate: string;
  lastGrade: ReviewGrade | null;
  lastReviewedAt: string | null;
}

/** Оценка вспоминания по SM-2: 0 — полный провал, 5 — вспомнил мгновенно. */
export const REVIEW_GRADES = [0, 1, 2, 3, 4, 5] as const;
export type ReviewGrade = (typeof REVIEW_GRADES)[number];

export interface FlashcardWithState extends Flashcard {
  state: Sm2State;
}

export interface ReviewQueue {
  due: FlashcardWithState[];
  /** Сколько карточек ещё не показывалось ни разу. */
  newCount: number;
  dueCount: number;
  /** Карточки, которые станут доступны завтра. */
  tomorrowCount: number;
}
