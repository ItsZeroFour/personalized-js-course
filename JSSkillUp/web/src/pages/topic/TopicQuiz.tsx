import { useMemo, useState } from 'react';
import type {
  CheckAnswerRequest,
  CheckAnswerResponse,
  OpenAnswerGrade,
  PublicQuestion,
  QuestionOutcome,
} from '@jsskillup/shared';
import { DIFFICULTY_LABELS, QUESTION_KIND_LABELS } from '@jsskillup/shared';
import { api, ApiRequestError } from '@/api/client';
import { useApi } from '@/lib/useApi';
import { Card } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Badge } from '@/components/ui/StatusBadge';
import { Markdown } from '@/components/ui/Markdown';
import { EmptyState, ErrorState, Loading } from '@/components/ui/States';
import { AiUnavailable, OpenAnswerGradePanel } from '@/components/ai/AiPanels';
import { GenerateQuestions } from '@/components/ai/GenerateQuestions';
import { cn } from '@/lib/cn';
import { toApiError } from '@/lib/useApi';
import { useTopic } from './TopicLayout';

interface Draft {
  optionIds: string[];
  text: string;
}

const EMPTY_DRAFT: Draft = { optionIds: [], text: '' };

/** Порог, с которого самооценка или оценка AI считается верным ответом. */
const PASS_SCORE = 7;

/**
 * Итог по вопросу для навигатора: сначала результат текущей сессии,
 * затем оценка открытого ответа (AI или самооценка), затем сохранённая в базе попытка.
 * null — данных нет.
 */
function resolveOutcome(
  session: CheckAnswerResponse | undefined,
  score: number | undefined,
  previous: QuestionOutcome | undefined,
): boolean | null {
  if (session?.isCorrect != null) return session.isCorrect;
  if (score !== undefined) return score >= PASS_SCORE;
  if (previous?.isCorrect != null) return previous.isCorrect;
  if (previous?.aiScore != null) return previous.aiScore >= PASS_SCORE;
  return null;
}

/** Итог вопроса: null — ещё не отвечали в этой сессии. */
type Results = Record<string, CheckAnswerResponse | undefined>;
type Drafts = Record<string, Draft | undefined>;
type SelfScores = Record<string, number | undefined>;

