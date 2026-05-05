import type { Pool } from 'pg';

export async function runSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS barbers (
      id     SERIAL PRIMARY KEY,
      name   TEXT   NOT NULL,
      active INT    NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS services (
      id           SERIAL PRIMARY KEY,
      name         TEXT   NOT NULL,
      duration_min INT    NOT NULL,
      price_cents  INT    NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id             SERIAL PRIMARY KEY,
      barber_id      INT  NOT NULL REFERENCES barbers(id),
      service_id     INT  NOT NULL REFERENCES services(id),
      customer_name  TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      date           TEXT NOT NULL,
      start_time     TEXT NOT NULL,
      end_time       TEXT NOT NULL,
      status         TEXT NOT NULL DEFAULT 'scheduled',
      created_at     TEXT NOT NULL DEFAULT to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    );

    CREATE TABLE IF NOT EXISTS admins (
      id            SERIAL PRIMARY KEY,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_appt_barber_date
      ON appointments(barber_id, date);

    CREATE INDEX IF NOT EXISTS idx_appt_status
      ON appointments(status);

    CREATE INDEX IF NOT EXISTS idx_appt_date_end
      ON appointments(date, end_time);
  `);

  // Agrega columnas de recordatorio WhatsApp (idempotente)
  await pool.query(`
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_30_sent BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_15_sent BOOLEAN NOT NULL DEFAULT FALSE;
  `);
}
