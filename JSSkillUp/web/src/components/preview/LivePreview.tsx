import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/lib/theme';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { Button } from '@/components/ui/Button';
import { PREVIEW_SANDBOX } from '@/sandbox/channels';
import { isPreviewEnvelope } from '@/sandbox/protocol';
import type { LogLevel, PreviewCommand } from '@/sandbox/protocol';
import { cn } from '@/lib/cn';

/** Перерисовка не на каждое нажатие клавиши, а после паузы в наборе. */
const RENDER_DEBOUNCE_MS = 400;
/** Если iframe не ответил за это время, рендер, скорее всего, завис в бесконечном цикле. */
const HANG_TIMEOUT_MS = 4000;
const MAX_LOG_LINES = 200;

interface ConsoleLine {
  level: LogLevel;
  text: string;
}

interface RenderView {
  renderId: number;
  status: 'pending' | 'rendered' | 'error';
  error: { stage: 'compile' | 'runtime'; message: string } | null;
  logs: ConsoleLine[];
}

const INITIAL_VIEW: RenderView = { renderId: 0, status: 'pending', error: null, logs: [] };

/** Событие относится к более новому рендеру — начинаем его вид с чистого листа. */
function viewFor(view: RenderView, renderId: number): RenderView {
  return renderId > view.renderId ? { renderId, status: 'pending', error: null, logs: [] } : view;
}

const LEVEL_CLASS: Record<LogLevel, string> = {
  log: 'text-fg',
  info: 'text-fg',
  warn: 'text-warning',
  error: 'text-danger',
};

/**
 * Живое превью React-компонента в sandbox-iframe. Код перерисовывается после паузы в наборе;
 * логи и ошибки — только текущей версии кода. Если рендер завис, iframe удаляется и
 * пересоздаётся, когда код изменится.
 */
export function LivePreview({ code, height = 380 }: { code: string; height?: number }) {
  const { theme } = useTheme();
  const debouncedCode = useDebouncedValue(code, RENDER_DEBOUNCE_MS);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const renderSeq = useRef(0);
  const lastAck = useRef(0);

  const [frameKey, setFrameKey] = useState(0);
  const [readyFrame, setReadyFrame] = useState<number | null>(null);
  const [hungCode, setHungCode] = useState<string | null>(null);
  const [view, setView] = useState<RenderView>(INITIAL_VIEW);
  const [consoleOpen, setConsoleOpen] = useState(true);

  const hung = hungCode !== null && hungCode === debouncedCode;
  const ready = readyFrame === frameKey && !hung;

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>): void => {
      if (event.source !== iframeRef.current?.contentWindow || !isPreviewEnvelope(event.data)) return;
      const payload = event.data.payload;

      switch (payload.type) {
        case 'ready':
          setReadyFrame(frameKey);
          break;
        case 'rendered':
          lastAck.current = Math.max(lastAck.current, payload.renderId);
          setView((current) => {
            const next = viewFor(current, payload.renderId);
            return next.renderId === payload.renderId && next.status === 'pending'
              ? { ...next, status: 'rendered' }
              : next;
          });
          break;
        case 'render-error':
          lastAck.current = Math.max(lastAck.current, payload.renderId);
          setView((current) => {
            const next = viewFor(current, payload.renderId);
            if (next.renderId !== payload.renderId) return next;
            return { ...next, status: 'error', error: { stage: payload.stage, message: payload.message } };
          });
          break;
        case 'console':
          setView((current) => {
            const next = viewFor(current, payload.renderId);
            if (next.renderId !== payload.renderId) return next;
            const logs = [...next.logs, { level: payload.level, text: payload.text }];
            return { ...next, logs: logs.slice(-MAX_LOG_LINES) };
          });
          break;
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [frameKey]);

  // Отправка кода в iframe и сторож зависания.
  useEffect(() => {
    const target = iframeRef.current?.contentWindow;
    if (!ready || !target) return;

    renderSeq.current += 1;
    const id = renderSeq.current;
    const command: PreviewCommand = { type: 'render', id, code: debouncedCode, theme };
    target.postMessage(command, '*');

    const watchdog = setTimeout(() => {
      if (lastAck.current >= id) return;
      setHungCode(debouncedCode);
      setFrameKey((key) => key + 1);
    }, HANG_TIMEOUT_MS);
    return () => clearTimeout(watchdog);
  }, [ready, debouncedCode, theme]);

  const restart = (): void => {
    setHungCode(null);
    setFrameKey((key) => key + 1);
  };

  const stale = code !== debouncedCode;
  const statusLabel = hung
    ? 'завис'
    : !ready || view.status === 'pending' || stale
      ? 'обновляется…'
      : view.status === 'error'
        ? view.error?.stage === 'compile'
          ? 'ошибка компиляции'
          : 'ошибка выполнения'
        : 'работает';

  const errors = view.logs.filter((line) => line.level === 'error').length;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel">
      <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={cn(
              'size-2 rounded-full',
              hung || view.status === 'error' ? 'bg-danger' : statusLabel === 'работает' ? 'bg-success' : 'bg-warning',
            )}
          />
          <span className="font-medium text-fg">Превью</span>
          <span className="text-xs text-muted">{statusLabel}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={restart} title="Пересоздать iframe: сбросит состояние компонента">
          ↻ Перезапустить
        </Button>
      </div>

      {hung ? (
        <div className="flex flex-col items-center justify-center gap-2 p-6 text-center" style={{ height }}>
          <p className="text-sm font-medium text-danger">Превью не ответило за {HANG_TIMEOUT_MS / 1000} с</p>
          <p className="max-w-sm text-xs text-muted">
            Похоже на бесконечный цикл при рендере или бесконечную цепочку setState. Исправьте код —
            превью перезапустится само.
          </p>
        </div>
      ) : (
        <iframe
          key={frameKey}
          ref={iframeRef}
          src="/preview.html?mode=preview"
          sandbox={PREVIEW_SANDBOX}
          title="Превью компонента"
          className="block w-full bg-panel"
          style={{ height }}
        />
      )}

      <div className="border-t border-line">
        <button
          type="button"
          onClick={() => setConsoleOpen(!consoleOpen)}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-muted hover:text-fg"
        >
          <span>{consoleOpen ? '▾' : '▸'}</span>
          <span className="font-medium uppercase tracking-wide">Консоль</span>
          {view.logs.length > 0 ? <span className="tabular-nums">({view.logs.length})</span> : null}
          {errors > 0 ? <span className="text-danger">ошибок: {errors}</span> : null}
        </button>
        {consoleOpen ? (
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap bg-code-bg px-3 py-2 font-mono text-xs">
            {view.logs.length === 0 ? (
              <span className="text-muted">Пусто. console.log из компонента появится здесь.</span>
            ) : (
              view.logs.map((line, index) => (
                <div key={index} className={LEVEL_CLASS[line.level]}>
                  {line.text}
                </div>
              ))
            )}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
