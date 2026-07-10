import { Prisma } from '@prisma/client';
import {
  overspendByCategoryInsights,
  savingsRateChangeInsight,
  fixedExpenseRatioInsight,
  emergencyFundInsight,
  goalProjectionInsight,
} from './rules';

const d = (value: number) => new Prisma.Decimal(value);
const LABELS = { OUTINGS: 'Salidas', FOOD: 'Comida' };

describe('overspendByCategoryInsights', () => {
  it('flags a category that increased at least 20% vs. the previous period', () => {
    const insights = overspendByCategoryInsights(
      { OUTINGS: d(4200) },
      { OUTINGS: d(3281) },
      LABELS,
    );
    expect(insights).toHaveLength(1);
    expect(insights[0].type).toBe('OVERSPEND_CATEGORY:OUTINGS');
    expect(insights[0].message).toContain('28%');
    expect(insights[0].message).toContain('Salidas');
    expect(insights[0].severity).toBe('warning');
  });

  it('marks a very large increase as critical', () => {
    const insights = overspendByCategoryInsights(
      { OUTINGS: d(6000) },
      { OUTINGS: d(3000) },
      LABELS,
    );
    expect(insights[0].severity).toBe('critical');
  });

  it('ignores categories with no prior spend (no baseline to compare)', () => {
    const insights = overspendByCategoryInsights(
      { OUTINGS: d(500) },
      {},
      LABELS,
    );
    expect(insights).toHaveLength(0);
  });

  it('ignores increases below the threshold', () => {
    const insights = overspendByCategoryInsights(
      { OUTINGS: d(1050) },
      { OUTINGS: d(1000) },
      LABELS,
    );
    expect(insights).toHaveLength(0);
  });

  it('caps results at the 2 biggest increases', () => {
    const insights = overspendByCategoryInsights(
      { OUTINGS: d(200), FOOD: d(200), TRANSPORT: d(200) },
      { OUTINGS: d(100), FOOD: d(100), TRANSPORT: d(100) },
      LABELS,
    );
    expect(insights).toHaveLength(2);
  });
});

describe('savingsRateChangeInsight', () => {
  it('detects a drop in savings rate', () => {
    const insight = savingsRateChangeInsight(
      d(1000),
      d(10000),
      d(1800),
      d(10000),
    );
    expect(insight?.type).toBe('SAVINGS_RATE_DROP');
    expect(insight?.message).toBe(
      'Tu ahorro cayó de 18% a 10% de tus ingresos.',
    );
    expect(insight?.severity).toBe('warning');
  });

  it('marks a drop of 15+ points as critical', () => {
    const insight = savingsRateChangeInsight(
      d(500),
      d(10000),
      d(2500),
      d(10000),
    );
    expect(insight?.severity).toBe('critical');
  });

  it('detects an improvement in savings rate', () => {
    const insight = savingsRateChangeInsight(
      d(1800),
      d(10000),
      d(1000),
      d(10000),
    );
    expect(insight?.type).toBe('SAVINGS_RATE_UP');
  });

  it('returns null when the change is within normal noise', () => {
    const insight = savingsRateChangeInsight(
      d(1020),
      d(10000),
      d(1000),
      d(10000),
    );
    expect(insight).toBeNull();
  });

  it('returns null when there is no income to compare against', () => {
    const insight = savingsRateChangeInsight(d(0), d(0), d(1000), d(10000));
    expect(insight).toBeNull();
  });
});

describe('fixedExpenseRatioInsight', () => {
  it('flags a healthy-but-notable fixed expense ratio as info', () => {
    const insight = fixedExpenseRatioInsight(d(3500), d(10000));
    expect(insight?.severity).toBe('info');
  });

  it('flags 63% as warning, matching the PRD example', () => {
    const insight = fixedExpenseRatioInsight(d(6300), d(10000));
    expect(insight?.message).toBe(
      'Tus gastos fijos representan el 63% de tus ingresos.',
    );
    expect(insight?.severity).toBe('warning');
  });

  it('flags a ratio over 70% as critical', () => {
    const insight = fixedExpenseRatioInsight(d(7500), d(10000));
    expect(insight?.severity).toBe('critical');
  });

  it('returns null below the notable threshold', () => {
    const insight = fixedExpenseRatioInsight(d(1000), d(10000));
    expect(insight).toBeNull();
  });
});

describe('emergencyFundInsight', () => {
  it('reports months of runway at the current spending pace', () => {
    const insight = emergencyFundInsight(d(20000), d(5000));
    expect(insight?.message).toContain('4 meses');
    expect(insight?.severity).toBe('info');
  });

  it('flags less than 3 months as a warning', () => {
    const insight = emergencyFundInsight(d(8000), d(5000));
    expect(insight?.severity).toBe('warning');
  });

  it('flags less than 1 month as critical', () => {
    const insight = emergencyFundInsight(d(2000), d(5000));
    expect(insight?.severity).toBe('critical');
  });

  it('returns null when there is no spending history to estimate from', () => {
    const insight = emergencyFundInsight(d(20000), d(0));
    expect(insight).toBeNull();
  });
});

describe('goalProjectionInsight', () => {
  const base = {
    goalName: 'Fondo de emergencia',
    remaining: d(3000),
    avgMonthlyContribution: d(500),
    reducibleCategoryLabel: 'Salidas',
    reducibleMonthlySpend: d(2000),
    reductionPct: 0.15,
  };

  it('projects finishing the goal sooner by redirecting reduced spend', () => {
    const insight = goalProjectionInsight(base);
    expect(insight?.type).toBe('GOAL_PROJECTION_SIM');
    expect(insight?.message).toContain('15%');
    expect(insight?.message).toContain('Salidas');
    expect(insight?.message).toContain('Fondo de emergencia');
  });

  it('returns null when there is nothing to reduce', () => {
    const insight = goalProjectionInsight({
      ...base,
      reducibleMonthlySpend: d(0),
    });
    expect(insight).toBeNull();
  });

  it('returns null when the goal is already fully funded', () => {
    const insight = goalProjectionInsight({ ...base, remaining: d(0) });
    expect(insight).toBeNull();
  });

  it('returns null when there is no contribution pace to project from', () => {
    const insight = goalProjectionInsight({
      ...base,
      avgMonthlyContribution: d(0),
    });
    expect(insight).toBeNull();
  });

  it('returns null when the boost does not save at least a full month', () => {
    const insight = goalProjectionInsight({
      ...base,
      remaining: d(100000),
      reducibleMonthlySpend: d(10),
    });
    expect(insight).toBeNull();
  });
});
