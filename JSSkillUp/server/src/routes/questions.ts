import type { FastifyInstance } from 'fastify';
import { questionAnswerSchema, selfGradeSchema } from '@jsskillup/shared';
import type { CheckAnswerResponse, QuestionsResponse, SelfGradeResponse } from '@jsskillup/shared';
import { getTopicBySlug } from '../db/repos/roadmap.js';
import {
  checkAnswer,
  getOutcomesByTopic,
  getQuestionById,
  getQuestionsByTopic,
  getQuizStats,
  saveAttempt,
  setSelfScore,
  toPublicQuestion,
} from '../db/repos/questions.js';
import { recordActivity } from '../db/repos/progress.js';
import { recomputeTopicProgress } from '../services/progress.js';
import { badRequest, notFound } from '../errors.js';

export function registerQuestionRoutes(app: FastifyInstance): void {
  app.get<{ Params: { slug: string } }>(
    '/api/topics/:slug/questions',
    (request): QuestionsResponse => {
      const topic = getTopicBySlug(request.params.slug);
      if (!topic) throw notFound(`Тема "${request.params.slug}" не найдена`);

      return {
        questions: getQuestionsByTopic(topic.id).map(toPublicQuestion),
        outcomes: getOutcomesByTopic(topic.id),
        stats: getQuizStats(topic.id),
      };
    },
  );

  app.post<{ Params: { id: string } }>('/api/questions/:id/check', (request): CheckAnswerResponse => {
    const parsed = questionAnswerSchema.safeParse(request.body);
    if (!parsed.success) throw badRequest('Некорректный ответ', parsed.error.issues);

    const question = getQuestionById(request.params.id);
    if (!question) throw notFound(`Вопрос "${request.params.id}" не найден`);

    if (parsed.data.kind !== question.kind) {
      throw badRequest(
        `Тип ответа "${parsed.data.kind}" не совпадает с типом вопроса "${question.kind}"`,
      );
    }

    const isCorrect = checkAnswer(question, parsed.data);
    const attemptId = saveAttempt(question.id, parsed.data, isCorrect);
    recordActivity('questions');
    const topicPercent = recomputeTopicProgress(question.topicId);

    return {
      attemptId,
      isCorrect,
      correctOptionIds: question.kind === 'open' ? [] : question.correctOptionIds,
      expectedOutput: question.kind === 'output' ? question.expectedOutput : null,
      explanationMd: question.explanationMd,
      grade: null,
      referenceAnswerMd: question.kind === 'open' ? question.referenceAnswerMd : null,
      rubric: question.kind === 'open' ? question.rubric : null,
      topicPercent,
    };
  });

  app.post<{ Params: { id: string } }>(
    '/api/attempts/:id/self-grade',
    (request): SelfGradeResponse => {
      const parsed = selfGradeSchema.safeParse(request.body);
      if (!parsed.success) throw badRequest('Ожидается { score: 0..10 }', parsed.error.issues);

      const attemptId = Number.parseInt(request.params.id, 10);
      if (!Number.isInteger(attemptId)) throw badRequest('Некорректный id попытки');

      const attempt = setSelfScore(attemptId, parsed.data.score);
      if (!attempt) throw notFound(`Попытка ${attemptId} не найдена`);

      const question = getQuestionById(attempt.questionId);
      if (!question) throw notFound(`Вопрос "${attempt.questionId}" не найден`);

      return { topicPercent: recomputeTopicProgress(question.topicId) };
    },
  );
}
