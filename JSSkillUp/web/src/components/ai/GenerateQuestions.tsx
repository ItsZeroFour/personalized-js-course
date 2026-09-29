import { useState } from 'react';
import type { Difficulty, GenerateQuestionsResponse, QuestionKind } from '@jsskillup/shared';
import { DIFFICULTIES, DIFFICULTY_LABELS, QUESTION_KINDS, QUESTION_KIND_LABELS } from '@jsskillup/shared';
import { api, type ApiRequestError } from '@/api/client';
import { toApiError } from '@/lib/useApi';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/States';

const SELECT_CLASS =
  'h-8 rounded-lg border border-line bg-panel px-2 text-sm text-fg disabled:opacity-50';

/**
 * «Сгенерировать ещё вопросов по теме». Вопросы сохраняются на бэкенде с source = 'ai',
 * после успеха родитель перезагружает список.
 */
export function GenerateQuestions({
  topicSlug,
  onCreated,
}: {
  topicSlug: string;
  onCreated: (result: GenerateQuestionsResponse) => void;
}) {
  const [count, setCount] = useState(3);
  const [kind, setKind] = useState<QuestionKind | ''>('');
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiRequestError | null>(null);
  const [last, setLast] = useState<GenerateQuestionsResponse | null>(null);

  const generate = async (): Promise<void> => {
    setPending(true);
    setError(null);
    try {
      const result = await api.aiGenerateQuestions({
        topic: topicSlug,
        count,
        ...(kind ? { kind } : {}),
        ...(difficulty ? { difficulty } : {}),
      });
      setLast(result);
      onCreated(result);
    } catch (cause) {
      setError(toApiError(cause));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Количество"
          className={SELECT_CLASS}
          value={count}
          disabled={pending}
          onChange={(event) => setCount(Number(event.target.value))}
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value} шт.
            </option>
          ))}
        </select>
        <select
          aria-label="Тип вопроса"
          className={SELECT_CLASS}
          value={kind}
          disabled={pending}
          onChange={(event) => {
            const value = event.target.value;
            setKind(QUESTION_KINDS.find((item) => item === value) ?? '');
          }}
        >
          <option value="">Любой тип</option>
          {QUESTION_KINDS.map((value) => (
            <option key={value} value={value}>
              {QUESTION_KIND_LABELS[value]}
            </option>
          ))}
        </select>
        <select
          aria-label="Сложность"
          className={SELECT_CLASS}
          value={difficulty}
          disabled={pending}
          onChange={(event) => {
            const value = event.target.value;
            setDifficulty(DIFFICULTIES.find((item) => item === value) ?? '');
          }}
        >
          <option value="">Любая сложность</option>
          {DIFFICULTIES.map((value) => (
            <option key={value} value={value}>
              {DIFFICULTY_LABELS[value]}
            </option>
          ))}
        </select>
        <Button size="sm" disabled={pending} onClick={() => void generate()}>
          {pending ? 'Генерируем…' : '✨ Сгенерировать вопросы'}
        </Button>
      </div>

      {last ? (
        <p className="text-sm text-muted">
          Добавлено вопросов: <span className="font-medium text-fg">{last.created}</span>
          {last.rejected.length > 0 ? `, отброшено: ${last.rejected.length}` : ''}. Новые — в конце
          списка с пометкой AI.
        </p>
      ) : null}

      {error ? (
        <ErrorState title="Не удалось сгенерировать вопросы" error={error} onRetry={() => void generate()} />
      ) : null}
    </div>
  );
}
