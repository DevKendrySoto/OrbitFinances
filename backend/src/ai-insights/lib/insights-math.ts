import { Prisma } from '@prisma/client';

/** % de cambio de `previous` a `current`. null si `previous` es 0 (no hay base de comparación). */
export function pctChange(
  current: Prisma.Decimal,
  previous: Prisma.Decimal,
): number | null {
  if (previous.isZero()) return null;
  return current
    .minus(previous)
    .div(previous)
    .mul(100)
    .toDecimalPlaces(1)
    .toNumber();
}

/** `part` como % de `whole`. null si `whole` es 0. */
export function ratio(
  part: Prisma.Decimal,
  whole: Prisma.Decimal,
): number | null {
  if (whole.isZero()) return null;
  return part.div(whole).mul(100).toDecimalPlaces(1).toNumber();
}
