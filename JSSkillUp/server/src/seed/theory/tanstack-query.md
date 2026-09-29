# TanStack Query

## Серверное состояние — это кеш

Данные с сервера принадлежат серверу. На клиенте у вас лишь **копия**, которая
устаревает. TanStack Query управляет этой копией: загружает, кеширует, дедуплицирует
запросы, обновляет в фоне, отменяет, повторяет при ошибках.

```jsx
const { data, isPending, isError, error } = useQuery({
  queryKey: ['todos', { status }],
  queryFn: ({ signal }) => fetchTodos(status, signal),
});
```

## queryKey и структура кеша

Ключ — массив, **однозначно** описывающий данные. Всё, от чего зависит запрос, — в ключе:

```js
['todos']                         // все списки задач
['todos', { status: 'done' }]     // конкретный список
['todo', 42]                      // одна задача
```

- Одинаковый ключ в разных компонентах → **один** запрос и общие данные.
- Смена ключа → новый запрос (предыдущие данные остаются в кеше под своим ключом).
- Иерархия ключей позволяет инвалидировать **группу**: `invalidateQueries({ queryKey: ['todos'] })`
  затронет все списки.

Удобно держать ключи в «фабрике»: `todoKeys.list(filters)`, `todoKeys.detail(id)`.

## staleTime, gcTime и refetch-политики

- **`staleTime`** (по умолчанию 0) — сколько данные считаются **свежими**. Свежие данные
  отдаются из кеша без запроса.
- Устаревшие данные показываются сразу, но в фоне уходит перезапрос при:
  монтировании нового наблюдателя, **фокусе окна**, восстановлении сети, по
  `refetchInterval`.
- **`gcTime`** (по умолчанию 5 минут, в v4 — `cacheTime`) — сколько хранить данные,
  у которых **не осталось наблюдателей**, прежде чем удалить.

Практика: для редко меняющихся справочников `staleTime` — минуты или `Infinity`;
для ленты — секунды. `staleTime: 0` + перезапрос при фокусе иногда удивляет:
«почему при переключении вкладки браузера уходят запросы?» — это поведение по умолчанию.

Состояния: `isPending` — данных ещё нет; `isFetching` — идёт любой запрос, включая фоновый;
`isPlaceholderData` — показаны временные данные.

## Инвалидация и ручное обновление кеша

```js
const queryClient = useQueryClient();

queryClient.invalidateQueries({ queryKey: ['todos'] });   // пометить устаревшими и перезапросить активные
queryClient.setQueryData(['todo', 42], updatedTodo);      // положить данные вручную
queryClient.prefetchQuery({ queryKey: ['todo', 43], queryFn: … }); // заранее (при наведении)
```

## Мутации и оптимистичные обновления

```js
const mutation = useMutation({
  mutationFn: addTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] });   // не дать фоновому запросу перетереть
    const previous = queryClient.getQueryData(['todos']);
    queryClient.setQueryData(['todos'], (old = []) => [...old, { ...newTodo, id: 'temp' }]);
    return { previous };                                          // контекст для отката
  },
  onError: (_error, _newTodo, context) => {
    queryClient.setQueryData(['todos'], context.previous);        // откат
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['todos'] }), // синхронизация с сервером
});
```

Три уровня: просто `invalidateQueries` после успеха (надёжно, лишний запрос);
`setQueryData` из ответа мутации (без лишнего запроса); оптимистичное обновление с откатом
(мгновенный отклик, сложнее код).

## Пагинация и бесконечные списки

```js
// пагинация: не мигать при смене страницы
useQuery({
  queryKey: ['todos', page],
  queryFn: () => fetchTodos(page),
  placeholderData: keepPreviousData,
});

// бесконечная прокрутка
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: ['feed'],
  queryFn: ({ pageParam }) => fetchFeed(pageParam),
  initialPageParam: 0,
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
});
```

## Чего не делать

- Копировать `data` в `useState` и синхронизировать эффектом — кеш и есть state.
- Класть серверные данные в Redux/Zustand «на всякий случай».
- Забывать `signal` — без него отменённые запросы продолжают качаться.
- Создавать `QueryClient` внутри компонента без `useState` — кеш будет пересоздаваться.

## Как это спрашивают

- «Какие проблемы решает TanStack Query по сравнению с `useEffect` + `fetch`?»
- «Чем `staleTime` отличается от `gcTime`?»
- «Как обновить список после мутации? Как сделать оптимистичное обновление?»
- «Почему запросы уходят при переключении вкладки браузера?»
- «Как устроить queryKey для списка с фильтрами?»
