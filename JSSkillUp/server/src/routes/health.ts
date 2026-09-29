import type { FastifyInstance } from 'fastify';
import type { HealthResponse } from '@jsskillup/shared';
import { sqliteVersion } from '../db/client.js';
import { env } from '../env.js';

export function registerHealthRoutes(app: FastifyInstance): void {
  app.get('/api/health', (): HealthResponse => ({
    ok: true,
    nodeVersion: process.version,
    sqliteVersion: sqliteVersion(),
    aiConfigured: env.groq.configured,
    model: env.groq.configured ? env.groq.model : null,
  }));
}
