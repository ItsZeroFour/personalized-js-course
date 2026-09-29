import { useCallback, useEffect, useState } from 'react';
import { ApiRequestError } from '@/api/client';

export interface ApiState<T> {
  data: T | null;
  error: ApiRequestError | null;
  loading: boolean;
  reload: () => void;
}

interface Snapshot<T> {
  token: string | null;
  key: string;
  data: T | null;
  error: ApiRequestError | null;
}

const SEPARATOR = '\u0000';

export function toApiError(cause: unknown): ApiRequestError {
  return cause instanceof ApiRequestError
    ? cause
    : new ApiRequestError('INTERNAL', 'Неизвестная ошибка', 0, null, cause);
}

/**
 * Минимальная замена data-fetching библиотеке.
 *
 * `fetcher` должен быть стабильной ссылкой — методы объекта `api` подходят,
 * поэтому вызов выглядит как `useApi(api.topic, slug)`. Аргументы участвуют
 * в ключе запроса: их изменение перезапускает загрузку.
 */
export function useApi<A extends readonly string[], T>(
  fetcher: (...args: A) => Promise<T>,
  ...args: A
): ApiState<T> {
  const [nonce, setNonce] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot<T>>({
    token: null,
    key: '',
    data: null,
    error: null,
  });

  const key = args.join(SEPARATOR);
  const token = `${key}#${nonce}`;

  useEffect(() => {
    let cancelled = false;
    // Аргументы восстанавливаются из ключа, чтобы эффект не зависел от массива,
    // который пересоздаётся на каждом рендере.
    const restored = (key === '' ? [] : key.split(SEPARATOR)) as unknown as A;
    const currentToken = `${key}#${nonce}`;

    fetcher(...restored)
      .then((data) => {
        if (!cancelled) setSnapshot({ token: currentToken, key, data, error: null });
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setSnapshot({ token: currentToken, key, data: null, error: toApiError(cause) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fetcher, key, nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return {
    // Старые данные не показываем, если сменился ключ; при reload они остаются на месте.
    data: snapshot.key === key ? snapshot.data : null,
    error: snapshot.key === key ? snapshot.error : null,
    loading: snapshot.token !== token,
    reload,
  };
}
