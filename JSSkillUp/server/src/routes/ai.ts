import type { FastifyInstance } from 'fastify';
import { generateQuestionsSchema, generateTaskSchema } from '@jsskillup/shared';
import type {
  AiGradeResponse,
  AiReviewResponse,
  AiStatusResponse,
  GenerateQuestionsResponse,
  GenerateTaskResponse,
} from '@jsskillup/shared';
import { env } from '../env.js';
import { assertConfigured } from '../services/groq.js';
import {
  generateQuestions,
  generateTask,
  gradeOpenAnswer,
  reviewTaskAttempt,
} from '../services/aiContent.js';
import { badRequest } from '../errors.js';

function parseId(raw: string, what: string): number {
  const id = Number.parseInt(raw, 10);
  if (!Number.isInteger(id) || id < 1) throw badRequest(`Некорректный ${what}`);
  return id;
}

export function registerAiRoutes(app: FastifyInstance): void {
  app.get('/api/ai/status', (): AiStatusResponse => ({
    configured: env.groq.configured,
    model: env.groq.configured ? env.groq.model : null,
  }));

  app.post<{ Params: { id: string } }>(
    '/api/attempts/:id/ai-grade',
    async (request): Promise<AiGradeResponse> => {
      assertConfigured();
      return gradeOpenAnswer(parseId(request.params.id, 'id попытки'));
    },
  );

  app.post<{ Params: { slug: string; attemptId: string } }>(
    '/api/tasks/:slug/attempts/:attemptId/review',
    async (request): Promise<AiReviewResponse> => {
      assertConfigured();
      return reviewTaskAttempt(request.params.slug, parseId(request.params.attemptId, 'id попытки'));
    },
  );

  app.post('/api/ai/questions', async (request): Promise<GenerateQuestionsResponse> => {
    assertConfigured();

    const parsed = generateQuestionsSchema.safeParse(request.body);
    if (!parsed.success) throw badRequest('Некорректные параметры генерации', parsed.error.issues);

    return generateQuestions({
      topicSlug: parsed.data.topic,
      count: parsed.data.count,
      ...(parsed.data.difficulty ? { difficulty: parsed.data.difficulty } : {}),
      ...(parsed.data.kind ? { kind: parsed.data.kind } : {}),
    });
  });

  app.post('/api/ai/tasks', async (request): Promise<GenerateTaskResponse> => {
    assertConfigured();

    const parsed = generateTaskSchema.safeParse(request.body);
    if (!parsed.success) throw badRequest('Некорректные параметры генерации', parsed.error.issues);

    if (parsed.data.similarTo === undefined && parsed.data.topic === undefined) {
      throw badRequest('Нужно указать similarTo или topic');
    }

    return generateTask({
      ...(parsed.data.similarTo ? { similarTo: parsed.data.similarTo } : {}),
      ...(parsed.data.topic ? { topicSlug: parsed.data.topic } : {}),
      ...(parsed.data.difficulty ? { difficulty: parsed.data.difficulty } : {}),
    });
  });
}
