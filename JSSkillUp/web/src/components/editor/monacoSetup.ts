import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/language/typescript/ts.worker?worker';
import reactIndex from '~types/react/index.d.ts?raw';
import reactGlobal from '~types/react/global.d.ts?raw';
import reactJsxRuntime from '~types/react/jsx-runtime.d.ts?raw';
import reactDomIndex from '~types/react-dom/index.d.ts?raw';
import reactDomClient from '~types/react-dom/client.d.ts?raw';
import csstypeStub from './types/csstype.d.ts.txt?raw';

/**
 * По умолчанию @monaco-editor/react тянет редактор с CDN. Приложение задумано как
 * полностью локальное, поэтому Monaco подключается из node_modules, а его собственные
 * воркеры собирает Vite. Без этого редактор не открылся бы без интернета.
 *
 * Регистрируются только воркеры для TS/JS: другие языки в редакторе не открываются,
 * а их воркеры весят ещё несколько мегабайт.
 */
self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string): Worker {
    if (label === 'typescript' || label === 'javascript') return new tsWorker();
    return new editorWorker();
  },
};

/**
 * Настройки TypeScript для всех редакторов. С monaco-editor 0.55 API языка живёт в
 * `monaco.typescript`, а `monaco.languages.typescript` в рантайме — undefined.
 * Типы @monaco-editor/react об этом не знают, поэтому настройка делается здесь,
 * на реальном модуле, а не в onMount.
 */
monaco.typescript.typescriptDefaults.setCompilerOptions({
  target: monaco.typescript.ScriptTarget.ESNext,
  lib: ['esnext', 'dom'],
  strict: true,
  noEmit: true,
  allowNonTsExtensions: true,
  // Решение — самостоятельный скрипт, а не модуль: иначе Monaco ругается
  // на объявления верхнего уровня как на конфликт глобальных имён.
  // 3 = ts.ModuleDetectionKind.Force (enum в API Monaco не экспортируется).
  moduleDetection: 3,
  // React-задачи: TSX с automatic runtime и import из 'react'.
  jsx: monaco.typescript.JsxEmit.ReactJSX,
  moduleResolution: monaco.typescript.ModuleResolutionKind.NodeJs,
  module: monaco.typescript.ModuleKind.ESNext,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
});

/**
 * Типы React и ReactDOM подкладываются как файлы виртуального node_modules —
 * тогда `import { useState } from 'react'` в редакторе резолвится и даёт подсказки.
 */
const EXTRA_LIBS: Array<[path: string, content: string]> = [
  ['file:///node_modules/@types/react/index.d.ts', reactIndex],
  ['file:///node_modules/@types/react/global.d.ts', reactGlobal],
  ['file:///node_modules/@types/react/jsx-runtime.d.ts', reactJsxRuntime],
  ['file:///node_modules/@types/react-dom/index.d.ts', reactDomIndex],
  ['file:///node_modules/@types/react-dom/client.d.ts', reactDomClient],
  ['file:///node_modules/csstype/index.d.ts', csstypeStub],
];
for (const [path, content] of EXTRA_LIBS) {
  monaco.typescript.typescriptDefaults.addExtraLib(content, path);
}

loader.config({ monaco });

export { monaco };
