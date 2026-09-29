# CLAUDE.md

Контекст проекта для будущих сессий. Пользовательская документация — в [README.md](./README.md).

## Что это

Локальное приложение для подготовки одного конкретного человека к собеседованию на React Middle.
Профиль пользователя: 2+ года коммерческого React (фриланс), **слабые места — глубокое знание
JavaScript и написание логического/алгоритмического кода руками**. Дедлайна нет, нужна глубина,
а не шпаргалка. Поэтому приоритет контента: JS core и алгоритмы → React в глубину → остальное.

Весь интерфейс и контент **на русском, технические термины на английском**
(closure, event loop, reconciliation, stale closure).

## Стек и ключевые решения

| Решение | Почему так |
| --- | --- |
| npm workspaces, три пакета | без внешних менеджеров; `shared` — единственный источник типов |
| `node:sqlite` вместо ORM | встроен в Node, синхронный API, никакой генерации кода |
| Fastify | лёгкий, типизированные роуты, нормальный error handler |
| Vite + React 19 + Tailwind v4 | Tailwind настраивается из CSS (`@theme inline`), без `tailwind.config.js` |
| Своя песочница на Web Worker | контроль над таймаутом и прогоном тестов; Sandpack отвергнут как тяжёлый |
| Свой iframe-рантайм для React-превью | переиспользует транспиляцию песочницы, работает офлайн |
| Groq через бэкенд | ключ никогда не попадает во фронтенд |

## Структура

```
shared/src/        типы + Zod-схемы; импортируется как @jsskillup/shared
  roadmap.ts       Stage, Topic, TopicStatus, TopicProgress
  questions.ts     Question = McQuestion | OutputQuestion | OpenQuestion, OpenAnswerGrade
  tasks.ts         Task, TaskTest, RunResult, CodeReview, TaskListItem
  testing.ts       ядро прогона тестов: expect, deepEqual, buildTestProgram
  reactTesting.ts  рантайм React-задач: сборка TSX-модуля и мини-Testing Library
                   (не реэкспортируется из index — импорт по подпути)
  flashcards.ts    Flashcard, Sm2State, ReviewGrade
  interview.ts     InterviewSession, InterviewTurn, InterviewReport
  stats.ts         Dashboard и его части
  theory.ts        TheoryArticle
  ai.ts            Zod-схемы ответов Groq: оценка, ревью, сгенерированные вопросы и задачи
  api.ts           DTO эндпоинтов + Zod-схемы тел запросов + ApiErrorBody
                   PublicQuestion — версия вопроса без правильных ответов

server/src/
  env.ts           валидация .env через Zod; REPO_ROOT; env.groq.configured
  errors.ts        ApiError + маппинг кода на HTTP-статус
  db/client.ts     DatabaseSync, транзакции, типобезопасное чтение колонок
  db/migrate.ts    нумерованные .sql-миграции, таблица _migrations
  db/migrations/   001_init.sql и далее
  db/repos/        доступ к данным, отдаёт доменные типы из shared
  routes/          регистрация роутов, разбор входа через Zod
  services/        бизнес-логика без SQL: dashboard, date, srs (SM-2), progress,
                   taskRunner (прогон тестов в Node),
                   groq (HTTP-клиент: ретраи 429, completeJson со схемой и одной «починкой»),
                   prompts (все промпты в одном месте), aiContent (оценка, ревью, генерация),
                   interview + interviewPrompts (mock interview),
                   reactRunner + reactWorker (React-задачи в worker_threads с happy-dom)
  seed/validate.ts проверка эталонных решений: npm run validate:tasks
  seed/            статический контент + идемпотентный загрузчик

web/src/
  api/client.ts    типизированный fetch, ApiRequestError
  lib/useApi.ts    минимальный data-fetching, useTheme, cn
  components/ui/   Card, Button, ProgressBar, StatusBadge, States, Markdown
  components/cards/CardReviewer.tsx — общий ревьюер карточек для темы и общей очереди
  components/ai/   AiPanels (вывод оценки и ревью, AiUnavailable), GenerateQuestions,
                   TaskAi (AI-ревью попытки, «похожая задача»)
  components/interview/ Transcript, LiveCodingPanel, ReportView
  components/ui/ErrorBoundary.tsx — падение страницы не роняет всё приложение
  components/editor/ CodeEditor + monacoSetup (Monaco из node_modules, не с CDN)
  sandbox/         runner.worker.ts — песочница, useRunner.ts — таймаут и terminate,
                   channels.ts — транспорт (Worker или sandbox-iframe), protocol.ts
  preview/         runtime.ts — рантайм iframe (web/preview.html): превью и тесты React-задач
  components/preview/LivePreview.tsx — живое превью с консолью и сторожем зависания
  components/layout/AppShell.tsx
  pages/           по одной странице на роут
  pages/topic/     TopicLayout с вкладками + Overview / Theory / Quiz / Cards
```

