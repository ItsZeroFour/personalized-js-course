import { z } from 'zod';
import { CONTENT_SOURCES, DIFFICULTIES } from '@jsskillup/shared';
import type {
  OpenAnswerGrade,
  Question,
  QuestionAnswer,
  QuestionOutcome,
  QuizStats,
  PublicQuestion,
} from '@jsskillup/shared';
import {
  boolOrNull,
  enumColumn,
  execute,
  getDb,
  jsonColumn,
  jsonColumnOrNull,
  num,
  numOrNull,
  queryAll,
  queryOne,
  str,
  strOrNull,
  type Row,
} from '../client.js';

const optionsSchema = z.array(z.object({ id: z.string(), text: z.string() }));
const stringsSchema = z.array(z.string());

const SELECT = `
  SELECT id, topic_id, subtopic_id, kind, difficulty, prompt_md, code,
         options_json, correct_json, expected_output_json, explanation_md,
         reference_answer_md, rubric_json, tags_json, source, created_at
  FROM questions
`;

function mapQuestion(row: Row): Question {
  const base = {
    id: str(row['id'], 'id'),
    topicId: str(row['topic_id'], 'topic_id'),
    subtopicId: strOrNull(row['subtopic_id'], 'subtopic_id'),
    difficulty: enumColumn(row['difficulty'], 'difficulty', DIFFICULTIES),
    promptMd: str(row['prompt_md'], 'prompt_md'),
    code: strOrNull(row['code'], 'code'),
    explanationMd: str(row['explanation_md'], 'explanation_md'),
    tags: jsonColumn(row['tags_json'], 'tags_json', stringsSchema),
    source: enumColumn(row['source'], 'source', CONTENT_SOURCES),
    createdAt: str(row['created_at'], 'created_at'),
  };

  const kind = enumColumn(row['kind'], 'kind', ['mc', 'output', 'open'] as const);

  switch (kind) {
    case 'mc':
      return {
        ...base,
        kind,
        options: jsonColumn(row['options_json'], 'options_json', optionsSchema),
        correctOptionIds: jsonColumn(row['correct_json'], 'correct_json', stringsSchema),
      };
    case 'output':
      return {
        ...base,
        kind,
        options: jsonColumnOrNull(row['options_json'], 'options_json', optionsSchema) ?? [],
        correctOptionIds: jsonColumnOrNull(row['correct_json'], 'correct_json', stringsSchema) ?? [],
        expectedOutput: jsonColumn(row['expected_output_json'], 'expected_output_json', stringsSchema),
      };
    case 'open':
      return {
        ...base,
        kind,
        referenceAnswerMd: str(row['reference_answer_md'], 'reference_answer_md'),
        rubric: jsonColumn(row['rubric_json'], 'rubric_json', stringsSchema),
      };
  }
}

/** Убирает из вопроса всё, что подсказывает ответ. */
export function toPublicQuestion(question: Question): PublicQuestion {
  switch (question.kind) {
    case 'mc': {
      const { correctOptionIds: _correct, explanationMd: _explanation, ...rest } = question;
      return rest;
    }
    case 'output': {
      const {
        correctOptionIds: _correct,
        expectedOutput: _expected,
        explanationMd: _explanation,
        ...rest
      } = question;
      return rest;
    }
    case 'open': {
      const {
        referenceAnswerMd: _reference,
        rubric: _rubric,
        explanationMd: _explanation,
        ...rest
      } = question;
      return rest;
    }
  }
}

export function getQuestionsByTopic(topicId: string): Question[] {
  return queryAll(
    `${SELECT} WHERE topic_id = ? ORDER BY
       CASE difficulty WHEN 'easy' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, created_at, id`,
    [topicId],
    mapQuestion,
  );
}

export function getQuestionById(id: string): Question | null {
  return queryOne(`${SELECT} WHERE id = ?`, [id], mapQuestion);
}

export function saveAttempt(
  questionId: string,
  answer: QuestionAnswer,
  isCorrect: boolean | null,
): number {
  const statement = getDb().prepare(
    `INSERT INTO question_attempts (question_id, answer_json, is_correct, created_at)
     VALUES (?, ?, ?, ?)`,
  );
  const result = statement.run(
    questionId,
    JSON.stringify(answer),
    isCorrect === null ? null : Number(isCorrect),
    new Date().toISOString(),
  );
  return Number(result.lastInsertRowid);
}

export function setSelfScore(attemptId: number, score: number): { questionId: string } | null {
  const attempt = queryOne(
    'SELECT question_id FROM question_attempts WHERE id = ?',
    [attemptId],
    (row) => ({ questionId: str(row['question_id'], 'question_id') }),
  );
  if (!attempt) return null;
  execute('UPDATE question_attempts SET self_score = ? WHERE id = ?', [score, attemptId]);
  return attempt;
}

/** Последняя попытка по каждому вопросу темы. */
export function getOutcomesByTopic(topicId: string): QuestionOutcome[] {
  return queryAll(
    `SELECT
       q.id                                   AS question_id,
       (SELECT a.is_correct FROM question_attempts a
          WHERE a.question_id = q.id ORDER BY a.id DESC LIMIT 1) AS is_correct,
       (SELECT COALESCE(a.ai_score, a.self_score) FROM question_attempts a
          WHERE a.question_id = q.id ORDER BY a.id DESC LIMIT 1) AS score,
       (SELECT COUNT(*) FROM question_attempts a WHERE a.question_id = q.id) AS attempts,
       (SELECT a.created_at FROM question_attempts a
          WHERE a.question_id = q.id ORDER BY a.id DESC LIMIT 1) AS last_at
     FROM questions q
     WHERE q.topic_id = ?
       AND EXISTS (SELECT 1 FROM question_attempts a WHERE a.question_id = q.id)`,
    [topicId],
    (row) => ({
      questionId: str(row['question_id'], 'question_id'),
      isCorrect: boolOrNull(row['is_correct'], 'is_correct'),
      aiScore: numOrNull(row['score'], 'score'),
      attempts: num(row['attempts'], 'attempts'),
      lastAnsweredAt: str(row['last_at'], 'last_at'),
    }),
  );
}

