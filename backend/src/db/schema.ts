import type Database from 'better-sqlite3';

export function runSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS barbers (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      name   TEXT    NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS services (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT    NOT NULL,
      duration_min INTEGER NOT NULL,
      price_cents  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      barber_id      INTEGER NOT NULL REFERENCES barbers(id),
      service_id     INTEGER NOT NULL REFERENCES services(id),
      customer_name  TEXT    NOT NULL,
      customer_phone TEXT    NOT NULL,
      date           TEXT    NOT NULL,
      start_time     TEXT    NOT NULL,
      end_time       TEXT    NOT NULL,
      status         TEXT    NOT NULL DEFAULT 'scheduled',
      created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admins (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_appt_barber_date
      ON appointments(barber_id, date);

    CREATE INDEX IF NOT EXISTS idx_appt_status
      ON appointments(status);

    CREATE INDEX IF NOT EXISTS idx_appt_date_end
      ON appointments(date, end_time);
  `);
}
