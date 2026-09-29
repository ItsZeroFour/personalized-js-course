import type { SeedTask } from '../types.js';

/**
 * React-задачи на базовые вещи, которые спрашивают на каждом live-coding:
 * состояние, списки, формы. Исполняются в sandbox-iframe (runtime: 'preview'),
 * тесты — на чистом JS с мини-Testing Library (см. shared/src/reactTesting.ts).
 */
export const reactBasicsTasks: SeedTask[] = [
  {
    slug: 'react-counter-step',
    topic: 'state-hooks',
    title: 'Счётчик с шагом',
    kind: 'react',
    runtime: 'preview',
    difficulty: 'easy',
    tags: ['useState', 'функциональное обновление'],
    statementMd: `Сделайте компонент-счётчик.

- Текущее значение (изначально \`0\`) — в элементе с \`data-testid="value"\`.
- Кнопки с \`aria-label\` **«Увеличить»** и **«Уменьшить»** меняют значение на шаг.
- Поле **«Шаг»** (\`<label>\` с таким текстом, \`type="number"\`), по умолчанию \`1\`.
  Если в поле не положительное целое число, кнопки изменения заблокированы.
- Значение не может стать отрицательным: «Уменьшить» заблокирована, если \`value - step < 0\`.
- Кнопка с \`aria-label\` **«Увеличить дважды»** должна **дважды подряд вызвать ту же
  функцию увеличения**, что и «Увеличить», — и значение вырастет на \`2 × шаг\`.
- Кнопка **«Сбросить»** возвращает значение к \`0\`, шаг не трогает.

Пункт про «дважды» — ради него задачу и дают на собеседовании.`,
    starterCode: `import { useState } from 'react';

export default function Counter() {
  // TODO: состояние значения и шага, кнопки и поле «Шаг»
  return (
    <div>
      <p data-testid="value">0</p>
    </div>
  );
}
`,
    solutionCode: `import { useState } from 'react';

export default function Counter() {
  const [value, setValue] = useState(0);
  // Храним строку из поля как есть: иначе пользователь не сможет стереть число и ввести новое.
  const [stepInput, setStepInput] = useState('1');

  const step = Number(stepInput);
  const stepValid = Number.isInteger(step) && step > 0;

  // Функциональное обновление: React передаёт актуальное значение из очереди обновлений.
  const increment = () => setValue((current) => current + step);
  const decrement = () => setValue((current) => Math.max(0, current - step));

  return (
    <div>
      <p data-testid="value">{value}</p>
      <button aria-label="Уменьшить" disabled={!stepValid || value - step < 0} onClick={decrement}>
        −
      </button>
      <button aria-label="Увеличить" disabled={!stepValid} onClick={increment}>
        +
      </button>
      <button
        aria-label="Увеличить дважды"
        disabled={!stepValid}
        onClick={() => {
          increment();
          increment();
        }}
      >
        +×2
      </button>
      <button onClick={() => setValue(0)}>Сбросить</button>
      <div>
        <label htmlFor="counter-step">Шаг</label>
        <input
          id="counter-step"
          type="number"
          value={stepInput}
          onChange={(event) => setStepInput(event.target.value)}
        />
      </div>
    </div>
  );
}
`,
    solutionNotesMd: `**Главное — функциональное обновление.** \`setValue(value + step)\`, вызванный дважды
в одном обработчике, прибавит шаг один раз: оба вызова видят \`value\` из замыкания текущего
рендера, а React батчит обновления и применяет их после обработчика. \`setValue(c => c + step)\`
ставит в очередь функции, и каждая получает результат предыдущей.

Остальное:
- **Строка в состоянии поля.** Если хранить \`number\`, пустое поле превратится в \`0\`
  и курсор «прыгнет». Число выводится при рендере — это производное значение, отдельный
  \`useState\` для него не нужен.
- **Блокировка вместо проверки в обработчике.** \`disabled\` вычисляется из состояния при
  рендере; \`Math.max(0, …)\` в \`decrement\` — страховка на случай гонки.

Что спросят дальше: почему батчинг есть и в \`setTimeout\` начиная с React 18 (automatic batching)
и как отключить его точечно (\`flushSync\`).`,
    hints: [
      'Поле «Шаг» удобнее хранить строкой, а число вычислять при рендере: `Number(stepInput)`.',
      'Почему два вызова `setValue(value + step)` подряд дают только один шаг? Что видит каждый из них в `value`?',
      'Передайте в сеттер функцию: `setValue((current) => current + step)` — React применит обновления по очереди.',
    ],
    tests: [
      {
        name: 'начальное значение 0, «Увеличить» прибавляет 1',
        code: `await render(h(exports.default));
expect(screen.getByTestId('value').textContent).toBe('0');
await fireEvent.click(screen.getByRole('button', { name: 'Увеличить' }));
await fireEvent.click(screen.getByRole('button', { name: 'Увеличить' }));
expect(screen.getByTestId('value').textContent).toBe('2');`,
      },
      {
        name: 'шаг 5 применяется к обеим кнопкам',
        code: `await render(h(exports.default));
await fireEvent.change(screen.getByLabelText('Шаг'), { target: { value: '5' } });
await fireEvent.click(screen.getByRole('button', { name: 'Увеличить' }));
expect(screen.getByTestId('value').textContent).toBe('5');
await fireEvent.click(screen.getByRole('button', { name: 'Уменьшить' }));
expect(screen.getByTestId('value').textContent).toBe('0');`,
      },
      {
        name: '«Уменьшить» заблокирована, если значение уйдёт в минус',
        code: `await render(h(exports.default));
expect(screen.getByRole('button', { name: 'Уменьшить' }).disabled).toBe(true);
await fireEvent.change(screen.getByLabelText('Шаг'), { target: { value: '3' } });
await fireEvent.click(screen.getByRole('button', { name: 'Увеличить' }));
await fireEvent.change(screen.getByLabelText('Шаг'), { target: { value: '4' } });
expect(screen.getByRole('button', { name: 'Уменьшить' }).disabled).toBe(true);`,
      },
      {
        name: '«Увеличить дважды» прибавляет 2 × шаг',
        hidden: true,
        code: `await render(h(exports.default));
await fireEvent.change(screen.getByLabelText('Шаг'), { target: { value: '3' } });
await fireEvent.click(screen.getByRole('button', { name: 'Увеличить дважды' }));
expect(screen.getByTestId('value').textContent).toBe('6');`,
      },
      {
        name: 'некорректный шаг блокирует кнопки',
        hidden: true,
        code: `await render(h(exports.default));
for (const bad of ['0', '', '-2', '2.5']) {
  await fireEvent.change(screen.getByLabelText('Шаг'), { target: { value: bad } });
  expect(screen.getByRole('button', { name: 'Увеличить' }).disabled).toBe(true);
  expect(screen.getByRole('button', { name: 'Увеличить дважды' }).disabled).toBe(true);
}`,
      },
      {
        name: '«Сбросить» обнуляет значение, но не шаг',
        hidden: true,
        code: `await render(h(exports.default));
await fireEvent.change(screen.getByLabelText('Шаг'), { target: { value: '2' } });
await fireEvent.click(screen.getByRole('button', { name: 'Увеличить' }));
await fireEvent.click(screen.getByRole('button', { name: 'Сбросить' }));
expect(screen.getByTestId('value').textContent).toBe('0');
expect(screen.getByLabelText('Шаг').value).toBe('2');`,
      },
    ],
  },

  {
    slug: 'react-todo-list',
    topic: 'keys-lists',
    title: 'Todo-лист с фильтрами',
    kind: 'react',
    runtime: 'preview',
    difficulty: 'medium',
    tags: ['списки', 'keys', 'иммутабельность', 'формы'],
    statementMd: `Классика live-coding. Сделайте todo-лист.

**Добавление.** Форма с полем **«Новая задача»** (\`<label>\`) и кнопкой **«Добавить»**.
Добавлять можно и кнопкой, и Enter (сабмит формы). Текст обрезается по краям,
пустой не добавляется, после добавления поле очищается.

**Список.** \`<ul>\`, в каждом \`<li>\`:
- чекбокс, обёрнутый в \`<label>\` с текстом задачи (\`<label><input type="checkbox" /> текст</label>\`);
- кнопка удаления с \`aria-label\` вида **«Удалить «текст»»**.

**Фильтры.** Кнопки **«Все»**, **«Активные»**, **«Выполненные»**. У активной — \`aria-pressed="true"\`,
у остальных \`"false"\`.

**Счётчик** в \`data-testid="left"\`: текст \`Осталось: N\` — число невыполненных (не зависит от фильтра).

**«Очистить выполненные»** удаляет выполненные задачи; заблокирована, если таких нет.

Состояние обновляйте иммутабельно, а для \`key\` используйте стабильный id, а не индекс.`,
    starterCode: `import { useState, type SubmitEvent } from 'react';

type Todo = { id: number; text: string; done: boolean };
type Filter = 'all' | 'active' | 'done';

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    // TODO
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        {/* TODO: поле «Новая задача» и кнопка «Добавить» */}
      </form>
      <ul>{/* TODO */}</ul>
    </div>
  );
}
`,
    solutionCode: `import { useRef, useState, type SubmitEvent } from 'react';

type Todo = { id: number; text: string; done: boolean };
type Filter = 'all' | 'active' | 'done';

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 'active', label: 'Активные' },
  { value: 'done', label: 'Выполненные' },
];

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  // Счётчик id не влияет на рендер — ему место в ref, а не в state.
  const nextId = useRef(1);

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const id = nextId.current++;
    setTodos((current) => [...current, { id, text, done: false }]);
    setDraft('');
  };

  const toggle = (id: number) =>
    setTodos((current) => current.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)));

  const remove = (id: number) => setTodos((current) => current.filter((todo) => todo.id !== id));

  const clearDone = () => setTodos((current) => current.filter((todo) => !todo.done));

  // Производные значения считаются при рендере, отдельный state для них не нужен.
  const visible = todos.filter((todo) =>
    filter === 'all' ? true : filter === 'active' ? !todo.done : todo.done,
  );
  const left = todos.filter((todo) => !todo.done).length;
  const hasDone = todos.length > left;

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <label htmlFor="new-todo">Новая задача</label>
        <input id="new-todo" value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button type="submit">Добавить</button>
      </form>

      <div>
        {FILTERS.map((item) => (
          <button key={item.value} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>
            {item.label}
          </button>
        ))}
      </div>

      <ul>
        {visible.map((todo) => (
          <li key={todo.id}>
            <label>
              <input type="checkbox" checked={todo.done} onChange={() => toggle(todo.id)} /> {todo.text}
            </label>
            <button aria-label={\`Удалить «\${todo.text}»\`} onClick={() => remove(todo.id)}>
              ✕
            </button>
          </li>
        ))}
      </ul>

      <p data-testid="left">Осталось: {left}</p>
      <button disabled={!hasDone} onClick={clearDone}>
        Очистить выполненные
      </button>
    </div>
  );
}
`,
    solutionNotesMd: `Что здесь проверяют на собеседовании:

1. **Иммутабельные обновления.** \`todos.push(...)\` + \`setTodos(todos)\` не вызовет ререндер:
   React сравнивает state через \`Object.is\`, а ссылка на массив та же. Поэтому \`[...current, item]\`,
   \`map\` с копией изменённого объекта и \`filter\`.
2. **Стабильный \`key\`.** С \`key={index}\` удаление первого элемента «сдвигает» идентичность:
   React переиспользует DOM и state компонента первого \`<li>\` для второго. С контролируемыми
   чекбоксами это не видно, но стоит добавить в элемент локальное состояние (режим редактирования,
   uncontrolled input) — баг проявится.
3. **Производное состояние** (\`visible\`, \`left\`) считается при рендере. Хранить отфильтрованный
   список в отдельном \`useState\` и синхронизировать эффектом — классическая ошибка.
4. **id в \`useRef\`**: значение должно переживать рендеры, но его изменение не должно
   вызывать рендер.

Что спросят дальше: как не пересчитывать фильтрацию на каждый рендер (\`useMemo\`, и почему
на 100 элементах это не нужно), как вынести логику в \`useReducer\`.`,
    hints: [
      'Держите в state только исходные данные: массив задач, текст поля и текущий фильтр. Отфильтрованный список и счётчик вычисляйте при рендере.',
      'Для id подойдёт счётчик в `useRef` — он переживает рендеры и не вызывает их.',
      'Переключение задачи: `current.map(t => t.id === id ? { ...t, done: !t.done } : t)` — новый массив и новый объект только для изменённого элемента.',
    ],
    tests: [
      {
        name: 'добавление кнопкой и через Enter',
        code: `await render(h(exports.default));
const input = screen.getByLabelText('Новая задача');
await fireEvent.change(input, { target: { value: 'Купить молоко' } });
await fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));
await fireEvent.change(input, { target: { value: 'Выучить event loop' } });
await fireEvent.submit(input.closest('form'));
const items = screen.getAllByRole('listitem');
expect(items).toHaveLength(2);
expect(items[1].textContent).toContain('Выучить event loop');
expect(input.value).toBe('');`,
      },
      {
        name: 'текст обрезается, пустой не добавляется',
        code: `await render(h(exports.default));
const input = screen.getByLabelText('Новая задача');
await fireEvent.change(input, { target: { value: '   ' } });
await fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));
expect(screen.queryAllByRole('listitem')).toHaveLength(0);
await fireEvent.change(input, { target: { value: '  Задача  ' } });
await fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));
expect(screen.getByRole('checkbox', { name: 'Задача' })).toBeTruthy();`,
      },
      {
        name: 'отметка выполнения и счётчик',
        code: `await render(h(exports.default));
const input = screen.getByLabelText('Новая задача');
for (const text of ['A', 'B', 'C']) {
  await fireEvent.change(input, { target: { value: text } });
  await fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));
}
expect(screen.getByTestId('left').textContent).toBe('Осталось: 3');
await fireEvent.click(screen.getByRole('checkbox', { name: 'B' }));
expect(screen.getByRole('checkbox', { name: 'B' }).checked).toBe(true);
expect(screen.getByTestId('left').textContent).toBe('Осталось: 2');`,
      },
      {
        name: 'фильтры и aria-pressed',
        hidden: true,
        code: `await render(h(exports.default));
const input = screen.getByLabelText('Новая задача');
for (const text of ['A', 'B', 'C']) {
  await fireEvent.change(input, { target: { value: text } });
  await fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));
}
await fireEvent.click(screen.getByRole('checkbox', { name: 'A' }));
await fireEvent.click(screen.getByRole('button', { name: 'Активные' }));
expect(screen.getAllByRole('listitem').map((li) => li.textContent.trim().slice(0, 1))).toEqual(['B', 'C']);
expect(screen.getByRole('button', { name: 'Активные' }).getAttribute('aria-pressed')).toBe('true');
expect(screen.getByRole('button', { name: 'Все' }).getAttribute('aria-pressed')).toBe('false');
await fireEvent.click(screen.getByRole('button', { name: 'Выполненные' }));
expect(screen.getAllByRole('listitem')).toHaveLength(1);
expect(screen.getByTestId('left').textContent).toBe('Осталось: 2');
await fireEvent.click(screen.getByRole('button', { name: 'Все' }));
expect(screen.getAllByRole('listitem')).toHaveLength(3);`,
      },
      {
        name: 'удаление по кнопке',
        hidden: true,
        code: `await render(h(exports.default));
const input = screen.getByLabelText('Новая задача');
for (const text of ['A', 'B']) {
  await fireEvent.change(input, { target: { value: text } });
  await fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));
}
await fireEvent.click(screen.getByRole('button', { name: 'Удалить «A»' }));
expect(screen.getAllByRole('listitem')).toHaveLength(1);
expect(screen.queryByRole('checkbox', { name: 'A' })).toBeNull();`,
      },
      {
        name: '«Очистить выполненные»',
        hidden: true,
        code: `await render(h(exports.default));
const clear = () => screen.getByRole('button', { name: 'Очистить выполненные' });
const input = screen.getByLabelText('Новая задача');
for (const text of ['A', 'B', 'C']) {
  await fireEvent.change(input, { target: { value: text } });
  await fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));
}
expect(clear().disabled).toBe(true);
await fireEvent.click(screen.getByRole('checkbox', { name: 'A' }));
await fireEvent.click(screen.getByRole('checkbox', { name: 'C' }));
await fireEvent.click(clear());
expect(screen.getAllByRole('listitem')).toHaveLength(1);
expect(screen.getByRole('checkbox', { name: 'B' })).toBeTruthy();
expect(clear().disabled).toBe(true);`,
      },
    ],
  },

  {
    slug: 'react-pagination',
    topic: 'state-hooks',
    title: 'Пагинация списка',
    kind: 'react',
    runtime: 'preview',
    difficulty: 'medium',
    tags: ['производное состояние', 'props'],
    statementMd: `Компонент \`Pagination\` получает пропсы \`items: string[]\` и \`pageSize: number\`
и показывает элементы постранично.

- Элементы текущей страницы — в \`<ul>\` как \`<li>\`.
- В \`data-testid="page-info"\` текст \`Страница X из Y\`.
- Кнопки **«Назад»** и **«Вперёд»**; на первой и последней странице соответствующая заблокирована.
- Кнопки номеров страниц с текстом \`1\`, \`2\`, … Текущая помечена \`aria-current="page"\`.
- Если \`items\` пустой — только текст **«Нет данных»**, без списка и кнопок.
- **Если родитель передал меньше элементов** и текущей страницы больше не существует,
  показывается последняя существующая. Сделайте это без \`useEffect\`.

Для превью в заготовке есть \`App\` — его менять не нужно.`,
    starterCode: `import { useState } from 'react';

export function Pagination({ items, pageSize }: { items: string[]; pageSize: number }) {
  // TODO
  return <ul />;
}

export default function App() {
  const [count, setCount] = useState(23);
  const items = Array.from({ length: count }, (_, i) => \`Элемент \${i + 1}\`);
  return (
    <div>
      <button onClick={() => setCount((c) => Math.max(0, c - 5))}>Убрать 5 элементов</button>
      <Pagination items={items} pageSize={5} />
    </div>
  );
}
`,
    solutionCode: `import { useState } from 'react';

export function Pagination({ items, pageSize }: { items: string[]; pageSize: number }) {
  const [requestedPage, setRequestedPage] = useState(1);

  const totalPages = Math.ceil(items.length / pageSize);
  // Страница — производное значение: запрошенная, но не больше последней.
  // Никакого эффекта «поправить state» — он дал бы лишний рендер с неверными данными.
  const page = Math.min(requestedPage, Math.max(totalPages, 1));

  if (items.length === 0) return <p>Нет данных</p>;

  const start = (page - 1) * pageSize;
  const visible = items.slice(start, start + pageSize);

  return (
    <div>
      <ul>
        {visible.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p data-testid="page-info">
        Страница {page} из {totalPages}
      </p>
      <button disabled={page === 1} onClick={() => setRequestedPage(page - 1)}>
        Назад
      </button>
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
        <button
          key={number}
          aria-current={number === page ? 'page' : undefined}
          onClick={() => setRequestedPage(number)}
        >
          {number}
        </button>
      ))}
      <button disabled={page === totalPages} onClick={() => setRequestedPage(page + 1)}>
        Вперёд
      </button>
    </div>
  );
}

export default function App() {
  const [count, setCount] = useState(23);
  const items = Array.from({ length: count }, (_, i) => \`Элемент \${i + 1}\`);
  return (
    <div>
      <button onClick={() => setCount((c) => Math.max(0, c - 5))}>Убрать 5 элементов</button>
      <Pagination items={items} pageSize={5} />
    </div>
  );
}
`,
    solutionNotesMd: `Ключевая идея — **текущая страница вычисляется при рендере**:
\`page = min(requestedPage, totalPages)\`. В state лежит только то, что выбрал пользователь.

Типичная ошибка — \`useEffect(() => { if (page > totalPages) setPage(totalPages) }, [totalPages])\`.
Она работает, но:
- первый рендер после уменьшения \`items\` показывает пустую страницу и неверный текст;
- лишний цикл рендер → эффект → setState → рендер.

Обратите внимание: обработчики используют вычисленный \`page\`, а не \`requestedPage\` —
иначе «Назад» с «застрявшей» страницы 5 из 4 перешла бы на 4, то есть никуда.

Что спросят дальше: как синхронизировать страницу с URL (\`useSearchParams\`) и почему тогда
state вообще не нужен; серверная пагинация и \`keepPreviousData\` в TanStack Query.`,
    hints: [
      'Сколько всего страниц? `Math.ceil(items.length / pageSize)`.',
      'Храните в state страницу, которую выбрал пользователь, а показывайте `Math.min(выбранная, totalPages)` — это вычисляется при рендере.',
    ],
    tests: [
      {
        name: 'первая страница и page-info',
        code: `const items = Array.from({ length: 12 }, (_, i) => 'item ' + (i + 1));
await render(h(exports.Pagination, { items, pageSize: 5 }));
expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['item 1', 'item 2', 'item 3', 'item 4', 'item 5']);
expect(screen.getByTestId('page-info').textContent).toBe('Страница 1 из 3');
expect(screen.getByRole('button', { name: 'Назад' }).disabled).toBe(true);`,
      },
      {
        name: '«Вперёд», «Назад» и блокировка на последней',
        code: `const items = Array.from({ length: 12 }, (_, i) => 'item ' + (i + 1));
await render(h(exports.Pagination, { items, pageSize: 5 }));
await fireEvent.click(screen.getByRole('button', { name: 'Вперёд' }));
await fireEvent.click(screen.getByRole('button', { name: 'Вперёд' }));
expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['item 11', 'item 12']);
expect(screen.getByRole('button', { name: 'Вперёд' }).disabled).toBe(true);
await fireEvent.click(screen.getByRole('button', { name: 'Назад' }));
expect(screen.getByTestId('page-info').textContent).toBe('Страница 2 из 3');`,
      },
      {
        name: 'кнопки номеров и aria-current',
        hidden: true,
        code: `const items = Array.from({ length: 12 }, (_, i) => 'item ' + (i + 1));
await render(h(exports.Pagination, { items, pageSize: 5 }));
await fireEvent.click(screen.getByRole('button', { name: '3' }));
expect(screen.getByRole('button', { name: '3' }).getAttribute('aria-current')).toBe('page');
expect(screen.getByRole('button', { name: '1' }).getAttribute('aria-current')).toBeNull();
expect(screen.getByTestId('page-info').textContent).toBe('Страница 3 из 3');`,
      },
      {
        name: 'пустой список — «Нет данных»',
        hidden: true,
        code: `await render(h(exports.Pagination, { items: [], pageSize: 5 }));
expect(screen.getByText('Нет данных')).toBeTruthy();
expect(screen.queryByRole('list')).toBeNull();
expect(screen.queryByRole('button', { name: 'Вперёд' })).toBeNull();`,
      },
      {
        name: 'элементов стало меньше — показывается последняя страница',
        hidden: true,
        code: `const make = (n) => Array.from({ length: n }, (_, i) => 'item ' + (i + 1));
const view = await render(h(exports.Pagination, { items: make(20), pageSize: 5 }));
await fireEvent.click(screen.getByRole('button', { name: '4' }));
await view.rerender(h(exports.Pagination, { items: make(8), pageSize: 5 }));
expect(screen.getByTestId('page-info').textContent).toBe('Страница 2 из 2');
expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['item 6', 'item 7', 'item 8']);
await fireEvent.click(screen.getByRole('button', { name: 'Назад' }));
expect(screen.getByTestId('page-info').textContent).toBe('Страница 1 из 2');`,
      },
    ],
  },

  {
    slug: 'react-signup-form',
    topic: 'state-hooks',
    title: 'Форма регистрации с валидацией',
    kind: 'react',
    runtime: 'preview',
    difficulty: 'medium',
    tags: ['формы', 'валидация', 'доступность'],
    statementMd: `Компонент \`SignupForm\` с пропсом \`onSubmit(data: { email: string; password: string })\`.

Поля (у каждого \`<label>\`): **«Email»**, **«Пароль»**, **«Повторите пароль»**.
Кнопка **«Зарегистрироваться»**.

Правила:
| Поле | Условие | Текст ошибки |
| --- | --- | --- |
| Email | \`/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/\` после \`trim()\` | Некорректный email |
| Пароль | ≥ 8 символов и хотя бы одна цифра | Минимум 8 символов и хотя бы одна цифра |
| Повтор | совпадает с паролем | Пароли не совпадают |

Поведение:
- Ошибка поля показывается, только когда поле **«тронуто»** (было событие blur) или была
  попытка отправки. До этого ошибок не видно.
- Ошибка выводится в элементе с \`role="alert"\`, а у поля ставится \`aria-invalid="true"\`.
- После того как ошибка показана, она пропадает сразу, как только значение стало корректным.
- Отправка невалидной формы показывает все ошибки и **не** вызывает \`onSubmit\`.
- Валидная форма вызывает \`onSubmit\` один раз с \`{ email: обрезанный email, password }\`.`,
    starterCode: `import { useState, type SubmitEvent } from 'react';

type SignupData = { email: string; password: string };

export function SignupForm({ onSubmit }: { onSubmit: (data: SignupData) => void }) {
  // TODO
  return <form />;
}

export default function App() {
  const [result, setResult] = useState<string | null>(null);
  return (
    <div>
      <SignupForm onSubmit={(data) => setResult(JSON.stringify(data))} />
      {result ? <p>Отправлено: {result}</p> : null}
    </div>
  );
}
`,
    solutionCode: `import { useState, type SubmitEvent } from 'react';

type SignupData = { email: string; password: string };
type Field = 'email' | 'password' | 'confirm';
type Values = Record<Field, string>;

const EMAIL_RE = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

/** Чистая функция: легко тестировать отдельно от компонента. */
function validate(values: Values): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  if (!EMAIL_RE.test(values.email.trim())) errors.email = 'Некорректный email';
  if (values.password.length < 8 || !/\\d/.test(values.password)) {
    errors.password = 'Минимум 8 символов и хотя бы одна цифра';
  }
  if (values.confirm !== values.password) errors.confirm = 'Пароли не совпадают';
  return errors;
}

const FIELDS: Array<{ name: Field; label: string; type: string }> = [
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'password', label: 'Пароль', type: 'password' },
  { name: 'confirm', label: 'Повторите пароль', type: 'password' },
];

export function SignupForm({ onSubmit }: { onSubmit: (data: SignupData) => void }) {
  const [values, setValues] = useState<Values>({ email: '', password: '', confirm: '' });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  // Ошибки — производное значение от values, не отдельный state.
  const errors = validate(values);
  const visibleError = (field: Field) => (touched[field] || submitted ? errors[field] : undefined);

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    onSubmit({ email: values.email.trim(), password: values.password });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {FIELDS.map(({ name, label, type }) => {
        const error = visibleError(name);
        const id = \`signup-\${name}\`;
        return (
          <div key={name}>
            <label htmlFor={id}>{label}</label>
            <input
              id={id}
              type={type}
              value={values[name]}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? \`\${id}-error\` : undefined}
              onChange={(event) => setValues({ ...values, [name]: event.target.value })}
              onBlur={() => setTouched({ ...touched, [name]: true })}
            />
            {error ? (
              <p id={\`\${id}-error\`} role="alert">
                {error}
              </p>
            ) : null}
          </div>
        );
      })}
      <button type="submit">Зарегистрироваться</button>
    </form>
  );
}

export default function App() {
  const [result, setResult] = useState<string | null>(null);
  return (
    <div>
      <SignupForm onSubmit={(data) => setResult(JSON.stringify(data))} />
      {result ? <p>Отправлено: {result}</p> : null}
    </div>
  );
}
`,
    solutionNotesMd: `Структура, которую ждут от Middle:

- **В state только исходные данные**: значения, «тронутые» поля и флаг попытки отправки.
  Ошибки вычисляются функцией \`validate(values)\` при каждом рендере — их не нужно
  синхронизировать и они не могут «разъехаться» со значениями.
- **\`validate\` — чистая функция вне компонента**: её легко покрыть юнит-тестами и
  переиспользовать на бэкенде.
- **Когда показывать ошибку** — отдельное правило (\`touched || submitted\`), а не часть валидации.
- **Доступность**: \`aria-invalid\` и \`aria-describedby\` связывают поле с текстом ошибки,
  \`role="alert"\` зачитывается скринридером. \`noValidate\` отключает встроенные подсказки
  браузера, чтобы не было двух систем валидации.

Что спросят дальше: чем контролируемые поля отличаются от неконтролируемых и когда брать
React Hook Form (много полей — меньше ререндеров за счёт uncontrolled + ref); как валидировать
схемой (Zod) и делить схему между фронтом и бэком.`,
    hints: [
      'Ошибки — это функция от значений. Напишите чистую `validate(values)` и вызывайте её при рендере.',
      'Отдельно храните, какие поля «тронуты» (onBlur), и была ли попытка отправки. Показывать ошибку: `touched[field] || submitted`.',
      'В обработчике submit не забудьте `event.preventDefault()` и проверьте ошибки, вычисленные для текущих значений.',
    ],
    tests: [
      {
        name: 'до взаимодействия ошибок нет',
        code: `await render(h(exports.SignupForm, { onSubmit: () => {} }));
expect(screen.queryAllByRole('alert')).toHaveLength(0);
expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBeNull();`,
      },
      {
        name: 'ошибка email после blur',
        code: `await render(h(exports.SignupForm, { onSubmit: () => {} }));
const email = screen.getByLabelText('Email');
await fireEvent.change(email, { target: { value: 'not-an-email' } });
expect(screen.queryAllByRole('alert')).toHaveLength(0);
await fireEvent.blur(email);
expect(screen.getByRole('alert').textContent).toBe('Некорректный email');
expect(email.getAttribute('aria-invalid')).toBe('true');`,
      },
      {
        name: 'отправка пустой формы: все ошибки и onSubmit не вызван',
        code: `const calls = [];
await render(h(exports.SignupForm, { onSubmit: (data) => calls.push(data) }));
await fireEvent.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));
const texts = screen.getAllByRole('alert').map((el) => el.textContent);
expect(texts).toContain('Некорректный email');
expect(texts).toContain('Минимум 8 символов и хотя бы одна цифра');
expect(calls).toHaveLength(0);`,
      },
      {
        name: 'валидная форма вызывает onSubmit с обрезанным email',
        hidden: true,
        code: `const calls = [];
await render(h(exports.SignupForm, { onSubmit: (data) => calls.push(data) }));
await fireEvent.change(screen.getByLabelText('Email'), { target: { value: '  dev@mail.ru ' } });
await fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'secret123' } });
await fireEvent.change(screen.getByLabelText('Повторите пароль'), { target: { value: 'secret123' } });
await fireEvent.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));
expect(calls).toEqual([{ email: 'dev@mail.ru', password: 'secret123' }]);
expect(screen.queryAllByRole('alert')).toHaveLength(0);`,
      },
      {
        name: 'пароли не совпадают; ошибка уходит после исправления',
        hidden: true,
        code: `await render(h(exports.SignupForm, { onSubmit: () => {} }));
await fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'secret123' } });
const confirm = screen.getByLabelText('Повторите пароль');
await fireEvent.change(confirm, { target: { value: 'secret124' } });
await fireEvent.blur(confirm);
expect(screen.getByRole('alert').textContent).toBe('Пароли не совпадают');
await fireEvent.change(confirm, { target: { value: 'secret123' } });
expect(screen.queryAllByRole('alert')).toHaveLength(0);`,
      },
      {
        name: 'пароль без цифры невалиден',
        hidden: true,
        code: `const calls = [];
await render(h(exports.SignupForm, { onSubmit: (data) => calls.push(data) }));
await fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.co' } });
await fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'longpassword' } });
await fireEvent.change(screen.getByLabelText('Повторите пароль'), { target: { value: 'longpassword' } });
await fireEvent.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));
expect(calls).toHaveLength(0);
expect(screen.getByRole('alert').textContent).toBe('Минимум 8 символов и хотя бы одна цифра');`,
      },
    ],
  },
];
