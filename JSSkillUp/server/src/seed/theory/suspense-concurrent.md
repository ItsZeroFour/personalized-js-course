# Suspense и concurrent features

## React.lazy и Suspense для code splitting

```jsx
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

`lazy` принимает функцию, возвращающую промис модуля с default-экспортом. Сборщик
выносит модуль в отдельный чанк. Пока он грузится, компонент **приостанавливается**,
и ближайшая граница `<Suspense>` показывает `fallback`.

`lazy` вызывают на уровне модуля, а не внутри компонента — иначе каждый рендер создаёт
новый тип и сбрасывает state.

## Как работает приостановка

Компонент, которому чего-то не хватает для рендера, «бросает» промис (так делали
библиотеки) или вызывает `use(promise)` (React 19). React:

1. прекращает рендер этого поддерева;
2. находит ближайшую границу `<Suspense>` выше и показывает её `fallback`;
3. когда промис выполнится — повторяет рендер.

Границы можно вкладывать: внешняя показывает скелетон страницы, внутренние — скелетоны
отдельных блоков. Ошибка при загрузке — работа error boundary, не Suspense.

## Suspense для данных

```jsx
function Comments({ commentsPromise }) {
  const comments = use(commentsPromise);
  return comments.map((c) => <p key={c.id}>{c.text}</p>);
}

<Suspense fallback={<p>Загрузка комментариев…</p>}>
  <Comments commentsPromise={commentsPromise} />
</Suspense>
```

Важно: промис должен быть **стабильным** — создан вне рендера (в роутере, в серверном
компоненте) или закеширован. Новый промис на каждый рендер = бесконечная загрузка.
На практике Suspense для данных используют через фреймворк (Next.js) или библиотеку
(`useSuspenseQuery` в TanStack Query, Relay).

## Concurrent rendering

В React 18+ рендер может быть **прерываемым**: React начинает готовить новое дерево
в фоне, а если приходит срочное обновление (ввод), откладывает фоновую работу.
Включается не глобально, а через конкретные API: `useTransition`, `useDeferredValue`,
Suspense.

## useTransition

```jsx
const [isPending, startTransition] = useTransition();

function selectTab(next) {
  startTransition(() => {
    setTab(next); // несрочное обновление
  });
}
```

Обновления внутри `startTransition`:

- **низкоприоритетные** — если во время их рендера пользователь печатает или кликает,
  React прервёт тяжёлый рендер и обработает ввод;
- **не показывают fallback** Suspense для уже видимого контента — React держит старый
  интерфейс, пока новый не готов, а вы показываете `isPending` (приглушить старый контент,
  спиннер в табе).

В React 19 в `startTransition` можно передавать async-функции — это основа **Actions**.

Есть и функция `startTransition` без хука — для кода вне компонентов (например, в роутере).

Не подходит для контролируемого инпута: значение поля обновляется срочно, иначе ввод
будет «запаздывать».

## useDeferredValue

```jsx
function Search() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <div style={{ opacity: isStale ? 0.5 : 1 }}>
        <SlowList query={deferredQuery} />  {/* SlowList обёрнут в memo */}
      </div>
    </>
  );
}
```

Поле обновляется сразу; `SlowList` сначала рендерится со старым значением, а новое
готовится в фоновом прерываемом рендере. В отличие от debounce, **нет фиксированной
задержки**: на быстром устройстве отставание почти незаметно, на медленном ввод остаётся
отзывчивым. Но запросы к серверу `useDeferredValue` не сокращает.

`useTransition` — когда у вас есть доступ к `setState`. `useDeferredValue` — когда значение
приходит пропсом и вы не контролируете его обновление.

## useSyncExternalStore и tearing

**Tearing** — «разрыв» интерфейса: при прерываемом рендере часть компонентов успела
прочитать старое значение внешнего стора, часть — новое. На экране несогласованное состояние.

`useSyncExternalStore(subscribe, getSnapshot)` — официальный способ подписаться на
внешний источник (стор, `window.matchMedia`, `navigator.onLine`) так, чтобы React
гарантировал согласованность. На нём построены Redux (`useSelector`), Zustand и другие.

```jsx
function useOnlineStatus() {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener('online', callback);
      window.addEventListener('offline', callback);
      return () => {
        window.removeEventListener('online', callback);
        window.removeEventListener('offline', callback);
      };
    },
    () => navigator.onLine,
  );
}
```

## Как это спрашивают

- «Как работает Suspense?» — приостановка, ближайшая граница, повтор рендера.
- «Для чего `useTransition`? Пример.»
- «Чем `useDeferredValue` отличается от debounce?»
- «Что такое concurrent rendering и что он даёт пользователю?»
- Со звёздочкой: «что такое tearing и зачем `useSyncExternalStore`?»
