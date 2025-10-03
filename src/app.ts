import cors from 'cors';
import express from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { ZodError } from 'zod';

import { config } from './config.js';
import router from './routes/index.js';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'QuestBoard Server API',
      version: '1.0.0'
    },
    servers: [
      { url: 'http://localhost:' + config.port }
    ],
    components: {
      schemas: {
        UserInput: {
          type: 'object',
          required: ['name', 'color', 'avatarEmoji', 'pin'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            color: { type: 'string' },
            avatarEmoji: { type: 'string' },
            joinDate: { type: 'string', format: 'date-time' },
            isAdult: { type: 'boolean' },
            pin: { type: 'string' }
          }
        },
        UserUpdate: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            color: { type: 'string' },
            avatarEmoji: { type: 'string' },
            isAdult: { type: 'boolean' },
            pin: { type: 'string' }
          }
        },
        TemplateInput: {
          type: 'object',
          required: ['title', 'difficulty', 'points', 'recurrence', 'createdBy'],
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            flavorText: { type: 'string' },
            difficulty: { type: 'string', enum: ['easy', 'normal', 'hard', 'boss'] },
            points: { type: 'integer' },
            recurrence: { type: 'string', enum: ['once', 'daily', 'weekly', 'monthly'] },
            active: { type: 'boolean' },
            tags: { type: 'array', items: { type: 'string' } },
            notes: { type: 'string' },
            createdBy: { type: 'string' },
            weekAnchor: { type: 'integer' },
            monthAnchor: { type: 'integer' },
            requireProof: { type: 'boolean' }
          }
        },
        TemplateUpdate: {
          allOf: [
            { $ref: '#/components/schemas/TemplateInput' }
          ]
        },
        CompletionInput: {
          type: 'object',
          properties: {
            proofNote: { type: 'string' },
            proofPhotoUrl: { type: 'string', format: 'uri' }
          }
        },
        Settings: {
          type: 'object',
          required: ['refreshHour', 'weekAnchor', 'monthAnchor', 'proofRequiredTemplateIds'],
          properties: {
            refreshHour: { type: 'integer' },
            weekAnchor: { type: 'integer' },
            monthAnchor: { type: 'integer' },
            proofRequiredTemplateIds: { type: 'array', items: { type: 'string' } }
          }
        },
        SyncEnvelope: {
          type: 'object',
          required: ['id', 'type', 'payload', 'createdAt'],
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            payload: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/**/*.ts']
});

export function createApp() {
  const app = express();
  app.use(pinoHttp({ logger }));
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true
    })
  );
  app.use(express.json());

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use(router);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, 'Request failed');
    if (err instanceof ZodError) {
      res.status(400).json({ error: err.errors.map((issue) => issue.message).join('; ') });
    } else if (err instanceof Error) {
      res.status(400).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Unknown error' });
    }
  });

  return app;
}
