import type { SeedTask } from '../types.js';

/** Производительность, порталы, границы ошибок и паттерны — уровень «уверенный Middle». */
export const reactAdvancedTasks: SeedTask[] = [
  {
    slug: 'react-memo-rerenders',
    topic: 'memoization',
    title: 'Убрать лишние ререндеры списка',
    kind: 'react',
    runtime: 'preview',
    difficulty: 'medium',
    tags: ['memo', 'useCallback', 'производительность', 'баг'],
    statementMd: `В заготовке магазин: поле **«Заметка»**, счётчик корзины и список товаров.
Каждый \`ProductRow\` записывает своё имя в \`renderLog\` при рендере — **не удаляйте эту строку**,
по журналу тесты считают рендеры.

Сейчас любое действие перерисовывает все строки. Добейтесь, чтобы:
1. ввод в «Заметку» **не** перерисовывал ни одной строки;
2. клик «Добавить …» **не** перерисовывал строки (меняется только счётчик корзины),
   а корзина при этом считала правильно — в том числе при нескольких кликах подряд;
3. переключение сортировки **«Сначала дорогие»** меняло порядок строк, но **не** перерисовывало их.

Поведение магазина и разметка должны остаться прежними.`,
    starterCode: `import { useState } from 'react';

export const renderLog: string[] = [];

type Product = { id: number; name: string; price: number };

const PRODUCTS: Product[] = [
  { id: 1, name: 'Клавиатура', price: 4500 },
  { id: 2, name: 'Мышь', price: 1500 },
  { id: 3, name: 'Монитор', price: 21000 },
];

function ProductRow({ product, onAdd }: { product: Product; onAdd: (id: number) => void }) {
  renderLog.push(product.name); // не удаляйте: по этому журналу тесты считают рендеры
  return (
    <li>
      {product.name} — {product.price} ₽{' '}
      <button aria-label={\`Добавить \${product.name}\`} onClick={() => onAdd(product.id)}>
        +
      </button>
    </li>
  );
}

export default function Shop() {
  const [note, setNote] = useState('');
  const [cart, setCart] = useState<number[]>([]);
  const [expensiveFirst, setExpensiveFirst] = useState(false);

  const sorted = [...PRODUCTS].sort((a, b) => (expensiveFirst ? b.price - a.price : a.price - b.price));

  const handleAdd = (id: number) => {
    setCart([...cart, id]);
  };

  return (
    <div>
      <label htmlFor="note">Заметка</label>
      <input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
      <label>
        <input type="checkbox" checked={expensiveFirst} onChange={(e) => setExpensiveFirst(e.target.checked)} />
        Сначала дорогие
      </label>
      <p data-testid="cart">В корзине: {cart.length}</p>
      <ul>
        {sorted.map((product) => (
          <ProductRow key={product.id} product={product} onAdd={handleAdd} />
        ))}
      </ul>
    </div>
  );
}
`,
    solutionCode: `import { memo, useCallback, useMemo, useState } from 'react';

export const renderLog: string[] = [];

type Product = { id: number; name: string; price: number };

const PRODUCTS: Product[] = [
  { id: 1, name: 'Клавиатура', price: 4500 },
  { id: 2, name: 'Мышь', price: 1500 },
  { id: 3, name: 'Монитор', price: 21000 },
];

// memo: строка перерисуется, только если изменились её пропсы (сравнение Object.is по каждому).
const ProductRow = memo(function ProductRow({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (id: number) => void;
}) {
  renderLog.push(product.name); // не удаляйте: по этому журналу тесты считают рендеры
  return (
    <li>
      {product.name} — {product.price} ₽{' '}
      <button aria-label={\`Добавить \${product.name}\`} onClick={() => onAdd(product.id)}>
        +
      </button>
    </li>
  );
});

export default function Shop() {
  const [note, setNote] = useState('');
  const [cart, setCart] = useState<number[]>([]);
  const [expensiveFirst, setExpensiveFirst] = useState(false);

  // Объекты товаров — одни и те же ссылки, поэтому memo сработает и после сортировки.
  // useMemo здесь не обязателен для memo-строк, но избавляет от сортировки на каждый символ заметки.
  const sorted = useMemo(
    () => [...PRODUCTS].sort((a, b) => (expensiveFirst ? b.price - a.price : a.price - b.price)),
    [expensiveFirst],
  );

  // Стабильная ссылка + функциональное обновление: колбэку не нужен cart из замыкания.
  const handleAdd = useCallback((id: number) => {
    setCart((current) => [...current, id]);
  }, []);

  return (
    <div>
      <label htmlFor="note">Заметка</label>
      <input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
      <label>
        <input type="checkbox" checked={expensiveFirst} onChange={(e) => setExpensiveFirst(e.target.checked)} />
        Сначала дорогие
      </label>
      <p data-testid="cart">В корзине: {cart.length}</p>
      <ul>
        {sorted.map((product) => (
          <ProductRow key={product.id} product={product} onAdd={handleAdd} />
        ))}
      </ul>
    </div>
  );
}
`,
    solutionNotesMd: `Почему строки перерисовывались: **ререндер родителя по умолчанию перерисовывает всех детей**,
независимо от пропсов. \`memo\` меняет это правило: компонент пропускает рендер, если все
пропсы равны по \`Object.is\`.

Но \`memo\` сам по себе не помог бы: \`handleAdd\` — новая функция на каждый рендер
\`Shop\`, значит пропс \`onAdd\` всегда «новый». Нужен \`useCallback\`.

И тут вторая ловушка: \`useCallback(() => setCart([...cart, id]), [])\` — **stale closure**,
колбэк навсегда видит пустую корзину, и счётчик застрянет на 1. Правильно — функциональное
обновление \`setCart(c => [...c, id])\` и пустые зависимости.

Сортировка: \`[...PRODUCTS].sort(...)\` создаёт новый массив, но **объекты внутри те же**,
поэтому пропс \`product\` не меняется и строки не перерисовываются — React лишь переставит
DOM-узлы по \`key\`.

Когда мемоизация не нужна: дешёвые компоненты, пропсы-объекты, которые всё равно
создаются заново, и места, где React Compiler (React 19) расставит её сам.
Сначала измеряйте в React DevTools Profiler.`,
    hints: [
      'Какой механизм позволяет компоненту не рендериться, если пропсы не изменились?',
      'После `memo` строки всё ещё рендерятся: какой пропс меняется на каждый рендер `Shop`?',
      '`useCallback` с пустыми зависимостями «заморозит» `cart` в замыкании. Используйте функциональное обновление `setCart(c => [...c, id])`.',
    ],
    tests: [
      {
        name: 'первый рендер: три строки, корзина работает',
        code: `renderLog.length = 0;
await render(h(exports.default));
expect(renderLog).toHaveLength(3);
await fireEvent.click(screen.getByRole('button', { name: 'Добавить Мышь' }));
expect(screen.getByTestId('cart').textContent).toBe('В корзине: 1');`,
      },
      {
        name: 'ввод в «Заметку» не перерисовывает строки',
        code: `await render(h(exports.default));
renderLog.length = 0;
await fireEvent.type(screen.getByLabelText('Заметка'), 'abc');
expect(screen.getByLabelText('Заметка').value).toBe('abc');
expect(renderLog).toEqual([]);`,
      },
      {
        name: '«Добавить» не перерисовывает строки и считает корректно',
        hidden: true,
        code: `await render(h(exports.default));
renderLog.length = 0;
await fireEvent.click(screen.getByRole('button', { name: 'Добавить Мышь' }));
await fireEvent.click(screen.getByRole('button', { name: 'Добавить Монитор' }));
await fireEvent.click(screen.getByRole('button', { name: 'Добавить Мышь' }));
expect(screen.getByTestId('cart').textContent).toBe('В корзине: 3');
expect(renderLog).toEqual([]);`,
      },
      {
        name: 'сортировка меняет порядок без ререндера строк',
        hidden: true,
        code: `await render(h(exports.default));
const names = () => screen.getAllByRole('listitem').map((li) => li.textContent.split(' — ')[0]);
expect(names()).toEqual(['Мышь', 'Клавиатура', 'Монитор']);
renderLog.length = 0;
await fireEvent.click(screen.getByRole('checkbox', { name: 'Сначала дорогие' }));
expect(names()).toEqual(['Монитор', 'Клавиатура', 'Мышь']);
expect(renderLog).toEqual([]);`,
      },
    ],
  },

  {
    slug: 'react-modal-portal',
    topic: 'portals-errors',
    title: 'Модальное окно через портал',
    kind: 'react',
    runtime: 'preview',
    difficulty: 'medium',
    tags: ['createPortal', 'события', 'useEffect'],
    statementMd: `Компонент \`Modal({ open, onClose, title, children })\`.

- Если \`open === false\` — ничего не рендерит.
- Рендерится **через портал в \`document.body\`**, а не внутри родителя.
- Разметка: подложка с \`data-testid="overlay"\`, внутри — окно \`role="dialog"\`
  с \`aria-modal="true"\` и \`aria-labelledby\`, указывающим на заголовок \`<h2>\` с \`title\`.
- Внутри окна — \`children\` и кнопка **«Закрыть»**.
- \`onClose\` вызывается: по кнопке «Закрыть», по клику **на подложку** (но не на содержимое окна),
  по нажатию **Escape** в любом месте документа.
- Когда окно закрыто или размонтировано, слушатель Escape снимается.

Ловушка: клик внутри окна всплывает до подложки.`,
    starterCode: `import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ModalProps = { open: boolean; onClose: () => void; title: string; children?: ReactNode };

export function Modal({ open, onClose, title, children }: ModalProps) {
  // TODO
  return null;
}

export default function App() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Открыть</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Подтверждение">
        <p>Удалить задачу?</p>
      </Modal>
    </div>
  );
}
`,
    solutionCode: `import { useEffect, useId, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ModalProps = { open: boolean; onClose: () => void; title: string; children?: ReactNode };

export function Modal({ open, onClose, title, children }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      data-testid="overlay"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'grid', placeItems: 'center' }}
      onClick={(event) => {
        // Закрываем только по клику на саму подложку, а не на всплывший клик из окна.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ background: 'var(--bg, #fff)', padding: 16, borderRadius: 12, minWidth: 260 }}
      >
        <h2 id={titleId}>{title}</h2>
        {children}
        <button onClick={onClose}>Закрыть</button>
      </div>
    </div>,
    document.body,
  );
}

export default function App() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Открыть</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Подтверждение">
        <p>Удалить задачу?</p>
      </Modal>
    </div>
  );
}
`,
    solutionNotesMd: `**Зачем портал.** Модалка внутри родителя с \`overflow: hidden\` или \`transform\`
обрежется или спозиционируется неправильно, а \`z-index\` не выйдет за пределы stacking context
родителя. Портал переносит DOM в \`document.body\`, **но дерево React остаётся прежним**:
контекст доступен, а события **всплывают по дереву React**, а не по DOM. Клик внутри портала
дойдёт до \`onClick\` React-родителя модалки, даже если в DOM они не связаны.

**Клик по подложке.** Клик по содержимому всплывает до подложки. Сравнение
\`event.target === event.currentTarget\` отличает клик по самой подложке. Альтернатива —
\`stopPropagation\` на окне, но она ломает внешние обработчики (аналитику, закрытие меню).

**Escape** слушается на \`document\` в эффекте с cleanup. Обратите внимание на \`onClose\`
в зависимостях: если родитель передаёт стрелку, эффект будет переподписываться на каждый
рендер — корректно, но расточительно (\`useEffectEvent\` или ref решают это).

Что ещё ждут в реальной модалке: ловушка фокуса (focus trap), возврат фокуса на кнопку-триггер,
блокировка прокрутки \`body\`, \`inert\` на остальной странице. Нативный \`<dialog>\` с
\`showModal()\` даёт многое из этого бесплатно.`,
    hints: [
      '`createPortal(jsx, document.body)` из `react-dom` рендерит разметку в body, сохраняя место компонента в дереве React.',
      'Escape слушайте в `useEffect` через `document.addEventListener` и снимайте слушатель в cleanup.',
      'Клик внутри окна всплывает до подложки. Сравните `event.target` и `event.currentTarget`.',
    ],
    tests: [
      {
        name: 'закрытая модалка ничего не рендерит',
        code: `await render(h(exports.Modal, { open: false, onClose: () => {}, title: 'T' }));
expect(screen.queryByRole('dialog')).toBeNull();`,
      },
      {
        name: 'рендерится в body через портал',
        code: `const view = await render(h('div', { id: 'host' }, h(exports.Modal, { open: true, onClose: () => {}, title: 'Заголовок' }, h('p', null, 'Текст'))));
const dialog = screen.getByRole('dialog');
expect(view.container.querySelector('[role="dialog"]')).toBeNull();
expect(dialog.getAttribute('aria-modal')).toBe('true');
const labelId = dialog.getAttribute('aria-labelledby');
expect(document.getElementById(labelId).textContent).toBe('Заголовок');
expect(screen.getByText('Текст')).toBeTruthy();`,
      },
      {
        name: 'кнопка «Закрыть» вызывает onClose',
        code: `let closed = 0;
await render(h(exports.Modal, { open: true, onClose: () => { closed += 1; }, title: 'T' }));
await fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
expect(closed).toBe(1);`,
      },
      {
        name: 'клик по подложке закрывает, клик по окну — нет',
        hidden: true,
        code: `let closed = 0;
await render(h(exports.Modal, { open: true, onClose: () => { closed += 1; }, title: 'T' }, h('p', null, 'Внутри')));
await fireEvent.click(screen.getByText('Внутри'));
await fireEvent.click(screen.getByRole('dialog'));
expect(closed).toBe(0);
await fireEvent.click(screen.getByTestId('overlay'));
expect(closed).toBe(1);`,
      },
      {
        name: 'Escape закрывает, слушатель снимается после закрытия',
        hidden: true,
        code: `let closed = 0;
const onClose = () => { closed += 1; };
const view = await render(h(exports.Modal, { open: true, onClose, title: 'T' }));
await fireEvent.keyDown(document, { key: 'Enter' });
expect(closed).toBe(0);
await fireEvent.keyDown(document, { key: 'Escape' });
expect(closed).toBe(1);
await view.rerender(h(exports.Modal, { open: false, onClose, title: 'T' }));
await fireEvent.keyDown(document, { key: 'Escape' });
expect(closed).toBe(1);
await view.rerender(h(exports.Modal, { open: true, onClose, title: 'T' }));
await view.unmount();
await fireEvent.keyDown(document, { key: 'Escape' });
expect(closed).toBe(1);`,
      },
    ],
  },

  {
    slug: 'react-error-boundary',
    topic: 'portals-errors',
    title: 'Свой ErrorBoundary с reset',
    kind: 'react',
    runtime: 'preview',
    difficulty: 'medium',
    tags: ['error boundary', 'классовые компоненты'],
    statementMd: `Реализуйте \`ErrorBoundary\` — аналог популярной библиотеки react-error-boundary.

Пропсы:
- \`children\`;
- \`fallback: (error: Error, reset: () => void) => ReactNode\` — что показать вместо упавшего дерева;
- \`onError?: (error: Error) => void\` — вызывается один раз на каждую пойманную ошибку;
- \`resetKeys?: unknown[]\` — если любой элемент массива изменился (\`Object.is\`), граница
  сбрасывается автоматически и снова рендерит \`children\`.

\`reset()\` из \`fallback\` тоже снова рендерит \`children\`.

Error boundary пока можно написать только классом — хуков для этого нет.`,
    starterCode: `import { Component, useState, type ReactNode } from 'react';

type Props = {
  children?: ReactNode;
  fallback: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error) => void;
  resetKeys?: unknown[];
};

export class ErrorBoundary extends Component<Props> {
  // TODO
  render() {
    return this.props.children;
  }
}

function Bomb({ explode }: { explode: boolean }) {
  if (explode) throw new Error('Бум!');
  return <p>Всё хорошо</p>;
}

export default function App() {
  const [explode, setExplode] = useState(false);
  return (
    <div>
      <button onClick={() => setExplode((v) => !v)}>Переключить бомбу</button>
      <ErrorBoundary
        resetKeys={[explode]}
        fallback={(error, reset) => (
          <div role="alert">
            <p>Ошибка: {error.message}</p>
            <button onClick={reset}>Попробовать снова</button>
          </div>
        )}
      >
        <Bomb explode={explode} />
      </ErrorBoundary>
    </div>
  );
}
`,
    solutionCode: `import { Component, useState, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children?: ReactNode;
  fallback: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error) => void;
  resetKeys?: unknown[];
};

type State = { error: Error | null };

function keysChanged(a: unknown[] = [], b: unknown[] = []): boolean {
  return a.length !== b.length || a.some((item, index) => !Object.is(item, b[index]));
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  // Фаза рендера: переключаемся на fallback. Без побочных эффектов.
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  // Фаза коммита: место для логирования.
  componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onError?.(error);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error !== null && keysChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.reset();
    }
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) return this.props.fallback(this.state.error, this.reset);
    return this.props.children;
  }
}

function Bomb({ explode }: { explode: boolean }) {
  if (explode) throw new Error('Бум!');
  return <p>Всё хорошо</p>;
}

export default function App() {
  const [explode, setExplode] = useState(false);
  return (
    <div>
      <button onClick={() => setExplode((v) => !v)}>Переключить бомбу</button>
      <ErrorBoundary
        resetKeys={[explode]}
        fallback={(error, reset) => (
          <div role="alert">
            <p>Ошибка: {error.message}</p>
            <button onClick={reset}>Попробовать снова</button>
          </div>
        )}
      >
        <Bomb explode={explode} />
      </ErrorBoundary>
    </div>
  );
}
`,
    solutionNotesMd: `Два метода жизненного цикла с разными ролями:
- \`static getDerivedStateFromError\` — **фаза рендера**: вернуть новое состояние, чтобы
  показать fallback. Побочные эффекты здесь запрещены.
- \`componentDidCatch\` — **фаза коммита**: логирование (Sentry и т. п.).

\`resetKeys\` сравниваются в \`componentDidUpdate\`: если граница в состоянии ошибки и ключи
изменились, ошибка сбрасывается. Классический кейс — смена маршрута или id сущности.

**Что error boundary НЕ ловит:** ошибки в обработчиках событий, в асинхронном коде
(\`setTimeout\`, промисы), при SSR и в самой границе. Для асинхронных ошибок есть приём:
\`const [, setState] = useState(); setState(() => { throw error; })\` — ошибка
пробрасывается в рендер, и граница её поймает. React 19 добавил колбэки \`onCaughtError\` /
\`onUncaughtError\` в \`createRoot\` для глобального логирования.`,
    hints: [
      'Состояние границы — пойманная ошибка или null. Переход в ошибку делает `static getDerivedStateFromError`.',
      '`onError` вызывайте в `componentDidCatch` — это фаза коммита, там побочные эффекты допустимы.',
      'Для `resetKeys` сравните `prevProps.resetKeys` и `this.props.resetKeys` в `componentDidUpdate`.',
    ],
    tests: [
      {
        name: 'без ошибки рендерит children',
        code: `await render(h(exports.ErrorBoundary, { fallback: () => h('p', null, 'fallback') }, h('p', null, 'ok')));
expect(screen.getByText('ok')).toBeTruthy();
expect(screen.queryByText('fallback')).toBeNull();`,
      },
      {
        name: 'ловит ошибку рендера и показывает fallback',
        code: `const Bomb = () => { throw new Error('Бум'); };
const originalError = console.error;
console.error = () => {};
try {
  await render(h(exports.ErrorBoundary, { fallback: (error) => h('p', { role: 'alert' }, 'Ошибка: ' + error.message) }, h(Bomb)));
} finally { console.error = originalError; }
expect(screen.getByRole('alert').textContent).toBe('Ошибка: Бум');`,
      },
      {
        name: 'onError вызывается с ошибкой',
        hidden: true,
        code: `const Bomb = () => { throw new Error('X'); };
const seen = [];
const originalError = console.error;
console.error = () => {};
try {
  await render(h(exports.ErrorBoundary, { fallback: () => 'упало', onError: (e) => seen.push(e.message) }, h(Bomb)));
} finally { console.error = originalError; }
expect(seen).toEqual(['X']);`,
      },
      {
        name: 'reset из fallback снова рендерит children',
        hidden: true,
        code: `let shouldThrow = true;
const Maybe = () => { if (shouldThrow) throw new Error('once'); return h('p', null, 'восстановлено'); };
const originalError = console.error;
console.error = () => {};
try {
  await render(h(exports.ErrorBoundary, { fallback: (error, reset) => h('button', { onClick: reset }, 'Повторить') }, h(Maybe)));
  shouldThrow = false;
  await fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
} finally { console.error = originalError; }
expect(screen.getByText('восстановлено')).toBeTruthy();`,
      },
      {
        name: 'изменение resetKeys сбрасывает границу',
        hidden: true,
        code: `const Child = ({ id }) => { if (id === 1) throw new Error('bad id'); return h('p', null, 'id ' + id); };
const fallback = (error) => h('p', null, 'fallback: ' + error.message);
const originalError = console.error;
console.error = () => {};
try {
  const view = await render(h(exports.ErrorBoundary, { fallback, resetKeys: [1] }, h(Child, { id: 1 })));
  expect(screen.getByText('fallback: bad id')).toBeTruthy();
  await view.rerender(h(exports.ErrorBoundary, { fallback, resetKeys: [2] }, h(Child, { id: 2 })));
} finally { console.error = originalError; }
expect(screen.getByText('id 2')).toBeTruthy();`,
      },
    ],
  },

  {
    slug: 'react-compound-tabs',
    topic: 'react-patterns',
    title: 'Compound components: Tabs',
    kind: 'react',
    runtime: 'preview',
    difficulty: 'hard',
    tags: ['compound components', 'Context', 'доступность', 'controlled/uncontrolled'],
    statementMd: `Сделайте набор компонентов \`Tabs\`, \`TabList\`, \`Tab\`, \`TabPanel\` в стиле
compound components:

\`\`\`tsx
<Tabs defaultValue="js">
  <TabList>
    <Tab value="js">JavaScript</Tab>
    <Tab value="ts">TypeScript</Tab>
  </TabList>
  <TabPanel value="js">Про JS</TabPanel>
  <TabPanel value="ts">Про TS</TabPanel>
</Tabs>
\`\`\`

Требования:
- \`TabList\` — \`role="tablist"\`; \`Tab\` — \`<button role="tab">\` с \`aria-selected\` (\`"true"\`/\`"false"\`);
  \`TabPanel\` — \`role="tabpanel"\`. Рендерится **только активная** панель.
- **Неконтролируемый режим**: \`defaultValue\`, выбор хранится внутри.
- **Контролируемый режим**: если передан \`value\`, активная вкладка берётся из него, а клик
  только вызывает \`onValueChange(next)\`. \`onValueChange\` вызывается и в неконтролируемом режиме.
- **Клавиатура**: \`ArrowRight\`/\`ArrowLeft\` на списке вкладок выбирают следующую/предыдущую
  по кругу.
- \`Tab\`, \`TabList\` или \`TabPanel\` вне \`Tabs\` бросают ошибку, в тексте которой есть \`Tabs\`.

Компоненты — именованные экспорты. \`App\` для превью уже есть.`,
    starterCode: `import { createContext, useContext, useState, type ReactNode } from 'react';

type TabsProps = {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children?: ReactNode;
};

export function Tabs(props: TabsProps) {
  // TODO
  return <div>{props.children}</div>;
}

export function TabList({ children }: { children?: ReactNode }) {
  return <div>{children}</div>;
}

export function Tab({ value, children }: { value: string; children?: ReactNode }) {
  return <button>{children}</button>;
}

export function TabPanel({ value, children }: { value: string; children?: ReactNode }) {
  return <div>{children}</div>;
}

export default function App() {
  return (
    <Tabs defaultValue="js">
      <TabList>
        <Tab value="js">JavaScript</Tab>
        <Tab value="ts">TypeScript</Tab>
        <Tab value="react">React</Tab>
      </TabList>
      <TabPanel value="js">Closures, event loop, прототипы</TabPanel>
      <TabPanel value="ts">Generics, narrowing, utility types</TabPanel>
      <TabPanel value="react">Reconciliation, хуки, мемоизация</TabPanel>
    </Tabs>
  );
}
`,
    solutionCode: `import { createContext, useContext, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

type TabsContextValue = {
  value: string | undefined;
  select: (value: string) => void;
  baseId: string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs(component: string): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) throw new Error(\`<\${component}> должен находиться внутри <Tabs>\`);
  return context;
}

type TabsProps = {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children?: ReactNode;
};

export function Tabs({ defaultValue, value, onValueChange, children }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;
  const baseId = useId();

  const select = (next: string) => {
    if (!isControlled) setInternal(next);
    onValueChange?.(next);
  };

  return <TabsContext.Provider value={{ value: current, select, baseId }}>{children}</TabsContext.Provider>;
}

export function TabList({ children }: { children?: ReactNode }) {
  const { value, select } = useTabs('TabList');
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    // Порядок вкладок берём из DOM: он совпадает с порядком в JSX и не требует регистрации.
    const tabs = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
    if (tabs.length === 0) return;
    const index = tabs.findIndex((tab) => tab.dataset.value === value);
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    if (next?.dataset.value) {
      select(next.dataset.value);
      next.focus();
    }
  };

  return (
    <div role="tablist" ref={listRef} onKeyDown={onKeyDown}>
      {children}
    </div>
  );
}

export function Tab({ value, children }: { value: string; children?: ReactNode }) {
  const tabs = useTabs('Tab');
  const selected = tabs.value === value;
  return (
    <button
      type="button"
      role="tab"
      id={\`\${tabs.baseId}-tab-\${value}\`}
      aria-selected={selected}
      aria-controls={\`\${tabs.baseId}-panel-\${value}\`}
      tabIndex={selected ? 0 : -1}
      data-value={value}
      onClick={() => tabs.select(value)}
    >
      {children}
    </button>
  );
}

export function TabPanel({ value, children }: { value: string; children?: ReactNode }) {
  const tabs = useTabs('TabPanel');
  if (tabs.value !== value) return null;
  return (
    <div role="tabpanel" id={\`\${tabs.baseId}-panel-\${value}\`} aria-labelledby={\`\${tabs.baseId}-tab-\${value}\`}>
      {children}
    </div>
  );
}

export default function App() {
  return (
    <Tabs defaultValue="js">
      <TabList>
        <Tab value="js">JavaScript</Tab>
        <Tab value="ts">TypeScript</Tab>
        <Tab value="react">React</Tab>
      </TabList>
      <TabPanel value="js">Closures, event loop, прототипы</TabPanel>
      <TabPanel value="ts">Generics, narrowing, utility types</TabPanel>
      <TabPanel value="react">Reconciliation, хуки, мемоизация</TabPanel>
    </Tabs>
  );
}
`,
    solutionNotesMd: `**Compound components** — несколько компонентов, которые работают как одно целое и
обмениваются состоянием через **неявный контекст**. Потребитель собирает разметку
как хочет (порядок, обёртки, стили), а логика остаётся внутри. Так устроены Radix, Headless UI,
Reach UI.

Детали решения:
- **Хук-страж \`useTabs\`**: без провайдера бросает понятную ошибку, а не падает на \`null\`.
- **Controlled / uncontrolled**, как у \`<input>\`: если \`value\` передан, источник истины —
  родитель. \`onValueChange\` вызывается в обоих режимах. Переключаться между режимами на лету
  нельзя (React предупреждает об этом и для инпутов).
- **Клавиатура по паттерну WAI-ARIA Tabs**: стрелки, «roving tabindex» — фокус по Tab попадает
  только на активную вкладку.
- **Порядок вкладок из DOM** — простой способ без регистрации вкладок в контексте.

Альтернативы и что спросят: render props (\`<Tabs render={…}>\`), конфигурационный API
(\`items={[…]}\`) — проще, но менее гибкий. Как избежать ререндера всех вкладок при смене
активной (значение контекста — новый объект; \`useMemo\` поможет, только если остальные
пропсы стабильны).`,
    hints: [
      'Создайте контекст с текущим значением и функцией выбора. `Tab` и `TabPanel` читают его через `useContext`.',
      'Контролируемый режим: `const current = value !== undefined ? value : internal`. Внутренний state меняйте, только если компонент неконтролируемый.',
      'Для стрелок достаточно найти все `[role="tab"]` внутри списка через ref и выбрать соседа по кругу: `(index + delta + n) % n`.',
    ],
    tests: [
      {
        name: 'роли, aria-selected и одна панель',
        code: `await render(h(exports.default));
expect(screen.getByRole('tablist')).toBeTruthy();
expect(screen.getByRole('tab', { name: 'JavaScript' }).getAttribute('aria-selected')).toBe('true');
expect(screen.getByRole('tab', { name: 'TypeScript' }).getAttribute('aria-selected')).toBe('false');
expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
expect(screen.getByRole('tabpanel').textContent).toContain('Closures');`,
      },
      {
        name: 'клик переключает вкладку',
        code: `await render(h(exports.default));
await fireEvent.click(screen.getByRole('tab', { name: 'React' }));
expect(screen.getByRole('tab', { name: 'React' }).getAttribute('aria-selected')).toBe('true');
expect(screen.getByRole('tabpanel').textContent).toContain('Reconciliation');`,
      },
      {
        name: 'контролируемый режим',
        hidden: true,
        code: `const { Tabs, TabList, Tab, TabPanel } = exports;
const changes = [];
const ui = (value) => h(Tabs, { value, onValueChange: (v) => changes.push(v) },
  h(TabList, null, h(Tab, { value: 'a' }, 'A'), h(Tab, { value: 'b' }, 'B')),
  h(TabPanel, { value: 'a' }, 'panel A'), h(TabPanel, { value: 'b' }, 'panel B'));
const view = await render(ui('a'));
await fireEvent.click(screen.getByRole('tab', { name: 'B' }));
expect(changes).toEqual(['b']);
expect(screen.getByRole('tabpanel').textContent).toBe('panel A');
await view.rerender(ui('b'));
expect(screen.getByRole('tabpanel').textContent).toBe('panel B');`,
      },
      {
        name: 'onValueChange в неконтролируемом режиме',
        hidden: true,
        code: `const { Tabs, TabList, Tab, TabPanel } = exports;
const changes = [];
await render(h(Tabs, { defaultValue: 'a', onValueChange: (v) => changes.push(v) },
  h(TabList, null, h(Tab, { value: 'a' }, 'A'), h(Tab, { value: 'b' }, 'B')),
  h(TabPanel, { value: 'b' }, 'panel B')));
await fireEvent.click(screen.getByRole('tab', { name: 'B' }));
expect(changes).toEqual(['b']);
expect(screen.getByRole('tabpanel').textContent).toBe('panel B');`,
      },
      {
        name: 'стрелки переключают по кругу',
        hidden: true,
        code: `await render(h(exports.default));
const list = screen.getByRole('tablist');
await fireEvent.keyDown(list, { key: 'ArrowLeft' });
expect(screen.getByRole('tab', { name: 'React' }).getAttribute('aria-selected')).toBe('true');
await fireEvent.keyDown(list, { key: 'ArrowRight' });
expect(screen.getByRole('tab', { name: 'JavaScript' }).getAttribute('aria-selected')).toBe('true');
await fireEvent.keyDown(list, { key: 'ArrowRight' });
expect(screen.getByRole('tab', { name: 'TypeScript' }).getAttribute('aria-selected')).toBe('true');`,
      },
      {
        name: 'Tab вне Tabs бросает понятную ошибку',
        hidden: true,
        code: `const originalError = console.error;
console.error = () => {};
let message = '';
try {
  await render(h(exports.Tab, { value: 'x' }, 'X'));
} catch (error) {
  message = error.message;
} finally { console.error = originalError; }
expect(message).toContain('Tabs');`,
      },
    ],
  },

  {
    slug: 'react-autocomplete',
    topic: 'effects',
    title: 'Автокомплит: debounce, гонки и клавиатура',
    kind: 'react',
    runtime: 'preview',
    difficulty: 'hard',
    tags: ['debounce', 'race condition', 'AbortController', 'доступность'],
    statementMd: `Компонент \`Autocomplete({ search, delay = 300, onSelect })\`.
\`search(query: string, signal: AbortSignal): Promise<string[]>\` — функция поиска.

**Поиск**
- Поле с \`<label>\` **«Поиск»**.
- Запрос уходит через \`delay\` мс после последнего ввода (debounce) с обрезанной строкой.
- Если строка короче 2 символов — запроса нет, подсказки скрыты.
- Пока идёт запрос — \`data-testid="loading"\` с текстом «Загрузка…».
- Результаты — \`<ul role="listbox">\` с \`<li role="option">\`; пустой результат — текст
  **«Ничего не найдено»**; ошибка поиска — \`role="alert"\` с текстом **«Ошибка поиска»**.
- **Устаревшие ответы игнорируются**, предыдущий запрос отменяется через \`signal\`.

**Выбор**
- \`ArrowDown\`/\`ArrowUp\` в поле двигают подсветку (\`aria-selected="true"\` у подсвеченного
  варианта; изначально ничего не подсвечено; по краям не выходит).
- \`Enter\` при подсвеченном варианте и клик по варианту — выбор: в поле подставляется текст
  варианта, список закрывается, вызывается \`onSelect(option)\`, и **новый поиск по выбранному
  тексту не запускается**.`,
    starterCode: `import { useEffect, useState, type KeyboardEvent } from 'react';

type Search = (query: string, signal: AbortSignal) => Promise<string[]>;

type Props = { search: Search; delay?: number; onSelect?: (value: string) => void };

export function Autocomplete({ search, delay = 300, onSelect }: Props) {
  const [query, setQuery] = useState('');
  // TODO
  return (
    <div>
      <label htmlFor="ac">Поиск</label>
      <input id="ac" value={query} onChange={(e) => setQuery(e.target.value)} />
    </div>
  );
}

const FRUITS = ['Абрикос', 'Авокадо', 'Ананас', 'Апельсин', 'Банан', 'Виноград', 'Груша', 'Гранат'];

const fakeSearch: Search = (query, signal) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => resolve(FRUITS.filter((f) => f.toLowerCase().includes(query.toLowerCase()))),
      200 + Math.random() * 400,
    );
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

export default function App() {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div>
      <Autocomplete search={fakeSearch} onSelect={setPicked} />
      <p>Выбрано: {picked ?? '—'}</p>
    </div>
  );
}
`,
    solutionCode: `import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

type Search = (query: string, signal: AbortSignal) => Promise<string[]>;

type Props = { search: Search; delay?: number; onSelect?: (value: string) => void };

type Status = 'idle' | 'loading' | 'done' | 'error';

export function Autocomplete({ search, delay = 300, onSelect }: Props) {
  const [query, setQuery] = useState('');
  // Строка, по которой реально ищем (query после debounce).
  const [searchTerm, setSearchTerm] = useState('');
  // Выбранный вариант: по нему повторно не ищем. Ref, а не state — его изменение
  // не должно ни перерисовывать компонент, ни перезапускать эффект поиска.
  const selectedRef = useRef<string | null>(null);
  const [results, setResults] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);

  // 1. Debounce ввода.
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(query.trim()), delay);
    return () => clearTimeout(timer);
  }, [query, delay]);

  // 2. Запрос с отменой: новый searchTerm отменяет старый запрос.
  useEffect(() => {
    if (searchTerm === selectedRef.current) return;
    if (searchTerm.length < 2) {
      setStatus('idle');
      setResults([]);
      return;
    }
    const controller = new AbortController();
    setStatus('loading');
    setActive(-1);
    search(searchTerm, controller.signal)
      .then((items) => {
        setResults(items);
        setStatus('done');
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setStatus('error');
      });
    return () => controller.abort();
  }, [searchTerm, search]);

  const choose = (option: string) => {
    selectedRef.current = option.trim();
    setQuery(option);
    setSearchTerm(option.trim());
    setOpen(false);
    setActive(-1);
    onSelect?.(option);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open || status !== 'done' || results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      const option = results[active];
      if (option !== undefined) choose(option);
    }
  };

  const showList = open && query.trim().length >= 2;

  return (
    <div>
      <label htmlFor="ac">Поиск</label>
      <input
        id="ac"
        value={query}
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
        onChange={(event) => {
          selectedRef.current = null;
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {showList && status === 'loading' ? <p data-testid="loading">Загрузка…</p> : null}
      {showList && status === 'error' ? <p role="alert">Ошибка поиска</p> : null}
      {showList && status === 'done' && results.length === 0 ? <p>Ничего не найдено</p> : null}
      {showList && status === 'done' && results.length > 0 ? (
        <ul role="listbox">
          {results.map((option, index) => (
            <li
              key={option}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
            >
              {option}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const FRUITS = ['Абрикос', 'Авокадо', 'Ананас', 'Апельсин', 'Банан', 'Виноград', 'Груша', 'Гранат'];

const fakeSearch: Search = (query, signal) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => resolve(FRUITS.filter((f) => f.toLowerCase().includes(query.toLowerCase()))),
      200 + Math.random() * 400,
    );
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

export default function App() {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div>
      <Autocomplete search={fakeSearch} onSelect={setPicked} />
      <p>Выбрано: {picked ?? '—'}</p>
    </div>
  );
}
`,
    solutionNotesMd: `Задача собирает три темы из реальных интервью.

**1. Debounce как отдельный этап.** \`query\` (что в поле) и \`searchTerm\` (по чему ищем) —
разные состояния. Первый эффект переносит \`query\` в \`searchTerm\` после паузы.
«Не искать после выбора» решает \`selectedRef\`: выбранный текст запоминается в ref,
эффект поиска его пропускает, а ввод с клавиатуры ref сбрасывает. Ref уместен: это
служебная пометка, от неё не зависит разметка, и её изменение не должно перезапускать эффект.

**2. Гонки.** Второй эффект зависит только от \`searchTerm\`; его cleanup отменяет запрос.
Отменённый промис отклоняется — это не ошибка (\`signal.aborted\`).

**3. Клавиатура и доступность.** Паттерн WAI-ARIA combobox: \`role="combobox"\`,
\`aria-expanded\`, \`listbox\`/\`option\`, \`aria-selected\`. \`preventDefault\` на стрелках
не даёт курсору прыгать по тексту. \`onMouseDown + preventDefault\` на варианте не даёт
полю потерять фокус до клика.

Что спросят дальше: кеш запросов (Map по строке или TanStack Query), \`useDeferredValue\`
для фильтрации на клиенте без debounce, виртуализация длинного списка, почему функция
\`search\` в зависимостях должна быть стабильной (иначе новый запрос на каждый рендер родителя).`,
    hints: [
      'Разделите «что в поле» и «по чему ищем»: второе обновляется из первого через debounce-эффект.',
      'Запрос делайте во втором эффекте, который зависит только от строки поиска, и отменяйте его в cleanup через AbortController.',
      'Чтобы после выбора не уходил новый запрос, при выборе сразу выставьте и текст поля, и строку поиска в выбранное значение.',
    ],
    tests: [
      {
        name: 'debounce: один запрос после паузы',
        code: `const calls = [];
const search = (q) => { calls.push(q); return Promise.resolve(['Ананас']); };
await render(h(exports.Autocomplete, { search, delay: 40 }));
await fireEvent.type(screen.getByLabelText('Поиск'), 'ана');
expect(calls).toEqual([]);
await sleep(70);
expect(calls).toEqual(['ана']);
expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Ананас']);`,
      },
      {
        name: 'короче двух символов — запроса нет',
        code: `const calls = [];
const search = (q) => { calls.push(q); return Promise.resolve([]); };
await render(h(exports.Autocomplete, { search, delay: 30 }));
await fireEvent.change(screen.getByLabelText('Поиск'), { target: { value: ' а ' } });
await sleep(60);
expect(calls).toEqual([]);
expect(screen.queryByRole('listbox')).toBeNull();`,
      },
      {
        name: 'загрузка и «Ничего не найдено»',
        code: `let resolve;
const search = () => new Promise((r) => { resolve = r; });
await render(h(exports.Autocomplete, { search, delay: 20 }));
await fireEvent.change(screen.getByLabelText('Поиск'), { target: { value: 'xyz' } });
await sleep(40);
expect(screen.getByTestId('loading').textContent).toBe('Загрузка…');
await act(async () => { resolve([]); });
expect(screen.getByText('Ничего не найдено')).toBeTruthy();`,
      },
      {
        name: 'устаревший ответ игнорируется, прошлый запрос отменён',
        hidden: true,
        code: `const signals = {};
const search = (q, signal) => new Promise((resolve, reject) => {
  signals[q] = signal;
  const timer = setTimeout(() => resolve([q + ' результат']), q === 'ап' ? 120 : 20);
  signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); });
});
await render(h(exports.Autocomplete, { search, delay: 20 }));
const input = screen.getByLabelText('Поиск');
await fireEvent.change(input, { target: { value: 'ап' } });
await sleep(35);
await fireEvent.change(input, { target: { value: 'апе' } });
await sleep(180);
expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['апе результат']);
expect(signals['ап'].aborted).toBe(true);`,
      },
      {
        name: 'ошибка поиска',
        hidden: true,
        code: `const search = () => Promise.reject(new Error('500'));
await render(h(exports.Autocomplete, { search, delay: 20 }));
await fireEvent.change(screen.getByLabelText('Поиск'), { target: { value: 'груша' } });
await sleep(50);
expect(screen.getByRole('alert').textContent).toBe('Ошибка поиска');`,
      },
      {
        name: 'клавиатура: стрелки, Enter, onSelect, без нового поиска',
        hidden: true,
        code: `const calls = [];
const picked = [];
const search = (q) => { calls.push(q); return Promise.resolve(['Абрикос', 'Авокадо', 'Ананас']); };
await render(h(exports.Autocomplete, { search, delay: 20, onSelect: (v) => picked.push(v) }));
const input = screen.getByLabelText('Поиск');
await fireEvent.change(input, { target: { value: 'аб' } });
await sleep(40);
expect(screen.getAllByRole('option').filter((o) => o.getAttribute('aria-selected') === 'true')).toHaveLength(0);
await fireEvent.keyDown(input, { key: 'ArrowDown' });
await fireEvent.keyDown(input, { key: 'ArrowDown' });
await fireEvent.keyDown(input, { key: 'ArrowDown' });
await fireEvent.keyDown(input, { key: 'ArrowDown' });
await fireEvent.keyDown(input, { key: 'ArrowUp' });
expect(screen.getByRole('option', { name: 'Авокадо' }).getAttribute('aria-selected')).toBe('true');
await fireEvent.keyDown(input, { key: 'Enter' });
expect(input.value).toBe('Авокадо');
expect(picked).toEqual(['Авокадо']);
expect(screen.queryByRole('listbox')).toBeNull();
await sleep(60);
expect(calls).toEqual(['аб']);`,
      },
      {
        name: 'клик по варианту выбирает его',
        hidden: true,
        code: `const picked = [];
const search = () => Promise.resolve(['Банан', 'Виноград']);
await render(h(exports.Autocomplete, { search, delay: 20, onSelect: (v) => picked.push(v) }));
await fireEvent.change(screen.getByLabelText('Поиск'), { target: { value: 'ба' } });
await sleep(40);
await fireEvent.click(screen.getByRole('option', { name: 'Виноград' }));
expect(screen.getByLabelText('Поиск').value).toBe('Виноград');
expect(picked).toEqual(['Виноград']);`,
      },
    ],
  },
];
