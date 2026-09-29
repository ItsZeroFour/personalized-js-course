# Redux Toolkit

## Модель Redux

- **Store** — единое дерево состояния.
- **Action** — объект-событие `{ type, payload }`: «что произошло».
- **Reducer** — чистая функция `(state, action) => newState`.
- **Dispatch** → middleware → reducers → новое состояние → подписчики (`useSelector`)
  перерисовываются.

Однонаправленный поток данных и журнал действий дают предсказуемость и мощные DevTools
(time travel). Redux Toolkit (RTK) — официальный способ писать Redux без шаблонного кода.

## createSlice и Immer

```js
const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [], coupon: null },
  reducers: {
    itemAdded(state, action) {
      const existing = state.items.find((i) => i.id === action.payload.id);
      if (existing) existing.qty += 1;         // «мутация» — это нормально
      else state.items.push({ ...action.payload, qty: 1 });
    },
    couponApplied(state, action) {
      state.coupon = action.payload;
    },
  },
});

export const { itemAdded, couponApplied } = cartSlice.actions;
export default cartSlice.reducer;
```

`createSlice` генерирует action creators и типы. Внутри редьюсеров работает **Immer**:
`state` — draft-прокси, изменения записываются, и в конце создаётся новое неизменяемое
состояние со **структурным разделением** (неизменённые ветки — те же ссылки, поэтому
селекторы и `memo` работают).

Правила: либо мутировать draft, либо **вернуть** новое значение, но не оба; вне
редьюсеров состояние мутировать нельзя.

## Селекторы и createSelector

```js
const selectItems = (state) => state.cart.items;

// мемоизированный: пересчёт, только если items изменились
const selectTotal = createSelector([selectItems], (items) =>
  items.reduce((sum, i) => sum + i.price * i.qty, 0),
);

const total = useSelector(selectTotal);
```

`useSelector` вызывает селектор **после каждого dispatch** и перерисовывает компонент,
если результат изменился **по ссылке** (`===`). Отсюда правило: селектор не должен
возвращать новый объект/массив при каждом вызове (`state => ({ a, b })`,
`state => items.filter(...)`) — иначе рендер на любое действие в приложении.
Решения: несколько `useSelector` с примитивами, `shallowEqual`, `createSelector`.

## Асинхронность: createAsyncThunk

```js
export const fetchUser = createAsyncThunk('user/fetch', async (id, { signal }) => {
  const response = await fetch(`/api/users/${id}`, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
});

// в slice
extraReducers: (builder) => {
  builder
    .addCase(fetchUser.pending, (state) => { state.status = 'loading'; })
    .addCase(fetchUser.fulfilled, (state, action) => { state.status = 'idle'; state.user = action.payload; })
    .addCase(fetchUser.rejected, (state, action) => { state.status = 'error'; state.error = action.error.message; });
},
```

Thunk генерирует три action'а. **Listener middleware** (`createListenerMiddleware`) —
для реакций на действия («после выхода очистить кеш», «сохранить в localStorage при
изменении корзины») — лёгкая альтернатива redux-saga.

## RTK Query

Для серверных данных в Redux-проекте не нужно писать thunks и слайсы руками:

```js
const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Todo'],
  endpoints: (build) => ({
    getTodos: build.query({ query: () => 'todos', providesTags: ['Todo'] }),
    addTodo: build.mutation({
      query: (body) => ({ url: 'todos', method: 'POST', body }),
      invalidatesTags: ['Todo'],       // после мутации getTodos перезапросится
    }),
  }),
});

export const { useGetTodosQuery, useAddTodoMutation } = api;
```

Кеш, дедупликация, инвалидация по тегам, polling, оптимистичные обновления — аналог
TanStack Query внутри Redux.

## Нормализация данных

Вложенные и дублирующиеся данные (`posts[].author`) тяжело обновлять: имя автора
придётся менять во всех постах. Нормализованная форма — «таблицы» по id:

```js
{ users: { ids: [1, 2], entities: { 1: { id: 1, name: 'Аня' } } },
  posts: { ids: [10], entities: { 10: { id: 10, authorId: 1 } } } }
```

`createEntityAdapter` даёт готовые редьюсеры (`addOne`, `upsertMany`, `removeOne`)
и селекторы (`selectAll`, `selectById`).

## Как это спрашивают

- «Почему в `createSlice` можно мутировать state?» — Immer, draft, структурное разделение.
- «Почему компонент перерисовывается на каждый dispatch?» — селектор с новой ссылкой.
- «Как делать асинхронные запросы в Redux?» — thunk, RTK Query.
- «Зачем нормализовать данные?»
- «Redux или Zustand/Context — когда что?»
