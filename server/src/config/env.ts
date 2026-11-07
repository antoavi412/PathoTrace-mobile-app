import 'dotenv/config';
import { z } from 'zod';

const isProduction = process.env.NODE_ENV === 'production';

const DEV_DEFAULTS = {
  DATABASE_URL: 'postgres://pathotrace:pathotrace_dev@localhost:5432/pathotrace',
  JWT_SECRET: 'dev-jwt-secret-change-me-32-characters-minimum',
  JWT_REFRESH_SECRET: 'dev-refresh-secret-change-me-32-characters-minimum',
  DEVICE_TOKEN_PEPPER: 'dev-device-pepper-change-me',
};

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().min(1).default('0.0.0.0'),
  DATABASE_URL: z.string().min(1).default(DEV_DEFAULTS.DATABASE_URL),
  JWT_SECRET: z.string().min(16).default(DEV_DEFAULTS.JWT_SECRET),
  JWT_REFRESH_SECRET: z.string().min(16).default(DEV_DEFAULTS.JWT_REFRESH_SECRET),
  DEVICE_TOKEN_PEPPER: z.string().min(8).default(DEV_DEFAULTS.DEVICE_TOKEN_PEPPER),
  ACCESS_TOKEN_TTL: z.string().min(2).default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  EXPORT_MAX_RANGE_DAYS: z.coerce.number().int().positive().default(31),
  EXPORT_MAX_ROWS: z.coerce.number().int().positive().default(100000),
  TEMPERATURE_HIGH_C: z.coerce.number().default(39.5),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.string().default('info'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Print a readable summary without dumping secrets.
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('; ');
  throw new Error(`Invalid environment configuration: ${issues}`);
}

export const env = parsed.data;

if (isProduction) {
  const insecure: string[] = [];
  if (env.JWT_SECRET === DEV_DEFAULTS.JWT_SECRET) insecure.push('JWT_SECRET');
  if (env.JWT_REFRESH_SECRET === DEV_DEFAULTS.JWT_REFRESH_SECRET) insecure.push('JWT_REFRESH_SECRET');
  if (env.DEVICE_TOKEN_PEPPER === DEV_DEFAULTS.DEVICE_TOKEN_PEPPER) insecure.push('DEVICE_TOKEN_PEPPER');
  if (env.DATABASE_URL === DEV_DEFAULTS.DATABASE_URL) insecure.push('DATABASE_URL');
  if (insecure.length > 0) {
    throw new Error(
      `Refusing to start in production with development defaults for: ${insecure.join(', ')}`
    );
  }
}

/** Convert a duration such as `15m`, `30s` or `2h` to seconds. */
export function durationToSeconds(value: string): number {
  const match = /^(\d+)\s*(s|m|h|d)?$/.exec(value.trim());
  if (!match) return 900;
  const amount = Number(match[1]);
  const unit = match[2] ?? 's';
  const multiplier = unit === 'd' ? 86400 : unit === 'h' ? 3600 : unit === 'm' ? 60 : 1;
  return amount * multiplier;
}
