import type { FastifyInstance } from 'fastify';
import { updateProgressSchema } from '@jsskillup/shared';
import type { RoadmapResponse, TopicResponse, UpdateProgressResponse } from '@jsskillup/shared';
import { getRoadmap, getTopicById, getTopicBySlug, getTopicNeighbours } from '../db/repos/roadmap.js';
import { updateTopicProgress } from '../db/repos/progress.js';
import { badRequest, notFound } from '../errors.js';

export function registerRoadmapRoutes(app: FastifyInstance): void {
  app.get('/api/roadmap', (): RoadmapResponse => ({ stages: getRoadmap() }));

  app.get<{ Params: { slug: string } }>('/api/topics/:slug', (request): TopicResponse => {
    const topic = getTopicBySlug(request.params.slug);
    if (!topic) throw notFound(`Тема "${request.params.slug}" не найдена`);

    const neighbours = getTopicNeighbours(topic.slug);
    if (!neighbours) throw notFound(`Тема "${request.params.slug}" не найдена`);

    return { topic, stage: neighbours.stage, prev: neighbours.prev, next: neighbours.next };
  });

  app.patch<{ Params: { id: string } }>(
    '/api/topics/:id/progress',
    (request): UpdateProgressResponse => {
      const parsed = updateProgressSchema.safeParse(request.body);
      if (!parsed.success) {
        throw badRequest('Некорректное тело запроса', parsed.error.issues);
      }

      const { id } = request.params;
      if (!getTopicById(id)) throw notFound(`Тема "${id}" не найдена`);

      updateTopicProgress(id, parsed.data);
      const topic = getTopicById(id);
      if (!topic) throw notFound(`Тема "${id}" не найдена`);
      return { topic };
    },
  );
}
