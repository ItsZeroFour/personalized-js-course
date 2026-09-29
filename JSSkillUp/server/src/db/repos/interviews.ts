import {
  INTERVIEW_FORMATS,
  INTERVIEW_MOVE_KINDS,
  INTERVIEW_STATUSES,
  TURN_ROLES,
  interviewReportSchema,
  turnMetaSchema,
} from '@jsskillup/shared';
import type {
  InterviewFormat,
  InterviewMoveKind,
  InterviewReport,
  InterviewSession,
  InterviewSessionWithTurns,
  InterviewStatus,
  InterviewTurn,
  TurnMeta,
  TurnRole,
} from '@jsskillup/shared';
import {
  enumColumn,
  execute,
  jsonColumnOrNull,
  num,
  queryAll,
  queryOne,
  str,
  strOrNull,
  transaction,
  type Row,
} from '../client.js';

const SESSION_SELECT = `
  SELECT s.id, s.format, s.started_at, s.ended_at, s.planned_minutes, s.status, s.report_json,
         (SELECT COUNT(*) FROM interview_turns t
            WHERE t.session_id = s.id AND t.role = 'candidate') AS answer_count
  FROM interview_sessions s
`;

function mapSession(row: Row): InterviewSession {
  return {
    id: str(row['id'], 'id'),
    format: enumColumn(row['format'], 'format', INTERVIEW_FORMATS),
    startedAt: str(row['started_at'], 'started_at'),
    endedAt: strOrNull(row['ended_at'], 'ended_at'),
    plannedMinutes: num(row['planned_minutes'], 'planned_minutes'),
    status: enumColumn(row['status'], 'status', INTERVIEW_STATUSES),
    report: jsonColumnOrNull(row['report_json'], 'report_json', interviewReportSchema),
    answerCount: num(row['answer_count'], 'answer_count'),
  };
}

function mapTurn(row: Row): InterviewTurn {
  const kind = strOrNull(row['kind'], 'kind');
  const meta = jsonColumnOrNull(row['meta_json'], 'meta_json', turnMetaSchema);

  return {
    id: num(row['id'], 'id'),
    sessionId: str(row['session_id'], 'session_id'),
    role: enumColumn(row['role'], 'role', TURN_ROLES),
    content: str(row['content'], 'content'),
    code: strOrNull(row['code'], 'code'),
    topicId: strOrNull(row['topic_id'], 'topic_id'),
    kind: kind === null ? null : enumColumn(kind, 'kind', INTERVIEW_MOVE_KINDS),
    codingTask: meta?.codingTask ?? null,
    assessment: meta?.assessment ?? null,
    createdAt: str(row['created_at'], 'created_at'),
  };
}

export function getSession(id: string): InterviewSessionWithTurns | null {
  const session = queryOne(`${SESSION_SELECT} WHERE s.id = ?`, [id], mapSession);
  if (!session) return null;

  const turns = queryAll(
    `SELECT id, session_id, role, content, code, topic_id, kind, meta_json, created_at
     FROM interview_turns WHERE session_id = ? ORDER BY id`,
    [id],
    mapTurn,
  );
  return { ...session, turns };
}

export function listSessions(limit = 50): InterviewSession[] {
  return queryAll(`${SESSION_SELECT} ORDER BY s.started_at DESC LIMIT ?`, [limit], mapSession);
}

export interface NewTurn {
  role: TurnRole;
  content: string;
  code?: string | null;
  topicId?: string | null;
  kind?: InterviewMoveKind | null;
  meta?: TurnMeta | null;
}

function insertTurn(sessionId: string, turn: NewTurn, createdAt: string): void {
  execute(
    `INSERT INTO interview_turns (session_id, role, content, code, topic_id, kind, meta_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sessionId,
      turn.role,
      turn.content,
      turn.code ?? null,
      turn.topicId ?? null,
      turn.kind ?? null,
      turn.meta ? JSON.stringify(turn.meta) : null,
      createdAt,
    ],
  );
}

/** Сессия создаётся вместе с первой репликой интервьюера — пустых сессий в базе не бывает. */
export function createSession(session: {
  id: string;
  format: InterviewFormat;
  plannedMinutes: number;
  startedAt: string;
  firstTurn: NewTurn;
}): void {
  transaction(() => {
    execute(
      `INSERT INTO interview_sessions (id, format, started_at, planned_minutes, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [session.id, session.format, session.startedAt, session.plannedMinutes],
    );
    insertTurn(session.id, session.firstTurn, session.startedAt);
  });
}

/** Ответ кандидата и следующий ход интервьюера пишутся атомарно. */
export function appendTurns(sessionId: string, turns: readonly NewTurn[]): void {
  transaction(() => {
    for (const turn of turns) insertTurn(sessionId, turn, new Date().toISOString());
  });
}

export function closeSession(
  id: string,
  status: Exclude<InterviewStatus, 'active'>,
  report: InterviewReport | null,
): void {
  execute('UPDATE interview_sessions SET status = ?, ended_at = ?, report_json = ? WHERE id = ?', [
    status,
    new Date().toISOString(),
    report ? JSON.stringify(report) : null,
    id,
  ]);
}

export function deleteSession(id: string): boolean {
  const exists = queryOne('SELECT id FROM interview_sessions WHERE id = ?', [id], (row) =>
    str(row['id'], 'id'),
  );
  if (!exists) return false;
  execute('DELETE FROM interview_sessions WHERE id = ?', [id]);
  return true;
}
