import type { SeedQuestion } from '../types.js';
import { jsCoreLanguageQuestions } from './js-core-language.js';
import { jsCoreAsyncQuestions } from './js-core-async.js';
import { jsCoreDataQuestions } from './js-core-data.js';
import { typescriptQuestions } from './typescript.js';
import { algorithmsQuestions } from './algorithms.js';
import { reactQuestions } from './react.js';
import { stateManagementQuestions } from './state-management.js';
import { browserQuestions } from './browser.js';
import { engineeringQuestions } from './engineering.js';

export const questionsSeed: SeedQuestion[] = [
  ...jsCoreLanguageQuestions,
  ...jsCoreAsyncQuestions,
  ...jsCoreDataQuestions,
  ...typescriptQuestions,
  ...algorithmsQuestions,
  ...reactQuestions,
  ...stateManagementQuestions,
  ...browserQuestions,
  ...engineeringQuestions,
];
