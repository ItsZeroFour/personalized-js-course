import type { InterviewFormat, InterviewTurn } from '@jsskillup/shared';
import { INTERVIEW_FORMAT_LABELS } from '@jsskillup/shared';
import type { ChatMessage } from './groq.js';
import { INTERVIEWER_ROLE, JSON_RULES } from './prompts.js';

/**
 * Промпты mock interview.
 *
 * Весь контекст передаётся одним user-сообщением, а не историей chat-сообщений:
 * так модель стабильнее держит JSON-формат, а транскрипт можно сжимать.
 * Сжатие важно из-за лимита токенов в минуту на бесплатном тарифе Groq:
 * последние реплики идут целиком, более ранние — одной строкой «вопрос → оценка».
 */

export interface TopicRef {
  slug: string;
  title: string;
}

export interface InterviewPromptContext {
  format: InterviewFormat;
  plannedMinutes: number;
  elapsedMinutes: number;
  topics: readonly TopicRef[];
  weakTopics: readonly TopicRef[];
  turns: readonly InterviewTurn[];
  topicTitle: (topicId: string | null) => string | null;
}

/** Сколько последних реплик отдаётся модели целиком. */
const RECENT_TURNS = 10;
const MAX_ANSWER_CHARS = 3000;
const MAX_CODE_CHARS = 4000;

const CANDIDATE_PROFILE =
  'Кандидат: 2+ года коммерческой разработки на React (фриланс, продакшен-код). ' +
  'Известные слабые места: глубокое понимание JavaScript (как язык устроен внутри) ' +
  'и написание логического/алгоритмического кода руками.';

const FORMAT_RULES: Record<InterviewFormat, string> = {
  js_theory: `Формат: теория по JavaScript.
- Вопросы про механику языка: scope, closures, this, прототипы, event loop, Promise, async/await, приведение типов, сравнение, мутабельность, коллекции, GC.
- Чередуй «объясните» и «что выведет этот код» — во втором случае вставляй короткий код в \`\`\`js.
- Проси объяснить, ПОЧЕМУ так, а не просто назвать ответ.`,
  react_theory: `Формат: теория по React.
- Рендеринг и reconciliation, Fiber, keys, все хуки и их подводные камни, stale closures, мемоизация и когда она не нужна, Context и производительность, refs, error boundaries, Suspense, concurrent features, React 19, state management (Redux Toolkit, Zustand, TanStack Query).
- Давай мини-кейсы: «вот компонент, почему он ререндерится?», «где тут баг?» — с кодом в \`\`\`jsx.`,
  live_coding: `Формат: live-coding.
- Интервью строится вокруг 1–3 задач уровня LeetCode easy/medium или утилит (debounce, throttle, groupBy, deepClone, Promise.all, EventEmitter, работа с массивами, строками, объектами).
- Задача выдаётся ходом kind "coding_task" с полем codingTask: понятное условие с примерами входа/выхода и starterCode с сигнатурой функции (без решения!).
- Когда кандидат присылает код, отвечай ходом "code_comment": корректность, edge cases, сложность O(n), попроси исправить или улучшить. Не пиши решение за кандидата.
- Если код верный и оптимальный — спроси про сложность или альтернативу, затем следующая задача.`,
  mixed_tech: `Формат: смешанное техническое интервью, как на реальном собеседовании.
- Блоки по порядку: JavaScript core → TypeScript (кратко) → React в глубину → браузер и сеть → архитектура/тестирование.
- Примерно в середине интервью дай одну небольшую задачу ходом kind "coding_task" (утилита или easy-алгоритм), разбери код ходом "code_comment" и вернись к теории.
- На каждый блок 2–4 вопроса вместе с follow-up.`,
  behavioral: `Формат: поведенческое интервью.
- Вопросы про реальный опыт: проекты, самая сложная задача, конфликт с заказчиком или коллегой, ошибка в продакшене, оценка сроков, работа с нечёткими требованиями, почему уходите с фриланса.
- Жди ответ по STAR (Situation, Task, Action, Result). Если ответ размытый — follow-up на конкретику: «что именно сделали вы?», «какой был результат, в цифрах?», «что бы сделали иначе?».
- Код не нужен, coding_task не используй.`,
};

