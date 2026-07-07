export function formatMoney(amount: string, currency: 'USD' | 'DOP'): string {
  const value = Number(amount);
  const formatted = new Intl.NumberFormat('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${currency === 'USD' ? 'US$' : 'RD$'}${formatted}`;
}