## Соглашения

**TypeScript.** `strict`, плюс `noUncheckedIndexedAccess`, `noUnusedLocals`,
`verbatimModuleSyntax`. `any` запрещён правилом ESLint. Для непроверенных данных —
`unknown` + Zod (тела запросов, ответы Groq) или явные хелперы (`str`, `num`, `enumColumn`,
`jsonColumn` в `db/client.ts`) для строк из SQLite. Единственные приведения типов —
локализованы в `db/client.ts` и снабжены комментарием.

**Импорты.** В `server` и `shared` — расширение `.js` в относительных путях (`moduleResolution:
NodeNext`). В `web` — алиасы `@/…` и `@jsskillup/shared`. Типы импортируются через
`import type`.

**Слои на бэкенде.** Роут разбирает вход и формирует ответ; репозиторий знает SQL и мапит
строки; сервис содержит логику без SQL. Роут не пишет SQL, репозиторий не знает про HTTP.

**Ошибки.** Бэкенд бросает `ApiError` с кодом из `API_ERROR_CODES`; глобальный обработчик
превращает её в `ApiErrorBody`. Фронт ловит `ApiRequestError` и показывает `message` как есть —
все сообщения написаны для человека и по-русски. Для 429 от Groq заполняется `retryAfterSec`.

**Даты.** «День» считается по локальному времени машины, формат `YYYY-MM-DD`
(`services/date.ts`). Метки времени — ISO-строки.

**Хуки.** `eslint-plugin-react-hooks` включён на `web/**` в режиме `recommended-latest`
и ловит в том числе `setState` внутри эффекта. Это осознанно: проект про подготовку
именно по этим темам, поэтому обходить правило отключением — плохой тон.
Производное состояние вычисляется при рендере, сброс локального состояния — через `key`.

**Прогресс.** `computed_percent` считается автоматически, `manual_percent` (если задан)
перебивает его в UI. Итоговое значение — поле `percent` в `TopicWithProgress`.
Формула (`services/progress.ts`): 30% теория, 35% точность по вопросам, 25% решённые
задачи, 10% «созревшие» карточки (интервал ≥ 21 дня). **Пустые блоки исключаются,
их вес распределяется между остальными** — иначе тема с нулём задач никогда не дошла бы
до 100%. Пересчёт вызывается после каждого действия: отметки статьи, ответа на вопрос,
самооценки, повторения карточки.

Статус двигается автоматически: `not_started` → `in_progress` при percent > 0,
`in_progress` → `learned` при 100%. Статус `review` автоматика не сбрасывает.

**Квизы.** На фронт уходит `PublicQuestion` — из вопроса вырезаны `correctOptionIds`,
`expectedOutput`, `explanationMd`, `referenceAnswerMd` и `rubric`. Они приходят
только в ответе `POST /api/questions/:id/check`. Открытый вопрос оценивает AI
(`POST /api/attempts/:id/ai-grade` → `ai_score` + `ai_feedback_json`) или сам пользователь
по эталону (`POST /api/attempts/:id/self-grade` → `self_score`). Колонки раздельные,
везде в статистике используется `COALESCE(ai_score, self_score)`.
Порог «верного ответа» для оценок — 7 из 10.

**Песочница.** Решение исполняется в Web Worker (`web/src/sandbox/`). Изоляция —
сам воркер: нет DOM, стейта приложения и localStorage. **Лимит времени сторожит хост**,
а не воркер: внутри воркера бесконечный цикл ничем не прервать, поэтому страница
взводит таймер на каждый тест по сообщению `test-start` и вызывает `terminate()`.
Поэтому в отчёте видно, какой именно тест завис.

Ядро прогона (`shared/src/testing.ts`) общее для браузера и Node: `buildTestProgram`
склеивает код решения и тесты в одну область видимости, поэтому тесты видят объявления
пользователя без экспорта. Тот же код использует `services/taskRunner.ts` —
значит «проверено в Node» означает «работает в браузере». `node:vm` намеренно
не используется: отдельный realm сломал бы `instanceof` для Date, Map и Error.

