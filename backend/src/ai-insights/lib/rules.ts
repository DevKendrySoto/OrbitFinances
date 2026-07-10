import { Prisma } from '@prisma/client';
import { pctChange, ratio } from './insights-math';

export type Severity = 'info' | 'warning' | 'critical';

export interface Insight {
  type: string;
  severity: Severity;
  message: string;
}

const OVERSPEND_THRESHOLD_PCT = 20;
const OVERSPEND_MAX_INSIGHTS = 2;

/** Compara gasto por categoría vs. el período anterior; señala las que subieron
 * al menos OVERSPEND_THRESHOLD_PCT%, como máximo las 2 más significativas. */
export function overspendByCategoryInsights(
  current: Record<string, Prisma.Decimal>,
  previous: Record<string, Prisma.Decimal>,
  labels: Record<string, string>,
): Insight[] {
  const candidates: { category: string; pct: number }[] = [];

  for (const category of Object.keys(current)) {
    const currentAmount = current[category];
    const previousAmount = previous[category] ?? new Prisma.Decimal(0);
    const pct = pctChange(currentAmount, previousAmount);
    if (pct !== null && pct >= OVERSPEND_THRESHOLD_PCT) {
      candidates.push({ category, pct });
    }
  }

  candidates.sort((a, b) => b.pct - a.pct);

  return candidates
    .slice(0, OVERSPEND_MAX_INSIGHTS)
    .map(({ category, pct }) => ({
      type: `OVERSPEND_CATEGORY:${category}`,
      severity: pct >= 50 ? 'critical' : 'warning',
      message: `Este mes gastaste un ${Math.round(pct)}% más en ${labels[category] ?? category} que el mes pasado.`,
    }));
}

const SAVINGS_RATE_CHANGE_THRESHOLD_PTS = 5;
const SAVINGS_RATE_CRITICAL_DROP_PTS = 15;

/** Compara % de ingresos destinado a metas de ahorro entre este período y el anterior. */
export function savingsRateChangeInsight(
  currentContributions: Prisma.Decimal,
  currentIncome: Prisma.Decimal,
  previousContributions: Prisma.Decimal,
  previousIncome: Prisma.Decimal,
): Insight | null {
  const currentRate = ratio(currentContributions, currentIncome);
  const previousRate = ratio(previousContributions, previousIncome);
  if (currentRate === null || previousRate === null) return null;

  const diff = currentRate - previousRate;

  if (diff <= -SAVINGS_RATE_CHANGE_THRESHOLD_PTS) {
    return {
      type: 'SAVINGS_RATE_DROP',
      severity:
        diff <= -SAVINGS_RATE_CRITICAL_DROP_PTS ? 'critical' : 'warning',
      message: `Tu ahorro cayó de ${Math.round(previousRate)}% a ${Math.round(currentRate)}% de tus ingresos.`,
    };
  }

  if (diff >= SAVINGS_RATE_CHANGE_THRESHOLD_PTS) {
    return {
      type: 'SAVINGS_RATE_UP',
      severity: 'info',
      message: `Tu ahorro subió de ${Math.round(previousRate)}% a ${Math.round(currentRate)}% de tus ingresos. ¡Sigue así!`,
    };
  }

  return null;
}

const FIXED_EXPENSE_INFO_PCT = 30;
const FIXED_EXPENSE_WARNING_PCT = 50;
const FIXED_EXPENSE_CRITICAL_PCT = 70;

/** Qué tan comprometidos están los ingresos con pagos fijos ya pagados este período. */
export function fixedExpenseRatioInsight(
  fixedExpenses: Prisma.Decimal,
  income: Prisma.Decimal,
): Insight | null {
  const pct = ratio(fixedExpenses, income);
  if (pct === null || pct < FIXED_EXPENSE_INFO_PCT) return null;

  const severity: Severity =
    pct >= FIXED_EXPENSE_CRITICAL_PCT
      ? 'critical'
      : pct >= FIXED_EXPENSE_WARNING_PCT
        ? 'warning'
        : 'info';

  return {
    type: 'FIXED_EXPENSE_RATIO',
    severity,
    message: `Tus gastos fijos representan el ${Math.round(pct)}% de tus ingresos.`,
  };
}

const EMERGENCY_FUND_CRITICAL_MONTHS = 1;
const EMERGENCY_FUND_WARNING_MONTHS = 3;

/** Cuántos meses de gastos podrían cubrirse con lo ahorrado hasta ahora (estimado). */
export function emergencyFundInsight(
  totalSaved: Prisma.Decimal,
  avgMonthlyExpenses: Prisma.Decimal,
): Insight | null {
  if (avgMonthlyExpenses.lessThanOrEqualTo(0)) return null;

  const months = totalSaved
    .div(avgMonthlyExpenses)
    .toDecimalPlaces(1)
    .toNumber();

  const severity: Severity =
    months < EMERGENCY_FUND_CRITICAL_MONTHS
      ? 'critical'
      : months < EMERGENCY_FUND_WARNING_MONTHS
        ? 'warning'
        : 'info';

  return {
    type: 'EMERGENCY_FUND_ESTIMATE',
    severity,
    message: `Con tus ahorros actuales podrías cubrir tus gastos por ${months} ${months === 1 ? 'mes' : 'meses'} si dejaras de recibir ingresos.`,
  };
}

/** Simula redirigir un % de un gasto reducible hacia el ritmo de aporte de una meta,
 * y cuántos meses antes se alcanzaría si se sostiene ese ritmo. */
export function goalProjectionInsight(input: {
  goalName: string;
  remaining: Prisma.Decimal;
  avgMonthlyContribution: Prisma.Decimal;
  reducibleCategoryLabel: string;
  reducibleMonthlySpend: Prisma.Decimal;
  reductionPct: number;
}): Insight | null {
  const {
    goalName,
    remaining,
    avgMonthlyContribution,
    reducibleCategoryLabel,
    reducibleMonthlySpend,
    reductionPct,
  } = input;

  if (
    avgMonthlyContribution.lessThanOrEqualTo(0) ||
    remaining.lessThanOrEqualTo(0)
  ) {
    return null;
  }

  const extra = reducibleMonthlySpend.mul(reductionPct);
  if (extra.lessThanOrEqualTo(0)) return null;

  const currentMonths = Math.ceil(
    remaining.div(avgMonthlyContribution).toNumber(),
  );
  const boostedMonths = Math.ceil(
    remaining.div(avgMonthlyContribution.add(extra)).toNumber(),
  );
  const monthsSaved = currentMonths - boostedMonths;
  if (monthsSaved < 1) return null;

  const pctLabel = Math.round(reductionPct * 100);

  return {
    type: 'GOAL_PROJECTION_SIM',
    severity: 'info',
    message: `Si reduces un ${pctLabel}% tus gastos en ${reducibleCategoryLabel}, alcanzarías tu meta "${goalName}" ${monthsSaved} ${monthsSaved === 1 ? 'mes' : 'meses'} antes.`,
  };
}
