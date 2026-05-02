import { Router, Request, Response } from 'express';
import { getDb } from '../db/database';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const services = getDb().prepare('SELECT * FROM services ORDER BY id').all();
  res.json(services);
});

router.post('/', requireAuth, (req: Request, res: Response) => {
  const { name, duration_min, price_cents } = req.body as {
    name: string;
    duration_min: number;
    price_cents: number;
  };
  if (!name || !duration_min) {
    res.status(400).json({ error: 'name y duration_min son requeridos' });
    return;
  }
  const result = getDb()
    .prepare('INSERT INTO services (name, duration_min, price_cents) VALUES (?, ?, ?)')
    .run(name.trim(), Number(duration_min), Number(price_cents ?? 0));
  const service = getDb().prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(service);
});

router.patch('/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, duration_min, price_cents } = req.body as {
    name?: string;
    duration_min?: number;
    price_cents?: number;
  };
  const db = getDb();
  const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Servicio no encontrado' });
    return;
  }
  const svc = existing as { name: string; duration_min: number; price_cents: number };
  db.prepare('UPDATE services SET name = ?, duration_min = ?, price_cents = ? WHERE id = ?').run(
    name?.trim() ?? svc.name,
    duration_min !== undefined ? Number(duration_min) : svc.duration_min,
    price_cents !== undefined ? Number(price_cents) : svc.price_cents,
    id
  );
  res.json(db.prepare('SELECT * FROM services WHERE id = ?').get(id));
});

router.delete('/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const future = db
    .prepare(
      `SELECT COUNT(*) as c FROM appointments
       WHERE service_id = ? AND status = 'scheduled' AND date >= date('now')`
    )
    .get(id) as { c: number };
  if (future.c > 0) {
    res.status(409).json({ error: 'El servicio tiene turnos futuros activos' });
    return;
  }
  db.prepare('DELETE FROM services WHERE id = ?').run(id);
  res.status(204).end();
});

export default router;
