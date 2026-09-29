import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

/** Корень репозитория: server/src → server → корень. */
export const REPO_ROOT = resolve(import.meta.dirname, '..', '..');

const envFile = resolve(REPO_ROOT, '.env');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  DB_PATH: z.string().min(1).default('data/app.db'),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().min(1).default('openai/gpt-oss-120b'),
  GROQ_BASE_URL: z.string().url().default('https://api.groq.com/openai/v1'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Некорректный .env:\n${issues}`);
}

const raw = parsed.data;

/** Ключ считается настроенным, только если это не плейсхолдер из .env.example. */
const apiKey = raw.GROQ_API_KEY?.trim();
const hasRealKey = Boolean(apiKey && apiKey.startsWith('gsk_') && !apiKey.includes('замени'));

export const env = {
  port: raw.PORT,
  dbPath: resolve(REPO_ROOT, raw.DB_PATH),
  groq: {
    apiKey: hasRealKey ? (apiKey as string) : null,
    model: raw.GROQ_MODEL,
    baseUrl: raw.GROQ_BASE_URL,
    configured: hasRealKey,
  },
} as const;
