import type { ApiErrorCode } from '@jsskillup/shared';

/** Ошибка, которую бэкенд осознанно показывает пользователю. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly statusCode: number;
  readonly retryAfterSec?: number;
  readonly details?: unknown;

  constructor(
    code: ApiErrorCode,
    message: string,
    options: { statusCode?: number; retryAfterSec?: number; details?: unknown } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = options.statusCode ?? defaultStatus(code);
    if (options.retryAfterSec !== undefined) this.retryAfterSec = options.retryAfterSec;
    if (options.details !== undefined) this.details = options.details;
  }
}

function defaultStatus(code: ApiErrorCode): number {
  switch (code) {
    case 'BAD_REQUEST':
      return 400;
    case 'NOT_FOUND':
      return 404;
    case 'RATE_LIMIT':
      return 429;
    case 'AI_UNAVAILABLE':
      return 503;
    case 'AI_BAD_RESPONSE':
      return 502;
    case 'INTERNAL':
      return 500;
  }
}

export function notFound(message: string): ApiError {
  return new ApiError('NOT_FOUND', message);
}

export function badRequest(message: string, details?: unknown): ApiError {
  return new ApiError('BAD_REQUEST', message, { details });
}
