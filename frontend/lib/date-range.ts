function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function today(): string {
  return toDateOnly(new Date());
}

export function daysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return toDateOnly(date);
}

export function firstDayOfMonth(): string {
  const now = new Date();
  return toDateOnly(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
}
