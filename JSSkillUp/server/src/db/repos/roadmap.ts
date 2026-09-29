import { TOPIC_STATUSES } from '@jsskillup/shared';
import type { StageWithTopics, Subtopic, TopicWithProgress } from '@jsskillup/shared';
import { enumColumn, num, numOrNull, queryAll, queryOne, str, type Row } from '../client.js';

const TOPIC_SELECT = `
  SELECT
    t.id                                   AS id,
    t.stage_id                             AS stage_id,
    t.slug                                 AS slug,
    t.title                                AS title,
    t.summary                              AS summary,
    t.order_index                          AS order_index,
    t.estimated_minutes                    AS estimated_minutes,
    COALESCE(p.status, 'not_started')      AS status,
    p.manual_percent                       AS manual_percent,
    COALESCE(p.computed_percent, 0)        AS computed_percent,
    COALESCE(p.notes, '')                  AS notes,
    COALESCE(p.updated_at, '')             AS updated_at,
    (SELECT COUNT(*) FROM theory th     WHERE th.topic_id = t.id) AS theory_count,
    (SELECT COUNT(*) FROM questions q   WHERE q.topic_id  = t.id) AS question_count,
    (SELECT COUNT(*) FROM tasks ts      WHERE ts.topic_id = t.id) AS task_count,
    (SELECT COUNT(*) FROM flashcards f  WHERE f.topic_id  = t.id) AS card_count
  FROM topics t
  JOIN stages s ON s.id = t.stage_id
  LEFT JOIN topic_progress p ON p.topic_id = t.id
`;

function mapTopic(row: Row): TopicWithProgress {
  const manualPercent = numOrNull(row['manual_percent'], 'manual_percent');
  const computedPercent = num(row['computed_percent'], 'computed_percent');
  return {
    id: str(row['id'], 'id'),
    stageId: str(row['stage_id'], 'stage_id'),
    slug: str(row['slug'], 'slug'),
    title: str(row['title'], 'title'),
    summary: str(row['summary'], 'summary'),
    orderIndex: num(row['order_index'], 'order_index'),
    estimatedMinutes: num(row['estimated_minutes'], 'estimated_minutes'),
    progress: {
      topicId: str(row['id'], 'id'),
      status: enumColumn(row['status'], 'status', TOPIC_STATUSES),
      manualPercent,
      computedPercent,
      notes: str(row['notes'], 'notes'),
      updatedAt: str(row['updated_at'], 'updated_at'),
    },
    percent: manualPercent ?? computedPercent,
    subtopics: [],
    counts: {
      theory: num(row['theory_count'], 'theory_count'),
      questions: num(row['question_count'], 'question_count'),
      tasks: num(row['task_count'], 'task_count'),
      flashcards: num(row['card_count'], 'card_count'),
    },
  };
}

function mapSubtopic(row: Row): Subtopic {
  return {
    id: str(row['id'], 'id'),
    topicId: str(row['topic_id'], 'topic_id'),
    title: str(row['title'], 'title'),
    orderIndex: num(row['order_index'], 'order_index'),
  };
}

function loadSubtopics(): Map<string, Subtopic[]> {
  const rows = queryAll(
    'SELECT id, topic_id, title, order_index FROM subtopics ORDER BY topic_id, order_index',
    [],
    mapSubtopic,
  );
  const byTopic = new Map<string, Subtopic[]>();
  for (const subtopic of rows) {
    const list = byTopic.get(subtopic.topicId);
    if (list) list.push(subtopic);
    else byTopic.set(subtopic.topicId, [subtopic]);
  }
  return byTopic;
}

function averagePercent(topics: TopicWithProgress[]): number {
  if (topics.length === 0) return 0;
  const sum = topics.reduce((acc, topic) => acc + topic.percent, 0);
  return Math.round(sum / topics.length);
}

export function getRoadmap(): StageWithTopics[] {
  const subtopicsByTopic = loadSubtopics();
  const topics = queryAll(`${TOPIC_SELECT} ORDER BY s.order_index, t.order_index`, [], mapTopic);
  for (const topic of topics) {
    topic.subtopics = subtopicsByTopic.get(topic.id) ?? [];
  }

  const stages = queryAll(
    'SELECT id, title, description, order_index, icon FROM stages ORDER BY order_index',
    [],
    (row) => ({
      id: str(row['id'], 'id'),
      title: str(row['title'], 'title'),
      description: str(row['description'], 'description'),
      orderIndex: num(row['order_index'], 'order_index'),
      icon: str(row['icon'], 'icon'),
    }),
  );

  return stages.map((stage) => {
    const stageTopics = topics.filter((topic) => topic.stageId === stage.id);
    return { ...stage, topics: stageTopics, percent: averagePercent(stageTopics) };
  });
}

export function getTopicBySlug(slug: string): TopicWithProgress | null {
  const topic = queryOne(`${TOPIC_SELECT} WHERE t.slug = ?`, [slug], mapTopic);
  if (!topic) return null;
  topic.subtopics = queryAll(
    'SELECT id, topic_id, title, order_index FROM subtopics WHERE topic_id = ? ORDER BY order_index',
    [topic.id],
    mapSubtopic,
  );
  return topic;
}

export function getTopicById(id: string): TopicWithProgress | null {
  const topic = queryOne(`${TOPIC_SELECT} WHERE t.id = ?`, [id], mapTopic);
  if (!topic) return null;
  topic.subtopics = queryAll(
    'SELECT id, topic_id, title, order_index FROM subtopics WHERE topic_id = ? ORDER BY order_index',
    [topic.id],
    mapSubtopic,
  );
  return topic;
}

export interface TopicNeighbours {
  stage: { id: string; title: string; icon: string };
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}

/** Соседние темы в сквозном порядке роадмапа — для навигации «назад / далее». */
export function getTopicNeighbours(slug: string): TopicNeighbours | null {
  const ordered = queryAll(
    `SELECT t.slug AS slug, t.title AS title, t.stage_id AS stage_id,
            s.title AS stage_title, s.icon AS stage_icon
     FROM topics t JOIN stages s ON s.id = t.stage_id
     ORDER BY s.order_index, t.order_index`,
    [],
    (row) => ({
      slug: str(row['slug'], 'slug'),
      title: str(row['title'], 'title'),
      stageId: str(row['stage_id'], 'stage_id'),
      stageTitle: str(row['stage_title'], 'stage_title'),
      stageIcon: str(row['stage_icon'], 'stage_icon'),
    }),
  );

  const index = ordered.findIndex((item) => item.slug === slug);
  const current = ordered[index];
  if (!current) return null;

  const prev = ordered[index - 1];
  const next = ordered[index + 1];
  return {
    stage: { id: current.stageId, title: current.stageTitle, icon: current.stageIcon },
    prev: prev ? { slug: prev.slug, title: prev.title } : null,
    next: next ? { slug: next.slug, title: next.title } : null,
  };
}
