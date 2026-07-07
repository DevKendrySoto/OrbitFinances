const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** "2026-07" -> "julio 2026" */
export function formatPeriodLabel(period: string): string {
  const [year, month] = period.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function formatDueDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getUTCDate()} de ${MONTH_NAMES[date.getUTCMonth()]}`;
}
