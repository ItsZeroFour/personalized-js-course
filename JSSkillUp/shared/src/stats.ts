export interface OverallProgress {
  percent: number;
  topicsTotal: number;
  topicsLearned: number;
  topicsInProgress: number;
  topicsToReview: number;
}

export interface StageProgress {
  id: string;
  title: string;
  icon: string;
  percent: number;
  topicsTotal: number;
  topicsLearned: number;
}

export interface StreakInfo {
  current: number;
  longest: number;
  activeToday: boolean;
  /** Активность за последние 84 дня для heat-map, от старой к новой. */
  history: Array<{ day: string; score: number }>;
}

export interface WeakTopic {
  topicId: string;
  slug: string;
  title: string;
  stageTitle: string;
  reason: string;
  /** Доля верных ответов, 0–1. null — данных пока нет. */
  accuracy: number | null;
}

export type RecommendationKind = 'review' | 'cards' | 'continue' | 'start' | 'tasks';

export interface Recommendation {
  kind: RecommendationKind;
  title: string;
  reason: string;
  href: string;
  actionLabel: string;
}

export interface TodayQueue {
  dueCards: number;
  unansweredQuestions: number;
  unsolvedTasks: number;
}

export interface Dashboard {
  overall: OverallProgress;
  stages: StageProgress[];
  streak: StreakInfo;
  weakTopics: WeakTopic[];
  recommendations: Recommendation[];
  today: TodayQueue;
}