const INTERVIEW_RULES = `Правила ведения интервью:
1. Один вопрос за ход. Ты интервьюер, а не ментор: не читай лекций и не раскрывай правильный ответ. Можно коротко отреагировать («Да, так», «Не совсем») и сразу задать следующий вопрос.
2. После каждого ответа кандидата оцени его в поле assessment (0–10, note — одно предложение для отчёта: что было верно и чего не хватило). Эту оценку кандидат не увидит до конца интервью.
3. Затем реши, что делать:
   - ответ поверхностный, неточный или «заученный» → kind "follow_up": копай глубже в ТУ ЖЕ тему — «почему?», «что под капотом?», «а если…?», попроси пример кода или edge case;
   - ответ хороший → максимум один усложняющий "follow_up", затем новая тема (kind "question");
   - кандидат не знает → один наводящий вопрос, затем двигайся дальше, не мучай;
   - не больше 3 follow-up подряд по одной теме.
4. Покрой разные темы из списка, начни проще и повышай сложность. Приоритет — слабые темы кандидата.
5. Когда осталось меньше 3 минут или время вышло — kind "wrap_up": коротко поблагодари и скажи, что интервью окончено (без итоговой оценки — отчёт будет отдельно).
6. message — то, что ты говоришь вслух: 1–4 предложения, markdown, код — в блоках \`\`\`js. Никаких мета-комментариев вроде «Следующий вопрос:».
7. topicSlug — slug темы из списка, к которой относится твой вопрос, или null.`;

const MOVE_SCHEMA = `Верни JSON:
{
  "assessment": { "score": 0-10, "note": "..." } или null, если кандидат ещё не отвечал,
  "kind": "question" | "follow_up" | "coding_task" | "code_comment" | "wrap_up",
  "topicSlug": "slug из списка тем или null",
  "message": "реплика интервьюера",
  "codingTask": { "title": "...", "statementMd": "условие с примерами", "starterCode": "сигнатура функции" } или null (только для kind "coding_task")
}`;

function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit)}\n…[обрезано]`;
}

function oneLine(text: string, limit: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= limit ? flat : `${flat.slice(0, limit)}…`;
}

function renderTurn(turn: InterviewTurn): string {
  if (turn.role === 'interviewer') {
    const task = turn.codingTask
      ? `\n[Задача «${turn.codingTask.title}»]\n${turn.codingTask.statementMd}`
      : '';
    return `ИНТЕРВЬЮЕР (${turn.kind ?? 'question'}): ${turn.content}${task}`;
  }
  if (turn.role === 'candidate') {
    const code = turn.code ? `\nКод кандидата:\n\`\`\`\n${truncate(turn.code, MAX_CODE_CHARS)}\n\`\`\`` : '';
    return `КАНДИДАТ: ${truncate(turn.content, MAX_ANSWER_CHARS)}${code}`;
  }
  return `СИСТЕМА: ${turn.content}`;
}

/** Ранние реплики сжимаются до «вопрос → оценка ответа». */
function summarizeEarlier(turns: readonly InterviewTurn[], ctx: InterviewPromptContext): string {
  const lines: string[] = [];
  for (const [index, turn] of turns.entries()) {
    if (turn.role !== 'interviewer') continue;
    const answer = turns[index + 1];
    const score =
      answer?.role === 'candidate' && answer.assessment ? ` → оценка ${answer.assessment.score}/10` : '';
    const topic = ctx.topicTitle(turn.topicId);
    lines.push(`- ${topic ? `[${topic}] ` : ''}${oneLine(turn.content, 160)}${score}`);
  }
  return lines.join('\n');
}

/** Сколько follow-up/code_comment подряд идёт в конце — чтобы модель не зацикливалась на теме. */
function trailingFollowUps(turns: readonly InterviewTurn[]): number {
  let count = 0;
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index];
    if (!turn || turn.role !== 'interviewer') continue;
    if (turn.kind === 'follow_up' || turn.kind === 'code_comment') count += 1;
    else break;
  }
  return count;
}

function systemPrompt(ctx: InterviewPromptContext): string {
  return [
    INTERVIEWER_ROLE,
    `Сейчас ты проводишь mock interview: «${INTERVIEW_FORMAT_LABELS[ctx.format]}», ${ctx.plannedMinutes} минут.`,
    CANDIDATE_PROFILE,
    FORMAT_RULES[ctx.format],
    INTERVIEW_RULES,
    JSON_RULES,
  ].join('\n\n');
}

function stateBlock(ctx: InterviewPromptContext): string {
  const remaining = Math.max(0, ctx.plannedMinutes - ctx.elapsedMinutes);
  const questions = ctx.turns.filter(
    (turn) => turn.role === 'interviewer' && (turn.kind === 'question' || turn.kind === 'coding_task'),
  ).length;

  return `ТЕМЫ (slug — название):
${ctx.topics.map((topic) => `- ${topic.slug} — ${topic.title}`).join('\n')}

СЛАБЫЕ ТЕМЫ КАНДИДАТА (по статистике тренировок): ${
    ctx.weakTopics.length > 0 ? ctx.weakTopics.map((topic) => topic.title).join(', ') : 'данных пока нет'
  }

ВРЕМЯ: прошло ${ctx.elapsedMinutes} мин из ${ctx.plannedMinutes}, осталось ${remaining} мин.
ЗАДАНО ОСНОВНЫХ ВОПРОСОВ И ЗАДАЧ: ${questions}. FOLLOW-UP ПОДРЯД ПО ТЕКУЩЕЙ ТЕМЕ: ${trailingFollowUps(ctx.turns)}.`;
}

