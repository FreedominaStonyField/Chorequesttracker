CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  avatar_emoji TEXT NOT NULL,
  join_date INTEGER NOT NULL,
  is_adult INTEGER NOT NULL,
  pin_hash TEXT NOT NULL
);
