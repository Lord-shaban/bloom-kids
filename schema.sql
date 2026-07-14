-- قاعدة بيانات بلوم كيدز — جدول التسجيلات
-- يتنفذ مرة واحدة على D1:
-- npx wrangler d1 execute bloom-kids-db --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  child_name TEXT NOT NULL,
  child_age TEXT NOT NULL,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',   -- new | contacted | confirmed
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_registrations_created ON registrations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations (status);
