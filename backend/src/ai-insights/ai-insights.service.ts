import { Injectable, NotFoundException } from '@nestjs/common';
import { Currency, Prisma, GoalStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HouseholdAccessService } from '../household/household-access.service';
import {
  computeDueDate,
  formatPeriod,
  nextPeriod,
  previousPeriod,
} from '../recurring-payments/lib/period';
import {
  overspendByCategoryInsights,
  savingsRateChangeInsight,
  fixedExpenseRatioInsight,
  emergencyFundInsight,
  goalProjectionInsight,
  type Insight,
} from './lib/rules';
import { EXPENSE_CATEGORY_LABEL } from './lib/labels';
import type { ListInsightsQuery } from './dto/ai-insights.schemas';

const REDUCIBLE_CATEGORY = 'OUTINGS';
const GOAL_SIM_REDUCTION_PCT = 0.15;
const EMERGENCY_FUND_LOOKBACK_MONTHS = 3;

function zero() {
  return new Prisma.Decimal(0);
}

@Injectable()
export class AiInsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly householdAccess: HouseholdAccessService,
  ) {}

  async list(userId: string, query: ListInsightsQuery) {
    const membership = await this.householdAccess.getMembership(
      userId,
      query.householdId,
    );
    const householdId = membership.householdId;
    const period = query.period ?? formatPeriod(new Date());

    const household = await this.prisma.household.findUniqueOrThrow({
      where: { id: householdId },
    });

    const insights = await this.computeInsights(
      householdId,
      household.baseCurrency,
      period,
    );

    const saved = await Promise.all(
      insights.map((insight) =>
        this.prisma.aIRecommendation.upsert({
          where: {
            householdId_period_type: {
              householdId,
              period,
              type: insight.type,
            },
          },
          create: {
            householdId,
            period,
            type: insight.type,
            message: insight.message,
            severity: insight.severity,
          },
          update: {
            message: insight.message,
            severity: insight.severity,
          },
        }),
      ),
    );

    return saved.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async dismiss(userId: string, id: string) {
    const insight = await this.prisma.aIRecommendation.findUnique({
      where: { id },
    });
    if (!insight) {
      throw new NotFoundException('Recomendación no encontrada');
    }
    await this.householdAccess.getMembership(userId, insight.householdId);

    return this.prisma.aIRecommendation.update({
      where: { id },
      data: { dismissedAt: new Date() },
    });
  }

  private async computeInsights(
    householdId: string,
    baseCurrency: Currency,
    period: string,
  ): Promise<Insight[]> {
    const prevPeriod = previousPeriod(period);
    const monthStart = computeDueDate(period, 1);
    const monthEnd = computeDueDate(nextPeriod(period), 1);
    const prevMonthStart = computeDueDate(prevPeriod, 1);
    const prevMonthEnd = monthStart;

    const [
      currentExpensesByCategory,
      previousExpensesByCategory,
      currentIncome,
      previousIncome,
      currentContributions,
      previousContributions,
      currentFixedPaid,
      totalSavedEver,
      avgMonthlyExpenses,
      goalForProjection,
    ] = await Promise.all([
      this.sumExpensesByCategory(
        householdId,
        baseCurrency,
        monthStart,
        monthEnd,
      ),
      this.sumExpensesByCategory(
        householdId,
        baseCurrency,
        prevMonthStart,
        prevMonthEnd,
      ),
      this.sumIncome(householdId, baseCurrency, period),
      this.sumIncome(householdId, baseCurrency, prevPeriod),
      this.sumContributions(householdId, baseCurrency, monthStart, monthEnd),
      this.sumContributions(
        householdId,
        baseCurrency,
        prevMonthStart,
        prevMonthEnd,
      ),
      this.sumFixedPaid(householdId, baseCurrency, monthStart, monthEnd),
      this.sumContributionsAllTime(householdId, baseCurrency),
      this.avgMonthlyExpenses(
        householdId,
        baseCurrency,
        period,
        EMERGENCY_FUND_LOOKBACK_MONTHS,
      ),
      this.getGoalForProjection(householdId, baseCurrency),
    ]);

    const insights: Insight[] = [];

    insights.push(
      ...overspendByCategoryInsights(
        currentExpensesByCategory,
        previousExpensesByCategory,
        EXPENSE_CATEGORY_LABEL,
      ),
    );

    const savingsInsight = savingsRateChangeInsight(
      currentContributions,
      currentIncome,
      previousContributions,
      previousIncome,
    );
    if (savingsInsight) insights.push(savingsInsight);

    const fixedInsight = fixedExpenseRatioInsight(
      currentFixedPaid,
      currentIncome,
    );
    if (fixedInsight) insights.push(fixedInsight);

    const emergencyInsight = emergencyFundInsight(
      totalSavedEver,
      avgMonthlyExpenses,
    );
    if (emergencyInsight) insights.push(emergencyInsight);

    if (goalForProjection) {
      const reducibleSpend =
        currentExpensesByCategory[REDUCIBLE_CATEGORY] ?? zero();
      const goalInsight = goalProjectionInsight({
        goalName: goalForProjection.name,
        remaining: goalForProjection.remaining,
        avgMonthlyContribution: goalForProjection.avgMonthlyContribution,
        reducibleCategoryLabel: EXPENSE_CATEGORY_LABEL[REDUCIBLE_CATEGORY],
        reducibleMonthlySpend: reducibleSpend,
        reductionPct: GOAL_SIM_REDUCTION_PCT,
      });
      if (goalInsight) insights.push(goalInsight);
    }

    return insights;
  }

  private async sumExpensesByCategory(
    householdId: string,
    currency: Currency,
    gte: Date,
    lt: Date,
  ) {
    const rows = await this.prisma.variableExpense.groupBy({
      by: ['category'],
      where: { householdId, deletedAt: null, currency, spentAt: { gte, lt } },
      _sum: { amount: true },
    });
    const result: Record<string, Prisma.Decimal> = {};
    for (const row of rows) {
      result[row.category] = row._sum.amount ?? zero();
    }
    return result;
  }

  private async sumExpensesTotal(
    householdId: string,
    currency: Currency,
    gte: Date,
    lt: Date,
  ) {
    const agg = await this.prisma.variableExpense.aggregate({
      where: { householdId, deletedAt: null, currency, spentAt: { gte, lt } },
      _sum: { amount: true },
    });
    return agg._sum.amount ?? zero();
  }

  private async sumIncome(
    householdId: string,
    currency: Currency,
    period: string,
  ) {
    const agg = await this.prisma.income.aggregate({
      where: { householdId, deletedAt: null, currency, period },
      _sum: { amount: true },
    });
    return agg._sum.amount ?? zero();
  }

  private async sumContributions(
    householdId: string,
    currency: Currency,
    gte: Date,
    lt: Date,
  ) {
    const agg = await this.prisma.goalContribution.aggregate({
      where: { currency, contributedAt: { gte, lt }, goal: { householdId } },
      _sum: { amount: true },
    });
    return agg._sum.amount ?? zero();
  }

  private async sumContributionsAllTime(
    householdId: string,
    currency: Currency,
  ) {
    const agg = await this.prisma.goalContribution.aggregate({
      where: { currency, goal: { householdId } },
      _sum: { amount: true },
    });
    return agg._sum.amount ?? zero();
  }

  private async sumFixedPaid(
    householdId: string,
    currency: Currency,
    gte: Date,
    lt: Date,
  ) {
    const agg = await this.prisma.recurringPaymentOccurrence.aggregate({
      where: {
        status: PaymentStatus.PAID,
        paidAt: { gte, lt },
        recurringPayment: { householdId, currency },
      },
      _sum: { amount: true },
    });
    return agg._sum.amount ?? zero();
  }

  private async avgMonthlyExpenses(
    householdId: string,
    currency: Currency,
    period: string,
    months: number,
  ) {
    let total = zero();
    let cursor = period;
    for (let i = 0; i < months; i++) {
      const gte = computeDueDate(cursor, 1);
      const lt = computeDueDate(nextPeriod(cursor), 1);
      const [variable, fixed] = await Promise.all([
        this.sumExpensesTotal(householdId, currency, gte, lt),
        this.sumFixedPaid(householdId, currency, gte, lt),
      ]);
      total = total.add(variable).add(fixed);
      cursor = previousPeriod(cursor);
    }
    return total.div(months);
  }

  private async getGoalForProjection(householdId: string, currency: Currency) {
    const goal = await this.prisma.savingsGoal.findFirst({
      where: { householdId, status: GoalStatus.IN_PROGRESS, currency },
      orderBy: { createdAt: 'asc' },
      include: { contributions: true },
    });
    if (!goal) return null;

    const totalContributed = goal.contributions.reduce(
      (sum, c) => sum.add(c.amount),
      zero(),
    );
    const remaining = goal.targetAmount.minus(totalContributed);
    if (remaining.lessThanOrEqualTo(0)) return null;

    const monthsElapsed = Math.max(
      1,
      Math.round(
        (Date.now() - goal.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30),
      ),
    );
    const avgMonthlyContribution = totalContributed.div(monthsElapsed);

    return { name: goal.name, remaining, avgMonthlyContribution };
  }
}