/**
 * Статистика по теме. Открытый вопрос считается верным, если оценка (AI или своя) ≥ 7 из 10.
 */
export function getQuizStats(topicId: string): QuizStats {
  const stats = queryOne(
    `WITH last_attempt AS (
       SELECT q.id AS question_id,
              (SELECT a.is_correct FROM question_attempts a
                 WHERE a.question_id = q.id ORDER BY a.id DESC LIMIT 1) AS is_correct,
              (SELECT COALESCE(a.ai_score, a.self_score) FROM question_attempts a
                 WHERE a.question_id = q.id ORDER BY a.id DESC LIMIT 1) AS score,
              EXISTS (SELECT 1 FROM question_attempts a WHERE a.question_id = q.id) AS answered
       FROM questions q WHERE q.topic_id = ?
     )
     SELECT
       COUNT(*)                                                       AS total,
       SUM(CASE WHEN answered THEN 1 ELSE 0 END)                      AS answered,
       SUM(CASE WHEN is_correct = 1 OR score >= 7 THEN 1 ELSE 0 END)  AS correct
     FROM last_attempt`,
    [topicId],
    (row) => ({
      total: num(row['total'], 'total'),
      answered: numOrNull(row['answered'], 'answered') ?? 0,
      correct: numOrNull(row['correct'], 'correct') ?? 0,
    }),
  );

  const result = stats ?? { total: 0, answered: 0, correct: 0 };
  return {
    ...result,
    accuracy: result.answered === 0 ? null : result.correct / result.answered,
  };
}

/** Проверка ответа. Для открытого вопроса автоматической проверки нет — вернётся null. */
export function checkAnswer(question: Question, answer: QuestionAnswer): boolean | null {
  if (question.kind === 'open') return null;

  if (question.kind === 'mc') {
    if (answer.kind !== 'mc') return false;
    return sameSet(answer.optionIds, question.correctOptionIds);
  }

  if (answer.kind !== 'output') return false;

  if (question.options.length > 0) {
    return sameSet(answer.optionIds, question.correctOptionIds);
  }
  return sameLines(answer.text, question.expectedOutput);
}

function sameSet(actual: readonly string[], expected: readonly string[]): boolean {
  if (actual.length !== expected.length) return false;
  const expectedSet = new Set(expected);
  return actual.every((id) => expectedSet.has(id));
}

/** Сравнение свободного ввода с ожидаемым выводом: без учёта лишних пробелов и пустых строк. */
function sameLines(actual: string, expected: readonly string[]): boolean {
  const normalize = (lines: readonly string[]): string[] =>
    lines.map((line) => line.trim()).filter((line) => line.length > 0);

  const actualLines = normalize(actual.split('\n'));
  const expectedLines = normalize(expected);

  return (
    actualLines.length === expectedLines.length &&
    actualLines.every((line, index) => line === expectedLines[index])
  );
}

export interface StoredAttempt {
  id: number;
  questionId: string;
  answer: QuestionAnswer;
}

const answerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('mc'), optionIds: z.array(z.string()) }),
  z.object({ kind: z.literal('output'), optionIds: z.array(z.string()), text: z.string() }),
  z.object({ kind: z.literal('open'), text: z.string() }),
]);

export function getAttemptById(id: number): StoredAttempt | null {
  return queryOne(
    'SELECT id, question_id, answer_json FROM question_attempts WHERE id = ?',
    [id],
    (row) => ({
      id: num(row['id'], 'id'),
      questionId: str(row['question_id'], 'question_id'),
      answer: jsonColumn(row['answer_json'], 'answer_json', answerSchema),
    }),
  );
}

/** Оценка AI живёт в отдельной колонке от самооценки — их нельзя путать. */
export function saveAiGrade(attemptId: number, grade: OpenAnswerGrade): void {
  execute('UPDATE question_attempts SET ai_score = ?, ai_feedback_json = ? WHERE id = ?', [
    grade.score,
    JSON.stringify(grade),
    attemptId,
  ]);
}

export function insertGeneratedQuestion(question: {
  id: string;
  topicId: string;
  kind: 'mc' | 'output' | 'open';
  difficulty: string;
  promptMd: string;
  code: string | null;
  options: string | null;
  correct: string | null;
  expectedOutput: string | null;
  explanationMd: string;
  referenceAnswerMd: string | null;
  rubric: string | null;
  tags: string[];
}): void {
  execute(
    `INSERT INTO questions (
       id, topic_id, subtopic_id, kind, difficulty, prompt_md, code,
       options_json, correct_json, expected_output_json, explanation_md,
       reference_answer_md, rubric_json, tags_json, source, created_at
     ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ai', ?)`,
    [
      question.id,
      question.topicId,
      question.kind,
      question.difficulty,
      question.promptMd,
      question.code,
      question.options,
      question.correct,
      question.expectedOutput,
      question.explanationMd,
      question.referenceAnswerMd,
      question.rubric,
      JSON.stringify(question.tags),
      new Date().toISOString(),
    ],
  );
}

export function getExistingPrompts(topicId: string, limit = 40): string[] {
  return queryAll(
    'SELECT prompt_md FROM questions WHERE topic_id = ? ORDER BY created_at DESC LIMIT ?',
    [topicId, limit],
    (row) => str(row['prompt_md'], 'prompt_md'),
  );
}
