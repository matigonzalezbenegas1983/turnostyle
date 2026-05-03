import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getPool } from '../db/database';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password) {
    res.status(400).json({ error: 'username y password son requeridos' });
    return;
  }
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
  const admin = rows[0] as { id: number; username: string; password_hash: string } | undefined;

  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    res.status(401).json({ error: 'Credenciales inválidas' });
    return;
  }
  const token = jwt.sign({ sub: admin.id, username: admin.username }, process.env.JWT_SECRET!, {
    expiresIn: '8h',
  });
  res.json({ token, expiresIn: 28800 });
});

router.get('/appointments', requireAuth, async (req: Request, res: Response) => {
  const { date } = req.query as { date?: string };
  const targetDate = date ?? new Date().toISOString().slice(0, 10);
  const pool = getPool();

  const { rows: barbers } = await pool.query(
    'SELECT id, name FROM barbers WHERE active = 1 ORDER BY id'
  );

  const result = await Promise.all(
    (barbers as { id: number; name: string }[]).map(async barber => {
      const { rows: appointments } = await pool.query(
        `SELECT a.*, s.name as service_name, s.duration_min, s.price_cents
         FROM appointments a
         JOIN services s ON s.id = a.service_id
         WHERE a.barber_id = $1 AND a.date = $2
         ORDER BY a.start_time ASC`,
        [barber.id, targetDate]
      );
      return { ...barber, appointments };
    })
  );

  res.json({ date: targetDate, barbers: result });
});

router.patch('/appointments/:id/cancel', requireAuth, async (req: Request, res: Response) => {
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM appointments WHERE id = $1', [req.params.id]);
  if (rows.length === 0) {
    res.status(404).json({ error: 'Turno no encontrado' });
    return;
  }
  const appt = rows[0] as { id: number; status: string };
  if (appt.status !== 'scheduled') {
    res.status(409).json({ error: 'Solo se pueden cancelar turnos programados' });
    return;
  }
  await pool.query("UPDATE appointments SET status = 'cancelled' WHERE id = $1", [appt.id]);
  res.json({ message: 'Turno cancelado' });
});

router.patch('/appointments/:id/complete', requireAuth, async (req: Request, res: Response) => {
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM appointments WHERE id = $1', [req.params.id]);
  if (rows.length === 0) {
    res.status(404).json({ error: 'Turno no encontrado' });
    return;
  }
  const appt = rows[0] as { id: number };
  await pool.query("UPDATE appointments SET status = 'completed' WHERE id = $1", [appt.id]);
  res.json({ message: 'Turno completado' });
});

export default router;
