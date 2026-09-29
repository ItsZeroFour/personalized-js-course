import type { SeedFlashcard } from '../types.js';

/** State management, браузер и сеть, тестирование, архитектура, поведенческое интервью. */
export const engineeringFlashcards: SeedFlashcard[] = [
  // --- local-vs-global ---
  {
    topic: 'local-vs-global',
    front: 'Пять видов состояния и где их держать',
    back: 'Серверное — кеш запросов (TanStack Query). URL — фильтры, страница, вкладка. Локальное UI — useState как можно ниже. Глобальное клиентское — Context / Zustand / Redux. Форма — локально или React Hook Form.',
  },
  {
    topic: 'local-vs-global',
    front: 'Lifting state up — до какого уровня поднимать?',
    back: 'До ближайшего общего родителя всех компонентов, которым нужно значение. Выше — лишние ререндеры и связанность.',
  },
  {
    topic: 'local-vs-global',
    front: 'Главное правило «одного источника истины»',
    back: 'Одно значение хранится в одном месте; производные значения вычисляются, а не копируются в state и не синхронизируются эффектами.',
  },

  // --- redux-toolkit ---
  {
    topic: 'redux-toolkit',
    front: 'Почему в createSlice можно «мутировать» state?',
    back: 'Immer передаёт draft-прокси, записывает изменения и создаёт новое состояние со структурным разделением. Либо мутировать draft, либо вернуть новое значение — не оба.',
  },
  {
    topic: 'redux-toolkit',
    front: 'Когда useSelector перерисует компонент?',
    back: 'Когда результат селектора изменился по `===`. Селектор, возвращающий новый объект/массив, будит компонент на каждый dispatch → `shallowEqual` или `createSelector`.',
  },
  {
    topic: 'redux-toolkit',
    front: 'createAsyncThunk и RTK Query',
    back: 'createAsyncThunk — async-логика с pending/fulfilled/rejected-экшенами. RTK Query — кеш запросов (как TanStack Query) внутри Redux: хуки, теги для инвалидации.',
  },

  // --- zustand ---
  {
    topic: 'zustand',
    front: 'Базовый Zustand-стор',
    back: '`const useStore = create((set) => ({ count: 0, inc: () => set((s) => ({ count: s.count + 1 })) }))`. Без провайдера; `set` мержит объект на верхнем уровне.',
  },
  {
    topic: 'zustand',
    front: 'Как избежать лишних ререндеров в Zustand?',
    back: 'Селектор конкретного значения `useStore(s => s.count)`; для нескольких полей — `useShallow`. Без селектора — подписка на весь стор.',
  },
  {
    topic: 'zustand',
    front: 'Как прочитать Zustand-стор вне React?',
    back: '`useStore.getState()` и `useStore.subscribe(listener)` — в обработчиках, утилитах, интеграциях. В рендере — только через хук, иначе нет подписки.',
  },

  // --- tanstack-query ---
  {
    topic: 'tanstack-query',
    front: 'staleTime vs gcTime',
    back: 'staleTime (по умолчанию 0) — сколько данные свежие и не перезапрашиваются. gcTime (5 мин) — сколько хранить неиспользуемые данные после ухода последнего наблюдателя.',
  },
  {
    topic: 'tanstack-query',
    front: 'Когда TanStack Query перезапрашивает устаревшие данные?',
    back: 'При монтировании нового наблюдателя, фокусе окна, восстановлении сети, по `refetchInterval`, после инвалидации.',
  },
  {
    topic: 'tanstack-query',
    front: 'Как обновить данные после мутации?',
    back: '`invalidateQueries({ queryKey })` — перезапрос; `setQueryData` — положить результат в кеш; оптимистично — в `onMutate` с откатом в `onError`.',
  },
  {
    topic: 'tanstack-query',
    front: 'isPending vs isFetching',
    back: 'isPending — данных ещё нет (первая загрузка). isFetching — идёт любой запрос, в том числе фоновое обновление при наличии данных.',
  },

  // --- dom-events ---
  {
    topic: 'dom-events',
    front: 'Фазы события',
    back: 'Capture (от window к цели) → target → bubble (обратно). `addEventListener(type, fn, true)` — на capture-фазу. Не всплывают: focus, blur, mouseenter, mouseleave.',
  },
  {
    topic: 'dom-events',
    front: 'target vs currentTarget',
    back: 'target — где событие произошло (самый глубокий элемент). currentTarget — чей обработчик выполняется сейчас.',
  },
  {
    topic: 'dom-events',
    front: 'stopPropagation vs preventDefault',
    back: 'stopPropagation — остановить распространение по дереву. preventDefault — отменить действие браузера по умолчанию (переход по ссылке, отправка формы).',
  },
  {
    topic: 'dom-events',
    front: 'Опция `passive: true`',
    back: 'Обещание не вызывать preventDefault — браузер может скроллить, не дожидаясь обработчика touch/wheel. Улучшает плавность прокрутки.',
  },

  // --- rendering-path ---
  {
    topic: 'rendering-path',
    front: 'Этапы рендеринга страницы',
    back: 'DOM + CSSOM → render tree → layout → paint → composite. Изменение transform/opacity — только composite.',
  },
  {
    topic: 'rendering-path',
    front: 'defer vs async',
    back: 'Оба грузят скрипт параллельно с парсингом. defer — выполнение после парсинга, по порядку. async — сразу по загрузке, порядок не гарантирован. `type="module"` ведёт себя как defer.',
  },
  {
    topic: 'rendering-path',
    front: 'Layout thrashing',
    back: 'Чередование записи стилей и чтения геометрии (offsetWidth, getBoundingClientRect) вызывает синхронный layout на каждом чтении. Сначала все чтения, потом все записи.',
  },

  // --- http-cors ---
  {
    topic: 'http-cors',
    front: 'Что такое origin?',
    back: 'Схема + хост + порт. `http://a.com` и `https://a.com` — разные origin; `a.com:3000` и `a.com:4000` — тоже.',
  },
  {
    topic: 'http-cors',
    front: 'Когда нужен preflight?',
    back: 'Методы кроме GET/HEAD/POST, свои заголовки (Authorization и т. п.), Content-Type кроме form-urlencoded, multipart и text/plain — например application/json.',
  },
  {
    topic: 'http-cors',
    front: 'CORS с cookies',
    back: 'Клиент: `credentials: "include"`. Сервер: `Access-Control-Allow-Credentials: true` и конкретный origin (не `*`).',
  },
  {
    topic: 'http-cors',
    front: 'Коды 401 vs 403, 400 vs 422',
    back: '401 — не аутентифицирован (кто ты?). 403 — аутентифицирован, но нет прав. 400 — некорректный запрос. 422 — формально корректен, но не прошёл валидацию.',
  },

  // --- caching ---
  {
    topic: 'caching',
    front: 'no-cache vs no-store',
    back: 'no-cache — хранить можно, но каждый раз ревалидировать (ETag → 304). no-store — не хранить вообще.',
  },
  {
    topic: 'caching',
    front: 'Кеширование для SPA',
    back: 'Файлы с хешем в имени — `max-age=31536000, immutable`. index.html — `no-cache`. Старые чанки держать после деплоя, чтобы не было ChunkLoadError.',
  },
  {
    topic: 'caching',
    front: 'ETag и условный запрос',
    back: 'Сервер отдаёт `ETag`; браузер при ревалидации шлёт `If-None-Match`; если не изменилось — `304 Not Modified` без тела.',
  },

  // --- web-vitals ---
  {
    topic: 'web-vitals',
    front: 'Core Web Vitals и пороги',
    back: 'LCP ≤ 2,5 с (основной контент), INP ≤ 200 мс (отклик на взаимодействия, заменил FID в 2024), CLS ≤ 0,1 (сдвиги вёрстки).',
  },
  {
    topic: 'web-vitals',
    front: 'Главные причины плохого LCP',
    back: 'Медленный TTFB; LCP-картинка найдена поздно (JS, CSS background, lazy); тяжёлое изображение; блокирующие CSS/JS; клиентский рендеринг всего контента.',
  },
  {
    topic: 'web-vitals',
    front: 'Как улучшить INP?',
    back: 'Не блокировать main thread: дробить длинные задачи (`scheduler.yield`, `setTimeout`), переносить тяжёлое в Web Worker, `useTransition` для несрочных обновлений, меньше JS.',
  },

  // --- bundle-optimization ---
  {
    topic: 'bundle-optimization',
    front: 'Условия tree shaking',
    back: 'ES-модули, статические импорты конкретных функций, модули без побочных эффектов (`"sideEffects": false`).',
  },
  {
    topic: 'bundle-optimization',
    front: 'Где начинать code splitting?',
    back: 'С маршрутов (`React.lazy` + Suspense), затем тяжёлые редкие компоненты и библиотеки через `import()` по требованию. Предзагрузка по наведению.',
  },
  {
    topic: 'bundle-optimization',
    front: 'Чем анализировать бандл?',
    back: '`rollup-plugin-visualizer` (Vite), `webpack-bundle-analyzer`, `source-map-explorer`; bundlephobia — вес пакета до установки.',
  },

  // --- web-security ---
  {
    topic: 'web-security',
    front: 'Где XSS возможен в React?',
    back: '`dangerouslySetInnerHTML`, `innerHTML` через ref, `href`/`src` с `javascript:` из пользовательских данных, eval/new Function, сторонние скрипты. Защита: санитайзер (DOMPurify), валидация URL, CSP.',
  },
  {
    topic: 'web-security',
    front: 'Защита от CSRF',
    back: 'Cookies с `SameSite=Lax/Strict`, CSRF-токен, проверка Origin, изменяющие действия только не-GET методами.',
  },
  {
    topic: 'web-security',
    front: 'localStorage vs httpOnly cookie для токена',
    back: 'localStorage читается любым XSS. httpOnly cookie недоступна JS, но уязвима к CSRF без SameSite. Компромисс: access-токен в памяти + refresh в httpOnly SameSite cookie.',
  },

  // --- vitest-jest ---
  {
    topic: 'vitest-jest',
    front: 'Структура теста: AAA',
    back: 'Arrange (подготовка), Act (действие), Assert (проверка). Один тест — одно поведение; имя теста описывает поведение, а не реализацию.',
  },
  {
    topic: 'vitest-jest',
    front: 'toBe vs toEqual vs toStrictEqual',
    back: 'toBe — `Object.is`. toEqual — глубокое сравнение (игнорирует undefined-поля). toStrictEqual — ещё и undefined-поля, классы, разреженность массивов.',
  },
  {
    topic: 'vitest-jest',
    front: 'Фейковые таймеры',
    back: '`vi.useFakeTimers()` → `vi.advanceTimersByTime(ms)` / `runAllTimers()` → `vi.useRealTimers()`. Тесты таймеров мгновенные и детерминированные.',
  },

  // --- rtl ---
  {
    topic: 'rtl',
    front: 'Приоритет запросов Testing Library',
    back: 'getByRole → getByLabelText → getByPlaceholderText → getByText → getByDisplayValue → alt/title → getByTestId (последний вариант).',
  },
  {
    topic: 'rtl',
    front: 'getBy vs queryBy vs findBy',
    back: 'getBy — бросает, если нет. queryBy — возвращает null (проверка отсутствия). findBy — промис, ждёт появления (асинхронное).',
  },
  {
    topic: 'rtl',
    front: 'userEvent vs fireEvent',
    back: 'userEvent имитирует реального пользователя (фокус, keydown/keypress/input/keyup, hover), fireEvent диспатчит одно событие. Предпочтительнее userEvent.',
  },

  // --- what-to-test ---
  {
    topic: 'what-to-test',
    front: 'Testing trophy',
    back: 'Основание — статический анализ (TS, ESLint), дальше юнит-тесты, больше всего — интеграционных тестов компонентов, наверху немного E2E.',
  },
  {
    topic: 'what-to-test',
    front: 'Что такое «детали реализации» в тестах?',
    back: 'То, чего не видит пользователь: внутренний state, имена классов, структура DOM, вызовы конкретных хуков. Тесты на них ломаются при рефакторинге.',
  },
  {
    topic: 'what-to-test',
    front: 'Что покрывать E2E-тестами?',
    back: 'Немногие критические пути: вход, оплата, оформление заказа — где поломка стоит денег. E2E медленные и хрупкие, их не должно быть много.',
  },

  // --- mocks ---
  {
    topic: 'mocks',
    front: 'vi.fn / vi.spyOn / vi.mock',
    back: 'fn — новая функция-заглушка. spyOn — обёртка над существующим методом (с mockRestore). mock — подмена модуля при импорте.',
  },
  {
    topic: 'mocks',
    front: 'Почему MSW лучше мока fetch?',
    back: 'Перехват на уровне HTTP не зависит от клиента (fetch/axios/Query), проверяет сериализацию и статусы, обработчики переиспользуются в Storybook и разработке.',
  },
  {
    topic: 'mocks',
    front: 'Изоляция тестов',
    back: 'Сбрасывать моки (`vi.restoreAllMocks`), обработчики MSW (`resetHandlers`), создавать новый QueryClient без ретраев на каждый тест.',
  },

  // --- project-structure ---
  {
    topic: 'project-structure',
    front: 'Слои FSD сверху вниз',
    back: 'app → pages → widgets → features → entities → shared. Импорт только из нижних слоёв; слайсы одного слоя друг друга не импортируют.',
  },
  {
    topic: 'project-structure',
    front: 'Публичный API модуля',
    back: 'Каждый слайс экспортирует наружу только `index.ts`; глубокие импорты `features/cart/ui/Button` запрещены. Можно менять внутренности без правок снаружи.',
  },
  {
    topic: 'project-structure',
    front: 'Feature-based vs type-based структура',
    back: 'Type-based (`components/`, `hooks/`) — удобно в начале, но фича размазана по папкам. Feature-based — код фичи рядом, её легко изменить и удалить.',
  },

  // --- solid-frontend ---
  {
    topic: 'solid-frontend',
    front: 'SRP во фронтенде',
    back: 'Компонент отвечает за одно: данные (хук/контейнер) или отображение. Признак нарушения — компонент на 500 строк с запросами, форматированием и вёрсткой.',
  },
  {
    topic: 'solid-frontend',
    front: 'OCP во фронтенде',
    back: 'Расширять композицией (children, слоты, конфигурация вариантов), а не новыми if и boolean-пропсами на каждый случай.',
  },
  {
    topic: 'solid-frontend',
    front: 'DIP во фронтенде',
    back: 'Зависеть от абстракций: API-клиент, логгер, хранилище передаются через контекст/пропсы и легко подменяются в тестах.',
  },

  // --- logic-ui-separation ---
  {
    topic: 'logic-ui-separation',
    front: 'Container / presentational в эпоху хуков',
    back: 'Логика — в кастомном хуке (`useCheckout`), компонент получает данные и действия и только рисует. Презентационный компонент удобно показывать в Storybook.',
  },
  {
    topic: 'logic-ui-separation',
    front: 'Headless-компоненты',
    back: 'Логика, состояние и доступность без разметки и стилей: Radix, Headless UI, TanStack Table. Внешний вид — полностью у потребителя.',
  },
  {
    topic: 'logic-ui-separation',
    front: 'Зачем маппить ответ API в свою модель?',
    back: 'Компоненты не зависят от формата бэкенда: переименование поля правится в одном месте, даты и суммы приводятся к удобным типам сразу.',
  },

  // --- error-handling ---
  {
    topic: 'error-handling',
    front: 'Отклоняет ли fetch промис на 404/500?',
    back: 'Нет. Только при сетевой ошибке или отмене. HTTP-статус проверяют вручную: `if (!response.ok) throw …`.',
  },
  {
    topic: 'error-handling',
    front: 'Уровни обработки ошибок в React-приложении',
    back: 'Error boundaries по зонам; try/catch в обработчиках; ошибки запросов как UI-состояние с повтором; глобальное логирование (Sentry, onUncaughtError).',
  },
  {
    topic: 'error-handling',
    front: 'Ожидаемые vs неожиданные ошибки',
    back: 'Ожидаемые (валидация, 404, нет прав) — часть UI и сценария. Неожиданные (баги) — граница ошибок, мониторинг, сообщение «что-то пошло не так» с повтором.',
  },

  // --- behavioral ---
  {
    topic: 'self-presentation',
    front: 'Структура «Расскажите о себе»',
    back: 'Кто я сейчас → 2–3 конкретных примера с результатами → сильная сторона под вакансию → почему эта компания. 1,5–2 минуты.',
  },
  {
    topic: 'self-presentation',
    front: 'Как подать опыт фриланса?',
    back: 'Ответственность за результат целиком, общение с заказчиком, оценка сроков, работа с чужим кодом. Мотивация в команду — рост через ревью и долгоживущий продукт.',
  },
  {
    topic: 'star-method',
    front: 'STAR',
    back: 'Situation (контекст, кратко) → Task (ваша задача) → Action (что именно сделали вы, основная часть) → Result (измеримый итог и вывод).',
  },
  {
    topic: 'star-method',
    front: 'Типичные ошибки в ответах по STAR',
    back: 'Длинная ситуация и скомканное действие; «мы» вместо «я»; нет результата; история без сложности и принятия решений.',
  },
  {
    topic: 'conflicts',
    front: 'Как рассказывать о конфликте',
    back: 'Понял позицию другой стороны → аргументы и данные → варианты и компромисс → принятое решение выполнено (disagree and commit) → вывод. Без обвинений.',
  },
  {
    topic: 'conflicts',
    front: 'Disagree and commit',
    back: 'Высказать несогласие с аргументами, но после принятого решения выполнять его в полную силу, зафиксировав риски.',
  },
  {
    topic: 'estimation',
    front: 'Как оценивать задачу',
    back: 'Разбить на части по 2–8 часов; выделить неизвестное (spike); дать диапазон с допущениями; учесть ошибки, адаптив, ревью, тесты.',
  },
  {
    topic: 'estimation',
    front: 'Что делать, если не успеваете',
    back: 'Сообщить как можно раньше, объяснить причину, предложить варианты: сократить объём, сдвинуть срок, привлечь помощь. Потом разобрать ошибку оценки.',
  },
];
