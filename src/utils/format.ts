const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(value?: string): string {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return dateFormatter.format(date);
}

export function formatDateTime(value?: string): string {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return dateTimeFormatter.format(date);
}

export function relativeTime(value?: string, now: Date = new Date()): string {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';

  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(value);
}

export function formatAge(ageMonths?: number): string {
  if (ageMonths === undefined || ageMonths === null || Number.isNaN(ageMonths)) {
    return 'Not recorded';
  }
  if (ageMonths < 12) {
    return `${Math.max(1, Math.round(ageMonths))} mo`;
  }
  const years = Math.floor(ageMonths / 12);
  const months = Math.round(ageMonths % 12);
  if (months > 0) return `${years}y ${months}m`;
  return `${years} ${years === 1 ? 'year' : 'years'}`;
}

export function formatLiters(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return 'Not recorded';
  return `${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format(value)} L`;
}

export function formatNumber(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return 'Not recorded';
  return new Intl.NumberFormat('en-GB').format(value);
}

export function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return 'PT';
  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
}

export function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

export function formatSyncStatus(status: 'synced' | 'pending'): string {
  return status === 'synced' ? 'Synced' : 'Saved locally';
}