**React-песочница.** Задачи с `runtime: 'preview'` — TSX-модули с `import`/`export`.
sucrase (`reactTransformOptions()`) переводит их в CommonJS; `require` отдаёт React
из того же бандла, поэтому всё работает офлайн. Общий код — `shared/src/reactTesting.ts`:
сборка программы (`buildReactProgram`) и мини-Testing Library (`createReactHarness`).
Файл подключает lib DOM только для себя и **не реэкспортируется из `index.ts`** —
импорт `@jsskillup/shared/reactTesting` (в web) или `…/reactTesting.js` (в server).
- Браузер: `web/preview.html` + `src/preview/runtime.ts` в sandbox-iframe **без
  `allow-same-origin`** (opaque origin). Режим `?mode=preview` — живое превью
  (`LivePreview`, отложенная перерисовка, консоль, сторож зависания 4 с), `?mode=test` —
  прогон тестов тем же протоколом `WorkerMessage`, что и Web Worker. `useRunner(kind)`
  не знает, что за транспорт: `sandbox/channels.ts` даёт `SandboxChannel` для воркера
  и для iframe.
- Dev-сервер Vite разрешает CORS для origin `null` — иначе module-скрипты не загрузятся
  в sandbox-iframe (`vite.config.ts`, там же второй вход сборки `preview.html`).
- Node: `services/reactRunner.ts` запускает `reactWorker.ts` в `worker_threads` с happy-dom.
  Отдельный поток обязателен: happy-dom подменяет глобальные `fetch` и таймеры и сломал бы
  сервер, а зависший тест можно убить только `terminate()`. `taskRunner.runTaskTests`
  выбирает раннер по `runtime` — через него работают валидатор и AI-генерация.
- Хелперы асинхронные (`await render(...)`, `await fireEvent.click(...)`) — так поведение
  одинаково и с `act` (dev-сборка React), и без него (production-сборка, где `act`
  бросает — харнесс переключается на запасной путь). `sleep` ждёт **вне** `act`: внутри
  async-act React копит работу до конца колбэка, и цепочки «таймер → setState → эффект»
  не продвигались бы.
- Сообщения матчеров строятся лениво, `formatValue` печатает DOM-узел разметкой:
  обход свойств узла happy-dom практически бесконечен.
- Monaco получает типы React через `?raw`-импорт `@types/react` (алиас `~types`)
  и заглушку `csstype`; модель TSX-редактора создаётся с путём `*.tsx`.

**Тесты задач пишутся на чистом JS**: транспилируется только код решения,
тесты подставляются как есть.

**Скрытые тесты** приходят на клиент вместе с задачей — иначе их нельзя выполнить
в браузере. Они лишь не показываются в UI до прогона. Это осознанный компромисс
для личного приложения.

**SM-2** (`services/srs.ts`). Успешный ответ (grade ≥ 3): интервал 1 → 6 → предыдущий × ease.
Провал сбрасывает серию и возвращает карточку на завтра. Ease пересчитывается при любой
оценке по формуле Вожняка, минимум 1.3. В UI четыре кнопки вместо шести оценок:
0 / 3 / 4 / 5 — промежуточные значения на практике неразличимы.

**Слабые темы.** ≥3 попыток и точность <60%, либо статус `review`
(его проставляет отчёт mock interview).

**Seed.** Идемпотентен: upsert по id, удаление того, чего больше нет в seed-файлах.
Прогресс, заметки, попытки и состояние карточек не трогает. Запускается автоматически
при старте сервера.

**AI-контент.** Всегда сохраняется с `source = 'ai'` и помечается в UI бейджем.
Задача от AI сохраняется, только если её эталонное решение прошло её собственные тесты
(в Node, через `taskRunner.runTaskTests`) **и** стартовый код их не проходит.
«Похожая» задача наследует тип образца (`TaskFlavor`): React-образец → React-модуль
с отдельными правилами тестов в промпте и проверкой в happy-dom. При провале модели
один раз показывают причину и просят исправить. Вопросы дедуплицируются по хешу
`topicId + promptMd`; MC-вопрос с верным id, которого нет среди опций, отбрасывается.
Каждый вызов пишется в `ai_generations`.

