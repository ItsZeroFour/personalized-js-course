import type {
  ApiErrorBody,
  ApiErrorCode,
  AiGradeResponse,
  AiReviewResponse,
  AiStatusResponse,
  CardQueueResponse,
  CheckAnswerRequest,
  CheckAnswerResponse,
  DashboardResponse,
  GenerateQuestionsRequest,
  GenerateQuestionsResponse,
  GenerateTaskRequest,
  GenerateTaskResponse,
  HealthResponse,
  HintResponse,
  InterviewAnswerRequest,
  InterviewResponse,
  InterviewsResponse,
  MarkReadResponse,
  QuestionsResponse,
  ReviewCardRequest,
  ReviewCardResponse,
  RoadmapResponse,
  SelfGradeResponse,
  SolutionResponse,
  StartInterviewRequest,
  SubmitAttemptRequest,
  SubmitAttemptResponse,
  TaskResponse,
  TasksResponse,
  TheoryResponse,
  TopicCardsResponse,
  TopicResponse,
  UpdateProgressRequest,
  UpdateProgressResponse,
} from '@jsskillup/shared';

/** Ошибка бэкенда, разобранная в понятный объект. Именно её ловят компоненты. */
export class ApiRequestError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly retryAfterSec: number | null;
  readonly details: unknown;

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    retryAfterSec: number | null,
    details: unknown,
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
    this.retryAfterSec = retryAfterSec;
    this.details = details;
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const { error } = value as { error: unknown };
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      // Content-Type только при наличии тела: Fastify отвергает пустой JSON-body с 400,
      // а POST без тела здесь обычное дело (ai-grade, review).
      headers: {
        ...(init?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
  } catch (cause) {
    throw new ApiRequestError(
      'INTERNAL',
      'Бэкенд недоступен. Запущен ли он на порту 3001?',
      0,
      null,
      cause,
    );
  }

  const payload: unknown = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    if (isApiErrorBody(payload)) {
      throw new ApiRequestError(
        payload.error.code,
        payload.error.message,
        response.status,
        payload.error.retryAfterSec ?? null,
        payload.error.details,
      );
    }
    throw new ApiRequestError('INTERNAL', `HTTP ${response.status}`, response.status, null, payload);
  }

  return payload as T;
}

const path = (...parts: string[]): string => parts.map(encodeURIComponent).join('/');

export const api = {
  health: (): Promise<HealthResponse> => request('/api/health'),
  roadmap: (): Promise<RoadmapResponse> => request('/api/roadmap'),
  dashboard: (): Promise<DashboardResponse> => request('/api/dashboard'),

  topic: (slug: string): Promise<TopicResponse> => request(`/api/topics/${path(slug)}`),
  updateProgress: (
    topicId: string,
    body: UpdateProgressRequest,
  ): Promise<UpdateProgressResponse> =>
    request(`/api/topics/${path(topicId)}/progress`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  theory: (slug: string): Promise<TheoryResponse> => request(`/api/topics/${path(slug)}/theory`),
  markRead: (articleId: string, read: boolean): Promise<MarkReadResponse> =>
    request(`/api/theory/${path(articleId)}/read`, {
      method: 'POST',
      body: JSON.stringify({ read }),
    }),

  questions: (slug: string): Promise<QuestionsResponse> =>
    request(`/api/topics/${path(slug)}/questions`),
  checkAnswer: (questionId: string, answer: CheckAnswerRequest): Promise<CheckAnswerResponse> =>
    request(`/api/questions/${path(questionId)}/check`, {
      method: 'POST',
      body: JSON.stringify(answer),
    }),
  selfGrade: (attemptId: number, score: number): Promise<SelfGradeResponse> =>
    request(`/api/attempts/${attemptId}/self-grade`, {
      method: 'POST',
      body: JSON.stringify({ score }),
    }),

  cardQueue: (limit = '30'): Promise<CardQueueResponse> =>
    request(`/api/cards/queue?limit=${encodeURIComponent(limit)}`),
  topicCards: (slug: string): Promise<TopicCardsResponse> =>
    request(`/api/topics/${path(slug)}/cards`),
  reviewCard: (cardId: string, body: ReviewCardRequest): Promise<ReviewCardResponse> =>
    request(`/api/cards/${path(cardId)}/review`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  tasks: (query: string): Promise<TasksResponse> =>
    request(query ? `/api/tasks?${query}` : '/api/tasks'),
  task: (slug: string): Promise<TaskResponse> => request(`/api/tasks/${path(slug)}`),
  taskHint: (slug: string, level: number): Promise<HintResponse> =>
    request(`/api/tasks/${path(slug)}/hints/${level}`),
  taskSolution: (slug: string): Promise<SolutionResponse> =>
    request(`/api/tasks/${path(slug)}/solution`),
  submitAttempt: (slug: string, body: SubmitAttemptRequest): Promise<SubmitAttemptResponse> =>
    request(`/api/tasks/${path(slug)}/attempts`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  aiStatus: (): Promise<AiStatusResponse> => request('/api/ai/status'),
  aiGrade: (attemptId: number): Promise<AiGradeResponse> =>
    request(`/api/attempts/${attemptId}/ai-grade`, { method: 'POST' }),
  aiReview: (slug: string, attemptId: number): Promise<AiReviewResponse> =>
    request(`/api/tasks/${path(slug)}/attempts/${attemptId}/review`, { method: 'POST' }),
  aiGenerateQuestions: (body: GenerateQuestionsRequest): Promise<GenerateQuestionsResponse> =>
    request('/api/ai/questions', { method: 'POST', body: JSON.stringify(body) }),
  aiGenerateTask: (body: GenerateTaskRequest): Promise<GenerateTaskResponse> =>
    request('/api/ai/tasks', { method: 'POST', body: JSON.stringify(body) }),

  interviews: (): Promise<InterviewsResponse> => request('/api/interviews'),
  interview: (id: string): Promise<InterviewResponse> => request(`/api/interviews/${path(id)}`),
  startInterview: (body: StartInterviewRequest): Promise<InterviewResponse> =>
    request('/api/interviews', { method: 'POST', body: JSON.stringify(body) }),
  answerInterview: (id: string, body: InterviewAnswerRequest): Promise<InterviewResponse> =>
    request(`/api/interviews/${path(id)}/answer`, { method: 'POST', body: JSON.stringify(body) }),
  finishInterview: (id: string): Promise<InterviewResponse> =>
    request(`/api/interviews/${path(id)}/finish`, { method: 'POST' }),
  abortInterview: (id: string): Promise<InterviewResponse> =>
    request(`/api/interviews/${path(id)}/abort`, { method: 'POST' }),
  deleteInterview: (id: string): Promise<null> =>
    request(`/api/interviews/${path(id)}`, { method: 'DELETE' }),
};
