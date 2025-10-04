CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  avatar_emoji TEXT NOT NULL,
  join_date TEXT NOT NULL,
  is_adult INTEGER,
  pin TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  flavor_text TEXT,
  difficulty TEXT NOT NULL,
  points INTEGER NOT NULL,
  recurrence TEXT NOT NULL,
  active INTEGER NOT NULL,
  tags TEXT NOT NULL,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  week_anchor INTEGER,
  month_anchor INTEGER,
  require_proof INTEGER
);

CREATE TABLE IF NOT EXISTS instances (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  scheduled_for TEXT NOT NULL,
  status TEXT NOT NULL,
  assigned_to TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_instances_template ON instances(template_id);
CREATE INDEX IF NOT EXISTS idx_instances_status ON instances(status);
CREATE INDEX IF NOT EXISTS idx_instances_assigned_to ON instances(assigned_to);

CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  card_instance_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  claimed_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (card_instance_id) REFERENCES instances(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_claims_card_instance ON claims(card_instance_id);
CREATE INDEX IF NOT EXISTS idx_claims_user ON claims(user_id);

CREATE TABLE IF NOT EXISTS completions (
  id TEXT PRIMARY KEY,
  card_instance_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  proof_note TEXT,
  proof_photo_url TEXT,
  streaks_awarded TEXT,
  points_awarded INTEGER NOT NULL,
  FOREIGN KEY (card_instance_id) REFERENCES instances(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_completions_user ON completions(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_instance ON completions(card_instance_id);

CREATE TABLE IF NOT EXISTS inventories (
  user_id TEXT PRIMARY KEY,
  items TEXT NOT NULL,
  total_points INTEGER NOT NULL,
  badges TEXT NOT NULL,
  streaks TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  refresh_hour INTEGER NOT NULL,
  week_anchor INTEGER NOT NULL,
  month_anchor INTEGER NOT NULL,
  proof_required_template_ids TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  entry_type TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  at TEXT NOT NULL,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id TEXT PRIMARY KEY,
  push_token TEXT,
  notify_on_leaderboard INTEGER NOT NULL,
  notify_on_new_quests INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
