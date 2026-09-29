import type {
  Dashboard,
  OverallProgress,
  Recommendation,
  StageProgress,
  StreakInfo,
  TopicWithProgress,
  WeakTopic,
} from '@jsskillup/shared';
import { getRoadmap } from '../db/repos/roadmap.js';
import { getActivity, getTodayCounts, getTopicAccuracy } from '../db/repos/stats.js';
import { addDays, today } from './date.js';

const HEATMAP_DAYS = 84;
const WEAK_ACCURACY_THRESHOLD = 0.6;
const WEAK_MIN_ATTEMPTS = 3;

function buildStreak(): StreakInfo {
  const activity = getActivity(365);
  const scoreByDay = new Map(
    activity.map((day) => [day.day, day.questions + day.tasks + day.cards]),
  );
  const activeDays = new Set(
    activity.filter((day) => day.questions + day.tasks + day.cards > 0).map((day) => day.day),
  );

  const currentDay = today();
  const activeToday = activeDays.has(currentDay);

  // Серия не рвётся, если сегодня ещё не занимались, — считаем от вчера.
  let cursor = activeToday ? currentDay : addDays(currentDay, -1);
  let current = 0;
  while (activeDays.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  let longest = 0;
  let run = 0;
  const sortedDays = [...activeDays].sort();
  let previous: string | null = null;
  for (const day of sortedDays) {
    run = previous !== null && addDays(previous, 1) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }

  const history: StreakInfo['history'] = [];
  for (let offset = HEATMAP_DAYS - 1; offset >= 0; offset -= 1) {
    const day = addDays(currentDay, -offset);
    history.push({ day, score: scoreByDay.get(day) ?? 0 });
  }

  return { current, longest, activeToday, history };
}

function buildOverall(topics: TopicWithProgress[]): OverallProgress {
  const percent =
    topics.length === 0
      ? 0
      : Math.round(topics.reduce((acc, topic) => acc + topic.percent, 0) / topics.length);
  return {
    percent,
    topicsTotal: topics.length,
    topicsLearned: topics.filter((topic) => topic.progress.status === 'learned').length,
    topicsInProgress: topics.filter((topic) => topic.progress.status === 'in_progress').length,
    topicsToReview: topics.filter((topic) => topic.progress.status === 'review').length,
  };
}

export function buildWeakTopics(): WeakTopic[] {
  const rows = getTopicAccuracy();
  const weak: WeakTopic[] = [];

  for (const row of rows) {
    const lowAccuracy =
      row.accuracy !== null &&
      row.attempts >= WEAK_MIN_ATTEMPTS &&
      row.accuracy < WEAK_ACCURACY_THRESHOLD;

    if (!lowAccuracy && row.status !== 'review') continue;

    weak.push({
      topicId: row.topicId,
      slug: row.slug,
      title: row.title,
      stageTitle: row.stageTitle,
      accuracy: row.accuracy,
      reason: lowAccuracy
        ? `Верных ответов ${Math.round((row.accuracy ?? 0) * 100)}% из ${row.attempts} попыток`
        : 'Помечена как «повторить»',
    });
  }

  return weak
    .sort((a, b) => (a.accuracy ?? 1) - (b.accuracy ?? 1))
    .slice(0, 6);
}

function buildRecommendations(
  topics: TopicWithProgress[],
  weakTopics: WeakTopic[],
  dueCards: number,
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (dueCards > 0) {
    recommendations.push({
      kind: 'cards',
      title: `Повторить ${dueCards} карточек`,
      reason: 'Интервальное повторение работает, только если не копить долги',
      href: '/cards',
      actionLabel: 'Начать повторение',
    });
  }

  const [weakest] = weakTopics;
  if (weakest) {
    recommendations.push({
      kind: 'review',
      title: `Подтянуть: ${weakest.title}`,
      reason: weakest.reason,
      href: `/topic/${weakest.slug}`,
      actionLabel: 'Открыть тему',
    });
  }

  const inProgress = topics
    .filter((topic) => topic.progress.status === 'in_progress')
    .sort((a, b) => a.percent - b.percent)[0];
  if (inProgress) {
    recommendations.push({
      kind: 'continue',
      title: `Продолжить: ${inProgress.title}`,
      reason: `Тема начата и пройдена на ${inProgress.percent}%`,
      href: `/topic/${inProgress.slug}`,
      actionLabel: 'Продолжить',
    });
  }

  if (recommendations.length < 3) {
    const next = topics.find((topic) => topic.progress.status === 'not_started');
    if (next) {
      recommendations.push({
        kind: 'start',
        title: `Начать: ${next.title}`,
        reason: 'Следующая тема по порядку роадмапа',
        href: `/topic/${next.slug}`,
        actionLabel: 'Начать',
      });
    }
  }

  return recommendations.slice(0, 3);
}

export function buildDashboard(): Dashboard {
  const stages = getRoadmap();
  const topics = stages.flatMap((stage) => stage.topics);
  const todayCounts = getTodayCounts();
  const weakTopics = buildWeakTopics();

  const stageProgress: StageProgress[] = stages.map((stage) => ({
    id: stage.id,
    title: stage.title,
    icon: stage.icon,
    percent: stage.percent,
    topicsTotal: stage.topics.length,
    topicsLearned: stage.topics.filter((topic) => topic.progress.status === 'learned').length,
  }));

  return {
    overall: buildOverall(topics),
    stages: stageProgress,
    streak: buildStreak(),
    weakTopics,
    recommendations: buildRecommendations(topics, weakTopics, todayCounts.dueCards),
    today: todayCounts,
  };
}
