import type { ComponentProps } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { cn } from '@/lib/cn';
import './markdown.css';

// rehype-highlight тянет common-набор грамматик highlight.js целиком: сузить его
// опцией `languages` не выходит, потому что `common` всё равно попадает в граф импортов.
// Для локального приложения это приемлемо; цвета подсветки заданы в markdown.css.
type MarkdownPlugins = ComponentProps<typeof ReactMarkdown>['rehypePlugins'];

const REHYPE_PLUGINS: MarkdownPlugins = [rehypeHighlight];
const REMARK_PLUGINS: MarkdownPlugins = [remarkGfm];

interface MarkdownProps {
  children: string;
  className?: string;
  /** Компактный режим — для карточек и коротких пояснений. */
  compact?: boolean;
}

export function Markdown({ children, className, compact = false }: MarkdownProps) {
  return (
    <div className={cn('md', compact && 'md--compact', className)}>
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
