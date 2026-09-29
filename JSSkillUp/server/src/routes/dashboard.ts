import type { FastifyInstance } from 'fastify';
import type { DashboardResponse } from '@jsskillup/shared';
import { buildDashboard } from '../services/dashboard.js';

export function registerDashboardRoutes(app: FastifyInstance): void {
  app.get('/api/dashboard', (): DashboardResponse => buildDashboard());
}
