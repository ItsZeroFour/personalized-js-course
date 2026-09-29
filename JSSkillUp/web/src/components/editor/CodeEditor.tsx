import './monacoSetup';
import { useId } from 'react';
import Editor from '@monaco-editor/react';
import type { OnMount } from '@monaco-editor/react';
import type { TaskLanguage } from '@jsskillup/shared';
import { useTheme } from '@/lib/theme';

/** Расширение файла модели: только по .tsx Monaco включает разбор JSX. */
const FILE_EXTENSION: Record<TaskLanguage, string> = { js: 'js', ts: 'ts', tsx: 'tsx' };

const MONACO_LANGUAGE: Record<TaskLanguage, string> = {
  js: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
};

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: TaskLanguage;
  height?: number | string;
  readOnly?: boolean;
  /** Ctrl/Cmd + Enter — привычное сочетание «запустить». */
  onRun?: () => void;
}

export function CodeEditor({
  value,
  onChange,
  language,
  height = 460,
  readOnly = false,
  onRun,
}: CodeEditorProps) {
  const { theme } = useTheme();
  // У каждого редактора своя модель: общий путь смешал бы код разных экземпляров.
  const modelId = useId().replace(/[^a-zA-Z0-9]/g, '');

  // Компилятор TypeScript настраивается один раз в monacoSetup.
  const handleMount: OnMount = (editor, monaco) => {
    if (onRun) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, onRun);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <Editor
        height={height}
        language={MONACO_LANGUAGE[language]}
        path={`file:///editor-${modelId}.${FILE_EXTENSION[language]}`}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        value={value}
        onChange={(next) => onChange(next ?? '')}
        onMount={handleMount}
        loading={<div className="p-6 text-sm text-muted">Загружаем редактор…</div>}
        options={{
          readOnly,
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Cascadia Code', ui-monospace, Consolas, monospace",
          lineHeight: 1.6,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          renderLineHighlight: 'line',
          padding: { top: 14, bottom: 14 },
          smoothScrolling: true,
          bracketPairColorization: { enabled: true },
        }}
      />
    </div>
  );
}
