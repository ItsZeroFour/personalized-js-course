-- Mock interview: тип хода интервьюера и метаданные реплики
-- (задача для live-coding у интервьюера, скрытая оценка ответа у кандидата).
ALTER TABLE interview_turns ADD COLUMN kind TEXT;
ALTER TABLE interview_turns ADD COLUMN meta_json TEXT;
