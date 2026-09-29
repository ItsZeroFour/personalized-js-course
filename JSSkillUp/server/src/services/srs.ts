import type { ReviewGrade, Sm2State } from '@jsskillup/shared';
import { addDays, today } from './date.js';

/** Минимальный фактор лёгкости по SM-2: ниже карточка начала бы возвращаться слишком часто. */
const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;

/** Оценка 3 и выше считается успешным вспоминанием. */
const PASS_THRESHOLD = 3;

export function initialState(cardId: string, dueDate = today()): Sm2State {
  return {
    cardId,
    ease: DEFAULT_EASE,
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
    dueDate,
    lastGrade: null,
    lastReviewedAt: null,
  };
}

/**
 * Шаг алгоритма SM-2.
 *
 * Успешный ответ (grade ≥ 3) наращивает интервал: 1 день → 6 дней → предыдущий × ease.
 * Провал сбрасывает серию и возвращает карточку на завтра.
 * Фактор лёгкости пересчитывается при любой оценке по формуле Вожняка и не опускается ниже 1.3.
 */
export function applyReview(state: Sm2State, grade: ReviewGrade, now = new Date()): Sm2State {
  const passed = grade >= PASS_THRESHOLD;

  const repetitions = passed ? state.repetitions + 1 : 0;
  const lapses = passed ? state.lapses : state.lapses + 1;

  let intervalDays: number;
  if (!passed) {
    intervalDays = 1;
  } else if (state.repetitions === 0) {
    intervalDays = 1;
  } else if (state.repetitions === 1) {
    intervalDays = 6;
  } else {
    intervalDays = Math.max(1, Math.round(state.intervalDays * state.ease));
  }

  const delta = 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02);
  const ease = Math.max(MIN_EASE, Number((state.ease + delta).toFixed(4)));

  return {
    cardId: state.cardId,
    ease,
    intervalDays,
    repetitions,
    lapses,
    dueDate: addDays(today(), intervalDays),
    lastGrade: grade,
    lastReviewedAt: now.toISOString(),
  };
}

/** Карточка считается усвоенной, когда интервал дорос до трёх недель. */
export const MATURE_INTERVAL_DAYS = 21;

export function isMature(state: Sm2State): boolean {
  return state.intervalDays >= MATURE_INTERVAL_DAYS;
}
