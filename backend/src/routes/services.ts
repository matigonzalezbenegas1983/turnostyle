import { Router, Request, Response } from 'express';
import { getPool } from '../db/database';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM services ORDER BY id');
  res.json(rows);
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { name, duration_min, price_cents } = req.body as {
    name: string;
    duration_min: number;
    price_cents: number;
  };
  if (!name || !duration_min) {
    res.status(400).json({ error: 'name y duration_min son requeridos' });
    return;
  }
  const pool = getPool();
  const { rows } = await pool.query(
    'INSERT INTO services (name, duration_min, price_cents) VALUES ($1, $2, $3) RETURNING *',
    [name.trim(), Number(duration_min), Number(price_cents ?? 0)]
  );
  res.status(201).json(rows[0]);
});

router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, duration_min, price_cents } = req.body as {
    name?: string;
    duration_min?: number;
    price_cents?: number;
  };
  const pool = getPool();
  const existing = await pool.query('SELECT * FROM services WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Servicio no encontrado' });
    return;
  }
  const svc = existing.rows[0] as { name: string; duration_min: number; price_cents: number };
  const { rows } = await pool.query(
    'UPDATE services SET name = $1, duration_min = $2, price_cents = $3 WHERE id = $4 RETURNING *',
    [
      name?.trim() ?? svc.name,
      duration_min !== undefined ? Number(duration_min) : svc.duration_min,
      price_cents !== undefined ? Number(price_cents) : svc.price_cents,
      id,
    ]
  );
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const pool = getPool();
  const future = await pool.query(
    `SELECT COUNT(*) AS c FROM appointments
     WHERE service_id = $1 AND status = 'scheduled' AND date >= CURRENT_DATE::text`,
    [id]
  );
  if (parseInt(future.rows[0].c, 10) > 0) {
    res.status(409).json({ error: 'El servicio tiene turnos futuros activos' });
    return;
  }
  await pool.query('DELETE FROM services WHERE id = $1', [id]);
  res.status(204).end();
});

export default router;
