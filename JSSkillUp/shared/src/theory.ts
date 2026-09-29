import type { ContentSource } from './roadmap.js';

/** Статья теории по теме. Тело — Markdown с блоками кода. */
export interface TheoryArticle {
  id: string;
  topicId: string;
  subtopicId: string | null;
  title: string;
  bodyMd: string;
  orderIndex: number;
  source: ContentSource;
  /** Когда статья была отмечена прочитанной; null — ещё не читалась. */
  readAt: string | null;
}
