CREATE TABLE IF NOT EXISTS booking_locks (
  unit_start_utc TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  slot_id TEXT NOT NULL,
  request_kind TEXT NOT NULL,
  email TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_locks_expires_at ON booking_locks (expires_at);
CREATE INDEX IF NOT EXISTS idx_booking_locks_request_id ON booking_locks (request_id);
