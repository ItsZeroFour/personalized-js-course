import { randomUUID } from 'node:crypto';
import { interviewReportAiSchema, interviewerMoveSchema } from '@jsskillup/shared';
import type {
  InterviewFormat,
  InterviewReport,
  InterviewSessionWithTurns,
  InterviewTurn,
  InterviewerMove,
  ReviewTopicRef,
  TopicWithProgress,
} from '@jsskillup/shared';
import {
  appendTurns,
  closeSession,
  createSession,
  getSession,
  type NewTurn,
} from '../db/repos/interviews.js';
import { getRoadmap } from '../db/repos/roadmap.js';
import { markTopicsForReview, recordActivity } from '../db/repos/progress.js';
import { transaction } from '../db/client.js';
import { badRequest, notFound } from '../errors.js';
import { logGeneration } from './aiContent.js';
import { buildWeakTopics } from './dashboard.js';
import { assertConfigured, completeJson } from './groq.js';
import {
  interviewNextMovePrompt,
  interviewOpeningPrompt,
  interviewReportPrompt,
  type InterviewPromptContext,
} from './interviewPrompts.js';

/** Из каких этапов роадмапа интервьюер берёт темы для каждого формата. */
const FORMAT_STAGES: Record<InterviewFormat, readonly string[]> = {
  js_theory: ['js-core'],
  react_theory: ['react', 'state'],
  live_coding: ['algorithms', 'js-core'],
  mixed_tech: ['js-core', 'typescript', 'react', 'state', 'browser', 'testing', 'architecture'],
  behavioral: ['behavioral'],
};

/** Темы с оценкой ниже порога попадают в «повторить», даже если модель их не назвала. */
const REVIEW_SCORE_THRESHOLD = 6;

const MOVE_OPTIONS = { temperature: 0.7, maxTokens: 1500 } as const;

interface TopicIndex {
  /** Темы формата — из них интервьюер выбирает вопросы. */
  formatTopics: TopicWithProgress[];
  bySlug: Map<string, TopicWithProgress>;
  byId: Map<string, TopicWithProgress>;
}

function indexTopics(format: InterviewFormat): TopicIndex {
  const stages = getRoadmap();
  const all = stages.flatMap((stage) => stage.topics);
  const allowed = new Set(FORMAT_STAGES[format]);

  return {
    formatTopics: stages.filter((stage) => allowed.has(stage.id)).flatMap((stage) => stage.topics),
    bySlug: new Map(all.map((topic) => [topic.slug, topic])),
    byId: new Map(all.map((topic) => [topic.id, topic])),
  };
}

function elapsedMinutes(startedAt: string, now = Date.now()): number {
  return Math.max(0, Math.round((now - Date.parse(startedAt)) / 60_000));
}

function buildContext(
  format: InterviewFormat,
  plannedMinutes: number,
  startedAt: string,
  turns: readonly InterviewTurn[],
  topics: TopicIndex,
): InterviewPromptContext {
  const formatSlugs = new Set(topics.formatTopics.map((topic) => topic.slug));

  return {
    format,
    plannedMinutes,
    elapsedMinutes: elapsedMinutes(startedAt),
    topics: topics.formatTopics.map((topic) => ({ slug: topic.slug, title: topic.title })),
    weakTopics: buildWeakTopics()
      .filter((topic) => formatSlugs.has(topic.slug))
      .map((topic) => ({ slug: topic.slug, title: topic.title })),
    turns,
    topicTitle: (topicId) => (topicId === null ? null : (topics.byId.get(topicId)?.title ?? null)),
  };
}

/**
 * Нормализует ход модели: задача без условия превращается в обычный вопрос,
 * неизвестный slug темы — в null. Доверять модели в этих мелочах нельзя.
 */
function toInterviewerTurn(move: InterviewerMove, topics: TopicIndex): NewTurn {
  const codingTask = move.kind === 'coding_task' ? move.codingTask : null;
  const kind = move.kind === 'coding_task' && codingTask === null ? 'question' : move.kind;

  return {
    role: 'interviewer',
    content: move.message,
    topicId: move.topicSlug ? (topics.bySlug.get(move.topicSlug)?.id ?? null) : null,
    kind,
    meta: { codingTask, assessment: null },
  };
}

/** Во время интервью скрытые оценки ответов не отдаются на фронт. */
export function toPublicSession(session: InterviewSessionWithTurns): InterviewSessionWithTurns {
  if (session.status !== 'active') return session;
  return { ...session, turns: session.turns.map((turn) => ({ ...turn, assessment: null })) };
}

function requireSession(id: string): InterviewSessionWithTurns {
  const session = getSession(id);
  if (!session) throw notFound('Интервью не найдено');
  return session;
}

function requireActive(id: string): InterviewSessionWithTurns {
  const session = requireSession(id);
  if (session.status !== 'active') throw badRequest('Интервью уже завершено');
  return session;
}

