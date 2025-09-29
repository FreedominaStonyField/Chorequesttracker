import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { StateRepository } from './stateRepository.js';
import type { RootState } from './types.js';

dotenv.config();

const prisma = new PrismaClient();
const repository = new StateRepository(prisma);

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const apiToken = process.env.API_TOKEN;

function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!apiToken) {
    return next();
  }

  const provided = req.header('x-api-key');
  if (provided && provided === apiToken) {
    return next();
  }

  return res.status(401).json({ message: 'Unauthorized' });
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', authenticate);

app.get('/api/state', async (_req, res) => {
  try {
    const state = await repository.load();
    if (!state) {
      return res.status(404).json({ message: 'State not initialized' });
    }
    return res.json(state);
  } catch (error) {
    console.error('Failed to load state', error);
    return res.status(500).json({ message: 'Failed to load state' });
  }
});

app.put('/api/state', async (req, res) => {
  const state = req.body?.state as RootState | undefined;
  if (!state) {
    return res.status(400).json({ message: 'Missing state payload' });
  }

  try {
    await repository.save(state);
    return res.status(204).send();
  } catch (error) {
    console.error('Failed to persist state', error);
    return res.status(500).json({ message: 'Failed to persist state' });
  }
});

app.delete('/api/state', async (_req, res) => {
  try {
    await repository.clear();
    return res.status(204).send();
  } catch (error) {
    console.error('Failed to clear state', error);
    return res.status(500).json({ message: 'Failed to clear state' });
  }
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
