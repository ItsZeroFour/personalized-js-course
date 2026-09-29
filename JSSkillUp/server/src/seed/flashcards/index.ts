import type { SeedFlashcard } from '../types.js';
import { jsCoreFlashcards } from './js-core.js';
import { typescriptFlashcards } from './typescript.js';
import { algorithmsFlashcards } from './algorithms.js';
import { reactFlashcards } from './react.js';
import { engineeringFlashcards } from './engineering.js';

export const flashcardsSeed: SeedFlashcard[] = [
  ...jsCoreFlashcards,
  ...typescriptFlashcards,
  ...algorithmsFlashcards,
  ...reactFlashcards,
  ...engineeringFlashcards,
];
