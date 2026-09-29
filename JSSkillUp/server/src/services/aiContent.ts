import {
  codeReviewSchema,
  generatedQuestionsSchema,
  generatedTaskSchema,
  openAnswerGradeSchema,
} from '@jsskillup/shared';
import type {
  CodeReview,
  Difficulty,
  GeneratedQuestion,
  GeneratedTask,
  OpenAnswerGrade,
  QuestionKind,
  Task,
  TaskKind,
  TaskLanguage,
  TaskRuntime,
  TopicWithProgress,
} from '@jsskillup/shared';
import { createHash } from 'node:crypto';
import { execute } from '../db/client.js';
import { env } from '../env.js';
import { ApiError, badRequest, notFound } from '../errors.js';
import {
  getAttemptById as getQuestionAttempt,
  getExistingPrompts,
  getQuestionById,
  insertGeneratedQuestion,
  saveAiGrade,
} from '../db/repos/questions.js';
import {
  getAllSlugsAndTitles,
  getAttemptById as getTaskAttempt,
  getTaskBySlug,
  insertGeneratedTask,
  saveAiReview,
} from '../db/repos/tasks.js';
import { getTopicById, getTopicBySlug } from '../db/repos/roadmap.js';
import { completeJson, type ChatMessage } from './groq.js';
import {
  generateQuestionsPrompt,
  generateTaskPrompt,
  gradeOpenAnswerPrompt,
  reviewCodePrompt,
  type TaskFlavor,
} from './prompts.js';
import { runTaskTests } from './taskRunner.js';
import { recomputeTopicProgress } from './progress.js';

export function logGeneration(kind: string, topicId: string | null, status: string, error?: string): void {
  execute(
    'INSERT INTO ai_generations (kind, topic_id, model, status, error, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [kind, topicId, env.groq.model, status, error ?? null, new Date().toISOString()],
  );
}

// --- Оценка открытого ответа ---------------------------------------------------------

export async function gradeOpenAnswer(
  attemptId: number,
): Promise<{ grade: OpenAnswerGrade; topicPercent: number }> {
  const attempt = getQuestionAttempt(attemptId);
  if (!attempt) throw notFound(`Попытка ${attemptId} не найдена`);

  const question = getQuestionById(attempt.questionId);
  if (!question) throw notFound(`Вопрос "${attempt.questionId}" не найден`);
  if (question.kind !== 'open') {
    throw badRequest('AI-оценка применима только к открытым вопросам');
  }
  if (attempt.answer.kind !== 'open') {
    throw badRequest('В попытке сохранён ответ не того типа');
  }

  const topic = getTopicById(question.topicId);

  const grade = await completeJson(
    gradeOpenAnswerPrompt(question, attempt.answer.text, topic?.title ?? 'JavaScript'),
    openAnswerGradeSchema,
    { temperature: 0.2 },
  );

  saveAiGrade(attemptId, grade);
  logGeneration('grade_answer', question.topicId, 'ok');

  return { grade, topicPercent: recomputeTopicProgress(question.topicId) };
}

// --- Ревью кода ----------------------------------------------------------------------

export async function reviewTaskAttempt(
  taskSlug: string,
  attemptId: number,
): Promise<{ review: CodeReview }> {
  const task = getTaskBySlug(taskSlug);
  if (!task) throw notFound(`Задача "${taskSlug}" не найдена`);

  const attempt = getTaskAttempt(attemptId);
  if (!attempt) throw notFound(`Попытка ${attemptId} не найдена`);
  if (attempt.taskId !== task.id) throw badRequest('Попытка относится к другой задаче');

  const review = await completeJson(
    reviewCodePrompt(task, attempt.code, attempt.results),
    codeReviewSchema,
    { temperature: 0.3 },
  );

  saveAiReview(attemptId, review);
  logGeneration('review_code', task.topicId, 'ok');

  return { review };
}

// --- Генерация вопросов --------------------------------------------------------------

function questionId(topicId: string, promptMd: string): string {
  const hash = createHash('sha1').update(`${topicId}\u0000${promptMd}`).digest('hex');
  return `q-${hash.slice(0, 12)}`;
}

