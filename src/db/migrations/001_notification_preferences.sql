CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  push_token TEXT,
  notify_on_leaderboard INTEGER NOT NULL DEFAULT 1,
  notify_on_new_quests INTEGER NOT NULL DEFAULT 1
);