/** Первый ход: приветствие и первый вопрос. */
export function interviewOpeningPrompt(ctx: InterviewPromptContext): ChatMessage[] {
  return [
    { role: 'system', content: systemPrompt(ctx) },
    {
      role: 'user',
      content: `${stateBlock(ctx)}

Начни интервью: одним-двумя предложениями поздоровайся и объясни формат, затем задай первый вопрос
(в live-coding — сразу выдай первую задачу ходом "coding_task"). Начни с вопроса средней сложности,
без разминки «расскажите о себе» (кроме поведенческого формата). assessment = null.

${MOVE_SCHEMA}`,
    },
  ];
}

/** Следующий ход после ответа кандидата (он уже последний в `ctx.turns`). */
export function interviewNextMovePrompt(ctx: InterviewPromptContext): ChatMessage[] {
  const recent = ctx.turns.slice(-RECENT_TURNS);
  const earlier = ctx.turns.slice(0, -RECENT_TURNS);

  return [
    { role: 'system', content: systemPrompt(ctx) },
    {
      role: 'user',
      content: `${stateBlock(ctx)}

${earlier.length > 0 ? `РАНЕЕ ОБСУЖДАЛИ (сжато):\n${summarizeEarlier(earlier, ctx)}\n\n` : ''}ПОСЛЕДНИЕ РЕПЛИКИ:
${recent.map(renderTurn).join('\n\n')}

Оцени последний ответ кандидата и сделай следующий ход по правилам.

${MOVE_SCHEMA}`,
    },
  ];
}

/** Итоговый отчёт по всему транскрипту. */
export function interviewReportPrompt(ctx: InterviewPromptContext): ChatMessage[] {
  const blocks: string[] = [];
  for (const [index, turn] of ctx.turns.entries()) {
    if (turn.role !== 'interviewer') continue;
    const answer = ctx.turns[index + 1];
    const topic = ctx.topicTitle(turn.topicId);
    const lines = [`ВОПРОС${topic ? ` [${topic}]` : ''}: ${truncate(turn.content, 800)}`];
    if (turn.codingTask) lines.push(`ЗАДАЧА: ${truncate(turn.codingTask.statementMd, 800)}`);
    if (answer?.role === 'candidate') {
      lines.push(`ОТВЕТ: ${truncate(answer.content, 1500)}`);
      if (answer.code) lines.push(`КОД:\n\`\`\`\n${truncate(answer.code, 2500)}\n\`\`\``);
      if (answer.assessment) {
        lines.push(`ОЦЕНКА ПО ХОДУ ИНТЕРВЬЮ: ${answer.assessment.score}/10 — ${answer.assessment.note}`);
      }
    } else {
      lines.push('ОТВЕТ: (не было)');
    }
    blocks.push(lines.join('\n'));
  }

  return [
    { role: 'system', content: `${INTERVIEWER_ROLE}\n\n${JSON_RULES}` },
    {
      role: 'user',
      content: `Mock interview «${INTERVIEW_FORMAT_LABELS[ctx.format]}» окончено. Длилось ${ctx.elapsedMinutes} мин.
${CANDIDATE_PROFILE}

ТЕМЫ (slug — название):
${ctx.topics.map((topic) => `- ${topic.slug} — ${topic.title}`).join('\n')}

ТРАНСКРИПТ:
${blocks.join('\n\n')}

Составь честный отчёт, как для нанимающего менеджера и для самого кандидата.
Оценивай только то, что прозвучало: не додумывай знания, которых кандидат не показал.
Если ответов мало — так и скажи в verdict и не завышай оценку.

Верни JSON:
{
  "overallScore": 0-10,
  "verdict": "одна-две фразы: прошёл бы на React Middle или нет и почему",
  "strengths": ["конкретные сильные стороны с примерами из ответов"],
  "weaknesses": ["конкретные пробелы: что именно не знает или путает"],
  "topicScores": [{ "topicSlug": "slug из списка или null", "topicTitle": "...", "score": 0-10, "comment": "..." }],
  "topicsToReview": ["slug", "..."] — только slug-и из списка тем, которые явно надо повторить,
  "advice": "что делать дальше: 3-5 конкретных шагов в markdown-списке"
}`,
    },
  ];
}
