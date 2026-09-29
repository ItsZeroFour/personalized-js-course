import { resolve } from 'node:path';
import type { RunnableTest } from '@jsskillup/shared';
import { runTaskTests } from '../services/taskRunner.js';
import { tasksSeed } from './tasks/index.js';
import { taskRuntimeOf, type SeedTask } from './types.js';

export function toRunnableTests(task: SeedTask): RunnableTest[] {
  return task.tests.map((test) => ({
    name: test.name,
    code: test.code,
    visibility: test.hidden ? 'hidden' : 'visible',
  }));
}

export interface ValidationIssue {
  slug: string;
  problem: string;
  details: string[];
}

/**
 * Проверяет, что эталонное решение каждой задачи проходит её собственные тесты,
 * а стартовый код — нет (иначе задача ничего не проверяет).
 */
export async function validateTasks(tasks: readonly SeedTask[]): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const slugs = new Set<string>();

  for (const task of tasks) {
    if (slugs.has(task.slug)) {
      issues.push({ slug: task.slug, problem: 'дубль slug', details: [] });
    }
    slugs.add(task.slug);

    if (task.tests.length === 0) {
      issues.push({ slug: task.slug, problem: 'нет ни одного теста', details: [] });
      continue;
    }

    const runnable = toRunnableTests(task);
    const options = taskRuntimeOf(task);

    const solution = await runTaskTests(task.solutionCode, runnable, options);
    if (solution.status !== 'passed') {
      issues.push({
        slug: task.slug,
        problem: `эталонное решение не проходит тесты (${solution.passed}/${solution.total})`,
        details: solution.error
          ? [solution.error]
          : solution.results
              .filter((result) => !result.passed)
              .map((result) => `${result.name}: ${result.message ?? 'без сообщения'}`),
      });
    }

    const starter = await runTaskTests(task.starterCode, runnable, options);
    if (starter.status === 'passed') {
      issues.push({
        slug: task.slug,
        problem: 'стартовый код уже проходит все тесты — задача ничего не проверяет',
        details: [],
      });
    }
  }

  return issues;
}

// Запуск напрямую: npm run validate:tasks
if (process.argv[1] && import.meta.filename === resolve(process.argv[1])) {
  // Валидатор намеренно прогоняет заведомо нерабочий стартовый код. Он может оставить
  // необработанное отклонение промиса (например, в тесте на reject), а Node по умолчанию
  // убивает процесс. Здесь это ожидаемо, поэтому гасим.
  process.on('unhandledRejection', () => {});

  const issues = await validateTasks(tasksSeed);

  if (issues.length === 0) {
    const testCount = tasksSeed.reduce((acc, task) => acc + task.tests.length, 0);
    console.log(`✓ Все ${tasksSeed.length} задач валидны, тестов всего ${testCount}.`);
  } else {
    console.error(`✗ Проблем: ${issues.length}\n`);
    for (const issue of issues) {
      console.error(`  ${issue.slug}: ${issue.problem}`);
      for (const detail of issue.details) console.error(`      ${detail}`);
    }
    process.exitCode = 1;
  }
}
