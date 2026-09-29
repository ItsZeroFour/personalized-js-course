import type { Difficulty, OpenQuestion, QuestionKind, Task, TestResult } from '@jsskillup/shared';
import type { ChatMessage } from './groq.js';

/**
 * Промпты для Groq. Все ответы — строгий JSON: схема описывается прямо в промпте,
 * а результат всё равно проверяется Zod-ом на стороне сервера.
 */

export const INTERVIEWER_ROLE =
  'Ты — опытный senior frontend-разработчик, который проводит технические собеседования ' +
  'на позицию React Middle. Ты требователен, но доброжелателен, говоришь по-русски, ' +
  'технические термины оставляешь на английском (closure, event loop, reconciliation). ' +
  'Ты не хвалишь за поверхностные ответы и всегда называешь конкретные пробелы.';

export const JSON_RULES =
  'Отвечай ТОЛЬКО валидным JSON-объектом без markdown-обёрток и пояснений. ' +
  'Все текстовые поля — на русском языке, код внутри них — в markdown-блоках ```js.';

// --- Оценка открытого ответа ---------------------------------------------------------

export function gradeOpenAnswerPrompt(
  question: OpenQuestion,
  answer: string,
  topicTitle: string,
): ChatMessage[] {
  return [
    { role: 'system', content: `${INTERVIEWER_ROLE}\n\n${JSON_RULES}` },
    {
      role: 'user',
      content: `Оцени ответ кандидата на вопрос с собеседования.

ТЕМА: ${topicTitle}

ВОПРОС:
${question.promptMd}
${question.code ? `\nКОД К ВОПРОСУ:\n\`\`\`js\n${question.code}\n\`\`\`` : ''}

ЧТО ДОЛЖНО ПРОЗВУЧАТЬ В СИЛЬНОМ ОТВЕТЕ:
${question.rubric.map((item, index) => `${index + 1}. ${item}`).join('\n')}

ЭТАЛОННЫЙ ОТВЕТ (для сверки, кандидат его не видел):
${question.referenceAnswerMd}

ОТВЕТ КАНДИДАТА:
"""
${answer}
"""

Оцени строго, как на реальном собеседовании. Шкала: 0 — ответа по сути нет,
5 — базовое понимание без глубины, 7 — уверенный ответ уровня middle,
9–10 — ответ с пониманием механики и нюансов.

Верни JSON:
{
  "score": число 0-10,
  "summary": "1-2 предложения: общий вердикт",
  "covered": ["пункты рубрики, которые кандидат раскрыл"],
  "missed": ["пункты рубрики, которые кандидат НЕ раскрыл"],
  "mistakes": ["фактические ошибки в ответе; пустой массив, если их нет"],
  "referenceAnswerMd": "эталонный ответ в markdown",
  "strongCandidateAnswerMd": "как ответил бы сильный кандидат: живая устная формулировка на 4-6 предложений, не пересказ эталона",
  "followUpQuestions": ["2-3 уточняющих вопроса, которые интервьюер задал бы дальше именно по этому ответу"]
}`,
    },
  ];
}

// --- Ревью кода ----------------------------------------------------------------------

export function reviewCodePrompt(
  task: Task,
  code: string,
  results: readonly TestResult[],
): ChatMessage[] {
  const testSummary = results
    .map((result) => `${result.passed ? '✓' : '✗'} ${result.name}${result.message ? ` — ${result.message}` : ''}`)
    .join('\n');

  return [
    { role: 'system', content: `${INTERVIEWER_ROLE}\n\n${JSON_RULES}` },
    {
      role: 'user',
      content: `Сделай ревью решения задачи с собеседования.

ЗАДАЧА: ${task.title}
СЛОЖНОСТЬ: ${task.difficulty}

УСЛОВИЕ:
${task.statementMd}

РЕШЕНИЕ КАНДИДАТА:
\`\`\`${task.language}
${code}
\`\`\`

РЕЗУЛЬТАТ АВТОТЕСТОВ:
${testSummary || 'тесты не запускались'}

Оцени так, как оценил бы интервьюер: не пересказывай код, а скажи, что в нём не так
и что спросят дальше. Если решение корректно, но неоптимально — скажи прямо.
${
  task.runtime === 'preview'
    ? `
Это React-код. Кроме корректности смотри на: лишние ререндеры и мемоизацию (нужна ли она),
зависимости и cleanup эффектов, stale closures, производное состояние вместо лишнего state,
ключи списков, доступность (роли, label). В complexity опиши сложность рендера и число
ререндеров на действие пользователя, а не только O(n).
`
    : ''
}
Верни JSON:
{
  "correctness": { "score": 0-10, "comment": "работает ли решение, какие входы сломают его" },
  "complexity": { "time": "O(...)", "space": "O(...)", "comment": "почему именно такая, можно ли лучше" },
  "readability": { "score": 0-10, "comment": "имена, структура, лишние сущности" },
  "improvements": ["конкретные улучшения, по одному пункту на мысль"],
  "rewrittenCode": "улучшенная версия кода без markdown-обёртки, или null если улучшать нечего",
  "interviewerFollowUps": ["2-3 вопроса, которые интервьюер задаст по этому решению"]
}`,
    },
  ];
}

