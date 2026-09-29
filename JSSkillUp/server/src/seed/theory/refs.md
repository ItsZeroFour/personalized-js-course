# Refs, useRef, forwardRef, useImperativeHandle

## useRef — изменяемый контейнер

```jsx
const ref = useRef(initialValue); // { current: initialValue }
```

`useRef` возвращает **один и тот же объект** на всё время жизни компонента.
Запись в `ref.current`:

- **не вызывает рендер**;
- **не участвует в снапшоте** — в отличие от state, значение одно на все рендеры.

Правило выбора: если значение **отображается** пользователю — это state. Если нужно
запомнить что-то «для внутреннего пользования» между рендерами — ref.

Типичные применения:

- DOM-узел (фокус, прокрутка, измерение, интеграция с библиотеками);
- id таймера/интервала, экземпляр стороннего объекта (карта, плеер, WebSocket);
- «последнее значение» для долгоживущих колбэков (защита от stale closure);
- флаги, не влияющие на разметку («уже отправили аналитику»).

**Не читайте и не пишите `ref.current` во время рендера** (кроме ленивой инициализации
`if (ref.current === null) ref.current = new Heavy()`). Рендер должен быть чистым,
а ref — изменяемый; React Compiler и линтер это отмечают.

## Ref на DOM-элемент

```jsx
function SearchInput() {
  const inputRef = useRef(null);
  return (
    <>
      <input ref={inputRef} />
      <button onClick={() => inputRef.current.focus()}>Найти</button>
    </>
  );
}
```

React заполняет `ref.current` в фазе **коммита**, до layout-эффектов, и обнуляет при
размонтировании. Во время первого рендера там `null`.

## Callback ref

Вместо объекта можно передать функцию — React вызовет её с узлом при монтировании
(и с `null` при размонтировании до React 19):

```jsx
function MeasuredBox() {
  const [height, setHeight] = useState(0);
  const measure = useCallback((node) => {
    if (node) setHeight(node.getBoundingClientRect().height);
  }, []);
  return <div ref={measure}>…</div>;
}
```

Полезно, когда нужно узнать о **появлении** узла (например, условно рендеримого), или
работать со списком узлов. В **React 19** callback ref может вернуть функцию очистки —
как эффект:

```jsx
<div ref={(node) => {
  const observer = new ResizeObserver(…);
  observer.observe(node);
  return () => observer.disconnect();
}} />
```

## forwardRef и ref как проп в React 19

До React 19 `ref` был особым пропом и не передавался в функциональный компонент.
Чтобы родитель мог получить DOM-узел внутри вашего компонента, нужен был `forwardRef`:

```jsx
const TextField = forwardRef(function TextField(props, ref) {
  return <input ref={ref} {...props} />;
});
```

**React 19**: `ref` — обычный проп функциональных компонентов:

```jsx
function TextField({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}
```

`forwardRef` продолжает работать, но будет объявлен устаревшим.

## useImperativeHandle

Иногда родителю нужно не весь DOM-узел, а ограниченный набор действий:

```jsx
function VideoPlayer({ ref, src }) {
  const videoRef = useRef(null);
  useImperativeHandle(ref, () => ({
    play: () => videoRef.current.play(),
    pause: () => videoRef.current.pause(),
  }), []);
  return <video ref={videoRef} src={src} />;
}

// родитель
playerRef.current.play();
```

Так компонент контролирует свой публичный императивный API: родитель не может
поменять стили или атрибуты `<video>` напрямую.

## Когда ref — это костыль

Ref — «аварийный люк» из декларативной модели. Признаки злоупотребления:

- чтение значения инпута через ref, когда нужна валидация и реакция на ввод, — лучше
  контролируемое поле (или React Hook Form, где ref — осознанная оптимизация);
- императивное управление потомком («открой модалку») вместо пропа `open`;
- хранение в ref того, что должно отображаться, и ручной «форс-рендер»;
- чтение ref во время рендера для вычисления разметки.

Всё, что выражается пропсами и state, выражается ими. Ref — для фокуса, прокрутки,
измерений, анимаций, медиа и интеграции с не-React кодом.

## Как это спрашивают

- «Чем `useRef` отличается от `useState`?» — рендер, снапшот, что показывается.
- «Когда `ref.current` становится доступен?» — после коммита, до layout-эффектов.
- «Как передать ref в свой компонент? Что изменилось в React 19?»
- «Зачем `useImperativeHandle`?»
- «Как измерить элемент, который появляется условно?» — callback ref.
