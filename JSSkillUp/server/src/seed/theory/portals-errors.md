# Portals и error boundaries

## createPortal

```jsx
import { createPortal } from 'react-dom';

function Modal({ children }) {
  return createPortal(<div className="modal">{children}</div>, document.body);
}
```

Портал рендерит JSX в **другой DOM-узел**, сохраняя компонент на его месте в **дереве React**.

Зачем: модалки, тултипы, выпадающие меню, тосты. Внутри родителя с `overflow: hidden`,
`transform` или своим stacking context (`z-index`) такой элемент обрежется или окажется
под соседями. В `document.body` этих ограничений нет.

## Дерево React против дерева DOM

Портал меняет положение в DOM, но **не** в React:

- **контекст** доступен — модалка видит тему, пользователя, роутер родителя;
- **синтетические события всплывают по дереву React**: клик внутри модалки дойдёт до
  `onClick` компонента, который её отрендерил, хотя в DOM модалка — ребёнок `body`;
- нативные слушатели на DOM-предках (`document.querySelector('#app').addEventListener`)
  событие **не** получат — в DOM это другое поддерево.

Практическое следствие: карточка с `onClick={openDetails}` рендерит модалку подтверждения —
клик по кнопке в модалке «всплывёт» до карточки и откроет детали. Лечится
`event.stopPropagation()` в модалке или проверкой `event.target`.

## Типичная модалка

```jsx
function Modal({ open, onClose, title, children }) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
```

Для production ещё нужны: ловушка фокуса, возврат фокуса на триггер, блокировка
прокрутки `body`, `inert` для остальной страницы. Нативный `<dialog>` с `showModal()`
даёт top layer, Escape и фокус из коробки.

## Error boundary

Без границ ошибка при рендере любого компонента **размонтирует всё приложение** —
пользователь видит белый экран. Error boundary перехватывает ошибки своего поддерева
и показывает запасной UI.

```jsx
class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };               // render phase: переключиться на fallback
  }

  componentDidCatch(error, info) {
    logToSentry(error, info.componentStack); // commit phase: побочные эффекты
  }

  render() {
    if (this.state.error) return this.props.fallback;
    return this.props.children;
  }
}
```

Error boundary можно написать **только классом** — хукового аналога нет. На практике
берут библиотеку `react-error-boundary`: `FallbackComponent`, `resetKeys`, `onReset`,
хук `useErrorBoundary`.

## Что error boundary не ловит

- **Обработчики событий** — выполняются вне рендера. Используйте `try/catch` и state ошибки.
- **Асинхронный код** — `setTimeout`, промисы, `await`.
- **SSR**.
- **Ошибки самой границы** — их ловит граница выше.

Приём для асинхронных ошибок — пробросить в рендер:

```jsx
const [, setState] = useState();
fetchData().catch((error) => setState(() => { throw error; }));
```

`useErrorBoundary().showBoundary(error)` из `react-error-boundary` делает то же.
TanStack Query умеет это через `throwOnError`.

## Где ставить границы

Не одна граница на всё приложение, а по зонам:

- **корневая** — «что-то пошло не так» + кнопка перезагрузки;
- **на маршрут** — упала страница, но навигация работает;
- **на независимые виджеты** — упал график, остальной дашборд живёт.

## Восстановление после ошибки

- **reset** из fallback: сбросить state границы и попробовать отрендерить детей заново
  (имеет смысл, если причина устранена — например, данные перезапрошены);
- **`resetKeys`**: граница сбрасывается автоматически при смене маршрута или id сущности;
- **смена `key`** у границы — пересоздаёт её вместе с поддеревом.

В React 19 у `createRoot` появились колбэки `onCaughtError` и `onUncaughtError` для
централизованного логирования.

## Как это спрашивают

- «Куда всплывёт событие из портала?» — по дереву React.
- «Зачем нужны порталы, если есть `position: fixed`?» — overflow, transform, stacking context.
- «Что такое error boundary и почему только классом?»
- «Что error boundary не ловит и как обработать async-ошибки?»
- «Как организовать границы ошибок в приложении?»