// --- Генерация вопросов --------------------------------------------------------------

export function generateQuestionsPrompt(options: {
  topicTitle: string;
  topicSummary: string;
  subtopics: readonly string[];
  existingPrompts: readonly string[];
  count: number;
  difficulty?: Difficulty;
  kind?: QuestionKind;
}): ChatMessage[] {
  const { topicTitle, topicSummary, subtopics, existingPrompts, count } = options;

  return [
    { role: 'system', content: `${INTERVIEWER_ROLE}\n\n${JSON_RULES}` },
    {
      role: 'user',
      content: `Придумай ${count} новых вопросов для подготовки к собеседованию на React Middle.

ТЕМА: ${topicTitle}
О ЧЁМ ТЕМА: ${topicSummary}
ПОДТЕМЫ:
${subtopics.map((item) => `- ${item}`).join('\n')}

${options.difficulty ? `СЛОЖНОСТЬ: только "${options.difficulty}".` : 'Сложности смешай.'}
${options.kind ? `ТИП: только "${options.kind}".` : 'Типы смешай.'}

ВОПРОСЫ, КОТОРЫЕ УЖЕ ЕСТЬ — НЕ ПОВТОРЯЙ ИХ И НЕ ПЕРЕФРАЗИРУЙ:
${existingPrompts.length > 0 ? existingPrompts.map((item) => `- ${item}`).join('\n') : '(пока нет)'}

Требования к вопросам:
- уровень реального собеседования на middle, без воды и без вопросов «на память синтаксиса»;
- для типа "output" код должен быть коротким и иметь однозначный вывод;
- expectedOutput — массив строк ровно так, как их напечатает console.log, построчно;
- для "mc" ровно один или два верных варианта, остальные — правдоподобные заблуждения;
- explanationMd объясняет механику, а не просто называет правильный ответ.

Верни JSON: { "questions": [ ... ] }, где каждый элемент — один из трёх видов:

multiple choice:
{ "kind": "mc", "difficulty": "easy|medium|hard", "promptMd": "...", "code": "код или null",
  "options": [{ "id": "a", "text": "..." }, ...], "correct": ["a"],
  "explanationMd": "...", "tags": ["..."] }

что выведет код:
{ "kind": "output", "difficulty": "...", "promptMd": "Что выведет этот код?",
  "code": "обязательный код", "expectedOutput": ["строка 1", "строка 2"],
  "explanationMd": "...", "tags": ["..."] }

открытый вопрос:
{ "kind": "open", "difficulty": "...", "promptMd": "...", "code": "код или null",
  "referenceAnswerMd": "развёрнутый эталонный ответ",
  "rubric": ["что должно прозвучать", "..."],
  "explanationMd": "...", "tags": ["..."] }`,
    },
  ];
}

// --- Генерация задачи ----------------------------------------------------------------

/** Какую задачу генерируем: функцию для Web Worker или React-модуль для iframe-превью. */
export type TaskFlavor = 'algo' | 'react';

const ALGO_TEST_RULES = `КРИТИЧЕСКИ ВАЖНО ПРО ТЕСТЫ:
- код решения пишется на TypeScript, его транспилируют перед запуском;
- **тесты пишутся на чистом JavaScript, без типов** — они подставляются как есть;
- решение и тесты попадают в одну область видимости: тест вызывает функцию по имени,
  никакого export/import быть не должно;
- доступные в тестах помощники: expect(...), deepEqual(a, b), sleep(ms);
- матчеры: toBe, toEqual, toBeCloseTo, toBeTruthy, toBeFalsy, toBeNull, toBeUndefined,
  toBeDefined, toBeInstanceOf, toHaveLength, toContain, toThrow, и .not перед любым из них;
- тело теста асинхронное, поэтому await работает;
- solutionCode ОБЯЗАН проходить все тесты — это проверяется автоматически, иначе задача
  будет отброшена;
- starterCode НЕ должен проходить тесты: это заготовка с сигнатурой и заглушкой.`;

