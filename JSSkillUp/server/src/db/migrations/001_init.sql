-- Роадмап -----------------------------------------------------------------
CREATE TABLE stages (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL,
  icon        TEXT NOT NULL DEFAULT ''
);

CREATE TABLE topics (
  id                TEXT PRIMARY KEY,
  stage_id          TEXT NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  slug              TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  summary           TEXT NOT NULL DEFAULT '',
  order_index       INTEGER NOT NULL,
  estimated_minutes INTEGER NOT NULL DEFAULT 60
);
CREATE INDEX idx_topics_stage ON topics(stage_id, order_index);

CREATE TABLE subtopics (
  id          TEXT PRIMARY KEY,
  topic_id    TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  order_index INTEGER NOT NULL
);
CREATE INDEX idx_subtopics_topic ON subtopics(topic_id, order_index);

CREATE TABLE theory (
  id          TEXT PRIMARY KEY,
  topic_id    TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  subtopic_id TEXT REFERENCES subtopics(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  body_md     TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  source      TEXT NOT NULL DEFAULT 'seed' CHECK (source IN ('seed', 'ai')),
  read_at     TEXT
);
CREATE INDEX idx_theory_topic ON theory(topic_id, order_index);

-- Прогресс ----------------------------------------------------------------
CREATE TABLE topic_progress (
  topic_id         TEXT PRIMARY KEY REFERENCES topics(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'not_started'
                     CHECK (status IN ('not_started', 'in_progress', 'learned', 'review')),
  manual_percent   INTEGER CHECK (manual_percent BETWEEN 0 AND 100),
  computed_percent INTEGER NOT NULL DEFAULT 0,
  notes            TEXT NOT NULL DEFAULT '',
  updated_at       TEXT NOT NULL
);

-- Активность по дням: источник данных для streak.
CREATE TABLE daily_activity (
  day       TEXT PRIMARY KEY,
  questions INTEGER NOT NULL DEFAULT 0,
  tasks     INTEGER NOT NULL DEFAULT 0,
  cards     INTEGER NOT NULL DEFAULT 0,
  minutes   INTEGER NOT NULL DEFAULT 0
);

-- Вопросы -----------------------------------------------------------------
CREATE TABLE questions (
  id                   TEXT PRIMARY KEY,
  topic_id             TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  subtopic_id          TEXT REFERENCES subtopics(id) ON DELETE SET NULL,
  kind                 TEXT NOT NULL CHECK (kind IN ('mc', 'output', 'open')),
  difficulty           TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  prompt_md            TEXT NOT NULL,
  code                 TEXT,
  options_json         TEXT,
  correct_json         TEXT,
  expected_output_json TEXT,
  explanation_md       TEXT NOT NULL DEFAULT '',
  reference_answer_md  TEXT,
  rubric_json          TEXT,
  tags_json            TEXT NOT NULL DEFAULT '[]',
  source               TEXT NOT NULL DEFAULT 'seed' CHECK (source IN ('seed', 'ai')),
  created_at           TEXT NOT NULL
);
CREATE INDEX idx_questions_topic ON questions(topic_id, kind);

CREATE TABLE question_attempts (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id      TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_json      TEXT NOT NULL,
  is_correct       INTEGER,
  ai_score         REAL,
  ai_feedback_json TEXT,
  created_at       TEXT NOT NULL
);
CREATE INDEX idx_question_attempts_question ON question_attempts(question_id, created_at DESC);

-- Задачи ------------------------------------------------------------------
CREATE TABLE tasks (
  id                TEXT PRIMARY KEY,
  topic_id          TEXT REFERENCES topics(id) ON DELETE SET NULL,
  slug              TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  kind              TEXT NOT NULL CHECK (kind IN ('algo', 'react', 'review')),
  difficulty        TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  statement_md      TEXT NOT NULL,
  starter_code      TEXT NOT NULL DEFAULT '',
  solution_code     TEXT NOT NULL DEFAULT '',
  solution_notes_md TEXT NOT NULL DEFAULT '',
  language          TEXT NOT NULL DEFAULT 'ts' CHECK (language IN ('js', 'ts', 'tsx')),
  runtime           TEXT NOT NULL DEFAULT 'worker' CHECK (runtime IN ('worker', 'preview', 'none')),
  time_limit_ms     INTEGER NOT NULL DEFAULT 2000,
  tags_json         TEXT NOT NULL DEFAULT '[]',
  source            TEXT NOT NULL DEFAULT 'seed' CHECK (source IN ('seed', 'ai')),
  created_at        TEXT NOT NULL
);
CREATE INDEX idx_tasks_kind ON tasks(kind, difficulty);
CREATE INDEX idx_tasks_topic ON tasks(topic_id);

CREATE TABLE task_tests (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id     TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  visibility  TEXT NOT NULL DEFAULT 'visible' CHECK (visibility IN ('visible', 'hidden')),
  code        TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_task_tests_task ON task_tests(task_id, order_index);

CREATE TABLE task_hints (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  level   INTEGER NOT NULL,
  body_md TEXT NOT NULL,
  UNIQUE (task_id, level)
);

CREATE TABLE task_attempts (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id        TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  code           TEXT NOT NULL,
  passed         INTEGER NOT NULL DEFAULT 0,
  total          INTEGER NOT NULL DEFAULT 0,
  results_json   TEXT NOT NULL DEFAULT '[]',
  duration_ms    INTEGER NOT NULL DEFAULT 0,
  ai_review_json TEXT,
  created_at     TEXT NOT NULL
);
CREATE INDEX idx_task_attempts_task ON task_attempts(task_id, created_at DESC);

-- Флеш-карточки (SM-2) ----------------------------------------------------
CREATE TABLE flashcards (
  id         TEXT PRIMARY KEY,
  topic_id   TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  front_md   TEXT NOT NULL,
  back_md    TEXT NOT NULL,
  tags_json  TEXT NOT NULL DEFAULT '[]',
  source     TEXT NOT NULL DEFAULT 'seed' CHECK (source IN ('seed', 'ai')),
  created_at TEXT NOT NULL
);
CREATE INDEX idx_flashcards_topic ON flashcards(topic_id);

CREATE TABLE card_state (
  card_id          TEXT PRIMARY KEY REFERENCES flashcards(id) ON DELETE CASCADE,
  ease             REAL NOT NULL DEFAULT 2.5,
  interval_days    INTEGER NOT NULL DEFAULT 0,
  repetitions      INTEGER NOT NULL DEFAULT 0,
  lapses           INTEGER NOT NULL DEFAULT 0,
  due_date         TEXT NOT NULL,
  last_grade       INTEGER,
  last_reviewed_at TEXT
);
CREATE INDEX idx_card_state_due ON card_state(due_date);

CREATE TABLE card_reviews (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id       TEXT NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  grade         INTEGER NOT NULL,
  interval_days INTEGER NOT NULL,
  reviewed_at   TEXT NOT NULL
);
CREATE INDEX idx_card_reviews_card ON card_reviews(card_id, reviewed_at DESC);

-- Mock interview ----------------------------------------------------------
CREATE TABLE interview_sessions (
  id              TEXT PRIMARY KEY,
  format          TEXT NOT NULL,
  started_at      TEXT NOT NULL,
  ended_at        TEXT,
  planned_minutes INTEGER NOT NULL DEFAULT 45,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'finished', 'aborted')),
  report_json     TEXT
);
CREATE INDEX idx_interview_sessions_started ON interview_sessions(started_at DESC);

CREATE TABLE interview_turns (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('interviewer', 'candidate', 'system')),
  content    TEXT NOT NULL,
  code       TEXT,
  topic_id   TEXT REFERENCES topics(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_interview_turns_session ON interview_turns(session_id, id);

-- Служебное ---------------------------------------------------------------
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE ai_generations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  kind       TEXT NOT NULL,
  topic_id   TEXT REFERENCES topics(id) ON DELETE SET NULL,
  model      TEXT NOT NULL,
  status     TEXT NOT NULL,
  error      TEXT,
  created_at TEXT NOT NULL
);
