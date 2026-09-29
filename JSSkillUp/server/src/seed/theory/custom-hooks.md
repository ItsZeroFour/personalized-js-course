# Кастомные хуки

## Что это

Кастомный хук — обычная функция, имя которой начинается с `use`, и внутри которой
вызываются другие хуки. Он переиспользует **логику с состоянием и эффектами**,
не меняя дерево компонентов (в отличие от HOC и render props).

```jsx
function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
```

## Хук переиспользует логику, а не состояние

Два компонента, вызвавшие `useOnlineStatus()`, получат **независимые** state и подписки.
State хука принадлежит компоненту, который его вызвал. Для общего состояния нужно
поднять его выше, в контекст или во внешний стор.

## Когда логика заслуживает своего хука

- **Повторяется** в нескольких компонентах: подписки на окно, debounce, работа с формой,
  пагинация, медиа-запросы.
- **Прячет эффект** за понятным именем: `useDocumentTitle(title)` читается лучше, чем
  эффект в теле страницы.
- **Отделяет логику от разметки** даже без переиспользования: `useCheckout()` возвращает
  данные и действия, компонент только рисует. Такой хук тестируется отдельно.

Когда не нужен: функция без хуков внутри — обычная функция (`formatPrice`), префикс
`use` ей не нужен и вводит в заблуждение линтер и React Compiler.

## Композиция хуков

Хуки вызывают другие хуки — так строятся слои:

```jsx
function useProductSearch() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const { data, isPending } = useQuery({
    queryKey: ['products', debouncedQuery],
    queryFn: ({ signal }) => searchProducts(debouncedQuery, signal),
    enabled: debouncedQuery.length >= 2,
  });
  return { query, setQuery, results: data ?? [], isPending };
}
```

## Стабильный возвращаемый API

Всё, что хук возвращает, потребители кладут в зависимости эффектов и в пропсы
`memo`-компонентов. Поэтому:

```jsx
function useCounter(initial = 0) {
  const [count, setCount] = useState(initial);
  const increment = useCallback(() => setCount((c) => c + 1), []);
  const reset = useCallback(() => setCount(initial), [initial]);
  return useMemo(() => ({ count, increment, reset }), [count, increment, reset]);
}
```

Без `useCallback` каждый рендер давал бы новые функции — эффект потребителя с
`[increment]` в зависимостях срабатывал бы постоянно.

Форма результата:

- **кортеж** `[value, setValue]` — когда значений 1–2 и их удобно переименовать
  (как `useState`);
- **объект** — когда полей больше; порядок не важен, легко расширять.

## Хуки с подписками и cleanup

Хук, подписывающийся на внешний источник, обязан отписываться — иначе утечки и
обновления state размонтированного компонента. Для внешних сторов правильнее
`useSyncExternalStore`: он корректно работает с concurrent rendering.

Если хук принимает колбэк (`useInterval(callback, delay)`), колбэк не должен быть
зависимостью подписки — иначе подписка пересоздаётся на каждый рендер. Решение — ref
с последней версией колбэка (паттерн «latest ref»).

## Тестирование

```js
import { renderHook, act } from '@testing-library/react';

test('increment', () => {
  const { result } = renderHook(() => useCounter(5));
  act(() => result.current.increment());
  expect(result.current.count).toBe(6);
});
```

`result.current` — возвращаемое значение последнего рендера. Действия, меняющие state,
оборачиваются в `act`. Хук с контекстом тестируется с опцией `wrapper`.

## Как это спрашивают

- «Разделяют ли два компонента состояние одного кастомного хука?» — нет.
- «Когда вы выносите логику в хук?»
- «Почему функции, возвращаемые хуком, стоит оборачивать в `useCallback`?»
- «Напишите `useDebounce` / `usePrevious` / `useFetch` / `useLocalStorage`» — классика
  live-coding.
- «Как протестировать кастомный хук?»
