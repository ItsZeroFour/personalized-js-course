import { CONTENT_SOURCES } from '@jsskillup/shared';
import type { TheoryArticle } from '@jsskillup/shared';
import { enumColumn, execute, num, queryAll, queryOne, str, strOrNull, type Row } from '../client.js';

function mapArticle(row: Row): TheoryArticle {
  return {
    id: str(row['id'], 'id'),
    topicId: str(row['topic_id'], 'topic_id'),
    subtopicId: strOrNull(row['subtopic_id'], 'subtopic_id'),
    title: str(row['title'], 'title'),
    bodyMd: str(row['body_md'], 'body_md'),
    orderIndex: num(row['order_index'], 'order_index'),
    source: enumColumn(row['source'], 'source', CONTENT_SOURCES),
    readAt: strOrNull(row['read_at'], 'read_at'),
  };
}

const SELECT = `
  SELECT id, topic_id, subtopic_id, title, body_md, order_index, source, read_at
  FROM theory
`;

export function getTheoryByTopic(topicId: string): TheoryArticle[] {
  return queryAll(`${SELECT} WHERE topic_id = ? ORDER BY order_index`, [topicId], mapArticle);
}

export function getArticleById(id: string): TheoryArticle | null {
  return queryOne(`${SELECT} WHERE id = ?`, [id], mapArticle);
}

export function setArticleRead(id: string, read: boolean): void {
  execute('UPDATE theory SET read_at = ? WHERE id = ?', [
    read ? new Date().toISOString() : null,
    id,
  ]);
}

export interface TheoryProgress {
  total: number;
  read: number;
}

export function getTheoryProgress(topicId: string): TheoryProgress {
  const row = queryOne(
    `SELECT COUNT(*) AS total, COUNT(read_at) AS read_count FROM theory WHERE topic_id = ?`,
    [topicId],
    (r) => ({ total: num(r['total'], 'total'), read: num(r['read_count'], 'read_count') }),
  );
  return row ?? { total: 0, read: 0 };
}
