import type { SeedTask } from '../types.js';
import { arraysStringsTasks } from './arrays-strings.js';
import { hashMapsTasks } from './hash-maps.js';
import { pointersWindowTasks } from './pointers-window.js';
import { stackRecursionTasks } from './stack-recursion.js';
import { sortingSearchTasks } from './sorting-search.js';
import { utilityTasks } from './utilities.js';
import { asyncPatternTasks } from './async-patterns.js';
import { reactBasicsTasks } from './react-basics.js';
import { reactHooksTasks } from './react-hooks.js';
import { reactAdvancedTasks } from './react-advanced.js';
import { codeReviewTasks } from './code-review.js';

export const tasksSeed: SeedTask[] = [
  ...arraysStringsTasks,
  ...hashMapsTasks,
  ...pointersWindowTasks,
  ...stackRecursionTasks,
  ...sortingSearchTasks,
  ...utilityTasks,
  ...asyncPatternTasks,
  ...reactBasicsTasks,
  ...reactHooksTasks,
  ...reactAdvancedTasks,
  ...codeReviewTasks,
];
