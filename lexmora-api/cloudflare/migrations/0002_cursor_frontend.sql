-- Add cursor/frontend history types for existing D1 databases.
-- SQLite cannot ALTER CHECK constraints in place; rebuild history.

CREATE TABLE history_new (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL CHECK (
    type IN (
      'simplify',
      'en_fa',
      'fa_en',
      'term_en',
      'term_fa',
      'refine',
      'symptoms',
      'compare_en',
      'compare_fa',
      'grammar_en',
      'grammar_fa',
      'cursor',
      'frontend'
    )
  ),
  input_text TEXT NOT NULL,
  result_text TEXT NOT NULL,
  model TEXT NOT NULL,
  instruction_key TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  quiz_shown_count INTEGER NOT NULL DEFAULT 0
);

INSERT INTO history_new (
  id, type, input_text, result_text, model, instruction_key, metadata, created_at, quiz_shown_count
)
SELECT
  id, type, input_text, result_text, model, instruction_key, metadata, created_at, quiz_shown_count
FROM history;

DROP TABLE history;
ALTER TABLE history_new RENAME TO history;

CREATE INDEX idx_history_created_at ON history (created_at DESC);
CREATE INDEX idx_history_type ON history (type);
