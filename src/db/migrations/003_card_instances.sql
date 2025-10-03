CREATE TABLE IF NOT EXISTS card_instances (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES card_templates(id),
  scheduled_for INTEGER NOT NULL,
  status TEXT NOT NULL,
  assigned_to TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER
);
