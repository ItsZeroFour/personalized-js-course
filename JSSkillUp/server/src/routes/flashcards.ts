import type { FastifyInstance } from 'fastify';
import { reviewCardSchema } from '@jsskillup/shared';
import type { CardQueueResponse, ReviewCardResponse, TopicCardsResponse } from '@jsskillup/shared';
import { getTopicBySlug } from '../db/repos/roadmap.js';
import {
  getCardById,
  getCardsByTopic,
  getDueCards,
  getQueueByTopic,
  getQueueCounts,
  saveState,
} from '../db/repos/flashcards.js';
import { recordActivity } from '../db/repos/progress.js';
import { applyReview } from '../services/srs.js';
import { recomputeTopicProgress } from '../services/progress.js';
import { badRequest, notFound } from '../errors.js';

const DEFAULT_QUEUE_LIMIT = 30;
const MAX_QUEUE_LIMIT = 100;

export function registerFlashcardRoutes(app: FastifyInstance): void {
  app.get<{ Querystring: { limit?: string; topic?: string } }>(
    '/api/cards/queue',
    (request): CardQueueResponse => {
      const rawLimit = request.query.limit;
      const limit = rawLimit === undefined ? DEFAULT_QUEUE_LIMIT : Number.parseInt(rawLimit, 10);
      if (!Number.isInteger(limit) || limit < 1 || limit > MAX_QUEUE_LIMIT) {
        throw badRequest(`limit должен быть целым от 1 до ${MAX_QUEUE_LIMIT}`);
      }

      let topicId: string | undefined;
      if (request.query.topic) {
        const topic = getTopicBySlug(request.query.topic);
        if (!topic) throw notFound(`Тема "${request.query.topic}" не найдена`);
        topicId = topic.id;
      }

      const counts = getQueueCounts();
      return {
        due: getDueCards(limit, topicId),
        dueCount: counts.dueCount,
        newCount: counts.newCount,
        tomorrowCount: counts.tomorrowCount,
        byTopic: getQueueByTopic(),
      };
    },
  );

  app.post<{ Params: { id: string } }>('/api/cards/:id/review', (request): ReviewCardResponse => {
    const parsed = reviewCardSchema.safeParse(request.body);
    if (!parsed.success) throw badRequest('Ожидается { grade: 0..5 }', parsed.error.issues);

    const card = getCardById(request.params.id);
    if (!card) throw notFound(`Карточка "${request.params.id}" не найдена`);

    const next = applyReview(card.state, parsed.data.grade);
    saveState(next, parsed.data.grade);
    recordActivity('cards');

    return {
      state: next,
      remaining: getQueueCounts().dueCount,
      topicPercent: recomputeTopicProgress(card.topicId),
    };
  });

  app.get<{ Params: { slug: string } }>('/api/topics/:slug/cards', (request): TopicCardsResponse => {
    const topic = getTopicBySlug(request.params.slug);
    if (!topic) throw notFound(`Тема "${request.params.slug}" не найдена`);
    return { cards: getCardsByTopic(topic.id) };
  });
}
