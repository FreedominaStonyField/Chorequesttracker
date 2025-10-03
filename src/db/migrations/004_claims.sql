CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  card_instance_id TEXT NOT NULL REFERENCES card_instances(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  claimed_at INTEGER NOT NULL,
  expires_at INTEGER
);