**Groq.** Все ответы, от которых ждём структуру, идут через `completeJson(messages, schema)`:
`response_format: json_object`, снятие ```-обёртки, валидация Zod, при провале — одна
повторная попытка с текстом ошибки. Свободный текст (mock interview) — `completeText`.
429: до 3 попыток, backoff с джиттером, `retry-after` уважается; если он > 30 с —
сразу `RATE_LIMIT` с `retryAfterSec`. `env.groq.configured` ложен для плейсхолдера
из `.env.example`; фронт узнаёт статус через `GET /api/ai/status` и показывает
`AiUnavailable` вместо кнопок.

**HTTP-клиент фронта** ставит `Content-Type: application/json` только при наличии тела:
Fastify отвечает 400 на пустой JSON-body, а `ai-grade` и `review` — POST без тела.
4xx-ошибки самого Fastify глобальный обработчик отдаёт как `BAD_REQUEST`, не 500.

**Mock interview** (`services/interview.ts`, промпты — `services/interviewPrompts.ts`).
Каждый ход — один `completeJson` со схемой `interviewerMoveSchema`: модель одновременно
оценивает последний ответ (`assessment`) и выбирает следующий ход
(`question | follow_up | coding_task | code_comment | wrap_up`). Правила follow-up
(не больше 3 подряд, наводящий вопрос при «не знаю») — в промпте; счётчик follow-up
подряд и оставшееся время передаются модели явно.
- Контекст — одно user-сообщение, а не chat-история: последние 10 реплик целиком,
  ранние сжаты до «вопрос → оценка». Экономит токены (лимит TPM на Groq free).
- Ответ кандидата пишется в БД **только вместе** с ходом интервьюера (одна транзакция):
  при ошибке Groq в базе нет «висящего» ответа, фронт просто повторяет запрос.
- Оценки (`meta_json.assessment` у реплик кандидата) скрывает `toPublicSession`,
  пока сессия `active`.
- Темы берутся из этапов роадмапа по формату (`FORMAT_STAGES`); неизвестные slug-и
  от модели превращаются в `null`. «Повторить» ставится на темы из `topicsToReview`
  и на темы с оценкой < 6. Завершение интервью без ответов — `aborted` без запроса к AI.
- У задачи live-coding нет автотестов: код запускается в песочнице (`tests: []`)
  только ради `console.log`, проверяет его интервьюер.

## Схема БД

`server/src/db/migrations/`. `001_init.sql` заводит схему целиком,
`002_self_score.sql` добавляет `question_attempts.self_score`,
`003_interview_meta.sql` — `interview_turns.kind` и `meta_json`. Группы таблиц:

- роадмап: `stages`, `topics`, `subtopics`, `theory`
- прогресс: `topic_progress`, `daily_activity` (источник streak)
- квизы: `questions`, `question_attempts`
- задачи: `tasks`, `task_tests`, `task_hints`, `task_attempts`
- карточки: `flashcards`, `card_state` (SM-2), `card_reviews`
- интервью: `interview_sessions`, `interview_turns`
- служебное: `settings`, `ai_generations`, `_migrations`

Схема заведена целиком на фазе 1, поэтому дальнейшие фазы в основном добавляют код,
а не миграции. Новая миграция — новый файл `00N_описание.sql`, номера не переиспользуются.

## Состояние по фазам

1. ✅ Каркас: монорепо, миграции, seed роадмапа (9 этапов, 68 тем, 342 подтемы),
   роутинг, дашборд, страница темы с ручным прогрессом и заметками.
2. ✅ Теория (Markdown + подсветка), квизы трёх типов с самооценкой открытых ответов,
   карточки с SM-2 и очередью на сегодня, автоматический расчёт прогресса.
   Seed: 20 статей теории, 69 вопросов, 117 карточек по JS core и TypeScript.
3. ✅ Monaco (локально, без CDN), песочница в Web Worker с таймаутом, автотесты
   с видимыми и скрытыми проверками, ступенчатые подсказки, решение по кнопке,
   история попыток. Seed: 43 задачи и 221 тест, все проверены `npm run validate:tasks`.
4. ✅ Groq: оценка открытых ответов, ревью кода, догенерация вопросов и задач
   с проверкой эталона тестами, обработка 429. Проверено end-to-end на mock-сервере Groq
   (`GROQ_BASE_URL` можно переопределить в env).
5. ✅ Mock interview: 5 форматов, follow-up по качеству ответа, live-coding с песочницей,
   таймер, отчёт с пометкой тем «повторить», история с транскриптами. Проверено end-to-end
   на mock-сервере Groq (включая 429 на первом запросе).
6. ✅ React-задачи в sandbox-iframe с живым превью и тестами (мини-Testing Library),
   проверка в Node через happy-dom, AI-генерация похожих React-задач, code review.
   Seed дописан до полного покрытия: у всех 68 тем есть теория и карточки.
   Итого: 68 статей, 165 вопросов, 267 карточек, 63 задачи и 323 теста
   (43 алгоритмические, 14 React, 6 code review). Проверено в Chrome на dev- и prod-сборке.

Добавляя контент, держите покрытие: у каждой темы — статья, вопросы и карточки.
После правки задач — `npm run validate:tasks`.

## Проверка перед сдачей фазы

```bash
npm run typecheck && npm run lint && npm run build
npm run validate:tasks   # эталонные решения проходят свои тесты
npm run dev              # приложение должно подниматься и работать
```
