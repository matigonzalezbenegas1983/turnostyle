import { Router, Request, Response } from 'express';
import { getDb } from '../db/database';
import { getAvailableSlots } from '../utils/slots';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const barbers = getDb()
    .prepare('SELECT id, name FROM barbers WHERE active = 1 ORDER BY id')
    .all();
  res.json(barbers);
});

router.get('/:id/slots', (req: Request, res: Response) => {
  const { id } = req.params;
  const { date, serviceId } = req.query as { date?: string; serviceId?: string };

  if (!date || !serviceId) {
    res.status(400).json({ error: 'date y serviceId son requeridos' });
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

  const barber = db.prepare('SELECT id, name FROM barbers WHERE id = ? AND active = 1').get(id) as
    | { id: number; name: string }
    | undefined;
  if (!barber) {
    res.status(404).json({ error: 'Estilista no encontrado' });
    return;
  }

  const slots = getAvailableSlots(barber.id, date, service.duration_min);
  res.json({ barberId: barber.id, date, serviceDuration: service.duration_min, slots });
});

export default router;
