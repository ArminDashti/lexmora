-- Lexmora D1 schema (SQLite), effective tables from Postgres migrations 002–005.

CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  openrouter_api_key TEXT NOT NULL DEFAULT '',
  model_name TEXT NOT NULL DEFAULT 'anthropic/claude-3.5-sonnet',
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO app_settings (id) VALUES (1);

CREATE TABLE instructions (
  key TEXT PRIMARY KEY NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE history (
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

CREATE INDEX idx_history_created_at ON history (created_at DESC);
CREATE INDEX idx_history_type ON history (type);
