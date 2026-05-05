import { getPool } from '../db/database';
import { todayDate, nowTime, addMinutes } from '../utils/timeUtils';
import { sendReminder, type ApptInfo } from '../services/whatsapp';

interface ApptRow {
  id: number;
  customer_name: string;
  customer_phone: string;
  date: string;
  start_time: string;
  end_time: string;
  service_name: string;
  barber_name: string;
}

async function tick(): Promise<void> {
  const pool  = getPool();
  const today = todayDate();
  const now   = nowTime();

  // Tiempos objetivo: ahora + 30 min y ahora + 15 min
  const target30 = addMinutes(now, 30);
  const target15 = addMinutes(now, 15);

  // ── Recordatorios de 30 minutos ──────────────────────────────────────────
  const res30 = await pool.query<ApptRow>(
    `SELECT a.id, a.customer_name, a.customer_phone,
            a.date, a.start_time, a.end_time,
            s.name AS service_name, b.name AS barber_name
     FROM appointments a
     JOIN services s ON s.id = a.service_id
     JOIN barbers  b ON b.id = a.barber_id
     WHERE a.status = 'scheduled'
       AND a.date = $1
       AND a.start_time = $2
       AND a.reminder_30_sent = false`,
    [today, target30]
  );

  for (const row of res30.rows) {
    try {
      await sendReminder(row as ApptInfo, 30);
      await pool.query(
        'UPDATE appointments SET reminder_30_sent = true WHERE id = $1',
        [row.id]
      );
      console.log(`[reminderJob] ⏰ Recordatorio 30 min enviado → turno #${row.id}`);
    } catch (err) {
      console.error(`[reminderJob] Error en recordatorio 30 min turno #${row.id}:`, err);
    }
  }

  // ── Recordatorios de 15 minutos ──────────────────────────────────────────
  const res15 = await pool.query<ApptRow>(
    `SELECT a.id, a.customer_name, a.customer_phone,
            a.date, a.start_time, a.end_time,
            s.name AS service_name, b.name AS barber_name
     FROM appointments a
     JOIN services s ON s.id = a.service_id
     JOIN barbers  b ON b.id = a.barber_id
     WHERE a.status = 'scheduled'
       AND a.date = $1
       AND a.start_time = $2
       AND a.reminder_15_sent = false`,
    [today, target15]
  );

  for (const row of res15.rows) {
    try {
      await sendReminder(row as ApptInfo, 15);
      await pool.query(
        'UPDATE appointments SET reminder_15_sent = true WHERE id = $1',
        [row.id]
      );
      console.log(`[reminderJob] ⏰ Recordatorio 15 min enviado → turno #${row.id}`);
    } catch (err) {
      console.error(`[reminderJob] Error en recordatorio 15 min turno #${row.id}:`, err);
    }
  }
}

export function startReminderJob(): void {
  tick().catch(console.error);
  setInterval(() => tick().catch(console.error), 60_000);
  console.log('[reminderJob] Job de recordatorios WhatsApp iniciado (cada 60s).');
}
