import Fastify from 'fastify';
import cors from '@fastify/cors';
import type { ApiErrorBody } from '@jsskillup/shared';
import { env } from './env.js';
import { runMigrations } from './db/migrate.js';
import { runSeed } from './seed/index.js';
import { ApiError } from './errors.js';
import { registerRoadmapRoutes } from './routes/roadmap.js';
import { registerDashboardRoutes } from './routes/dashboard.js';
import { registerTheoryRoutes } from './routes/theory.js';
import { registerQuestionRoutes } from './routes/questions.js';
import { registerFlashcardRoutes } from './routes/flashcards.js';
import { registerTaskRoutes } from './routes/tasks.js';
import { registerAiRoutes } from './routes/ai.js';
import { registerInterviewRoutes } from './routes/interviews.js';
import { registerHealthRoutes } from './routes/health.js';

const app = Fastify({
  logger: {
    level: 'info',
    transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
  },
});

await app.register(cors, {
  origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
});

app.setErrorHandler((error, request, reply) => {
  if (error instanceof ApiError) {
    const body: ApiErrorBody = {
      error: {
        code: error.code,
        message: error.message,
        ...(error.retryAfterSec !== undefined ? { retryAfterSec: error.retryAfterSec } : {}),
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
    };
    void reply.status(error.statusCode).send(body);
    return;
  }

  // Ошибки самого Fastify с 4xx (битый JSON, неверный Content-Length) — это ошибка клиента,
  // а не сервера: отдаём 400, а не «внутреннюю ошибку».
  const statusCode =
    typeof error === 'object' && error !== null && 'statusCode' in error ? error.statusCode : null;
  if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
    const body: ApiErrorBody = {
      error: { code: 'BAD_REQUEST', message: 'Некорректный запрос: тело не удалось разобрать' },
    };
    void reply.status(statusCode).send(body);
    return;
  }

  request.log.error({ err: error }, 'Необработанная ошибка');
  const body: ApiErrorBody = {
    error: { code: 'INTERNAL', message: 'Внутренняя ошибка сервера' },
  };
  void reply.status(500).send(body);
});

app.setNotFoundHandler((request, reply) => {
  const body: ApiErrorBody = {
    error: { code: 'NOT_FOUND', message: `Маршрут ${request.method} ${request.url} не найден` },
  };
  void reply.status(404).send(body);
});

registerHealthRoutes(app);
registerRoadmapRoutes(app);
registerDashboardRoutes(app);
registerTheoryRoutes(app);
registerQuestionRoutes(app);
registerFlashcardRoutes(app);
registerTaskRoutes(app);
registerAiRoutes(app);
registerInterviewRoutes(app);

// Схема и базовый контент приводятся в актуальное состояние при каждом старте.
const migrations = runMigrations();
if (migrations.applied.length > 0) {
  app.log.info(`Применены миграции: ${migrations.applied.join(', ')}`);
}
const seedStats = runSeed();
app.log.info(
  `Seed: этапов ${seedStats.stages}, тем ${seedStats.topics}, подтем ${seedStats.subtopics}, ` +
    `статей теории ${seedStats.theory}, вопросов ${seedStats.questions}, ` +
    `карточек ${seedStats.flashcards}, задач ${seedStats.tasks}`,
);

if (!env.groq.configured) {
  app.log.warn('GROQ_API_KEY не задан — AI-функции будут отключены. См. README.');
}

await app.listen({ port: env.port, host: '127.0.0.1' });
