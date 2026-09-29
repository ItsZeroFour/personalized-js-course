import { useState } from 'react';
import type { TheoryArticle } from '@jsskillup/shared';
import { api, ApiRequestError } from '@/api/client';
import { useApi } from '@/lib/useApi';
import { Card } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Markdown } from '@/components/ui/Markdown';
import { EmptyState, ErrorState, Loading } from '@/components/ui/States';
import { useTopic } from './TopicLayout';

/** Оглавление по заголовкам второго уровня — чтобы длинная статья не терялась. */
function TableOfContents({ bodyMd }: { bodyMd: string }) {
  const headings = [...bodyMd.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1]?.trim() ?? '');
  if (headings.length < 3) return null;

  return (
    <Card className="sticky top-6">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Содержание</p>
      <ol className="space-y-1.5">
        {headings.map((heading, index) => (
          <li key={heading} className="flex gap-2 text-sm">
            <span className="tabular-nums text-muted">{index + 1}.</span>
            <span className="text-fg/80">{heading}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function Article({
  article,
  onRead,
}: {
  article: TheoryArticle;
  onRead: (article: TheoryArticle, percent: number) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleRead = async (): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      const result = await api.markRead(article.id, article.readAt === null);
      onRead(result.article, result.topicPercent);
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const isRead = article.readAt !== null;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <Card className="order-2 lg:order-1">
        <Markdown>{article.bodyMd}</Markdown>

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-5">
          <Button
            variant={isRead ? 'secondary' : 'primary'}
            disabled={saving}
            onClick={() => void toggleRead()}
          >
            {isRead ? '✓ Прочитано — снять отметку' : 'Отметить прочитанным'}
          </Button>
          {isRead ? (
            <span className="text-xs text-muted">
              Отмечено {new Date(article.readAt ?? '').toLocaleDateString('ru-RU')}
            </span>
          ) : (
            <span className="text-xs text-muted">Отметка засчитывается в прогресс темы</span>
          )}
          {error ? <span className="text-sm text-danger">{error}</span> : null}
        </div>
      </Card>

      <aside className="order-1 lg:order-2">
        <TableOfContents bodyMd={article.bodyMd} />
      </aside>
    </div>
  );
}

export function TopicTheory() {
  const { topic, setPercent } = useTopic();
  const { data, error, loading, reload } = useApi(api.theory, topic.slug);
  const [articles, setArticles] = useState<TheoryArticle[] | null>(null);

  if (loading) return <Loading label="Загружаем теорию" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const list = articles ?? data.articles;

  if (list.length === 0) {
    return (
      <EmptyState
        title="Теории по этой теме пока нет"
        description="Статья добавляется файлом server/src/seed/theory/<slug темы>.md и подхватывается при старте сервера."
        action={<ButtonLink to="/roadmap">К роадмапу</ButtonLink>}
      />
    );
  }

  const handleRead = (updated: TheoryArticle, percent: number): void => {
    setArticles(list.map((item) => (item.id === updated.id ? updated : item)));
    setPercent(percent);
  };

  return (
    <div className="space-y-8">
      {list.map((article) => (
        <Article key={article.id} article={article} onRead={handleRead} />
      ))}
    </div>
  );
}