function persistQuestion(topic: TopicWithProgress, question: GeneratedQuestion): void {
  const id = questionId(topic.id, question.promptMd);

  insertGeneratedQuestion({
    id,
    topicId: topic.id,
    kind: question.kind,
    difficulty: question.difficulty,
    promptMd: question.promptMd,
    code: question.code ?? null,
    options: question.kind === 'mc' ? JSON.stringify(question.options) : JSON.stringify([]),
    correct: question.kind === 'mc' ? JSON.stringify(question.correct) : JSON.stringify([]),
    expectedOutput: question.kind === 'output' ? JSON.stringify(question.expectedOutput) : null,
    explanationMd: question.explanationMd,
    referenceAnswerMd: question.kind === 'open' ? question.referenceAnswerMd : null,
    rubric: question.kind === 'open' ? JSON.stringify(question.rubric) : null,
    tags: question.tags,
  });
}

export async function generateQuestions(options: {
  topicSlug: string;
  count: number;
  difficulty?: Difficulty;
  kind?: QuestionKind;
}): Promise<{ created: number; rejected: string[] }> {
  const topic = getTopicBySlug(options.topicSlug);
  if (!topic) throw notFound(`Тема "${options.topicSlug}" не найдена`);

  const existingPrompts = getExistingPrompts(topic.id);

  const result = await completeJson(
    generateQuestionsPrompt({
      topicTitle: topic.title,
      topicSummary: topic.summary,
      subtopics: topic.subtopics.map((item) => item.title),
      existingPrompts,
      count: options.count,
      ...(options.difficulty ? { difficulty: options.difficulty } : {}),
      ...(options.kind ? { kind: options.kind } : {}),
    }),
    generatedQuestionsSchema,
    { temperature: 0.8 },
  );

  const rejected: string[] = [];
  const seenIds = new Set<string>();
  let created = 0;

  for (const question of result.questions) {
    const id = questionId(topic.id, question.promptMd);

    if (seenIds.has(id)) {
      rejected.push(`Дубль внутри ответа: «${question.promptMd.slice(0, 60)}…»`);
      continue;
    }
    if (getQuestionById(id) !== null) {
      rejected.push(`Такой вопрос уже есть: «${question.promptMd.slice(0, 60)}…»`);
      continue;
    }
    if (question.kind === 'mc') {
      const optionIds = new Set(question.options.map((option) => option.id));
      const unknown = question.correct.filter((id) => !optionIds.has(id));
      if (unknown.length > 0) {
        rejected.push(`Верный вариант не найден среди опций: ${unknown.join(', ')}`);
        continue;
      }
    }

    seenIds.add(id);
    persistQuestion(topic, question);
    created += 1;
  }

  logGeneration(
    'generate_questions',
    topic.id,
    created > 0 ? 'ok' : 'empty',
    rejected.length > 0 ? rejected.join('; ') : undefined,
  );

  if (created === 0) {
    throw new ApiError(
      'AI_BAD_RESPONSE',
      'Модель не выдала ни одного нового вопроса — все варианты уже есть или не прошли проверку.',
      { details: rejected },
    );
  }

  return { created, rejected };
}

// --- Генерация задачи ----------------------------------------------------------------

/** Параметры исполнения по типу задачи: React-модуль идёт в iframe-превью, остальное — в Web Worker. */
function runtimeFor(flavor: TaskFlavor): { language: TaskLanguage; runtime: TaskRuntime; timeLimitMs: number } {
  return flavor === 'react'
    ? { language: 'tsx', runtime: 'preview', timeLimitMs: 3000 }
    : { language: 'ts', runtime: 'worker', timeLimitMs: 2000 };
}