export async function startInterview(
  format: InterviewFormat,
  plannedMinutes: number,
): Promise<InterviewSessionWithTurns> {
  assertConfigured();

  const topics = indexTopics(format);
  const startedAt = new Date().toISOString();
  const context = buildContext(format, plannedMinutes, startedAt, [], topics);

  const move = await completeJson(interviewOpeningPrompt(context), interviewerMoveSchema, MOVE_OPTIONS);

  const id = randomUUID();
  createSession({
    id,
    format,
    plannedMinutes,
    // Время интервью отсчитывается с момента, когда кандидат увидел первый вопрос.
    startedAt: new Date().toISOString(),
    firstTurn: toInterviewerTurn({ ...move, assessment: null }, topics),
  });
  logGeneration('interview_move', null, 'ok');

  return toPublicSession(requireSession(id));
}

export async function answerInterview(
  id: string,
  answer: { content: string; code: string | null },
): Promise<InterviewSessionWithTurns> {
  assertConfigured();
  const session = requireActive(id);

  const lastInterviewerTurn = session.turns.findLast((turn) => turn.role === 'interviewer');
  if (session.turns.at(-1)?.role === 'candidate') {
    throw badRequest('Интервьюер ещё не ответил на предыдущую реплику');
  }
  if (lastInterviewerTurn?.kind === 'wrap_up') {
    throw badRequest('Интервьюер уже завершил интервью — осталось получить отчёт');
  }

  const topics = indexTopics(session.format);
  const code = answer.code?.trim() ? answer.code : null;

  // Ответ кандидата пока только в памяти: если Groq упадёт, в базе не останется
  // «висящего» ответа без реакции интервьюера, а фронт просто повторит запрос.
  const candidateTurn: InterviewTurn = {
    id: -1,
    sessionId: id,
    role: 'candidate',
    content: answer.content,
    code,
    topicId: lastInterviewerTurn?.topicId ?? null,
    kind: null,
    codingTask: null,
    assessment: null,
    createdAt: new Date().toISOString(),
  };

  const context = buildContext(
    session.format,
    session.plannedMinutes,
    session.startedAt,
    [...session.turns, candidateTurn],
    topics,
  );
  const move = await completeJson(interviewNextMovePrompt(context), interviewerMoveSchema, MOVE_OPTIONS);

  appendTurns(id, [
    {
      role: 'candidate',
      content: candidateTurn.content,
      code,
      topicId: candidateTurn.topicId,
      meta: { codingTask: null, assessment: move.assessment },
    },
    toInterviewerTurn(move, topics),
  ]);
  logGeneration('interview_move', candidateTurn.topicId, 'ok');

  return toPublicSession(requireSession(id));
}

function uniqueRefs(refs: readonly ReviewTopicRef[]): ReviewTopicRef[] {
  const byId = new Map<string, ReviewTopicRef>();
  for (const ref of refs) if (!byId.has(ref.topicId)) byId.set(ref.topicId, ref);
  return [...byId.values()];
}

export async function finishInterview(id: string): Promise<InterviewSessionWithTurns> {
  const session = requireSession(id);
  if (session.status !== 'active') return session;

  if (session.answerCount === 0) {
    // Отчёт по пустому интервью бессмыслен — просто закрываем его.
    closeSession(id, 'aborted', null);
    return requireSession(id);
  }

  assertConfigured();
  const topics = indexTopics(session.format);
  const context = buildContext(
    session.format,
    session.plannedMinutes,
    session.startedAt,
    session.turns,
    topics,
  );

  const ai = await completeJson(interviewReportPrompt(context), interviewReportAiSchema, {
    temperature: 0.3,
    maxTokens: 3000,
  });

  const toRef = (slug: string | null): ReviewTopicRef | null => {
    const topic = slug ? topics.bySlug.get(slug) : undefined;
    return topic ? { topicId: topic.id, slug: topic.slug, title: topic.title } : null;
  };

  const topicsToReview = uniqueRefs(
    [
      ...ai.topicsToReview.map(toRef),
      ...ai.topicScores.filter((item) => item.score < REVIEW_SCORE_THRESHOLD).map((item) => toRef(item.topicSlug)),
    ].filter((ref): ref is ReviewTopicRef => ref !== null),
  );

  const durationMinutes = Math.max(1, elapsedMinutes(session.startedAt));
  const report: InterviewReport = {
    overallScore: ai.overallScore,
    verdict: ai.verdict,
    strengths: ai.strengths,
    weaknesses: ai.weaknesses,
    topicScores: ai.topicScores.map((item) => ({
      topicId: toRef(item.topicSlug)?.topicId ?? null,
      slug: toRef(item.topicSlug)?.slug ?? null,
      topicTitle: item.topicTitle,
      score: item.score,
      comment: item.comment,
    })),
    topicsToReview,
    advice: ai.advice,
    durationMinutes,
    answers: session.answerCount,
  };

  transaction(() => {
    closeSession(id, 'finished', report);
    markTopicsForReview(topicsToReview.map((ref) => ref.topicId));
    // Ответы на интервью засчитываются в дневную активность и streak.
    recordActivity('questions', session.answerCount, durationMinutes);
  });
  logGeneration('interview_report', null, 'ok');

  return requireSession(id);
}

export function abortInterview(id: string): InterviewSessionWithTurns {
  const session = requireSession(id);
  if (session.status === 'active') closeSession(id, 'aborted', null);
  return requireSession(id);
}

export function getInterview(id: string): InterviewSessionWithTurns {
  return toPublicSession(requireSession(id));
}
