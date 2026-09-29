import type { FastifyInstance } from 'fastify';
import { interviewAnswerSchema, startInterviewSchema } from '@jsskillup/shared';
import type { InterviewResponse, InterviewsResponse } from '@jsskillup/shared';
import { deleteSession, listSessions } from '../db/repos/interviews.js';
import {
  abortInterview,
  answerInterview,
  finishInterview,
  getInterview,
  startInterview,
} from '../services/interview.js';
import { badRequest, notFound } from '../errors.js';

type IdParams = { Params: { id: string } };

export function registerInterviewRoutes(app: FastifyInstance): void {
  app.get('/api/interviews', (): InterviewsResponse => ({ sessions: listSessions() }));

  app.get<IdParams>('/api/interviews/:id', (request): InterviewResponse => ({
    session: getInterview(request.params.id),
  }));

  app.post('/api/interviews', async (request): Promise<InterviewResponse> => {
    const parsed = startInterviewSchema.safeParse(request.body);
    if (!parsed.success) throw badRequest('Некорректные параметры интервью', parsed.error.issues);

    return { session: await startInterview(parsed.data.format, parsed.data.plannedMinutes) };
  });

  app.post<IdParams>('/api/interviews/:id/answer', async (request): Promise<InterviewResponse> => {
    const parsed = interviewAnswerSchema.safeParse(request.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message ?? 'Некорректный ответ', parsed.error.issues);
    }

    return { session: await answerInterview(request.params.id, parsed.data) };
  });

  app.post<IdParams>('/api/interviews/:id/finish', async (request): Promise<InterviewResponse> => ({
    session: await finishInterview(request.params.id),
  }));

  app.post<IdParams>('/api/interviews/:id/abort', (request): InterviewResponse => ({
    session: abortInterview(request.params.id),
  }));

  app.delete<IdParams>('/api/interviews/:id', async (request, reply) => {
    if (!deleteSession(request.params.id)) throw notFound('Интервью не найдено');
    return reply.status(204).send();
  });
}
