import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/**
 * Ловит ошибки рендера страницы, чтобы падение одного экрана (например, редактора)
 * не превращало всё приложение в пустой экран. Классовый компонент — хуками
 * error boundary не написать. Сбрасывается через `key` при смене маршрута.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Ошибка рендера страницы', error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="rounded-xl border border-danger/30 bg-danger-soft p-5">
        <p className="text-sm font-semibold text-danger">Страница упала с ошибкой</p>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-fg/80">
          {error.message}
        </pre>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="mt-3 rounded-lg border border-line bg-panel px-3 py-1.5 text-sm text-fg hover:bg-panel-2"
        >
          Попробовать снова
        </button>
      </div>
    );
  }
}
