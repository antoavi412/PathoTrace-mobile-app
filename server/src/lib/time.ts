import { ApiError } from './errors';

const BUCKET_PATTERN = /^(\d+)(s|m|h|d)$/;

/** Parse a bucket expression such as `30s`, `5m`, `15m`, `1h` or `1d`. */
export function parseBucketSeconds(bucket: string | undefined | null): number | null {
  if (!bucket) return null;
  const match = BUCKET_PATTERN.exec(bucket.trim());
  if (!match) {
    throw ApiError.badRequest('Invalid bucket. Use a value such as 30s, 5m, 15m, 1h or 1d.');
  }
  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier = unit === 'd' ? 86400 : unit === 'h' ? 3600 : unit === 'm' ? 60 : 1;
  const seconds = amount * multiplier;
  if (seconds < 1 || seconds > 86400) {
    throw ApiError.badRequest('Bucket must be between 1 second and 1 day.');
  }
  return seconds;
}

export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * Resolve a validated date range. Defaults to the last `defaultDays` days and
 * refuses ranges wider than `maxDays`.
 */
export function parseDateRange(
  from: string | undefined,
  to: string | undefined,
  maxDays: number,
  defaultDays = 7
): DateRange {
  const end = to ? new Date(to) : new Date();
  if (Number.isNaN(end.getTime())) {
    throw ApiError.badRequest('Invalid `to` date. Use an ISO 8601 timestamp.');
  }

  const start = from
    ? new Date(from)
    : new Date(end.getTime() - defaultDays * 24 * 60 * 60 * 1000);
  if (Number.isNaN(start.getTime())) {
    throw ApiError.badRequest('Invalid `from` date. Use an ISO 8601 timestamp.');
  }

  if (start.getTime() > end.getTime()) {
    throw ApiError.badRequest('`from` must be before `to`.');
  }

  const widthMs = end.getTime() - start.getTime();
  if (widthMs > maxDays * 24 * 60 * 60 * 1000) {
    throw ApiError.badRequest(`Date range must not exceed ${maxDays} days.`);
  }

  return { from: start, to: end };
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Convert an IST timestamp to a readable string for spreadsheet users. */
export function formatIst(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}
