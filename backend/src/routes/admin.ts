import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool } from '../db/database';
import { requireAuth } from '../middleware/auth';
import { sendCancellation, sendClosedBroadcast } from '../services/whatsapp';
import { todayDate } from '../utils/timeUtils';

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
  const appt = rows[0] as { id: number; status: string; customer_name: string; customer_phone: string; date: string; start_time: string; end_time: string };
  if (appt.status !== 'scheduled') {
    res.status(409).json({ error: 'Solo se pueden cancelar turnos programados' });
    return;
  }
  await pool.query("UPDATE appointments SET status = 'cancelled' WHERE id = $1", [appt.id]);
  // Aviso WhatsApp (fire-and-forget)
  sendCancellation(appt).catch(() => { /* ya logueado en whatsapp.ts */ });
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

/**
 * POST /api/admin/notify-closed
 * Avisa por WhatsApp a todos los clientes con turnos hoy que la barbería no abrirá.
 * Cancela todos esos turnos automáticamente.
 * Body opcional: { date: "YYYY-MM-DD" } — por defecto usa hoy.
 */
router.post('/notify-closed', requireAuth, async (req: Request, res: Response) => {
  const pool = getPool();
  const targetDate = (req.body as { date?: string }).date ?? todayDate();

  // Traer todos los turnos programados para ese día (con nombres de servicio y barbero)
  const { rows } = await pool.query(
    `SELECT a.id, a.customer_name, a.customer_phone,
            a.date, a.start_time, a.end_time,
            s.name AS service_name, b.name AS barber_name
     FROM appointments a
     JOIN services s ON s.id = a.service_id
     JOIN barbers  b ON b.id = a.barber_id
     WHERE a.status = 'scheduled' AND a.date = $1
     ORDER BY a.start_time ASC`,
    [targetDate]
  );

  if (rows.length === 0) {
    res.json({ message: 'No hay turnos programados para ese día.', sent: 0, cancelled: 0 });
    return;
  }

  // Cancelar todos en la BD
  await pool.query(
    `UPDATE appointments SET status = 'cancelled'
     WHERE status = 'scheduled' AND date = $1`,
    [targetDate]
  );

  // Enviar broadcast WhatsApp y contar enviados
  const sent = await sendClosedBroadcast(rows);

  res.json({
    message: `Aviso de cierre enviado. ${rows.length} turno(s) cancelado(s), ${sent} mensaje(s) enviado(s).`,
    cancelled: rows.length,
    sent,
  });
});

export default router;
