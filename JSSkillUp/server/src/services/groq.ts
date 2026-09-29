import { z } from 'zod';
import { env } from '../env.js';
import { ApiError } from '../errors.js';

/**
 * Клиент Groq (OpenAI-совместимый endpoint).
 *
 * Отвечает за три вещи, которых нет в «голом» fetch:
 * 1) понятную ошибку, когда ключ не задан;
 * 2) корректную обработку 429 бесплатного тарифа — ретраи с экспоненциальной
 *    задержкой и уважение к заголовку `retry-after`;
 * 3) разбор ответа модели строго по Zod-схеме, с одной попыткой «починки»:
 *    модели возвращается текст ошибки валидации.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 800;
/** Если сервер просит ждать дольше, ретраить бессмысленно — сообщаем пользователю. */
const MAX_WAIT_SEC = 30;
const REQUEST_TIMEOUT_MS = 90_000;

const completionSchema = z.object({
  choices: z
    .array(z.object({ message: z.object({ content: z.string().nullable() }) }))
    .min(1),
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfter(response: Response): number | null {
  const header = response.headers.get('retry-after');
  if (header === null) return null;

  const seconds = Number.parseFloat(header);
  return Number.isFinite(seconds) ? Math.ceil(seconds) : null;
}

export function assertConfigured(): void {
  if (!env.groq.configured) {
    throw new ApiError(
      'AI_UNAVAILABLE',
      'GROQ_API_KEY не задан. Добавьте ключ в .env и перезапустите сервер — см. README.',
    );
  }
}

export function isConfigured(): boolean {
  return env.groq.configured;
}

interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  /** Просить модель отвечать строго JSON-объектом. */
  json?: boolean;
}

async function callGroq(messages: ChatMessage[], options: CompletionOptions): Promise<string> {
  assertConfigured();

  let lastRateLimitSec: number | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      // Экспоненциальная задержка с джиттером: без него несколько запросов
      // после общего 429 пойдут снова одновременно.
      await sleep(BASE_DELAY_MS * 2 ** (attempt - 1) + Math.random() * 250);
    }

    let response: Response;
    try {
      response = await fetch(`${env.groq.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.groq.apiKey ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.groq.model,
          messages,
          temperature: options.temperature ?? 0.4,
          max_tokens: options.maxTokens ?? 4000,
          ...(options.json ? { response_format: { type: 'json_object' } } : {}),
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (cause) {
      const isTimeout = cause instanceof Error && cause.name === 'TimeoutError';
      if (attempt === MAX_ATTEMPTS - 1) {
        throw new ApiError(
          'AI_UNAVAILABLE',
          isTimeout
            ? 'Groq не ответил за 90 секунд. Попробуйте ещё раз или выберите модель полегче.'
            : 'Не удалось связаться с Groq. Проверьте интернет-соединение.',
          { details: String(cause) },
        );
      }
      continue;
    }

    if (response.status === 429) {
      const retryAfter = parseRetryAfter(response);
      lastRateLimitSec = retryAfter;

      if (retryAfter !== null && retryAfter > MAX_WAIT_SEC) {
        throw new ApiError(
          'RATE_LIMIT',
          `Лимит Groq исчерпан. Сервис просит подождать ${retryAfter} с.`,
          { retryAfterSec: retryAfter },
        );
      }
      if (retryAfter !== null) await sleep(retryAfter * 1000);
      continue;
    }

    if (response.status >= 500) {
      if (attempt === MAX_ATTEMPTS - 1) {
        throw new ApiError('AI_UNAVAILABLE', `Groq вернул ${response.status}. Попробуйте позже.`);
      }
      continue;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const message =
        response.status === 401
          ? 'Groq отклонил ключ (401). Проверьте GROQ_API_KEY в .env.'
          : response.status === 404
            ? `Модель "${env.groq.model}" недоступна: Groq её не знает или снял с обслуживания. ` +
              'Выберите актуальную на console.groq.com/docs/models и укажите в GROQ_MODEL в .env.'
            : `Groq вернул ошибку ${response.status}.`;
      throw new ApiError('AI_UNAVAILABLE', message, { details: text.slice(0, 500) });
    }

    const payload: unknown = await response.json().catch(() => null);
    const parsed = completionSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiError('AI_BAD_RESPONSE', 'Groq вернул ответ неожиданного формата.');
    }

    const content = parsed.data.choices[0]?.message.content;
    if (content === null || content === undefined || content.trim() === '') {
      throw new ApiError('AI_BAD_RESPONSE', 'Groq вернул пустой ответ.');
    }

    return content;
  }

  throw new ApiError(
    'RATE_LIMIT',
    'Лимит запросов Groq исчерпан. Подождите минуту и попробуйте снова.',
    lastRateLimitSec === null ? {} : { retryAfterSec: lastRateLimitSec },
  );
}

/** Свободный текстовый ответ — используется в mock interview. */
export function completeText(messages: ChatMessage[], options: CompletionOptions = {}): Promise<string> {
  return callGroq(messages, options);
}

/** Иногда модель оборачивает JSON в ```json-блок, несмотря на инструкции. */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) return trimmed;

  const withoutOpening = trimmed.replace(/^```(?:json)?\s*/i, '');
  const closingIndex = withoutOpening.lastIndexOf('```');
  return (closingIndex === -1 ? withoutOpening : withoutOpening.slice(0, closingIndex)).trim();
}

/**
 * Ответ строго по схеме. При провале валидации делается одна попытка починки:
 * модели показывают её же ответ и текст ошибки.
 */
export async function completeJson<T>(
  messages: ChatMessage[],
  schema: z.ZodType<T>,
  options: CompletionOptions = {},
): Promise<T> {
  const conversation = [...messages];

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const raw = await callGroq(conversation, { ...options, json: true });

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripCodeFence(raw));
    } catch {
      if (attempt === 0) {
        conversation.push(
          { role: 'assistant', content: raw },
          {
            role: 'user',
            content: 'Это не валидный JSON. Верни только JSON-объект, без пояснений и markdown.',
          },
        );
        continue;
      }
      throw new ApiError('AI_BAD_RESPONSE', 'Модель вернула не JSON.', { details: raw.slice(0, 500) });
    }

    const result = schema.safeParse(parsed);
    if (result.success) return result.data;

    const issues = result.error.issues
      .slice(0, 6)
      .map((issue) => `${issue.path.join('.') || '(корень)'}: ${issue.message}`)
      .join('\n');

    if (attempt === 0) {
      conversation.push(
        { role: 'assistant', content: raw },
        {
          role: 'user',
          content: `JSON не прошёл проверку схемы:\n${issues}\n\nВерни исправленный JSON-объект целиком.`,
        },
      );
      continue;
    }

    throw new ApiError('AI_BAD_RESPONSE', `Ответ модели не соответствует схеме:\n${issues}`);
  }

  throw new ApiError('AI_BAD_RESPONSE', 'Не удалось получить корректный ответ от модели.');
}
