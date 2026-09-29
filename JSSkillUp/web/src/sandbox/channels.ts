import { isPreviewEnvelope } from './protocol';
import type { PreviewEvent, RunRequest, SandboxChannel, WorkerMessage } from './protocol';

export type SandboxKind = 'worker' | 'iframe';

/** Web Worker для JS/TS-задач: нет DOM, нет доступа к странице. */
export function createWorkerChannel(): SandboxChannel {
  const worker = new Worker(new URL('./runner.worker.ts', import.meta.url), { type: 'module' });

  return {
    send: (request) => worker.postMessage(request),
    onMessage: (handler) =>
      worker.addEventListener('message', (event: MessageEvent<WorkerMessage>) => handler(event.data)),
    onError: (handler) => worker.addEventListener('error', (event: ErrorEvent) => handler(event.message)),
    dispose: () => worker.terminate(),
  };
}

/** Атрибут sandbox: скрипты и формы можно, same-origin — нет, поэтому у iframe нет доступа к странице. */
export const PREVIEW_SANDBOX = 'allow-scripts allow-forms allow-modals';

const WORKER_MESSAGE_TYPES = new Set<string>(['compile-error', 'test-start', 'test-result', 'log', 'done']);

function isWorkerMessage(payload: PreviewEvent | WorkerMessage): payload is WorkerMessage {
  return WORKER_MESSAGE_TYPES.has(payload.type);
}

/**
 * Невидимый sandbox-iframe для тестов React-задач: там настоящий DOM.
 * Запрос уходит после сигнала `ready` — до этого рантайм ещё грузится.
 * `dispose` удаляет iframe, а с ним и всё, что там крутилось.
 */
export function createIframeChannel(): SandboxChannel {
  const iframe = document.createElement('iframe');
  iframe.src = '/preview.html?mode=test';
  iframe.setAttribute('sandbox', PREVIEW_SANDBOX);
  iframe.setAttribute('aria-hidden', 'true');
  iframe.tabIndex = -1;
  // Не display: none — иначе у элементов не будет размеров и layout-зависимый код поведёт себя иначе.
  Object.assign(iframe.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: '800px',
    height: '600px',
    border: '0',
  });

  let ready = false;
  let pending: RunRequest | null = null;
  const messageHandlers: Array<(message: WorkerMessage) => void> = [];
  const errorHandlers: Array<(message: string) => void> = [];

  const post = (request: RunRequest): void => {
    // У sandbox-iframe без allow-same-origin «непрозрачный» origin — адресовать можно только '*'.
    iframe.contentWindow?.postMessage(request, '*');
  };

  const listener = (event: MessageEvent<unknown>): void => {
    if (event.source !== iframe.contentWindow || !isPreviewEnvelope(event.data)) return;
    const payload = event.data.payload;

    if (payload.type === 'ready') {
      ready = true;
      if (pending) post(pending);
      pending = null;
      return;
    }
    if (isWorkerMessage(payload)) {
      for (const handler of messageHandlers) handler(payload);
      return;
    }
    if (payload.type === 'render-error') {
      // Ошибка вне теста (например, в отложенном колбэке) — в лог, прогон продолжается.
      for (const handler of messageHandlers) handler({ type: 'log', text: `Ошибка: ${payload.message}` });
    }
  };

  window.addEventListener('message', listener);
  iframe.addEventListener('error', () => {
    for (const handler of errorHandlers) handler('Не удалось загрузить рантайм превью');
  });
  document.body.appendChild(iframe);

  return {
    send: (request) => {
      if (ready) post(request);
      else pending = request;
    },
    onMessage: (handler) => messageHandlers.push(handler),
    onError: (handler) => errorHandlers.push(handler),
    dispose: () => {
      window.removeEventListener('message', listener);
      iframe.remove();
    },
  };
}

export function createChannel(kind: SandboxKind): SandboxChannel {
  return kind === 'iframe' ? createIframeChannel() : createWorkerChannel();
}
