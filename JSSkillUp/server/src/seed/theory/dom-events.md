# DOM и события

## Три фазы события

Клик по `<button>` внутри `<li>` внутри `<ul>`:

1. **Capturing** — событие идёт от `window` вниз к цели: `window → document → html → body → ul → li`.
2. **Target** — обработчики на самой кнопке.
3. **Bubbling** — обратно вверх: `li → ul → body → … → window`.

`addEventListener(type, handler)` по умолчанию слушает всплытие. Третий аргумент
`true` или `{ capture: true }` — погружение:

```js
parent.addEventListener('click', () => console.log('parent capture'), true);
parent.addEventListener('click', () => console.log('parent bubble'));
child.addEventListener('click', () => console.log('child'));
// клик по child: parent capture → child → parent bubble
```

Не всплывают: `focus`/`blur` (есть всплывающие `focusin`/`focusout`), `mouseenter`/`mouseleave`
(есть `mouseover`/`mouseout`), `load`, `scroll` на элементах.

## target и currentTarget

- **`event.target`** — самый глубокий элемент, на котором событие произошло;
- **`event.currentTarget`** — элемент, чей обработчик выполняется **сейчас**.

## Делегирование событий

Один обработчик на контейнер вместо тысячи на элементы:

```js
list.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action="delete"]');
  if (!button || !list.contains(button)) return;
  deleteItem(button.closest('li').dataset.id);
});
```

Плюсы: меньше памяти, работает для элементов, добавленных позже. `closest` нужен,
потому что клик мог прийти по иконке внутри кнопки.

## stopPropagation, stopImmediatePropagation, preventDefault

- **`stopPropagation()`** — остановить распространение дальше по дереву (другие обработчики
  на этом же элементе выполнятся).
- **`stopImmediatePropagation()`** — ещё и остальные обработчики на текущем элементе.
- **`preventDefault()`** — отменить действие браузера по умолчанию: переход по ссылке,
  отправку формы, отметку чекбокса, прокрутку колесом.

`stopPropagation` — осторожно: ломает делегированные обработчики выше (аналитику,
закрытие меню по клику снаружи). Часто лучше проверить `event.target` в родителе.

## Синтетические события React

React не вешает обработчики на каждый элемент. Начиная с React 17 он слушает события
**на корневом контейнере** (`#root`) и сам диспатчит их по дереву компонентов.

- `onClick` — фаза всплытия, `onClickCapture` — погружения.
- Объект — `SyntheticEvent`, обёртка над нативным (`event.nativeEvent`) с одинаковым API
  во всех браузерах. Пул событий убран в React 17 — событие можно использовать асинхронно.
- `onChange` у инпутов срабатывает **на каждый ввод** (как нативный `input`), а не на
  потерю фокуса.
- `e.stopPropagation()` в React останавливает всплытие по дереву React; нативные
  слушатели на `document` при этом уже могли сработать или сработают — порядок стоит
  проверять, если смешиваете.
- События из порталов всплывают по дереву React, а не DOM.

## Пассивные слушатели

```js
window.addEventListener('touchmove', onMove, { passive: true });
```

`passive: true` — обещание не вызывать `preventDefault()`. Браузер может прокручивать
страницу сразу, не дожидаясь обработчика: плавный скролл на мобильных. Chrome делает
`touchstart`/`touchmove`/`wheel` на `window`/`document` пассивными по умолчанию.

Другие полезные опции: `once: true` — снять после первого вызова, `signal` — снять через
`AbortController` (удобно снять пачку слушателей разом):

```js
const controller = new AbortController();
window.addEventListener('resize', onResize, { signal: controller.signal });
window.addEventListener('scroll', onScroll, { signal: controller.signal, passive: true });
controller.abort(); // сняли оба
```

Для частых событий (`scroll`, `resize`, `mousemove`) — throttle или `requestAnimationFrame`,
а для «виден ли элемент» — `IntersectionObserver` вместо слушателя скролла.

## Как это спрашивают

- «Что выведет консоль?» — задача на порядок capture/bubble.
- «Что такое делегирование событий и зачем оно?»
- «Чем `target` отличается от `currentTarget`?»
- «Чем `stopPropagation` отличается от `preventDefault`?»
- «Как React обрабатывает события? Куда вешаются обработчики?»
- «Как сделать бесконечную прокрутку без слушателя scroll?» — IntersectionObserver.
