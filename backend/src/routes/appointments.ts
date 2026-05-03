import { Router, Request, Response } from 'express';
import type { PoolClient } from 'pg';
import { getPool } from '../db/database';
import { isSlotAvailableFromRows, calcEndTime } from '../utils/slots';
import { todayDate, nowTime } from '../utils/timeUtils';

const router = Router();

async function enrichAppointment(appt: Record<string, unknown>): Promise<Record<string, unknown>> {
  const pool = getPool();
  const [barberRes, serviceRes] = await Promise.all([
    pool.query('SELECT name FROM barbers WHERE id = $1', [appt.barber_id]),
    pool.query('SELECT name, duration_min, price_cents FROM services WHERE id = $1', [appt.service_id]),
  ]);
  return {
    ...appt,
    barberName: barberRes.rows[0]?.name,
    serviceName: serviceRes.rows[0]?.name,
    serviceDuration: serviceRes.rows[0]?.duration_min,
  };
}

router.post('/', async (req: Request, res: Response) => {
  const { barberId, serviceId, customerName, customerPhone, date, startTime } = req.body as {
    barberId: number;
    serviceId: number;
    customerName: string;
    customerPhone: string;
    date: string;
    startTime: string;
  };

  if (!barberId || !serviceId || !customerName || !customerPhone || !date || !startTime) {
    res.status(400).json({ error: 'Todos los campos son requeridos' });
    return;
  }

  const pool = getPool();
  const serviceRes = await pool.query('SELECT * FROM services WHERE id = $1', [serviceId]);
  if (serviceRes.rows.length === 0) {
    res.status(404).json({ error: 'Servicio no encontrado' });
    return;
  }
  const service = serviceRes.rows[0] as { id: number; duration_min: number };

  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingRes = await client.query(
      `SELECT start_time, end_time FROM appointments
       WHERE barber_id = $1 AND date = $2 AND status = 'scheduled'`,
      [barberId, date]
    );

    if (!isSlotAvailableFromRows(existingRes.rows, date, startTime, service.duration_min)) {
      await client.query('ROLLBACK');
      res.status(409).json({ error: 'El turno ya no está disponible' });
      return;
    }

    const endTime = calcEndTime(startTime, service.duration_min);
    const result = await client.query(
      `INSERT INTO appointments
         (barber_id, service_id, customer_name, customer_phone, date, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [barberId, serviceId, customerName.trim(), customerPhone.trim(), date, startTime, endTime]
    );

    await client.query('COMMIT');
    res.status(201).json(await enrichAppointment(result.rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM appointments WHERE id = $1', [req.params.id]);
  if (rows.length === 0) {
    res.status(404).json({ error: 'Turno no encontrado' });
    return;
  }
  res.json(await enrichAppointment(rows[0]));
});

router.post('/lookup', async (req: Request, res: Response) => {
  const { phone } = req.body as { phone: string };
  if (!phone) {
    res.status(400).json({ error: 'phone es requerido' });
    return;
  }
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT * FROM appointments
     WHERE customer_phone = $1 AND status = 'scheduled'
     ORDER BY date ASC, start_time ASC`,
    [phone.trim()]
  );
  const enriched = await Promise.all(rows.map(r => enrichAppointment(r)));
  res.json(enriched);
});

router.patch('/:id/cancel', async (req: Request, res: Response) => {
  const { phone } = req.body as { phone: string };
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM appointments WHERE id = $1', [req.params.id]);
  if (rows.length === 0) {
    res.status(404).json({ error: 'Turno no encontrado' });
    return;
  }
  const appt = rows[0] as { id: number; customer_phone: string; status: string; date: string; start_time: string };

  if (appt.customer_phone !== phone?.trim()) {
    res.status(403).json({ error: 'Teléfono incorrecto' });
    return;
  }
  if (appt.status !== 'scheduled') {
    res.status(409).json({ error: 'El turno no puede cancelarse' });
    return;
  }
  const now = todayDate();
  if (appt.date < now || (appt.date === now && appt.start_time <= nowTime())) {
    res.status(409).json({ error: 'No se puede cancelar un turno que ya comenzó' });
    return;
  }
  await pool.query("UPDATE appointments SET status = 'cancelled' WHERE id = $1", [appt.id]);
  res.json({ message: 'Turno cancelado' });
});

router.patch('/:id/reschedule', async (req: Request, res: Response) => {
  const { phone, barberId, serviceId, date, startTime } = req.body as {
    phone: string;
    barberId: number;
    serviceId: number;
    date: string;
    startTime: string;
  };

  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM appointments WHERE id = $1', [req.params.id]);
  if (rows.length === 0) {
    res.status(404).json({ error: 'Turno no encontrado' });
    return;
  }
  const appt = rows[0] as {
    id: number; customer_name: string; customer_phone: string;
    status: string; date: string; start_time: string;
  };

  if (appt.customer_phone !== phone?.trim()) {
    res.status(403).json({ error: 'Teléfono incorrecto' });
    return;
  }
  if (appt.status !== 'scheduled') {
    res.status(409).json({ error: 'El turno no puede modificarse' });
    return;
  }
  const now = todayDate();
  if (appt.date < now || (appt.date === now && appt.start_time <= nowTime())) {
    res.status(409).json({ error: 'No se puede modificar un turno que ya comenzó' });
    return;
  }

  const serviceRes = await pool.query('SELECT * FROM services WHERE id = $1', [serviceId]);
  if (serviceRes.rows.length === 0) {
    res.status(404).json({ error: 'Servicio no encontrado' });
    return;
  }
  const service = serviceRes.rows[0] as { id: number; duration_min: number };

  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingRes = await client.query(
      `SELECT start_time, end_time FROM appointments
       WHERE barber_id = $1 AND date = $2 AND status = 'scheduled' AND id != $3`,
      [barberId, date, appt.id]
    );

    if (!isSlotAvailableFromRows(existingRes.rows, date, startTime, service.duration_min)) {
      await client.query('ROLLBACK');
      res.status(409).json({ error: 'El nuevo horario no está disponible' });
      return;
    }

    const endTime = calcEndTime(startTime, service.duration_min);
    await client.query("UPDATE appointments SET status = 'cancelled' WHERE id = $1", [appt.id]);
    const result = await client.query(
      `INSERT INTO appointments
         (barber_id, service_id, customer_name, customer_phone, date, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [barberId, serviceId, appt.customer_name, appt.customer_phone, date, startTime, endTime]
    );

    await client.query('COMMIT');
    res.json(await enrichAppointment(result.rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

export default router;