const REACT_TEST_RULES = `ЭТО REACT-ЗАДАЧА. КРИТИЧЕСКИ ВАЖНО:
- solutionCode и starterCode — TSX-модуль: \`import { useState } from 'react'\`, компоненты и хуки
  с \`export\`. Можно импортировать только 'react' и 'react-dom'.
- В модуле обязателен \`export default function App()\` без пропсов — он показывается в живом превью.
  Тестируемый компонент или хук экспортируется отдельно (\`export function Counter\`, \`export function useX\`).
- **Тесты — чистый JavaScript без JSX и типов.** Экспорты модуля доступны как \`exports.Имя\`.
- Помощники в тестах (все асинхронные — обязательно await):
  - \`h\` = React.createElement, \`React\`, \`act(fn)\`, \`sleep(ms)\`, \`waitFor(fn)\`;
  - \`await render(h(exports.Counter, { initial: 1 }))\` → { container, rerender(el), unmount() };
  - \`await renderHook((props) => exports.useX(props.a), { initialProps: { a: 1 } })\` → { result: { current }, rerender(props), unmount() };
    вызовы функций из result.current оборачивайте: \`await act(() => result.current.inc())\`;
  - \`screen.getByRole('button', { name: 'Добавить' })\`, getByText, getByLabelText, getByTestId,
    getByPlaceholderText, getByDisplayValue, варианты queryBy/getAllBy/findBy;
  - \`await fireEvent.click(el)\`, \`await fireEvent.change(input, { target: { value: 'x' } })\`,
    \`await fireEvent.type(input, 'abc')\`, keyDown(el, { key: 'Enter' }), submit(form), blur(el);
- Проверяйте DOM напрямую: \`.textContent\`, \`.value\`, \`.checked\`, \`.disabled\`, \`getAttribute(...)\`.
- Для таймеров используйте маленькие задержки (20–100 мс) и \`await sleep(ms)\`.
- solutionCode ОБЯЗАН проходить все тесты — это проверяется автоматически в DOM-окружении,
  иначе задача будет отброшена. starterCode НЕ должен проходить тесты.`;

export function generateTaskPrompt(options: {
  source: Task | null;
  topicTitle: string | null;
  difficulty: Difficulty;
  flavor: TaskFlavor;
  existingSlugs: readonly string[];
  existingTitles: readonly string[];
}): ChatMessage[] {
  const { source, topicTitle, difficulty, flavor, existingSlugs, existingTitles } = options;

  const context = source
    ? `Придумай задачу, ПОХОЖУЮ на эту, но не такую же: другой предмет задачи, другие тесты.

ОБРАЗЕЦ — ${source.title} (${source.difficulty}):
${source.statementMd}`
    : `Придумай новую задачу по теме «${topicTitle ?? (flavor === 'react' ? 'React' : 'алгоритмы и логика на JavaScript')}».`;

  const example =
    flavor === 'react'
      ? `{ "name": "клик увеличивает счётчик", "code": "await render(h(exports.Counter));\\nawait fireEvent.click(screen.getByRole('button', { name: '+' }));\\nexpect(screen.getByTestId('value').textContent).toBe('1');", "hidden": false }`
      : `{ "name": "описание теста", "code": "expect(fn(...)).toEqual(...);", "hidden": false }`;

  return [
    { role: 'system', content: `${INTERVIEWER_ROLE}\n\n${JSON_RULES}` },
    {
      role: 'user',
      content: `${context}

СЛОЖНОСТЬ: ${difficulty}

УЖЕ СУЩЕСТВУЮЩИЕ ЗАДАЧИ — НЕ ДУБЛИРУЙ:
${existingTitles.map((item) => `- ${item}`).join('\n')}

ЗАНЯТЫЕ SLUG (выбери свободный): ${existingSlugs.join(', ')}

${flavor === 'react' ? REACT_TEST_RULES : ALGO_TEST_RULES}

Верни JSON:
{
  "slug": "короткий-slug-латиницей",
  "title": "Название задачи",
  "difficulty": "${difficulty}",
  "statementMd": "условие в markdown: что реализовать, требования к разметке (роли, label, data-testid), граничные случаи",
  "starterCode": "${flavor === 'react' ? 'TSX-модуль с заглушкой компонента/хука и готовым App' : 'сигнатура функции с заглушкой и комментарием // ваш код'}",
  "solutionCode": "полное рабочее решение на ${flavor === 'react' ? 'TSX' : 'TypeScript'}",
  "solutionNotesMd": "разбор: ${flavor === 'react' ? 'почему так, типичные ошибки, что спросят дальше' : 'сложность по времени и памяти, ловушки, альтернативы'}",
  "tags": ["..."],
  "hints": ["подсказка 1 — направление", "подсказка 2 — конкретнее"],
  "tests": [
    ${example},
    { "name": "граничный случай", "code": "...", "hidden": true }
  ]
}

Тестов должно быть не меньше четырёх, из них хотя бы один скрытый на граничный случай.`,
    },
  ];
}
