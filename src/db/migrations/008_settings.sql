CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY,
  refresh_hour INTEGER NOT NULL,
  week_anchor INTEGER NOT NULL,
  month_anchor INTEGER NOT NULL,
  proof_required_template_ids TEXT NOT NULL
);