function OptionList({
  options,
  selected,
  correctIds,
  disabled,
  onToggle,
}: {
  options: Array<{ id: string; text: string }>;
  selected: string[];
  correctIds: string[] | null;
  disabled: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {options.map((option) => {
        const isSelected = selected.includes(option.id);
        const isCorrect = correctIds?.includes(option.id) ?? false;
        const showWrong = correctIds !== null && isSelected && !isCorrect;

        return (
          <li key={option.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onToggle(option.id)}
              className={cn(
                'flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                correctIds === null && isSelected && 'border-accent bg-accent-soft',
                correctIds === null && !isSelected && 'border-line hover:bg-panel-2',
                correctIds !== null && isCorrect && 'border-success bg-success-soft',
                showWrong && 'border-danger bg-danger-soft',
                correctIds !== null && !isCorrect && !isSelected && 'border-line opacity-60',
                disabled && 'cursor-default',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border text-xs font-semibold',
                  isSelected ? 'border-accent bg-accent text-accent-fg' : 'border-line',
                  correctIds !== null && isCorrect && 'border-success bg-success text-white',
                  showWrong && 'border-danger bg-danger text-white',
                )}
              >
                {correctIds !== null && isCorrect ? '✓' : showWrong ? '✕' : option.id.toUpperCase()}
              </span>
              <span className="text-fg">{option.text}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function SelfGrade({
  attemptId,
  value,
  onGraded,
}: {
  attemptId: number;
  value: number | undefined;
  onGraded: (score: number, percent: number) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grade = async (score: number): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      const result = await api.selfGrade(attemptId, score);
      onGraded(score, result.topicPercent);
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Не удалось сохранить оценку');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-line bg-panel-2/50 p-4">
      <p className="text-sm font-medium text-fg">Оцените свой ответ по эталону</p>
      <p className="mt-0.5 text-xs text-muted">
        Оценка 7 и выше засчитывается как верный ответ. Если есть оценка AI, в статистике учитывается она.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
          <button
            key={score}
            type="button"
            disabled={saving}
            onClick={() => void grade(score)}
            className={cn(
              'size-9 rounded-md border text-sm font-medium tabular-nums transition-colors disabled:opacity-50',
              value === score
                ? 'border-accent bg-accent text-accent-fg'
                : 'border-line text-muted hover:bg-panel hover:text-fg',
            )}
          >
            {score}
          </button>
        ))}
      </div>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}

/**
 * Оценка открытого ответа. Если ключ Groq задан — оценивает AI, иначе остаётся
 * самооценка по эталону. AI-оценка пишется в отдельную колонку и имеет приоритет
 * в статистике, поэтому обе кнопки могут сосуществовать.
 */
function AnswerGrading({
  attemptId,
  aiConfigured,
  selfScore,
  onSelfGraded,
  onAiGraded,
}: {
  attemptId: number;
  aiConfigured: boolean;
  selfScore: number | undefined;
  onSelfGraded: (score: number, percent: number) => void;
  onAiGraded: (score: number, percent: number) => void;
}) {
  const [grade, setGrade] = useState<OpenAnswerGrade | null>(null);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<ApiRequestError | null>(null);

  const requestGrade = async (): Promise<void> => {
    setGrading(true);
    setError(null);
    try {
      const result = await api.aiGrade(attemptId);
      setGrade(result.grade);
      onAiGraded(result.grade.score, result.topicPercent);
    } catch (cause) {
      setError(toApiError(cause));
    } finally {
      setGrading(false);
    }
  };

  if (grade) return <OpenAnswerGradePanel grade={grade} />;

  return (
    <div className="space-y-3">
      {aiConfigured ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={grading} onClick={() => void requestGrade()}>
            {grading ? 'AI проверяет ответ…' : 'Оценить через AI'}
          </Button>
          <span className="text-xs text-muted">
            Оценка 0–10, что упущено, эталон и follow-up вопросы
          </span>
        </div>
      ) : (
        <AiUnavailable what="Оценка открытого ответа" />
      )}

      {error ? (
        <ErrorState title="AI не смог оценить ответ" error={error} onRetry={() => void requestGrade()} />
      ) : null}

      <SelfGrade attemptId={attemptId} value={selfScore} onGraded={onSelfGraded} />
    </div>
  );
}

function QuestionCard({
  question,
  draft,
  result,
  selfScore,
  aiConfigured,
  onDraftChange,
  onChecked,
  onSelfGraded,
  onAiGraded,
}: {
  question: PublicQuestion;
  draft: Draft;
  result: CheckAnswerResponse | undefined;
  selfScore: number | undefined;
  aiConfigured: boolean;
  onDraftChange: (draft: Draft) => void;
  onChecked: (result: CheckAnswerResponse) => void;
  onSelfGraded: (score: number, percent: number) => void;
  onAiGraded: (score: number, percent: number) => void;
}) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answered = result !== undefined;
  const hasOptions = question.kind !== 'open' && question.options.length > 0;

  const buildAnswer = (): CheckAnswerRequest | null => {
    if (question.kind === 'mc') {
      return draft.optionIds.length > 0 ? { kind: 'mc', optionIds: draft.optionIds } : null;
    }
    if (question.kind === 'output') {
      if (hasOptions) {
        return draft.optionIds.length > 0
          ? { kind: 'output', optionIds: draft.optionIds, text: '' }
          : null;
      }
      return draft.text.trim() ? { kind: 'output', optionIds: [], text: draft.text } : null;
    }
    return draft.text.trim() ? { kind: 'open', text: draft.text } : null;
  };

  const answer = buildAnswer();

  const check = async (): Promise<void> => {
    if (!answer) return;
    setChecking(true);
    setError(null);
    try {
      onChecked(await api.checkAnswer(question.id, answer));
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Не удалось проверить ответ');
    } finally {
      setChecking(false);
    }
  };

  const toggleOption = (id: string): void => {
    if (answered) return;
    onDraftChange({
      ...draft,
      optionIds: draft.optionIds.includes(id)
        ? draft.optionIds.filter((value) => value !== id)
        : [...draft.optionIds, id],
    });
  };

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{QUESTION_KIND_LABELS[question.kind]}</Badge>
        <Badge>{DIFFICULTY_LABELS[question.difficulty]}</Badge>
        {question.source === 'ai' ? <Badge tone="warning">AI</Badge> : null}
        {question.tags.map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>

      <Markdown compact>{question.promptMd}</Markdown>

      {question.code ? (
        <Markdown compact>{`\`\`\`js\n${question.code}\n\`\`\``}</Markdown>
      ) : null}

      {question.kind !== 'open' && question.options.length > 0 ? (
        <>
          <p className="text-xs text-muted">Выберите один или несколько вариантов</p>
          <OptionList
            options={question.options}
            selected={draft.optionIds}
            correctIds={result ? result.correctOptionIds : null}
            disabled={answered}
            onToggle={toggleOption}
          />
        </>
      ) : null}

      {question.kind === 'output' && !hasOptions ? (
        <div>
          <p className="mb-2 text-sm font-medium text-fg">Что выведет код? Каждая строка вывода — с новой строки</p>
          <textarea
            value={draft.text}
            disabled={answered}
            onChange={(event) => onDraftChange({ ...draft, text: event.target.value })}
            rows={5}
            className="w-full resize-y rounded-lg border border-line bg-panel-2 px-3 py-2 font-mono text-sm text-fg disabled:opacity-70"
            placeholder={'1\n2\n3'}
          />
        </div>
      ) : null}

      {question.kind === 'open' ? (
        <div>
          <p className="mb-2 text-sm font-medium text-fg">Ваш ответ</p>
          <textarea
            value={draft.text}
            disabled={answered}
            onChange={(event) => onDraftChange({ ...draft, text: event.target.value })}
            rows={8}
            className="w-full resize-y rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-fg disabled:opacity-70"
            placeholder="Отвечайте так, как ответили бы вслух на собеседовании"
          />
        </div>
      ) : null}

      {!answered ? (
        <div className="flex items-center gap-3">
          <Button disabled={!answer || checking} onClick={() => void check()}>
            Проверить
          </Button>
          {!answer ? <span className="text-xs text-muted">Сначала дайте ответ</span> : null}
          {error ? <span className="text-sm text-danger">{error}</span> : null}
        </div>
      ) : null}

      {result ? (
        <div className="space-y-4 border-t border-line pt-5">
          {result.isCorrect !== null ? (
            <p
              className={cn(
                'text-sm font-semibold',
                result.isCorrect ? 'text-success' : 'text-danger',
              )}
            >
              {result.isCorrect ? '✓ Верно' : '✕ Неверно'}
            </p>
          ) : null}

          {result.expectedOutput ? (
            <div>
              <p className="mb-1.5 text-sm font-medium text-fg">Правильный вывод</p>
              <Markdown compact>{`\`\`\`\n${result.expectedOutput.join('\n')}\n\`\`\``}</Markdown>
            </div>
          ) : null}

          {result.referenceAnswerMd ? (
            <div>
              <p className="mb-1.5 text-sm font-medium text-fg">Эталонный ответ</p>
              <div className="rounded-lg border border-line bg-panel-2/50 p-4">
                <Markdown compact>{result.referenceAnswerMd}</Markdown>
              </div>
            </div>
          ) : null}

          {result.rubric && result.rubric.length > 0 ? (
            <div>
              <p className="mb-1.5 text-sm font-medium text-fg">Что должно было прозвучать</p>
              <ul className="space-y-1.5">
                {result.rubric.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-muted">
                    <span className="text-accent">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.explanationMd ? (
            <div>
              <p className="mb-1.5 text-sm font-medium text-fg">Разбор</p>
              <Markdown compact>{result.explanationMd}</Markdown>
            </div>
          ) : null}

          {question.kind === 'open' ? (
            <AnswerGrading
              attemptId={result.attemptId}
              aiConfigured={aiConfigured}
              selfScore={selfScore}
              onSelfGraded={onSelfGraded}
              onAiGraded={onAiGraded}
            />
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

export function TopicQuiz() {
  const { topic, setPercent } = useTopic();
  const { data, error, loading, reload } = useApi(api.questions, topic.slug);
  const ai = useApi(api.aiStatus);
  const aiConfigured = ai.data?.configured ?? false;

  const [index, setIndex] = useState(0);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [results, setResults] = useState<Results>({});
  const [selfScores, setSelfScores] = useState<SelfScores>({});
  const [aiScores, setAiScores] = useState<SelfScores>({});

  const outcomeById = useMemo(() => {
    const map = new Map<string, QuestionOutcome>();
    for (const outcome of data?.outcomes ?? []) map.set(outcome.questionId, outcome);
    return map;
  }, [data]);

  // При reload после генерации данные остаются на месте — не сбрасываем экран.
  if (loading && !data) return <Loading label="Загружаем вопросы" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const generator = aiConfigured ? (
    <GenerateQuestions topicSlug={topic.slug} onCreated={reload} />
  ) : (
    <AiUnavailable what="Генерация вопросов" />
  );

  if (data.questions.length === 0) {
    return (
      <div className="space-y-5">
        <EmptyState
          title="Вопросов по этой теме пока нет"
          description="Сгенерируйте вопросы через AI ниже или добавьте их в seed-файлы (см. README)."
          action={<ButtonLink to="/roadmap">К роадмапу</ButtonLink>}
        />
        <Card>{generator}</Card>
      </div>
    );
  }

  const question = data.questions[index];
  if (!question) return null;

  const answeredNow = Object.keys(results).length;
  const stats = data.stats;

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="text-muted">
            Вопрос <span className="font-medium text-fg">{index + 1}</span> из {data.questions.length}
          </span>
          <span className="text-muted">
            Отвечено раньше: <span className="font-medium text-fg">{stats.answered}</span>
          </span>
          <span className="text-muted">
            Точность:{' '}
            <span className="font-medium text-fg">
              {stats.accuracy === null ? '—' : `${Math.round(stats.accuracy * 100)}%`}
            </span>
          </span>
          {answeredNow > 0 ? (
            <span className="text-muted">
              В этой сессии: <span className="font-medium text-fg">{answeredNow}</span>
            </span>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
          >
            ← Назад
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={index >= data.questions.length - 1}
            onClick={() => setIndex(index + 1)}
          >
            Далее →
          </Button>
        </div>
      </Card>

      <div className="flex flex-wrap gap-1.5">
        {data.questions.map((item, itemIndex) => {
          const correct = resolveOutcome(
            results[item.id],
            aiScores[item.id] ?? selfScores[item.id],
            outcomeById.get(item.id),
          );

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setIndex(itemIndex)}
              title={QUESTION_KIND_LABELS[item.kind]}
              className={cn(
                'size-8 rounded-md border text-xs font-medium tabular-nums transition-colors',
                itemIndex === index && 'ring-2 ring-accent ring-offset-2 ring-offset-bg',
                correct === true && 'border-success bg-success-soft text-success',
                correct === false && 'border-danger bg-danger-soft text-danger',
                correct === null && 'border-line text-muted hover:bg-panel-2',
              )}
            >
              {itemIndex + 1}
            </button>
          );
        })}
      </div>

      <QuestionCard
        key={question.id}
        question={question}
        draft={drafts[question.id] ?? EMPTY_DRAFT}
        result={results[question.id]}
        selfScore={selfScores[question.id]}
        aiConfigured={aiConfigured}
        onDraftChange={(draft) => setDrafts({ ...drafts, [question.id]: draft })}
        onChecked={(result) => {
          setResults({ ...results, [question.id]: result });
          setPercent(result.topicPercent);
        }}
        onSelfGraded={(score, percent) => {
          setSelfScores({ ...selfScores, [question.id]: score });
          setPercent(percent);
        }}
        onAiGraded={(score, percent) => {
          setAiScores({ ...aiScores, [question.id]: score });
          setPercent(percent);
        }}
      />

      {results[question.id] && index < data.questions.length - 1 ? (
        <div className="flex justify-end">
          <Button onClick={() => setIndex(index + 1)}>Следующий вопрос →</Button>
        </div>
      ) : null}

      <details className="rounded-xl border border-line bg-panel p-4">
        <summary className="cursor-pointer text-sm font-medium text-fg">
          Добавить вопросы через AI
        </summary>
        <div className="mt-3">{generator}</div>
      </details>
    </div>
  );
}