/** Прогоняет эталонное решение через тесты задачи: без этого её нельзя сохранять. */
async function verifyGeneratedTask(
  task: GeneratedTask,
  flavor: TaskFlavor,
): Promise<{ ok: true; passed: number } | { ok: false; reason: string }> {
  const tests = task.tests.map((test) => ({
    name: test.name,
    code: test.code,
    visibility: test.hidden ? ('hidden' as const) : ('visible' as const),
  }));

  const options = runtimeFor(flavor);
  const solution = await runTaskTests(task.solutionCode, tests, options);

  if (solution.status !== 'passed') {
    const failures = solution.error
      ? solution.error
      : solution.results
          .filter((result) => !result.passed)
          .map((result) => `«${result.name}»: ${result.message ?? 'без сообщения'}`)
          .join('; ');
    return { ok: false, reason: `эталонное решение не проходит свои тесты — ${failures}` };
  }

  const starter = await runTaskTests(task.starterCode, tests, options);
  if (starter.status === 'passed') {
    return { ok: false, reason: 'стартовый код уже проходит все тесты — задача ничего не проверяет' };
  }

  return { ok: true, passed: solution.passed };
}

export async function generateTask(options: {
  similarTo?: string;
  topicSlug?: string;
  difficulty?: Difficulty;
}): Promise<{ slug: string; title: string; verifiedTests: number }> {
  let source: Task | null = null;
  if (options.similarTo) {
    source = getTaskBySlug(options.similarTo);
    if (!source) throw notFound(`Задача "${options.similarTo}" не найдена`);
  }

  const topic =
    options.topicSlug !== undefined
      ? getTopicBySlug(options.topicSlug)
      : source?.topicId
        ? getTopicById(source.topicId)
        : null;

  const { slugs, titles } = getAllSlugsAndTitles();
  const difficulty = options.difficulty ?? source?.difficulty ?? 'medium';
  // Похожая задача наследует тип образца: React → React-модуль с превью, иначе функция.
  const flavor: TaskFlavor =
    source?.runtime === 'preview' || (!source && topic?.stageId === 'react') ? 'react' : 'algo';
  // Ревью-задачи генерируются как обычные: тесты проверяют поведение, а не наличие «ошибок».
  const kind: TaskKind = flavor === 'react' ? 'react' : 'algo';

  const messages: ChatMessage[] = generateTaskPrompt({
    source,
    topicTitle: topic?.title ?? null,
    difficulty,
    flavor,
    existingSlugs: slugs,
    existingTitles: titles,
  });

  let lastReason = '';

  // Две попытки: если решение не прошло свои же тесты, модели показывают, что именно сломалось.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const generated = await completeJson(messages, generatedTaskSchema, { temperature: 0.7 });

    const slugTaken = getTaskBySlug(generated.slug) !== null;
    const verification = slugTaken
      ? ({ ok: false, reason: `slug "${generated.slug}" уже занят` } as const)
      : await verifyGeneratedTask(generated, flavor);

    if (verification.ok) {
      insertGeneratedTask({
        slug: generated.slug,
        topicId: topic?.id ?? source?.topicId ?? null,
        kind,
        ...runtimeFor(flavor),
        title: generated.title,
        difficulty: generated.difficulty,
        statementMd: generated.statementMd,
        starterCode: generated.starterCode,
        solutionCode: generated.solutionCode,
        solutionNotesMd: generated.solutionNotesMd,
        tags: generated.tags,
        hints: generated.hints,
        tests: generated.tests,
      });

      logGeneration('generate_task', topic?.id ?? null, 'ok');
      return { slug: generated.slug, title: generated.title, verifiedTests: verification.passed };
    }

    lastReason = verification.reason;
    messages.push(
      { role: 'assistant', content: JSON.stringify(generated) },
      {
        role: 'user',
        content:
          `Задача отброшена: ${verification.reason}.\n\n` +
          'Исправь и верни JSON целиком. Помни: тесты пишутся на чистом JavaScript. ' +
          (flavor === 'react'
            ? 'Экспорты модуля доступны в тестах как exports.Имя, render/fireEvent/renderHook асинхронные — нужен await.'
            : 'Решение и тесты попадают в одну область видимости, экспорт не нужен.'),
      },
    );
  }

  logGeneration('generate_task', topic?.id ?? null, 'rejected', lastReason);

  throw new ApiError(
    'AI_BAD_RESPONSE',
    `Сгенерированная задача не прошла проверку: ${lastReason}. Задача не сохранена.`,
  );
}
