import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

type RootState = Record<string, unknown>;

type ErrorWithCode = NodeJS.ErrnoException & { code?: string };

const PORT = Number.parseInt(process.env.PORT ?? '4000', 10);
const DATA_FILE = process.env.DATA_FILE
  ? path.resolve(process.env.DATA_FILE)
  : path.resolve(process.cwd(), 'data', 'state.json');
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : true;

const app = express();

app.use(
  cors({
    origin: ALLOWED_ORIGINS,
  }),
);
app.use(express.json({ limit: '2mb' }));

const ensureDataDirectory = async () => {
  const directory = path.dirname(DATA_FILE);
  await mkdir(directory, { recursive: true });
};

const isPlainObject = (value: unknown): value is RootState =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readStateFromDisk = async (): Promise<RootState | null> => {
  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isPlainObject(parsed) ? parsed : null;
  } catch (error) {
    const err = error as ErrorWithCode;
    if (err.code === 'ENOENT') {
      return null;
    }
    console.error('Failed to read chore state from disk', error);
    throw error;
  }
};

const writeStateToDisk = async (state: RootState): Promise<void> => {
  await ensureDataDirectory();
  const serialized = `${JSON.stringify(state, null, 2)}\n`;
  await writeFile(DATA_FILE, serialized, 'utf8');
};

const deleteStateFromDisk = async (): Promise<void> => {
  try {
    await rm(DATA_FILE);
  } catch (error) {
    const err = error as ErrorWithCode;
    if (err.code === 'ENOENT') {
      return;
    }
    throw error;
  }
};

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.get('/api/state', async (_request, response) => {
  try {
    const state = await readStateFromDisk();
    if (!state) {
      response.status(204).end();
      return;
    }
    response.json(state);
  } catch (error) {
    console.error('Unable to load persisted state', error);
    response.status(500).json({ message: 'Failed to load state' });
  }
});

app.put('/api/state', async (request, response) => {
  const candidate = request.body as unknown;

  if (!isPlainObject(candidate)) {
    response.status(400).json({ message: 'State payload must be a JSON object' });
    return;
  }

  try {
    await writeStateToDisk(candidate);
    response.status(204).end();
  } catch (error) {
    console.error('Unable to persist state update', error);
    response.status(500).json({ message: 'Failed to save state' });
  }
});

app.delete('/api/state', async (_request, response) => {
  try {
    await deleteStateFromDisk();
    response.status(204).end();
  } catch (error) {
    console.error('Unable to clear stored state', error);
    response.status(500).json({ message: 'Failed to clear state' });
  }
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  console.error('Unhandled server error', error);
  response.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`ChoreQuest API listening on http://localhost:${PORT}`);
});
