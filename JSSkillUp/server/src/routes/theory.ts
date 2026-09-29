import type { FastifyInstance } from 'fastify';
import { markReadSchema } from '@jsskillup/shared';
import type { MarkReadResponse, TheoryResponse } from '@jsskillup/shared';
import { getTopicBySlug } from '../db/repos/roadmap.js';
import { getArticleById, getTheoryByTopic, setArticleRead } from '../db/repos/theory.js';
import { recomputeTopicProgress } from '../services/progress.js';
import { badRequest, notFound } from '../errors.js';

export function registerTheoryRoutes(app: FastifyInstance): void {
  app.get<{ Params: { slug: string } }>('/api/topics/:slug/theory', (request): TheoryResponse => {
    const topic = getTopicBySlug(request.params.slug);
    if (!topic) throw notFound(`Тема "${request.params.slug}" не найдена`);
    return { articles: getTheoryByTopic(topic.id) };
  });

  app.post<{ Params: { id: string } }>('/api/theory/:id/read', (request): MarkReadResponse => {
    const parsed = markReadSchema.safeParse(request.body);
    if (!parsed.success) throw badRequest('Ожидается { read: boolean }', parsed.error.issues);

    const existing = getArticleById(request.params.id);
    if (!existing) throw notFound(`Статья "${request.params.id}" не найдена`);

    setArticleRead(existing.id, parsed.data.read);
    const topicPercent = recomputeTopicProgress(existing.topicId);

    const article = getArticleById(existing.id);
    if (!article) throw notFound(`Статья "${request.params.id}" не найдена`);

    return { article, topicPercent };
  });
}
