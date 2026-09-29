import type { FastifyInstance } from 'fastify';
import { DIFFICULTIES, submitAttemptSchema, TASK_KINDS } from '@jsskillup/shared';
import type {
  Difficulty,
  HintResponse,
  SolutionResponse,
  SubmitAttemptResponse,
  TaskFilterStatus,
  TaskKind,
  TaskResponse,
  TasksResponse,
} from '@jsskillup/shared';
import {
  getAttempts,
  getFacets,
  getHint,
  getSolution,
  getTaskBySlug,
  isSolved,
  listTasks,
  saveAttempt,
} from '../db/repos/tasks.js';
import { getTopicById } from '../db/repos/roadmap.js';
import { recordActivity } from '../db/repos/progress.js';
import { recomputeTopicProgress } from '../services/progress.js';
import { badRequest, notFound } from '../errors.js';

const STATUSES: readonly TaskFilterStatus[] = ['all', 'solved', 'unsolved', 'attempted'];

function parseEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  field: string,
): T | undefined {
  if (value === undefined || value === '') return undefined;
  if (!(allowed as readonly string[]).includes(value)) {
    throw badRequest(`Некорректное значение ${field}: "${value}"`);
  }
  return value as T;
}

interface TaskQuery {
  kind?: string;
  difficulty?: string;
  topic?: string;
  status?: string;
  search?: string;
}

export function registerTaskRoutes(app: FastifyInstance): void {
  app.get<{ Querystring: TaskQuery }>('/api/tasks', (request): TasksResponse => {
    const { query } = request;

    const tasks = listTasks({
      kind: parseEnum<TaskKind>(query.kind, TASK_KINDS, 'kind'),
      difficulty: parseEnum<Difficulty>(query.difficulty, DIFFICULTIES, 'difficulty'),
      topic: query.topic || undefined,
      status: parseEnum<TaskFilterStatus>(query.status, STATUSES, 'status'),
      search: query.search || undefined,
    });

    return { tasks, facets: getFacets() };
  });

  app.get<{ Params: { slug: string } }>('/api/tasks/:slug', (request): TaskResponse => {
    const task = getTaskBySlug(request.params.slug);
    if (!task) throw notFound(`Задача "${request.params.slug}" не найдена`);

    const topic = task.topicId === null ? null : getTopicById(task.topicId);

    return {
      task,
      topic: topic === null ? null : { slug: topic.slug, title: topic.title },
      attempts: getAttempts(task.id),
    };
  });

  app.get<{ Params: { slug: string; level: string } }>(
    '/api/tasks/:slug/hints/:level',
    (request): HintResponse => {
      const task = getTaskBySlug(request.params.slug);
      if (!task) throw notFound(`Задача "${request.params.slug}" не найдена`);

      const level = Number.parseInt(request.params.level, 10);
      if (!Number.isInteger(level) || level < 1) throw badRequest('Уровень подсказки — целое от 1');

      const hint = getHint(task.id, level);
      if (!hint) throw notFound(`У задачи нет подсказки уровня ${level}`);

      return { hint };
    },
  );

  app.get<{ Params: { slug: string } }>('/api/tasks/:slug/solution', (request): SolutionResponse => {
    const solution = getSolution(request.params.slug);
    if (!solution) throw notFound(`Задача "${request.params.slug}" не найдена`);
    return solution;
  });

  app.post<{ Params: { slug: string } }>(
    '/api/tasks/:slug/attempts',
    (request): SubmitAttemptResponse => {
      const parsed = submitAttemptSchema.safeParse(request.body);
      if (!parsed.success) throw badRequest('Некорректное тело попытки', parsed.error.issues);

      const task = getTaskBySlug(request.params.slug);
      if (!task) throw notFound(`Задача "${request.params.slug}" не найдена`);

      const attempt = saveAttempt({
        taskId: task.id,
        code: parsed.data.code,
        passed: parsed.data.passed,
        total: parsed.data.total,
        results: parsed.data.results,
        durationMs: parsed.data.durationMs,
      });

      recordActivity('tasks');

      const topicPercent = task.topicId === null ? null : recomputeTopicProgress(task.topicId);

      return { attempt, topicPercent, solved: isSolved(task.id) };
    },
  );
}
