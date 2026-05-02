import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/database';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password) {
    res.status(400).json({ error: 'username y password son requeridos' });
    return;
  }
  const admin = getDb()
    .prepare('SELECT * FROM admins WHERE username = ?')
    .get(username) as { id: number; username: string; password_hash: string } | undefined;

  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    res.status(401).json({ error: 'Credenciales inválidas' });
    return;
  }
  const token = jwt.sign({ sub: admin.id, username: admin.username }, process.env.JWT_SECRET!, {
    expiresIn: '8h',
  });
  res.json({ token, expiresIn: 28800 });
});

router.get('/appointments', requireAuth, (req: Request, res: Response) => {
  const { date } = req.query as { date?: string };
  const targetDate = date ?? new Date().toISOString().slice(0, 10);
  const db = getDb();

  const barbers = db.prepare('SELECT id, name FROM barbers WHERE active = 1 ORDER BY id').all() as {
    id: number;
    name: string;
  }[];

  const result = barbers.map(barber => {
    const appointments = db
      .prepare(
        `SELECT a.*, s.name as service_name, s.duration_min, s.price_cents
         FROM appointments a
         JOIN services s ON s.id = a.service_id
         WHERE a.barber_id = ? AND a.date = ?
         ORDER BY a.start_time ASC`
      )
      .all(barber.id, targetDate);
    return { ...barber, appointments };
  });

  res.json({ date: targetDate, barbers: result });
});

router.patch('/appointments/:id/cancel', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const appt = db
    .prepare('SELECT * FROM appointments WHERE id = ?')
    .get(req.params.id) as { id: number; status: string } | undefined;

  if (!appt) {
    res.status(404).json({ error: 'Turno no encontrado' });
    return;
  }
  if (appt.status !== 'scheduled') {
    res.status(409).json({ error: 'Solo se pueden cancelar turnos programados' });
    return;
  }
  db.prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ?").run(appt.id);
  res.json({ message: 'Turno cancelado' });
});

router.patch('/appointments/:id/complete', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const appt = db
    .prepare('SELECT * FROM appointments WHERE id = ?')
    .get(req.params.id) as { id: number; status: string } | undefined;

  if (!appt) {
    res.status(404).json({ error: 'Turno no encontrado' });
    return;
  }
  db.prepare("UPDATE appointments SET status = 'completed' WHERE id = ?").run(appt.id);
  res.json({ message: 'Turno completado' });
});

export default router;
