CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  actor_user_id TEXT REFERENCES users(id),
  at INTEGER NOT NULL,
  payload TEXT NOT NULL
);
