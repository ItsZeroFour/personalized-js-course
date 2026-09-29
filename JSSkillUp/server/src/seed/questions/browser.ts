import type { SeedQuestion } from '../types.js';

/** Вопросы про браузер и сеть: события, рендеринг страницы, HTTP, кеш, Web Vitals, безопасность. */
export const browserQuestions: SeedQuestion[] = [
  // --- dom-events ---------------------------------------------------------------------
  {
    topic: 'dom-events',
    kind: 'output',
    difficulty: 'medium',
    promptMd: '`child` вложен в `parent`. Что выведет консоль?',
    code: `parent.addEventListener('click', () => console.log('parent capture'), true);
parent.addEventListener('click', () => console.log('parent bubble'));
child.addEventListener('click', () => console.log('child'));

child.click();`,
    expectedOutput: ['parent capture', 'child', 'parent bubble'],
    explanationMd:
      'Событие проходит три фазы: **погружение** (capture) от `window` к цели, **цель**, ' +
      '**всплытие** (bubble) обратно. Третий аргумент `true` (или `{ capture: true }`) вешает ' +
      'обработчик на фазу погружения, поэтому родитель узнаёт о клике раньше ребёнка.\n\n' +
      'На этом строятся перехват событий (закрыть меню до того, как клик дойдёт до цели) и ' +
      '`stopPropagation` в capture-фазе.',
    tags: ['события', 'capture', 'bubbling'],
  },
  {
    topic: 'dom-events',
    kind: 'mc',
    difficulty: 'easy',
    promptMd: 'Обработчик клика повешен на `<ul>` (делегирование), пользователь кликнул по `<span>` внутри `<li>`. Чему равны `event.target` и `event.currentTarget`?',
    options: [
      { id: 'a', text: 'target — ul, currentTarget — span' },
      { id: 'b', text: 'target — span, currentTarget — ul' },
      { id: 'c', text: 'Оба равны li' },
      { id: 'd', text: 'target — li, currentTarget — ul' },
    ],
    correct: ['b'],
    explanationMd:
      '`target` — самый глубокий элемент, на котором произошло событие; `currentTarget` — элемент, ' +
      'чей обработчик сейчас выполняется.\n\n' +
      'При делегировании нужный элемент ищут от цели вверх: `event.target.closest("li")` — и ' +
      'проверяют, что он внутри `currentTarget`. Делегирование экономит обработчики на больших ' +
      'списках и работает для элементов, добавленных позже. React сам делегирует события на корень.',
    tags: ['делегирование', 'события'],
  },

  // --- rendering-path ----------------------------------------------------------------------
  {
    topic: 'rendering-path',
    kind: 'mc',
    difficulty: 'medium',
    promptMd: 'Почему этот код медленный?',
    code: `for (const item of items) {
  item.style.width = container.offsetWidth / 2 + 'px';
}`,
    options: [
      { id: 'a', text: 'Строковая конкатенация медленная' },
      { id: 'b', text: 'Чтение offsetWidth после записи стиля заставляет браузер синхронно пересчитывать layout на каждой итерации (layout thrashing)' },
      { id: 'c', text: 'for...of медленнее обычного for' },
      { id: 'd', text: 'Проблема только в том, что стили нужно задавать через классы' },
    ],
    correct: ['b'],
    explanationMd:
      'Браузер откладывает пересчёт layout до конца кадра. Но чтение геометрии (`offsetWidth`, ' +
      '`getBoundingClientRect`, `scrollTop`) требует актуальных значений — и после записи стилей ' +
      'вызывает **принудительный синхронный layout**. Чередование записи и чтения в цикле = layout ' +
      'на каждой итерации.\n\n' +
      'Исправление: прочитать один раз до цикла, затем только писать. В сложных случаях — ' +
      'разделять чтения и записи по фазам (`requestAnimationFrame`, библиотека fastdom).',
    tags: ['reflow', 'layout thrashing'],
  },
  {
    topic: 'rendering-path',
    kind: 'open',
    difficulty: 'medium',
    promptMd: 'Опишите критический путь рендеринга: что делает браузер от получения HTML до первого кадра? Что его блокирует?',
    explanationMd: 'Классический вопрос; ждут этапы и влияние CSS/JS.',
    referenceAnswerMd: `Этапы:

1. **Парсинг HTML → DOM.** Парсер идёт по документу; preload scanner заранее находит ресурсы.
2. **CSS → CSSOM.** CSS **блокирует рендеринг**: страницу нельзя показать без стилей, иначе
   будет вспышка нестилизованного контента.
3. **JavaScript.** Обычный \`<script>\` **блокирует парсинг**: браузер останавливается, скачивает
   и выполняет скрипт (скрипт может менять DOM). Кроме того, скрипт ждёт загрузки CSS перед
   ним, потому что может читать стили.
4. **Render tree** = DOM + CSSOM, только видимые узлы.
5. **Layout** — вычисление размеров и позиций.
6. **Paint** — отрисовка пикселей по слоям.
7. **Composite** — сборка слоёв на GPU.

Как ускорить:
- \`defer\` для скриптов (загрузка параллельно, выполнение после парсинга, по порядку),
  \`async\` для независимых (аналитика), \`type="module"\` ведёт себя как defer;
- критический CSS инлайн, остальное — без блокировки; меньше CSS в целом;
- \`preload\` для шрифтов и LCP-картинки, \`preconnect\` к сторонним доменам;
- SSR/SSG, чтобы первый HTML уже содержал контент.

Изменение \`transform\`/\`opacity\` затрагивает только composite — поэтому анимации делают на них,
а не на \`top\`/\`width\` (layout + paint).`,
    rubric: [
      'DOM и CSSOM, render tree',
      'layout, paint, composite',
      'CSS блокирует рендер, скрипт блокирует парсинг',
      'defer/async, preload/preconnect, критический CSS',
      'transform/opacity только на composite',
    ],
    tags: ['critical rendering path'],
  },

  // --- http-cors ------------------------------------------------------------------------------
  {
    topic: 'http-cors',
    kind: 'mc',
    difficulty: 'medium',
    promptMd: 'В каком случае браузер отправит preflight-запрос `OPTIONS` перед запросом на другой origin?',
    options: [
      { id: 'a', text: 'Перед любым cross-origin запросом' },
      { id: 'b', text: 'fetch(url, { method: "POST", headers: { "Content-Type": "application/json" } })' },
      { id: 'c', text: 'fetch(url) — обычный GET без дополнительных заголовков' },
      { id: 'd', text: 'Отправка HTML-формы методом POST с application/x-www-form-urlencoded' },
    ],
    correct: ['b'],
    explanationMd:
      '«Простые» запросы (GET/HEAD/POST с «безопасными» заголовками и `Content-Type` из ' +
      '`text/plain`, `multipart/form-data`, `application/x-www-form-urlencoded`) идут без preflight — ' +
      'их и раньше могли отправлять обычные формы.\n\n' +
      '`Content-Type: application/json`, методы PUT/DELETE/PATCH, заголовок `Authorization` и любые ' +
      'свои заголовки требуют preflight: браузер спрашивает сервер `OPTIONS` с ' +
      '`Access-Control-Request-Method/Headers`. Ответ можно кешировать через `Access-Control-Max-Age`.',
    tags: ['CORS', 'preflight'],
  },
  {
    topic: 'http-cors',
    kind: 'open',
    difficulty: 'medium',
    promptMd: 'Что такое CORS и от чего он защищает? Почему ошибка CORS видна в браузере, но тот же запрос работает из Postman?',
    explanationMd: 'Проверяет понимание same-origin policy, а не заголовков наизусть.',
    referenceAnswerMd: `**Same-Origin Policy** — браузер не даёт скрипту одного origin (схема + хост + порт)
**читать ответы** другого origin. Иначе любой сайт мог бы от имени пользователя, с его
cookies, прочитать почту или банковский кабинет в соседней вкладке.

**CORS** — механизм, которым **сервер** разрешает определённым origin'ам читать свои ответы:
\`Access-Control-Allow-Origin\`, \`-Methods\`, \`-Headers\`, \`-Credentials\`. Для «непростых»
запросов браузер сначала отправляет preflight \`OPTIONS\`.

Почему Postman работает: CORS — **ограничение браузера**, защищающее пользователя.
Postman, curl и сервер-сервер не применяют SOP. Поэтому CORS **не защищает API**
от прямых запросов — для этого нужна аутентификация и авторизация.

Детали:
- запрос с cookies (\`credentials: 'include'\`) требует \`Allow-Credentials: true\`
  и конкретного origin, не \`*\`;
- «простой» запрос **отправляется** даже без разрешения — браузер лишь скрывает ответ;
  поэтому от CSRF CORS не спасает;
- в разработке CORS обходят прокси dev-сервера (Vite \`server.proxy\`), в проде — один
  домен или корректные заголовки на API.`,
    rubric: [
      'same-origin policy: запрет чтения ответов другого origin',
      'CORS — сервер разрешает origin через заголовки',
      'preflight OPTIONS',
      'это ограничение браузера, не защита API',
      'credentials требуют конкретный origin',
    ],
    tags: ['CORS', 'same-origin policy'],
  },

  // --- caching -----------------------------------------------------------------------------------
  {
    topic: 'caching',
    kind: 'mc',
    difficulty: 'medium',
    promptMd: 'Чем `Cache-Control: no-cache` отличается от `no-store`?',
    options: [
      { id: 'a', text: 'Это синонимы' },
      { id: 'b', text: 'no-cache: хранить можно, но перед использованием нужно проверить у сервера (ETag/Last-Modified); no-store: не сохранять вообще' },
      { id: 'c', text: 'no-cache запрещает кеш на CDN, no-store — в браузере' },
      { id: 'd', text: 'no-store кеширует на один запрос' },
    ],
    correct: ['b'],
    explanationMd:
      '`no-cache` — «всегда ревалидируй»: браузер отправит условный запрос (`If-None-Match`), и сервер ' +
      'ответит `304 Not Modified` без тела, если ничего не изменилось. Так отдают `index.html`.\n\n' +
      '`no-store` — ничего не сохранять: для приватных данных (банковские выписки).\n\n' +
      'Для статики с хешем в имени — `Cache-Control: public, max-age=31536000, immutable`.',
    tags: ['HTTP-кеш', 'Cache-Control'],
  },
  {
    topic: 'caching',
    kind: 'open',
    difficulty: 'medium',
    promptMd: 'Как настроить кеширование для SPA, чтобы пользователи получали новую версию сразу после деплоя, но статика кешировалась надолго?',
    explanationMd: 'Практический вопрос про cache busting.',
    referenceAnswerMd: `Две категории файлов — две стратегии:

1. **Статика с хешем содержимого в имени** (\`app.3f9a1c.js\`, \`styles.a81b.css\`, шрифты,
   картинки через сборщик): \`Cache-Control: public, max-age=31536000, immutable\`.
   Файл с таким именем **никогда не изменится** — при новом содержимом сборщик выдаст новое
   имя. Браузер и CDN держат его год и даже не ревалидируют.
2. **Точка входа** (\`index.html\`, иногда \`manifest.json\`, service worker):
   \`Cache-Control: no-cache\` (+ \`ETag\`). Браузер каждый раз спрашивает сервер и получает
   \`304\`, если версия не менялась, или новый HTML со ссылками на новые хешированные файлы.

После деплоя пользователь загружает свежий \`index.html\` → новые имена чанков → новые файлы.
Старые чанки стоит **хранить на сервере ещё какое-то время**: у открытых вкладок старый
HTML, и lazy-чанки грузятся по старым именам (иначе «ChunkLoadError» — его ловят и
перезагружают страницу).

Для API — отдельно: \`private\`/\`no-store\` для персональных данных, \`stale-while-revalidate\`
для публичных, ETag для условных запросов.`,
    rubric: [
      'хеш содержимого в имени файла + immutable на год',
      'index.html с no-cache и ревалидацией',
      'ETag и 304',
      'старые чанки и ChunkLoadError',
    ],
    tags: ['кеширование', 'cache busting'],
  },

  // --- web-vitals --------------------------------------------------------------------------------
  {
    topic: 'web-vitals',
    kind: 'mc',
    difficulty: 'easy',
    promptMd: 'Что измеряют Core Web Vitals LCP, INP и CLS?',
    options: [
      { id: 'a', text: 'LCP — время до первого байта, INP — размер JS, CLS — число запросов' },
      { id: 'b', text: 'LCP — когда отрисован самый большой видимый элемент; INP — задержка отклика на взаимодействия; CLS — неожиданные сдвиги вёрстки' },
      { id: 'c', text: 'LCP — время загрузки всех картинок, INP — время ввода текста, CLS — плавность анимаций' },
      { id: 'd', text: 'Это метрики только для мобильных устройств' },
    ],
    correct: ['b'],
    explanationMd:
      '**LCP** (Largest Contentful Paint) — загрузка основного контента; хорошо ≤ 2,5 с.\n\n' +
      '**INP** (Interaction to Next Paint, в 2024 заменил FID) — сколько проходит от клика/нажатия ' +
      'до следующего кадра, по худшим взаимодействиям за визит; хорошо ≤ 200 мс.\n\n' +
      '**CLS** (Cumulative Layout Shift) — сумма неожиданных сдвигов элементов; хорошо ≤ 0,1.\n\n' +
      'Измеряются на реальных пользователях (RUM, библиотека `web-vitals`, CrUX), Lighthouse — ' +
      'лабораторная оценка.',
    tags: ['Web Vitals', 'LCP', 'INP', 'CLS'],
  },
  {
    topic: 'web-vitals',
    kind: 'open',
    difficulty: 'medium',
    promptMd: 'Страница набирает плохие LCP и CLS. Какие причины вы будете искать и как исправлять?',
    explanationMd: 'Ждут конкретные причины и приёмы, а не «оптимизировать картинки».',
    referenceAnswerMd: `**LCP** — самый большой элемент (обычно hero-картинка или заголовок) отрисован поздно.
Причины и решения:
- долгий ответ сервера (TTFB) → кеш, CDN, SSR/SSG;
- LCP-картинка обнаруживается поздно (грузится JS, лежит в CSS background, \`loading="lazy"\`)
  → обычный \`<img>\` в HTML, \`fetchpriority="high"\`, \`<link rel="preload">\`, **не** lazy для
  первого экрана;
- тяжёлая картинка → современные форматы (AVIF/WebP), \`srcset\`/\`sizes\`, правильные размеры;
- блокирующие CSS/JS и клиентский рендеринг всего контента → критический CSS, \`defer\`,
  SSR, код-сплиттинг;
- веб-шрифты для текстового LCP → \`font-display: swap\`, preload.

**CLS** — элементы сдвигаются после появления.
- картинки/видео/iframe без размеров → \`width\`/\`height\` или \`aspect-ratio\`;
- контент, вставляемый сверху (баннеры, реклама, cookie-плашка) → резервировать место
  или показывать поверх;
- смена шрифта → \`size-adjust\`, похожий fallback-шрифт;
- анимации через \`top\`/\`height\` → \`transform\`;
- скелетоны того же размера, что и итоговый контент.

Диагностика: Lighthouse и Performance-панель (какой элемент LCP, какие сдвиги),
полевые данные — \`web-vitals\` в аналитику.`,
    rubric: [
      'LCP: TTFB, позднее обнаружение картинки, preload/fetchpriority, не lazy',
      'LCP: формат и размер изображений, блокирующие ресурсы',
      'CLS: размеры медиа, резерв места, шрифты',
      'transform вместо layout-свойств',
      'диагностика: Lighthouse, Performance, RUM',
    ],
    tags: ['Web Vitals', 'LCP', 'CLS'],
  },

  // --- bundle-optimization ------------------------------------------------------------------------
  {
    topic: 'bundle-optimization',
    kind: 'mc',
    difficulty: 'medium',
    promptMd: 'Что нужно, чтобы tree shaking удалил неиспользуемый код библиотеки? Выберите все верные.',
    options: [
      { id: 'a', text: 'Библиотека распространяется в ES-модулях (import/export), а не только в CommonJS' },
      { id: 'b', text: 'Модули без побочных эффектов при импорте; у пакета указано "sideEffects": false' },
      { id: 'c', text: 'Импорт конкретных функций, а не всего пространства имён с динамическим доступом' },
      { id: 'd', text: 'Минификация отключена' },
    ],
    correct: ['a', 'b', 'c'],
    explanationMd:
      'Tree shaking — статический анализ импортов и экспортов. CommonJS (`require`, `module.exports`) ' +
      'динамичен, его почти не удаётся «встряхнуть». Модуль с побочным эффектом (полифил, регистрация ' +
      'стилей) нельзя удалить, даже если экспорты не используются, — поле `sideEffects` сообщает ' +
      'сборщику, что можно.\n\n' +
      'Пример: `lodash` (CJS) тянет всё, `lodash-es` — только нужное. Анализировать бандл — ' +
      '`rollup-plugin-visualizer`, `source-map-explorer`.',
    tags: ['tree shaking', 'бандл'],
  },
  {
    topic: 'bundle-optimization',
    kind: 'mc',
    difficulty: 'easy',
    promptMd: 'С чего обычно начинают код-сплиттинг React-приложения?',
    options: [
      { id: 'a', text: 'С разделения каждого компонента в отдельный чанк' },
      { id: 'b', text: 'С маршрутов: React.lazy(() => import("./pages/Settings")) + Suspense на уровне роутера' },
      { id: 'c', text: 'С отключения минификации' },
      { id: 'd', text: 'С переписывания на классовые компоненты' },
    ],
    correct: ['b'],
    explanationMd:
      'Маршруты — естественные границы: пользователь редко нужен весь код сразу. Далее — тяжёлые, ' +
      'редко используемые компоненты (редактор кода, графики, модалки) и библиотеки (`import()` по ' +
      'требованию, например PDF-экспорт по клику).\n\n' +
      'Каждый чанк — лишний запрос, поэтому дробить до мелочи вредно. Предзагрузка по наведению на ' +
      'ссылку сглаживает задержку при переходе.',
    tags: ['code splitting', 'React.lazy'],
  },

  // --- web-security --------------------------------------------------------------------------------
  {
    topic: 'web-security',
    kind: 'mc',
    difficulty: 'medium',
    promptMd: 'React экранирует строки в JSX. Какие места всё равно опасны с точки зрения XSS? Выберите все верные.',
    options: [
      { id: 'a', text: '<div dangerouslySetInnerHTML={{ __html: userBio }} />' },
      { id: 'b', text: '<a href={user.website}>сайт</a>, где website пришёл от пользователя' },
      { id: 'c', text: '<p>{userComment}</p>' },
      { id: 'd', text: 'Вставка пользовательских данных в innerHTML через ref' },
    ],
    correct: ['a', 'b', 'd'],
    explanationMd:
      '(c) безопасно: React вставляет текст как текстовый узел.\n\n' +
      '(a) и (d) вставляют HTML как есть — нужен санитайзер (DOMPurify).\n\n' +
      '(b) — `javascript:alert(document.cookie)` в `href` выполнится при клике. React 19 блокирует ' +
      '`javascript:` URL, но полагаться стоит на валидацию протокола (`http:`/`https:`). ' +
      'Дополнительная защита — Content Security Policy.',
    tags: ['XSS', 'безопасность'],
  },
  {
    topic: 'web-security',
    kind: 'open',
    difficulty: 'hard',
    promptMd: 'Что такое CSRF и как от него защищаются? Где хранить токен авторизации в SPA и какие у вариантов риски?',
    explanationMd: 'Проверяет разницу между XSS и CSRF и понимание компромиссов хранения токенов.',
    referenceAnswerMd: `**CSRF** (Cross-Site Request Forgery) — чужой сайт заставляет браузер пользователя
отправить запрос на ваш сайт: браузер **сам приложит cookies**, и сервер примет запрос
как легитимный (например, форма на evil.com с \`action="bank.com/transfer"\`). Атакующий
не читает ответ — ему достаточно, чтобы действие выполнилось.

Защита:
- cookie с атрибутом **\`SameSite=Lax\`** (по умолчанию в современных браузерах) или \`Strict\` —
  cookie не отправляется с кросс-сайтовых POST;
- **CSRF-токен**: случайное значение в форме/заголовке, которое чужой сайт не может прочитать;
- проверка \`Origin\`/\`Referer\` на сервере;
- изменяющие действия — только не-GET методами; JSON API с кастомным заголовком требует
  preflight, что тоже мешает CSRF.

**Хранение токена:**
- \`localStorage\` — удобно, иммунно к CSRF (токен сам не прикладывается), но **любой XSS**
  его прочитает и уведёт;
- **httpOnly cookie** — недоступна JS, XSS не украдёт токен (но может действовать от имени
  пользователя, пока открыта страница); нужна защита от CSRF (\`SameSite\`, токен);
- распространённый компромисс: короткоживущий access-токен в памяти + refresh-токен
  в httpOnly \`SameSite=Strict\` cookie.

Главное: XSS обходит почти любую защиту, поэтому основа — не допустить XSS (экранирование,
санитайзинг, CSP).`,
    rubric: [
      'CSRF: браузер сам прикладывает cookies к запросу с чужого сайта',
      'SameSite cookies, CSRF-токен, проверка Origin',
      'localStorage уязвим к XSS',
      'httpOnly cookie защищает от кражи, но требует защиты от CSRF',
      'главное — предотвратить XSS',
    ],
    tags: ['CSRF', 'XSS', 'токены'],
  },
];
