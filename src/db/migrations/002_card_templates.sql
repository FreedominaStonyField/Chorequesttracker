CREATE TABLE IF NOT EXISTS card_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  flavor_text TEXT,
  difficulty TEXT NOT NULL,
  points INTEGER NOT NULL,
  recurrence TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  tags TEXT,
  notes TEXT,
  created_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  week_anchor INTEGER,
  month_anchor INTEGER,
  require_proof INTEGER NOT NULL DEFAULT 0
);
