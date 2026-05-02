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

app.use('/api/services', servicesRouter);
app.use('/api/barbers', barbersRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/admin', adminRouter);

app.use(errorHandler);

runSeed();
startCompletionJob();

app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
});
