const PERIOD_REGEX = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function formatPeriod(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function parsePeriod(period: string): { year: number; month: number } {
  const match = PERIOD_REGEX.exec(period);
  if (!match) {
    throw new Error(`Período inválido: ${period}`);
  }
  return { year: Number(match[1]), month: Number(match[2]) };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Combina un período ("YYYY-MM") con un día del mes, ajustando al último
 * día disponible si el mes no lo tiene (ej. día 31 en febrero). */
export function computeDueDate(period: string, day: number): Date {
  const { year, month } = parsePeriod(period);
  const clampedDay = Math.min(day, daysInMonth(year, month));
  return new Date(Date.UTC(year, month - 1, clampedDay));
}

export function nextPeriod(period: string): string {
  const { year, month } = parsePeriod(period);
  return month === 12
    ? `${year + 1}-01`
    : `${year}-${String(month + 1).padStart(2, '0')}`;
}

export function previousPeriod(period: string): string {
  const { year, month } = parsePeriod(period);
  return month === 1
    ? `${year - 1}-12`
    : `${year}-${String(month - 1).padStart(2, '0')}`;
}

/** true si `period` cae dentro de [startDate, endDate] (endDate opcional = sin límite). */
export function isPeriodWithinRange(
  period: string,
  startDate: Date,
  endDate: Date | null,
): boolean {
  const startPeriod = formatPeriod(startDate);
  if (period < startPeriod) return false;
  if (endDate && period > formatPeriod(endDate)) return false;
  return true;
}
