CREATE TABLE IF NOT EXISTS user_inventories (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  items TEXT NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  badges TEXT NOT NULL,
  streaks TEXT NOT NULL
);
