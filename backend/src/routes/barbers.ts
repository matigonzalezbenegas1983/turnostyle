import { Router, Request, Response } from 'express';
import { getPool } from '../db/database';
import { getAvailableSlots } from '../utils/slots';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT id, name FROM barbers WHERE active = 1 ORDER BY id'
  );
  res.json(rows);
});

router.get('/:id/slots', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { date, serviceId } = req.query as { date?: string; serviceId?: string };

  if (!date || !serviceId) {
    res.status(400).json({ error: 'date y serviceId son requeridos' });
    return;
  }

  const pool = getPool();
  const serviceRes = await pool.query('SELECT * FROM services WHERE id = $1', [serviceId]);
  if (serviceRes.rows.length === 0) {
    res.status(404).json({ error: 'Servicio no encontrado' });
    return;
  }
  const service = serviceRes.rows[0] as { id: number; duration_min: number };

  const barberRes = await pool.query(
    'SELECT id, name FROM barbers WHERE id = $1 AND active = 1',
    [id]
  );
  if (barberRes.rows.length === 0) {
    res.status(404).json({ error: 'Estilista no encontrado' });
    return;
  }
  const barber = barberRes.rows[0] as { id: number; name: string };

  const slots = await getAvailableSlots(barber.id, date, service.duration_min);
  res.json({ barberId: barber.id, date, serviceDuration: service.duration_min, slots });
});

export default router;
