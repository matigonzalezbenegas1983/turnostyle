import { Router, Request, Response } from 'express';
import { getDb } from '../db/database';
import { isSlotAvailable, calcEndTime } from '../utils/slots';
import { todayDate, nowTime } from '../utils/timeUtils';

const router = Router();

function enrichAppointment(appt: Record<string, unknown>) {
  const db = getDb();
  const barber = db.prepare('SELECT name FROM barbers WHERE id = ?').get(appt.barber_id) as { name: string } | undefined;
  const service = db.prepare('SELECT name, duration_min, price_cents FROM services WHERE id = ?').get(appt.service_id) as
    | { name: string; duration_min: number; price_cents: number }
    | undefined;
  return { ...appt, barberName: barber?.name, serviceName: service?.name, serviceDuration: service?.duration_min };
}

router.post('/', (req: Request, res: Response) => {
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

  const db = getDb();
  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId) as
    | { id: number; duration_min: number }
    | undefined;
  if (!service) {
    res.status(404).json({ error: 'Servicio no encontrado' });
    return;
  }

  const createAppt = db.transaction(() => {
    if (!isSlotAvailable(Number(barberId), date, startTime, service.duration_min)) {
      return null;
    }
    const endTime = calcEndTime(startTime, service.duration_min);
    const result = db
      .prepare(
        `INSERT INTO appointments (barber_id, service_id, customer_name, customer_phone, date, start_time, end_time)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(barberId, serviceId, customerName.trim(), customerPhone.trim(), date, startTime, endTime);
    return db.prepare('SELECT * FROM appointments WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>;
  });

  const appt = createAppt();
  if (!appt) {
    res.status(409).json({ error: 'El turno ya no está disponible' });
    return;
  }
  res.status(201).json(enrichAppointment(appt));
});

router.get('/:id', (req: Request, res: Response) => {
  const appt = getDb()
    .prepare('SELECT * FROM appointments WHERE id = ?')
    .get(req.params.id) as Record<string, unknown> | undefined;
  if (!appt) {
    res.status(404).json({ error: 'Turno no encontrado' });
    return;
  }
  res.json(enrichAppointment(appt));
});

router.post('/lookup', (req: Request, res: Response) => {
  const { phone } = req.body as { phone: string };
  if (!phone) {
    res.status(400).json({ error: 'phone es requerido' });
    return;
  }
  const appointments = getDb()
    .prepare(
      `SELECT * FROM appointments
       WHERE customer_phone = ? AND status = 'scheduled'
       ORDER BY date ASC, start_time ASC`
    )
    .all(phone.trim()) as Record<string, unknown>[];
  res.json(appointments.map(enrichAppointment));
});

router.patch('/:id/cancel', (req: Request, res: Response) => {
  const { phone } = req.body as { phone: string };
  const db = getDb();
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id) as
    | { id: number; customer_phone: string; status: string; date: string; start_time: string }
    | undefined;

  if (!appt) {
    res.status(404).json({ error: 'Turno no encontrado' });
    return;
  }
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
  db.prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ?").run(appt.id);
  res.json({ message: 'Turno cancelado' });
});

router.patch('/:id/reschedule', (req: Request, res: Response) => {
  const { phone, barberId, serviceId, date, startTime } = req.body as {
    phone: string;
    barberId: number;
    serviceId: number;
    date: string;
    startTime: string;
  };

  const db = getDb();
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id) as
    | { id: number; customer_name: string; customer_phone: string; status: string; date: string; start_time: string }
    | undefined;

  if (!appt) {
    res.status(404).json({ error: 'Turno no encontrado' });
    return;
  }
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

  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId) as
    | { id: number; duration_min: number }
    | undefined;
  if (!service) {
    res.status(404).json({ error: 'Servicio no encontrado' });
    return;
  }

  const reschedule = db.transaction(() => {
    if (!isSlotAvailable(Number(barberId), date, startTime, service.duration_min, appt.id)) {
      return null;
    }
    const endTime = calcEndTime(startTime, service.duration_min);
    db.prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ?").run(appt.id);
    const result = db
      .prepare(
        `INSERT INTO appointments (barber_id, service_id, customer_name, customer_phone, date, start_time, end_time)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(barberId, serviceId, appt.customer_name, appt.customer_phone, date, startTime, endTime);
    return db.prepare('SELECT * FROM appointments WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>;
  });

  const newAppt = reschedule();
  if (!newAppt) {
    res.status(409).json({ error: 'El nuevo horario no está disponible' });
    return;
  }
  res.json(enrichAppointment(newAppt));
});

export default router;
