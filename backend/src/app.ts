import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';

import { runSeed } from './db/seed';
import { startCompletionJob } from './jobs/completionJob';
import { errorHandler } from './middleware/errorHandler';

import servicesRouter from './routes/services';
import barbersRouter from './routes/barbers';
import appointmentsRouter from './routes/appointments';
import adminRouter from './routes/admin';

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

const allowedOrigins = ['http://localhost:5173'];
if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Health check — siempre responde 200, sin tocar la BD
app.get('/', (_req, res) => res.json({ status: 'ok', app: 'TurnoStyle API' }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/services', servicesRouter);
app.use('/api/barbers', barbersRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/admin', adminRouter);

app.use(errorHandler);

// Arranca el servidor primero; luego conecta la BD.
// Así Render ve el servicio como "vivo" aunque la BD tarde en responder.
app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);

  runSeed()
    .then(() => {
      startCompletionJob();
      console.log('Base de datos lista y job iniciado.');
    })
    .catch(err => {
      console.error('ERROR conectando a la base de datos:', err.message);
      console.error('Revisar DATABASE_URL en las variables de entorno de Render.');
    });
});
