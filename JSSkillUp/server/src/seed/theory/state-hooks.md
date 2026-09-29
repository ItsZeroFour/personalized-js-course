# useState, useReducer, батчинг

## State — это снапшот

Каждый рендер видит **свою копию** state. `setState` не меняет переменную — он ставит
обновление в очередь и планирует новый рендер, в котором переменная будет другой.

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(count + 1);
    console.log(count); // 0 — в этом рендере count всегда 0
  };
}
```

Это прямое следствие того, что компонент — функция: `count` — константа конкретного
вызова. Обработчик, созданный в рендере, замыкает именно её.

## Очередь обновлений и функциональная форма

```jsx
setCount(count + 1); // «поставь 1»
setCount(count + 1); // «поставь 1»
setCount((c) => c + 1); // «возьми актуальное и прибавь 1» → 2
```

React обрабатывает очередь по порядку: значение заменяет, функция получает результат
предыдущего шага. Функциональная форма нужна, когда:

- несколько обновлений подряд зависят от предыдущего значения;
- колбэк живёт дольше рендера (таймер, подписка, `useCallback` с пустыми зависимостями) —
  иначе stale closure.

Функция-обновление должна быть чистой: в StrictMode React вызывает её дважды.

## Когда React пропускает рендер

Если новое значение равно текущему по `Object.is`, React **пропускает** обновление
(bail out). Поэтому мутация не работает:

```jsx
const add = (item) => {
  items.push(item);   // тот же массив
  setItems(items);    // Object.is(items, items) → true → рендера нет
};
```

Правильно — новый массив: `setItems([...items, item])` или `setItems((prev) => [...prev, item])`.

## Автоматический батчинг

Несколько `setState` в одном синхронном участке кода объединяются в **один** ререндер.
До React 18 это работало только в обработчиках событий React; с React 18 (`createRoot`) —
везде: в промисах, `setTimeout`, нативных обработчиках.

```jsx
fetch('/api').then(() => {
  setLoading(false);
  setData(result);     // один рендер, а не два
});
```

Если нужно применить обновление немедленно (например, чтобы измерить DOM до следующего
шага), есть `flushSync` из `react-dom`:

```jsx
flushSync(() => setItems(next));
listRef.current.lastChild.scrollIntoView();
```

Использовать редко: он ломает батчинг и может ухудшить производительность.

## Ленивая инициализация

```jsx
const [todos, setTodos] = useState(createTodosFromStorage());       // вызов на каждом рендере
const [todos, setTodos] = useState(() => createTodosFromStorage()); // только при монтировании
```

Аргумент `useState` используется **только при первом рендере**. Если его вычисление
дорогое (парсинг `localStorage`, большие структуры), передавайте функцию.

## useReducer

```jsx
function reducer(state, action) {
  switch (action.type) {
    case 'added':
      return { ...state, items: [...state.items, action.item] };
    case 'removed':
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    default:
      return state;
  }
}

const [state, dispatch] = useReducer(reducer, { items: [] });
dispatch({ type: 'added', item });
```

Когда `useReducer` лучше `useState`:

- несколько полей меняются **вместе** и должны оставаться согласованными
  (`status`, `data`, `error`);
- много разных событий над одними данными — именованные actions читаются как журнал;
- переходы нетривиальны — редьюсер легко протестировать без React;
- `dispatch` **стабилен**: его можно передать в `memo`-компоненты или контекст без
  `useCallback`, а колбэки не страдают от stale closure — актуальный state читается
  внутри редьюсера.

Для одного-двух независимых значений `useState` проще.

## Производный state — не храните его

```jsx
// плохо: второй источник истины, лишний рендер, риск рассинхронизации
const [items, setItems] = useState([]);
const [total, setTotal] = useState(0);
useEffect(() => setTotal(items.reduce((s, i) => s + i.price, 0)), [items]);

// хорошо
const total = items.reduce((s, i) => s + i.price, 0);
```

Если значение можно вычислить из пропсов и state — вычисляйте при рендере. Дорогое
вычисление — в `useMemo`. Отдельный state нужен только для данных, которые нельзя
получить из других.

Похожая ловушка — копирование пропса в state: `useState(props.value)` читает пропс
только один раз. Если нужно «сбросить при смене» — `key` на компоненте.

## Как это спрашивают

- «Что выведет консоль после двух `setCount(count + 1)`?» — задача на снапшот и очередь.
- «Как работает батчинг и что изменилось в React 18?»
- «Почему не обновляется компонент после `push` в массив из state?»
- «Когда вы выберете `useReducer`?»
- «Зачем передавать функцию в `useState`?»
