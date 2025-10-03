CREATE TABLE IF NOT EXISTS completions (
  id TEXT PRIMARY KEY,
  card_instance_id TEXT NOT NULL UNIQUE REFERENCES card_instances(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  completed_at INTEGER NOT NULL,
  proof_note TEXT,
  proof_photo_url TEXT,
  points_awarded INTEGER NOT NULL,
  streaks_awarded TEXT
);
