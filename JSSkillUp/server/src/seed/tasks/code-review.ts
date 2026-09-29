import type { SeedTask } from '../types.js';

/**
 * Code review: дан код с ошибками, нужно найти их и исправить. Тесты проверяют исправления,
 * а заметки к решению перечисляют все проблемы — как ответ на ревью.
 */
export const codeReviewTasks: SeedTask[] = [
  {
    slug: 'review-effect-loop',
    topic: 'effects',
    title: 'Ревью: эффект, который не останавливается',
    kind: 'review',
    runtime: 'preview',
    difficulty: 'easy',
    tags: ['useEffect', 'зависимости', 'race condition'],
    statementMd: `Коллега написал карточку пользователя. В продакшене сервер получает сотни запросов
в секунду, а иногда на экране оказывается «чужой» пользователь.

Найдите причины и исправьте \`UserCard\`, не меняя её API:
- при монтировании \`fetchUser\` вызывается **один раз**;
- при смене \`userId\` — ещё один раз, с новым id;
- если ответ по старому \`userId\` пришёл позже нового, на экране остаётся новый пользователь.

Перед исправлением сформулируйте для себя, что именно вы бы написали в комментарии на ревью.`,
    starterCode: `import { useEffect, useState } from 'react';

type User = { id: number; name: string };
type Options = { includePosts: boolean };
type FetchUser = (id: number, options: Options) => Promise<User>;

export function UserCard({ userId, fetchUser }: { userId: number; fetchUser: FetchUser }) {
  const [user, setUser] = useState<User | null>(null);
  const options = { includePosts: false };

  useEffect(() => {
    fetchUser(userId, options).then((data) => setUser(data));
  }, [userId, options]);

  return <p data-testid="user">{user ? user.name : 'Загрузка…'}</p>;
}

const fakeFetchUser: FetchUser = (id) =>
  new Promise((resolve) => setTimeout(() => resolve({ id, name: \`Пользователь #\${id}\` }), 300));

export default function App() {
  const [id, setId] = useState(1);
  return (
    <div>
      <button onClick={() => setId((n) => n + 1)}>Следующий</button>
      <UserCard userId={id} fetchUser={fakeFetchUser} />
    </div>
  );
}
`,
    solutionCode: `import { useEffect, useState } from 'react';

type User = { id: number; name: string };
type Options = { includePosts: boolean };
type FetchUser = (id: number, options: Options) => Promise<User>;

// Константа вне компонента: одна ссылка на все рендеры.
const OPTIONS: Options = { includePosts: false };

export function UserCard({ userId, fetchUser }: { userId: number; fetchUser: FetchUser }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let ignore = false;
    fetchUser(userId, OPTIONS).then((data) => {
      // Ответ устаревшего запроса отбрасываем.
      if (!ignore) setUser(data);
    });
    return () => {
      ignore = true;
    };
  }, [userId, fetchUser]);

  return <p data-testid="user">{user ? user.name : 'Загрузка…'}</p>;
}

const fakeFetchUser: FetchUser = (id) =>
  new Promise((resolve) => setTimeout(() => resolve({ id, name: \`Пользователь #\${id}\` }), 300));

export default function App() {
  const [id, setId] = useState(1);
  return (
    <div>
      <button onClick={() => setId((n) => n + 1)}>Следующий</button>
      <UserCard userId={id} fetchUser={fakeFetchUser} />
    </div>
  );
}
`,
    solutionNotesMd: `Комментарии на ревью:

1. **Объект в зависимостях эффекта.** \`options\` создаётся заново на каждом рендере, а
   зависимости сравниваются через \`Object.is\` — эффект срабатывает после каждого рендера.
   Цикл: запрос → \`setUser\` (новый объект) → рендер → новый \`options\` → эффект → запрос…
   Исправления: константа вне компонента, \`useMemo\`, или зависимость от примитивов
   (\`options.includePosts\`).
2. **Race condition.** Ответы могут прийти не в том порядке, в каком ушли запросы.
   Флаг \`ignore\` в cleanup (или \`AbortController\`, если API поддерживает \`signal\`).
3. **Неполные зависимости.** \`fetchUser\` используется в эффекте — он должен быть в массиве.
   Если родитель передаёт нестабильную функцию, это его ответственность (\`useCallback\`).

Бонус для обсуждения: \`user\` остаётся от предыдущего id, пока грузится новый, — нужен
ли сброс в «Загрузка…»? Это продуктовое решение (TanStack Query называет его
\`placeholderData\`/\`keepPreviousData\`).`,
    hints: [
      'Сколько раз срабатывает эффект? Сравните `options` на двух соседних рендерах через `===`.',
      'Что будет, если запрос для userId=1 ответит позже запроса для userId=2?',
      'В cleanup эффекта выставьте флаг `ignore = true` и проверяйте его перед `setUser`.',
    ],
    tests: [
      {
        name: 'при монтировании один запрос',
        code: `const calls = [];
const fetchUser = (id) => { calls.push(id); return Promise.resolve({ id, name: 'U' + id }); };
await render(h(exports.UserCard, { userId: 1, fetchUser }));
await sleep(60);
expect(calls).toEqual([1]);
expect(screen.getByTestId('user').textContent).toBe('U1');`,
      },
      {
        name: 'смена userId — ещё один запрос',
        code: `const calls = [];
const fetchUser = (id) => { calls.push(id); return Promise.resolve({ id, name: 'U' + id }); };
const view = await render(h(exports.UserCard, { userId: 1, fetchUser }));
await sleep(30);
await view.rerender(h(exports.UserCard, { userId: 2, fetchUser }));
await sleep(60);
expect(calls).toEqual([1, 2]);
expect(screen.getByTestId('user').textContent).toBe('U2');`,
      },
      {
        name: 'поздний ответ по старому id не перетирает новый',
        hidden: true,
        code: `const fetchUser = (id) => new Promise((resolve) => setTimeout(() => resolve({ id, name: 'U' + id }), id === 1 ? 90 : 10));
const view = await render(h(exports.UserCard, { userId: 1, fetchUser }));
await view.rerender(h(exports.UserCard, { userId: 2, fetchUser }));
await sleep(140);
expect(screen.getByTestId('user').textContent).toBe('U2');`,
      },
    ],
  },

  {
    slug: 'review-todo-mutations',
    topic: 'keys-lists',
    title: 'Ревью: мутации и key={index}',
    kind: 'review',
    runtime: 'preview',
    difficulty: 'medium',
    tags: ['иммутабельность', 'keys', 'memo'],
    statementMd: `Список дел «иногда не обновляется», а заметки к задачам «перепрыгивают» между строками.
Найдите все причины и исправьте.

Что должно работать:
- **«Добавить»** сразу показывает новую задачу (пустой текст не добавляется);
- чекбокс переключает задачу;
- у каждой задачи есть поле заметки (\`aria-label\` «Заметка к «текст»») — после удаления
  другой задачи заметка остаётся у своей задачи;
- две задачи, добавленные подряд, независимы друг от друга.

\`TodoItem\` обёрнут в \`memo\` намеренно — это не ошибка, а условие задачи.`,
    starterCode: `import { memo, useState } from 'react';

type Todo = { id: number; text: string; done: boolean };

type ItemProps = { todo: Todo; onToggle: (id: number) => void; onRemove: (id: number) => void };

const TodoItem = memo(function TodoItem({ todo, onToggle, onRemove }: ItemProps) {
  return (
    <li>
      <label>
        <input type="checkbox" checked={todo.done} onChange={() => onToggle(todo.id)} /> {todo.text}
      </label>
      <input aria-label={\`Заметка к «\${todo.text}»\`} defaultValue="" />
      <button aria-label={\`Удалить «\${todo.text}»\`} onClick={() => onRemove(todo.id)}>
        ✕
      </button>
    </li>
  );
});

const INITIAL: Todo[] = [
  { id: 1, text: 'Купить хлеб', done: false },
  { id: 2, text: 'Позвонить маме', done: false },
];

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>(INITIAL);
  const [text, setText] = useState('');

  const add = () => {
    if (!text.trim()) return;
    todos.push({ id: Date.now(), text: text.trim(), done: false });
    setTodos(todos);
    setText('');
  };

  const toggle = (id: number) => {
    const todo = todos.find((item) => item.id === id);
    if (todo) todo.done = !todo.done;
    setTodos([...todos]);
  };

  const remove = (id: number) => setTodos(todos.filter((item) => item.id !== id));

  return (
    <div>
      <label htmlFor="new">Новая задача</label>
      <input id="new" value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={add}>Добавить</button>
      <ul>
        {todos.map((todo, index) => (
          <TodoItem key={index} todo={todo} onToggle={toggle} onRemove={remove} />
        ))}
      </ul>
    </div>
  );
}
`,
    solutionCode: `import { memo, useRef, useState } from 'react';

type Todo = { id: number; text: string; done: boolean };

type ItemProps = { todo: Todo; onToggle: (id: number) => void; onRemove: (id: number) => void };

const TodoItem = memo(function TodoItem({ todo, onToggle, onRemove }: ItemProps) {
  return (
    <li>
      <label>
        <input type="checkbox" checked={todo.done} onChange={() => onToggle(todo.id)} /> {todo.text}
      </label>
      <input aria-label={\`Заметка к «\${todo.text}»\`} defaultValue="" />
      <button aria-label={\`Удалить «\${todo.text}»\`} onClick={() => onRemove(todo.id)}>
        ✕
      </button>
    </li>
  );
});

const INITIAL: Todo[] = [
  { id: 1, text: 'Купить хлеб', done: false },
  { id: 2, text: 'Позвонить маме', done: false },
];

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>(INITIAL);
  const [text, setText] = useState('');
  // Монотонный счётчик вместо Date.now(): два добавления в одну миллисекунду не дадут дубль id.
  const nextId = useRef(INITIAL.length + 1);

  const add = () => {
    const value = text.trim();
    if (!value) return;
    const id = nextId.current++;
    setTodos((current) => [...current, { id, text: value, done: false }]);
    setText('');
  };

  // Новый объект для изменённой задачи — иначе memo(TodoItem) увидит тот же todo и не перерисует строку.
  const toggle = (id: number) =>
    setTodos((current) => current.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));

  const remove = (id: number) => setTodos((current) => current.filter((item) => item.id !== id));

  return (
    <div>
      <label htmlFor="new">Новая задача</label>
      <input id="new" value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={add}>Добавить</button>
      <ul>
        {todos.map((todo) => (
          <TodoItem key={todo.id} todo={todo} onToggle={toggle} onRemove={remove} />
        ))}
      </ul>
    </div>
  );
}
`,
    solutionNotesMd: `Четыре проблемы:

1. **\`todos.push\` + \`setTodos(todos)\`** — мутация и та же ссылка. React сравнивает state
   через \`Object.is\` и пропускает рендер: задача появится только при следующем постороннем
   обновлении. Плюс \`INITIAL\` — модульная константа, её мутация «переживает» размонтирование.
2. **\`todo.done = !todo.done\`** — мутация элемента. \`[...todos]\` создаёт новый массив,
   но объект задачи тот же. Сейчас баг замаскирован: обработчики пересоздаются на каждом
   рендере, поэтому \`memo(TodoItem)\` всё равно перерисовывает строки. Стоит кому-то
   «оптимизировать» их через \`useCallback\` — \`memo\` увидит тот же \`todo\` и пропустит рендер,
   чекбокс перестанет переключаться. И мутируются объекты из \`INITIAL\`: повторное монтирование
   списка покажет «грязные» данные. Нужна копия: \`{ ...item, done: !item.done }\`.
3. **\`key={index}\`** — после удаления первой задачи React сопоставит компонент с ключом 0
   со второй задачей. Неконтролируемый \`<input defaultValue>\` хранит своё значение в DOM
   и остаётся на месте: заметка «переезжает» к чужой задаче. Ключ — стабильный id.
4. **\`id: Date.now()\`** — два добавления в одну миллисекунду дают одинаковые id:
   конфликт ключей и переключение «обеих» задач. Счётчик в \`useRef\` или \`crypto.randomUUID()\`.

Заодно: обработчики используют функциональные обновления — они не зависят от \`todos\`
из замыкания и их проще сделать стабильными через \`useCallback\`, чтобы \`memo\` работал
в полную силу.`,
    hints: [
      'Сравните ссылку на массив до и после `add`. Что делает React, если новое состояние `===` старому?',
      '`TodoItem` обёрнут в `memo`. Меняется ли объект `todo` после `toggle`?',
      'Что хранит `defaultValue`-инпут и к чему он «привязан», если ключ — индекс?',
    ],
    tests: [
      {
        name: '«Добавить» сразу показывает задачу',
        code: `await render(h(exports.default));
await fireEvent.change(screen.getByLabelText('Новая задача'), { target: { value: 'Выучить хуки' } });
await fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));
expect(screen.getAllByRole('listitem')).toHaveLength(3);
expect(screen.getByRole('checkbox', { name: 'Выучить хуки' })).toBeTruthy();`,
      },
      {
        name: 'чекбокс переключает задачу',
        code: `await render(h(exports.default));
await fireEvent.click(screen.getByRole('checkbox', { name: 'Купить хлеб' }));
expect(screen.getByRole('checkbox', { name: 'Купить хлеб' }).checked).toBe(true);
await fireEvent.click(screen.getByRole('checkbox', { name: 'Купить хлеб' }));
expect(screen.getByRole('checkbox', { name: 'Купить хлеб' }).checked).toBe(false);`,
      },
      {
        name: 'заметка остаётся у своей задачи после удаления соседней',
        hidden: true,
        code: `await render(h(exports.default));
await fireEvent.change(screen.getByLabelText('Заметка к «Позвонить маме»'), { target: { value: 'вечером' } });
await fireEvent.click(screen.getByRole('button', { name: 'Удалить «Купить хлеб»' }));
expect(screen.getByLabelText('Заметка к «Позвонить маме»').value).toBe('вечером');`,
      },
      {
        name: 'повторное монтирование начинается с исходного списка',
        hidden: true,
        code: `const first = await render(h(exports.default));
await fireEvent.change(screen.getByLabelText('Новая задача'), { target: { value: 'Лишняя' } });
await fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));
await fireEvent.click(screen.getByRole('checkbox', { name: 'Купить хлеб' }));
await first.unmount();
await render(h(exports.default));
expect(screen.getAllByRole('listitem')).toHaveLength(2);
expect(screen.getByRole('checkbox', { name: 'Купить хлеб' }).checked).toBe(false);`,
      },
      {
        name: 'задачи, добавленные подряд, независимы',
        hidden: true,
        code: `const realNow = Date.now;
Date.now = () => 1700000000000;
try {
  await render(h(exports.default));
  const input = screen.getByLabelText('Новая задача');
  await fireEvent.change(input, { target: { value: 'X' } });
  await fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));
  await fireEvent.change(input, { target: { value: 'Y' } });
  await fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));
  await fireEvent.click(screen.getByRole('checkbox', { name: 'X' }));
  expect(screen.getByRole('checkbox', { name: 'X' }).checked).toBe(true);
  expect(screen.getByRole('checkbox', { name: 'Y' }).checked).toBe(false);
} finally {
  Date.now = realNow;
}`,
      },
    ],
  },

  {
    slug: 'review-edit-profile',
    topic: 'state-hooks',
    title: 'Ревью: пропсы, скопированные в state',
    kind: 'review',
    runtime: 'preview',
    difficulty: 'medium',
    tags: ['производное состояние', 'key', 'useEffect'],
    statementMd: `Форма редактирования профиля. Жалоба: «выбираю другого пользователя в списке,
а в форме остаются данные предыдущего». Ещё на ревью заметили два \`useEffect\`, которые
«можно убрать».

Исправьте \`EditProfile\`, сохранив её API и разметку:
- при смене **пользователя** (другой \`user.id\`) поля заполняются его данными,
  кнопка «Сохранить» заблокирована;
- если родитель передал **того же** пользователя новым объектом (например, после
  повторной загрузки), незаконченные правки не теряются;
- \`data-testid="preview"\` показывает \`Имя <email>\` по текущим значениям полей;
- «Сохранить» активна, только если есть изменения, и вызывает \`onSave\` с обновлённым пользователем.`,
    starterCode: `import { useEffect, useState, type SubmitEvent } from 'react';

type User = { id: number; name: string; email: string };

export function EditProfile({ user, onSave }: { user: User; onSave: (user: User) => void }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [preview, setPreview] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setPreview(\`\${name} <\${email}>\`);
  }, [name, email]);

  useEffect(() => {
    setDirty(name !== user.name || email !== user.email);
  }, [name, email]);

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    onSave({ ...user, name, email });
  };

  return (
    <form onSubmit={submit}>
      <label htmlFor="name">Имя</label>
      <input id="name" value={name} onChange={(e) => setName(e.target.value)} />
      <label htmlFor="email">Email</label>
      <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <p data-testid="preview">{preview}</p>
      <button type="submit" disabled={!dirty}>
        Сохранить
      </button>
    </form>
  );
}

const USERS: User[] = [
  { id: 1, name: 'Анна', email: 'anna@mail.ru' },
  { id: 2, name: 'Борис', email: 'boris@mail.ru' },
];

export default function App() {
  const [selected, setSelected] = useState(USERS[0]!);
  return (
    <div>
      {USERS.map((user) => (
        <button key={user.id} onClick={() => setSelected(user)}>
          {user.name}
        </button>
      ))}
      <EditProfile user={selected} onSave={(user) => console.log('save', user)} />
    </div>
  );
}
`,
    solutionCode: `import { useState, type SubmitEvent } from 'react';

type User = { id: number; name: string; email: string };
type Props = { user: User; onSave: (user: User) => void };

// key по id: другой пользователь — новый экземпляр формы с чистым состоянием.
// Тот же id — тот же экземпляр, правки сохраняются.
export function EditProfile(props: Props) {
  return <EditProfileForm key={props.user.id} {...props} />;
}

function EditProfileForm({ user, onSave }: Props) {
  // useState(initial) читает пропс только при монтировании — это и есть «начальное значение».
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);

  // Производные значения — при рендере, без эффектов и лишнего state.
  const preview = \`\${name} <\${email}>\`;
  const dirty = name !== user.name || email !== user.email;

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    onSave({ ...user, name, email });
  };

  return (
    <form onSubmit={submit}>
      <label htmlFor="name">Имя</label>
      <input id="name" value={name} onChange={(e) => setName(e.target.value)} />
      <label htmlFor="email">Email</label>
      <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <p data-testid="preview">{preview}</p>
      <button type="submit" disabled={!dirty}>
        Сохранить
      </button>
    </form>
  );
}

const USERS: User[] = [
  { id: 1, name: 'Анна', email: 'anna@mail.ru' },
  { id: 2, name: 'Борис', email: 'boris@mail.ru' },
];

export default function App() {
  const [selected, setSelected] = useState(USERS[0]!);
  return (
    <div>
      {USERS.map((user) => (
        <button key={user.id} onClick={() => setSelected(user)}>
          {user.name}
        </button>
      ))}
      <EditProfile user={selected} onSave={(user) => console.log('save', user)} />
    </div>
  );
}
`,
    solutionNotesMd: `Проблемы:

1. **Пропс, скопированный в state.** \`useState(user.name)\` использует аргумент только
   при первом рендере — смена \`user\` его не обновит. Варианты:
   - **\`key={user.id}\`** — самый простой и правильный: другой пользователь = другой
     экземпляр формы. Тот же id — правки на месте, даже если объект пришёл новый.
   - «Сброс при изменении пропса» во время рендера (\`if (user.id !== prevId) { … }\`).
   - \`useEffect(() => setName(user.name), [user])\` — **плохо**: лишний рендер со старыми
     данными, и правки теряются при любом новом объекте пользователя.
2. **\`preview\` через эффект** — производное значение. Эффект даёт лишний рендер и кадр
   с пустым превью. Вычисляйте при рендере.
3. **\`dirty\` через эффект** — то же самое плюс неполные зависимости (\`user\` не указан),
   поэтому флаг устаревает при смене пользователя.

Правило из документации React «You Might Not Need an Effect»: если значение можно
вычислить из пропсов и state — вычисляйте, а не синхронизируйте.`,
    hints: [
      'Когда React читает аргумент `useState(initial)`? Что происходит при следующих рендерах?',
      '`preview` и `dirty` можно вычислить из текущих значений при рендере — зачем им state и эффекты?',
      'Чтобы «сбросить» состояние компонента при смене сущности, дайте ему `key`, зависящий от id.',
    ],
    tests: [
      {
        name: 'редактирование, превью и сохранение',
        code: `const saved = [];
await render(h(exports.EditProfile, { user: { id: 1, name: 'Анна', email: 'a@m.ru' }, onSave: (u) => saved.push(u) }));
expect(screen.getByTestId('preview').textContent).toBe('Анна <a@m.ru>');
expect(screen.getByRole('button', { name: 'Сохранить' }).disabled).toBe(true);
await fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Аня' } });
expect(screen.getByTestId('preview').textContent).toBe('Аня <a@m.ru>');
await fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
expect(saved).toEqual([{ id: 1, name: 'Аня', email: 'a@m.ru' }]);`,
      },
      {
        name: 'другой пользователь — поля с его данными',
        code: `const onSave = () => {};
const view = await render(h(exports.EditProfile, { user: { id: 1, name: 'Анна', email: 'a@m.ru' }, onSave }));
await fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Черновик' } });
await view.rerender(h(exports.EditProfile, { user: { id: 2, name: 'Борис', email: 'b@m.ru' }, onSave }));
expect(screen.getByLabelText('Имя').value).toBe('Борис');
expect(screen.getByLabelText('Email').value).toBe('b@m.ru');
expect(screen.getByTestId('preview').textContent).toBe('Борис <b@m.ru>');`,
      },
      {
        name: 'после смены пользователя «Сохранить» заблокирована',
        hidden: true,
        code: `const onSave = () => {};
const view = await render(h(exports.EditProfile, { user: { id: 1, name: 'Анна', email: 'a@m.ru' }, onSave }));
await fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Черновик' } });
await view.rerender(h(exports.EditProfile, { user: { id: 2, name: 'Борис', email: 'b@m.ru' }, onSave }));
expect(screen.getByRole('button', { name: 'Сохранить' }).disabled).toBe(true);`,
      },
      {
        name: 'тот же пользователь новым объектом — правки сохраняются',
        hidden: true,
        code: `const onSave = () => {};
const view = await render(h(exports.EditProfile, { user: { id: 1, name: 'Анна', email: 'a@m.ru' }, onSave }));
await fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Аня' } });
await view.rerender(h(exports.EditProfile, { user: { id: 1, name: 'Анна', email: 'a@m.ru' }, onSave }));
expect(screen.getByLabelText('Имя').value).toBe('Аня');
expect(screen.getByRole('button', { name: 'Сохранить' }).disabled).toBe(false);`,
      },
    ],
  },

  {
    slug: 'review-js-utils',
    topic: 'arrays-objects-api',
    title: 'Ревью: шесть «очевидных» утилит',
    kind: 'review',
    difficulty: 'easy',
    tags: ['массивы', 'приведение типов', 'NaN'],
    statementMd: `Каждая функция ниже прошла ревью «на глаз», но в каждой есть ошибка.
Исправьте их, чтобы они соответствовали контракту:

| Функция | Контракт |
| --- | --- |
| \`parseIds(values)\` | строки → целые числа в десятичной системе: \`['1', '2', '10']\` → \`[1, 2, 10]\` |
| \`sortPrices(prices)\` | **новый** массив по возрастанию, исходный не меняется |
| \`sumTotal(items)\` | сумма \`price × qty\`; для пустого массива \`0\` |
| \`isBlank(value)\` | \`true\` только для \`null\`, \`undefined\` и строк из одних пробельных символов |
| \`uniq(items)\` | уникальные значения в порядке первого появления; \`NaN\` считается равным \`NaN\` |
| \`countWords(text)\` | число слов, разделённых любыми пробельными символами; \`''\` → \`0\` |

Для каждой функции сформулируйте, почему исходный код не работает, — это и есть
вопрос собеседования.`,
    starterCode: `function parseIds(values: string[]): number[] {
  return values.map(parseInt);
}

function sortPrices(prices: number[]): number[] {
  return prices.sort();
}

function sumTotal(items: Array<{ price: number; qty: number }>): number {
  return items.reduce((sum: any, item) => sum + item.price * item.qty);
}

function isBlank(value: unknown): boolean {
  return value == false || value == null;
}

function uniq<T>(items: T[]): T[] {
  return items.filter((item, index) => items.indexOf(item) === index);
}

function countWords(text: string): number {
  return text.split(' ').length;
}
`,
    solutionCode: `function parseIds(values: string[]): number[] {
  // map передаёт (value, index), и index становится основанием системы счисления.
  return values.map((value) => Number.parseInt(value, 10));
}

function sortPrices(prices: number[]): number[] {
  // sort без компаратора сравнивает строки, и к тому же мутирует массив.
  return [...prices].sort((a, b) => a - b);
}

function sumTotal(items: Array<{ price: number; qty: number }>): number {
  // Без начального значения аккумулятор — первый элемент (объект), а на [] — TypeError.
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  return typeof value === 'string' && value.trim() === '';
}

function uniq<T>(items: T[]): T[] {
  // Set сравнивает по SameValueZero: NaN равен NaN, в отличие от indexOf (===).
  return [...new Set(items)];
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\\s+/).length;
}
`,
    solutionNotesMd: `1. **\`map(parseInt)\`** — \`map\` вызывает колбэк с \`(value, index, array)\`, и
   \`parseInt('2', 1)\` → \`NaN\` (основание 1 недопустимо), \`parseInt('10', 2)\` → \`2\`.
2. **\`sort()\`** без компаратора приводит элементы к строкам: \`[10, 9, 1]\` → \`[1, 10, 9]\`.
   И \`sort\` сортирует **на месте** — исходный массив вызывающего кода испорчен.
   В ES2023 есть \`toSorted\`.
3. **\`reduce\` без начального значения**: аккумулятор = первый элемент (объект), дальше
   \`'[object Object]' + …\`; на пустом массиве — \`TypeError\`. \`any\` в сигнатуре скрыл ошибку
   от TypeScript — ещё один повод его не использовать.
4. **\`value == false\`** — нестрогое сравнение приводит к числу: \`0 == false\`,
   \`'0' == false\`, \`[] == false\`, \`'  ' == false\` — всё \`true\`. Строгие проверки
   и явная обработка строк.
5. **\`indexOf\`** использует \`===\`, а \`NaN !== NaN\`: \`indexOf(NaN)\` всегда \`-1\`,
   и NaN исчезает из результата целиком. \`Set\` и \`includes\` используют SameValueZero.
6. **\`split(' ')\`** не учитывает несколько пробелов, табы и переносы, а \`''.split(' ')\`
   даёт \`['']\` — длина 1.`,
    hints: [
      'Какие аргументы `map` передаёт в колбэк? Что `parseInt` делает со вторым аргументом?',
      'Как `sort()` сравнивает числа без компаратора и что происходит с исходным массивом?',
      'Чему равно `NaN === NaN` и какое сравнение использует `indexOf`, а какое — `Set`?',
    ],
    tests: [
      {
        name: 'parseIds',
        code: `expect(parseIds(['1', '2', '10', '07'])).toEqual([1, 2, 10, 7]);`,
      },
      {
        name: 'sortPrices сортирует числа и не мутирует',
        code: `const prices = [100, 25, 3, 1000];
expect(sortPrices(prices)).toEqual([3, 25, 100, 1000]);
expect(prices).toEqual([100, 25, 3, 1000]);`,
      },
      {
        name: 'sumTotal',
        code: `expect(sumTotal([{ price: 100, qty: 2 }, { price: 50, qty: 1 }])).toBe(250);
expect(sumTotal([])).toBe(0);`,
      },
      {
        name: 'isBlank',
        hidden: true,
        code: `expect(isBlank(null)).toBe(true);
expect(isBlank(undefined)).toBe(true);
expect(isBlank('   ')).toBe(true);
expect(isBlank('\\t\\n')).toBe(true);
expect(isBlank(0)).toBe(false);
expect(isBlank('0')).toBe(false);
expect(isBlank([])).toBe(false);
expect(isBlank(false)).toBe(false);
expect(isBlank('a')).toBe(false);`,
      },
      {
        name: 'uniq сохраняет NaN',
        hidden: true,
        code: `expect(uniq([1, 2, 1, 3, 2])).toEqual([1, 2, 3]);
const result = uniq([NaN, 1, NaN]);
expect(result).toHaveLength(2);
expect(Number.isNaN(result[0])).toBe(true);`,
      },
      {
        name: 'countWords',
        hidden: true,
        code: `expect(countWords('')).toBe(0);
expect(countWords('   ')).toBe(0);
expect(countWords('один')).toBe(1);
expect(countWords('  раз   два\\tтри\\nчетыре ')).toBe(4);`,
      },
    ],
  },

  {
    slug: 'review-async-bugs',
    topic: 'async-await',
    title: 'Ревью: ошибки в async-коде',
    kind: 'review',
    difficulty: 'medium',
    tags: ['async/await', 'Promise.all', 'forEach'],
    statementMd: `Четыре функции работы с асинхронностью. В каждой — классическая ошибка.

| Функция | Контракт |
| --- | --- |
| \`loadAll(ids, fetchItem)\` | загружает **параллельно**, результат в порядке \`ids\` |
| \`loadSequentially(ids, fetchItem)\` | загружает **строго по очереди**: следующий запрос — после завершения предыдущего; результат в порядке \`ids\` |
| \`withRetry(fn, attempts)\` | вызывает \`fn\` до \`attempts\` раз, пока промис не выполнится; если все попытки провалились — отклоняется последней ошибкой |
| \`valueOrFallback(promise, ms, fallback)\` | значение промиса, если он выполнился за \`ms\`; иначе — \`fallback\`, **в том числе если промис отклонился** |`,
    starterCode: `async function loadAll<T>(ids: number[], fetchItem: (id: number) => Promise<T>): Promise<T[]> {
  const results: T[] = [];
  ids.forEach(async (id) => {
    results.push(await fetchItem(id));
  });
  return results;
}

async function loadSequentially<T>(ids: number[], fetchItem: (id: number) => Promise<T>): Promise<T[]> {
  return Promise.all(ids.map((id) => fetchItem(id)));
}

async function withRetry<T>(fn: () => Promise<T>, attempts: number): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return fn();
    } catch (error) {
      if (i === attempts - 1) throw error;
    }
  }
  throw new Error('attempts должно быть больше 0');
}

async function valueOrFallback<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  const timeout = new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms));
  return Promise.race([promise, timeout]);
}
`,
    solutionCode: `async function loadAll<T>(ids: number[], fetchItem: (id: number) => Promise<T>): Promise<T[]> {
  // forEach не ждёт async-колбэки. Promise.all ждёт все и сохраняет порядок входа.
  return Promise.all(ids.map((id) => fetchItem(id)));
}

async function loadSequentially<T>(ids: number[], fetchItem: (id: number) => Promise<T>): Promise<T[]> {
  const results: T[] = [];
  for (const id of ids) {
    // await в for...of действительно ждёт каждую итерацию.
    results.push(await fetchItem(id));
  }
  return results;
}

async function withRetry<T>(fn: () => Promise<T>, attempts: number): Promise<T> {
  let lastError: unknown = new Error('attempts должно быть больше 0');
  for (let i = 0; i < attempts; i++) {
    try {
      // return await: без await отклонённый промис уходит из try, минуя catch.
      return await fn();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function valueOrFallback<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  try {
    // Отклонение превращается в fallback, а таймер очищается в любом случае.
    return await Promise.race([promise.catch(() => fallback), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
`,
    solutionNotesMd: `1. **\`forEach(async …)\`** — \`forEach\` игнорирует возвращаемые промисы: функция возвращает
   пустой массив сразу, а ошибки из колбэков становятся unhandled rejection. Порядок
   \`push\` к тому же зависел бы от того, кто ответил первым. \`Promise.all(ids.map(…))\`.
2. **«Последовательно» через \`Promise.all\`** — \`map\` запускает все запросы сразу.
   Последовательность даёт \`for…of\` с \`await\` (или \`reduce\` по цепочке промисов).
   Когда это нужно: rate limit API, зависимые запросы, контроль нагрузки.
3. **\`return fn()\` без \`await\` в \`try\`** — промис возвращается как есть, его отклонение
   случится уже после выхода из \`try\`, и \`catch\` не сработает. \`return await\` внутри
   \`try/catch\` — единственное место, где \`await\` перед \`return\` меняет поведение.
4. **\`Promise.race\`** отклоняется, если промис отклонился раньше таймаута. И таймер не
   очищается: процесс или тест будет ждать его завершения. \`promise.catch(() => fallback)\`
   и \`clearTimeout\` в \`finally\`.

Что спросят дальше: как ограничить параллельность N запросами (пул), \`Promise.allSettled\`
и \`Promise.any\`, отмена через \`AbortSignal\`.`,
    hints: [
      'Ждёт ли `forEach` промисы, которые возвращает async-колбэк? Когда `loadAll` возвращает результат?',
      'Когда именно отклоняется промис в `return fn()` — внутри `try` или уже после выхода из него?',
      'Что делает `Promise.race`, если первым завершился отклонённый промис?',
    ],
    tests: [
      {
        name: 'loadAll: порядок ids',
        code: `const fetchItem = (id) => new Promise((r) => setTimeout(() => r('item' + id), 40 - id * 10));
expect(await loadAll([1, 2, 3], fetchItem)).toEqual(['item1', 'item2', 'item3']);`,
      },
      {
        name: 'loadAll: запросы идут параллельно',
        code: `const fetchItem = (id) => new Promise((r) => setTimeout(() => r(id), 60));
const started = Date.now();
await loadAll([1, 2, 3, 4], fetchItem);
expect(Date.now() - started < 150).toBe(true);`,
      },
      {
        name: 'loadSequentially: не больше одного запроса одновременно',
        hidden: true,
        code: `let active = 0;
let maxActive = 0;
const fetchItem = async (id) => {
  active += 1;
  maxActive = Math.max(maxActive, active);
  await sleep(15);
  active -= 1;
  return id * 10;
};
expect(await loadSequentially([1, 2, 3], fetchItem)).toEqual([10, 20, 30]);
expect(maxActive).toBe(1);`,
      },
      {
        name: 'withRetry: повторяет отклонённые промисы',
        hidden: true,
        code: `let calls = 0;
const fn = async () => {
  calls += 1;
  if (calls < 3) throw new Error('fail ' + calls);
  return 'ok';
};
expect(await withRetry(fn, 5)).toBe('ok');
expect(calls).toBe(3);`,
      },
      {
        name: 'withRetry: после всех попыток — последняя ошибка',
        hidden: true,
        code: `let calls = 0;
const fn = async () => { calls += 1; throw new Error('fail ' + calls); };
let message = '';
try { await withRetry(fn, 3); } catch (error) { message = error.message; }
expect(message).toBe('fail 3');
expect(calls).toBe(3);`,
      },
      {
        name: 'valueOrFallback: значение, таймаут и отклонение',
        hidden: true,
        code: `expect(await valueOrFallback(Promise.resolve(1), 50, 0)).toBe(1);
expect(await valueOrFallback(new Promise((r) => setTimeout(() => r(1), 80)), 20, 0)).toBe(0);
expect(await valueOrFallback(Promise.reject(new Error('x')), 50, 'fallback')).toBe('fallback');`,
      },
    ],
  },

  {
    slug: 'review-context-rerenders',
    topic: 'context',
    title: 'Ревью: Context перерисовывает всё приложение',
    kind: 'review',
    runtime: 'preview',
    difficulty: 'hard',
    tags: ['Context', 'производительность', 'useMemo'],
    statementMd: `Приложение хранит пользователя и тему в одном контексте. Профилирование показывает,
что при вводе имени перерисовываются компоненты темы, и наоборот.
Компоненты пишут своё имя в \`renderLog\` — **не удаляйте эти строки**.

Добейтесь, чтобы:
- ввод в поле **«Имя»** перерисовывал \`UserName\`, но **не** \`ThemeLabel\` и \`ThemeButton\`;
- кнопка **«Сменить тему»** перерисовывала \`ThemeLabel\`, но **не** \`UserName\` и **не** саму
  \`ThemeButton\` (ей нужна только функция переключения).

Экспорты \`AppProvider\`, \`UserName\`, \`ThemeLabel\`, \`ThemeButton\`, \`UserInput\` и \`App\`
должны остаться. Внутреннее устройство провайдера и хуков — на ваше усмотрение.`,
    starterCode: `import { createContext, useContext, useState, type ReactNode } from 'react';

export const renderLog: string[] = [];

type Theme = 'light' | 'dark';
type AppState = {
  user: string;
  setUser: (user: string) => void;
  theme: Theme;
  toggleTheme: () => void;
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children?: ReactNode }) {
  const [user, setUser] = useState('Гость');
  const [theme, setTheme] = useState<Theme>('light');
  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  return <AppContext.Provider value={{ user, setUser, theme, toggleTheme }}>{children}</AppContext.Provider>;
}

function useApp(): AppState {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp вне AppProvider');
  return context;
}

export function UserInput() {
  const { user, setUser } = useApp();
  return <input aria-label="Имя" value={user} onChange={(e) => setUser(e.target.value)} />;
}

export function UserName() {
  const { user } = useApp();
  renderLog.push('UserName');
  return <p data-testid="user">Привет, {user}</p>;
}

export function ThemeLabel() {
  const { theme } = useApp();
  renderLog.push('ThemeLabel');
  return <p data-testid="theme">Тема: {theme}</p>;
}

export function ThemeButton() {
  const { toggleTheme } = useApp();
  renderLog.push('ThemeButton');
  return <button onClick={toggleTheme}>Сменить тему</button>;
}

export default function App() {
  return (
    <AppProvider>
      <UserInput />
      <UserName />
      <ThemeLabel />
      <ThemeButton />
    </AppProvider>
  );
}
`,
    solutionCode: `import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export const renderLog: string[] = [];

type Theme = 'light' | 'dark';
type UserState = { user: string; setUser: (user: string) => void };

// Три контекста по частоте изменений: данные пользователя, значение темы
// и функция переключения темы (она не меняется никогда).
const UserContext = createContext<UserState | null>(null);
const ThemeContext = createContext<Theme | null>(null);
const ThemeActionsContext = createContext<(() => void) | null>(null);

export function AppProvider({ children }: { children?: ReactNode }) {
  const [user, setUser] = useState('Гость');
  const [theme, setTheme] = useState<Theme>('light');

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'light' ? 'dark' : 'light')), []);
  // Новый объект только при смене user: иначе потребители перерисуются на каждый рендер провайдера.
  const userValue = useMemo(() => ({ user, setUser }), [user]);

  return (
    <UserContext.Provider value={userValue}>
      <ThemeActionsContext.Provider value={toggleTheme}>
        <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
      </ThemeActionsContext.Provider>
    </UserContext.Provider>
  );
}

function useRequired<T>(value: T | null, name: string): T {
  if (value === null) throw new Error(\`\${name} вне AppProvider\`);
  return value;
}

const useUser = () => useRequired(useContext(UserContext), 'useUser');
const useTheme = () => useRequired(useContext(ThemeContext), 'useTheme');
const useThemeActions = () => useRequired(useContext(ThemeActionsContext), 'useThemeActions');

export function UserInput() {
  const { user, setUser } = useUser();
  return <input aria-label="Имя" value={user} onChange={(e) => setUser(e.target.value)} />;
}

export function UserName() {
  const { user } = useUser();
  renderLog.push('UserName');
  return <p data-testid="user">Привет, {user}</p>;
}

export function ThemeLabel() {
  const theme = useTheme();
  renderLog.push('ThemeLabel');
  return <p data-testid="theme">Тема: {theme}</p>;
}

export function ThemeButton() {
  const toggleTheme = useThemeActions();
  renderLog.push('ThemeButton');
  return <button onClick={toggleTheme}>Сменить тему</button>;
}

export default function App() {
  return (
    <AppProvider>
      <UserInput />
      <UserName />
      <ThemeLabel />
      <ThemeButton />
    </AppProvider>
  );
}
`,
    solutionNotesMd: `**Как работает Context:** когда меняется \`value\` провайдера (по \`Object.is\`),
перерисовываются **все** компоненты, которые читают этот контекст через \`useContext\`, —
даже если им нужна только неизменившаяся часть. \`memo\` не спасает: подписка на контекст
пробивает его.

Проблемы исходного кода:
1. **Один контекст на всё** — любое изменение будит всех потребителей.
2. **\`value={{ … }}\`** — новый объект на каждый рендер провайдера.
3. **\`toggleTheme\`** создаётся заново на каждый рендер — даже вынесенная в свой контекст,
   она бы «менялась».

Решение: **разделить контексты** по частоте изменений (state / actions — паттерн
из Kent C. Dodds), стабилизировать значения через \`useMemo\` и \`useCallback\`.

Заметьте, почему \`App\` и дети вообще не перерисовываются при изменении state провайдера:
\`children\` — это элементы, созданные в \`App\`, а \`App\` не рендерится. Если бы провайдер
сам рендерил детей (\`<AppProvider><Layout/></AppProvider>\` внутри своего JSX), перерисовалось бы всё.

Когда контекстов становится много — это сигнал взять стейт-менеджер с селекторами
(Zustand, Redux, Jotai): компонент подписывается на конкретный кусок состояния.
\`use-context-selector\` делает то же для Context.`,
    hints: [
      'Кто перерисовывается при смене `value` контекста? Помогает ли тут `memo`?',
      'Разделите контекст на части, которые меняются независимо: пользователь, значение темы, функция переключения.',
      'Функция переключения должна быть стабильной (`useCallback` + функциональный setState), а объект пользователя — мемоизирован по `user`.',
    ],
    tests: [
      {
        name: 'всё работает: ввод имени и смена темы',
        code: `await render(h(exports.default));
await fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Лена' } });
expect(screen.getByTestId('user').textContent).toBe('Привет, Лена');
await fireEvent.click(screen.getByRole('button', { name: 'Сменить тему' }));
expect(screen.getByTestId('theme').textContent).toBe('Тема: dark');`,
      },
      {
        name: 'ввод имени не перерисовывает компоненты темы',
        code: `await render(h(exports.default));
renderLog.length = 0;
await fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Лена' } });
expect(renderLog).toContain('UserName');
expect(renderLog).not.toContain('ThemeLabel');
expect(renderLog).not.toContain('ThemeButton');`,
      },
      {
        name: 'смена темы перерисовывает только ThemeLabel',
        hidden: true,
        code: `await render(h(exports.default));
renderLog.length = 0;
await fireEvent.click(screen.getByRole('button', { name: 'Сменить тему' }));
expect(renderLog).toEqual(['ThemeLabel']);
await fireEvent.click(screen.getByRole('button', { name: 'Сменить тему' }));
expect(screen.getByTestId('theme').textContent).toBe('Тема: light');`,
      },
    ],
  },
];
