import type { RunnableTest, TaskLanguage, TestResult } from '@jsskillup/shared';

/** Сообщения между страницей и песочницей (Web Worker или iframe в режиме тестов). */

export interface RunRequest {
  type: 'run';
  code: string;
  language: TaskLanguage;
  tests: RunnableTest[];
}

export type WorkerMessage =
  /** Код не удалось скомпилировать — тесты не запускались. */
  | { type: 'compile-error'; message: string }
  /** Тест начал выполняться: по этому сообщению хост взводит таймер. */
  | { type: 'test-start'; index: number }
  | { type: 'test-result'; index: number; result: TestResult }
  | { type: 'log'; text: string }
  | { type: 'done' };

/**
 * Канал до песочницы. Хост (`useRunner`) не знает, что на том конце — воркер или iframe:
 * он отправляет запрос, слушает сообщения и уничтожает канал по таймауту.
 */
export interface SandboxChannel {
  send(request: RunRequest): void;
  onMessage(handler: (message: WorkerMessage) => void): void;
  onError(handler: (message: string) => void): void;
  dispose(): void;
}

// --- iframe-рантайм React-задач --------------------------------------------------------

/** Метка, по которой страница отличает сообщения превью от чужих postMessage. */
export const PREVIEW_MARKER = 'jsskillup-preview';

export type PreviewTheme = 'light' | 'dark';

/** Страница → iframe. */
export type PreviewCommand =
  | { type: 'render'; id: number; code: string; theme: PreviewTheme }
  | RunRequest;

export type LogLevel = 'log' | 'info' | 'warn' | 'error';

/**
 * iframe → страница. События превью несут `renderId` команды, после которой возникли:
 * так страница отбрасывает логи и ошибки предыдущей версии кода.
 * В режиме тестов вместо них приходят `WorkerMessage`.
 */
export type PreviewEvent =
  | { type: 'ready' }
  | { type: 'rendered'; renderId: number }
  | { type: 'render-error'; renderId: number; stage: 'compile' | 'runtime'; message: string }
  | { type: 'console'; renderId: number; level: LogLevel; text: string };

export type PreviewEnvelope = { marker: typeof PREVIEW_MARKER; payload: PreviewEvent | WorkerMessage };

export function isPreviewEnvelope(data: unknown): data is PreviewEnvelope {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { marker?: unknown }).marker === PREVIEW_MARKER &&
    typeof (data as { payload?: unknown }).payload === 'object'
  );
}
