import { Link } from 'react-router-dom';
import type { InterviewReport } from '@jsskillup/shared';
import { Card, CardHeader } from '@/components/ui/Card';
import { Markdown } from '@/components/ui/Markdown';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ScoreBadge } from '@/components/ai/AiPanels';

function Bullets({ items, marker }: { items: string[]; marker: string }) {
  if (items.length === 0) return <p className="text-sm text-muted">—</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm text-fg/90">
          <span className={marker}>•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function ReportView({ report }: { report: InterviewReport }) {
  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center gap-5">
        <div className="scale-125 px-2">
          <ScoreBadge score={report.overallScore} />
        </div>
        <div className="min-w-60 flex-1">
          <p className="text-base font-semibold text-fg">{report.verdict}</p>
          <p className="mt-1 text-xs text-muted">
            {report.durationMinutes} мин · ответов: {report.answers}
          </p>
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader title="Сильные стороны" />
          <Bullets items={report.strengths} marker="text-success" />
        </Card>
        <Card>
          <CardHeader title="Слабые стороны" />
          <Bullets items={report.weaknesses} marker="text-danger" />
        </Card>
      </div>

      {report.topicScores.length > 0 ? (
        <Card>
          <CardHeader title="Оценки по темам" />
          <ul className="space-y-4">
            {report.topicScores.map((item) => (
              <li key={`${item.topicTitle}-${item.slug ?? ''}`} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  {item.slug ? (
                    <Link to={`/topic/${item.slug}`} className="text-sm font-medium text-fg hover:text-accent">
                      {item.topicTitle}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-fg">{item.topicTitle}</span>
                  )}
                  <span className="text-sm font-semibold tabular-nums text-fg">
                    {Math.round(item.score * 10) / 10}/10
                  </span>
                </div>
                <ProgressBar percent={item.score * 10} size="sm" />
                {item.comment ? <p className="text-xs text-muted">{item.comment}</p> : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {report.topicsToReview.length > 0 ? (
        <Card>
          <CardHeader
            title="Помечено «повторить» в роадмапе"
            subtitle="Эти темы появятся в слабых темах на дашборде"
          />
          <ul className="flex flex-wrap gap-2">
            {report.topicsToReview.map((topic) => (
              <li key={topic.topicId}>
                <Link
                  to={`/topic/${topic.slug}`}
                  className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm text-fg transition-colors hover:bg-panel-2"
                >
                  {topic.title}
                  <StatusBadge status="review" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {report.advice ? (
        <Card>
          <CardHeader title="Что делать дальше" />
          <Markdown compact>{report.advice}</Markdown>
        </Card>
      ) : null}
    </div>
  );
}
