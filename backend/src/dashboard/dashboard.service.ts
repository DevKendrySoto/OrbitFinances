import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HouseholdAccessService } from '../household/household-access.service';
import {
  computeDueDate,
  formatPeriod,
  nextPeriod,
} from '../recurring-payments/lib/period';
import type { DashboardSummaryQuery } from './dto/dashboard.schemas';

type CurrencyTotals = { DOP: Prisma.Decimal; USD: Prisma.Decimal };

function zeroTotals(): CurrencyTotals {
  return { DOP: new Prisma.Decimal(0), USD: new Prisma.Decimal(0) };
}

function addTo(
  totals: CurrencyTotals,
  currency: 'DOP' | 'USD',
  amount: Prisma.Decimal,
) {
  totals[currency] = totals[currency].add(amount);
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly householdAccess: HouseholdAccessService,
  ) {}

  async getSummary(userId: string, query: DashboardSummaryQuery) {
    const membership = await this.householdAccess.getMembership(
      userId,
      query.householdId,
    );
    const householdId = membership.householdId;
    const period = query.month ?? formatPeriod(new Date());
    const monthStart = computeDueDate(period, 1);
    const monthEnd = computeDueDate(nextPeriod(period), 1);

    const [
      incomes,
      expenses,
      occurrences,
      usdIncomeTotal,
      usdConvertedTotal,
      convertedThisPeriod,
      upcomingPayments,
    ] = await Promise.all([
      this.prisma.income.findMany({
        where: { householdId, deletedAt: null, period },
        select: { amount: true, currency: true },
      }),
      this.prisma.variableExpense.findMany({
        where: {
          householdId,
          deletedAt: null,
          spentAt: { gte: monthStart, lt: monthEnd },
        },
        select: { amount: true, currency: true },
      }),
      this.prisma.recurringPaymentOccurrence.findMany({
        where: {
          recurringPayment: { householdId },
          period,
          status: { in: ['PENDING', 'OVERDUE'] },
        },
        select: {
          amount: true,
          recurringPayment: { select: { currency: true } },
        },
      }),
      this.prisma.income.aggregate({
        where: { householdId, deletedAt: null, currency: 'USD' },
        _sum: { amount: true },
      }),
      this.prisma.currencyConversion.aggregate({
        where: { householdId },
        _sum: { amountUsd: true },
      }),
      this.prisma.currencyConversion.aggregate({
        where: { householdId, convertedAt: { gte: monthStart, lt: monthEnd } },
        _sum: { amountDop: true },
      }),
      this.prisma.recurringPaymentOccurrence.findMany({
        where: { recurringPayment: { householdId }, status: 'PENDING' },
        orderBy: { dueDate: 'asc' },
        take: 5,
        include: {
          recurringPayment: {
            select: { name: true, priority: true, currency: true },
          },
        },
      }),
    ]);

    const income = zeroTotals();
    for (const row of incomes) addTo(income, row.currency, row.amount);

    const expensesTotal = zeroTotals();
    for (const row of expenses) addTo(expensesTotal, row.currency, row.amount);

    const committed = zeroTotals();
    for (const row of occurrences)
      addTo(committed, row.recurringPayment.currency, row.amount);

    const convertedToDop =
      convertedThisPeriod._sum.amountDop ?? new Prisma.Decimal(0);

    const availableReal: CurrencyTotals = {
      DOP: income.DOP.minus(committed.DOP)
        .minus(expensesTotal.DOP)
        .add(convertedToDop),
      USD: income.USD.minus(committed.USD).minus(expensesTotal.USD),
    };

    const savingsUsd = (
      usdIncomeTotal._sum.amount ?? new Prisma.Decimal(0)
    ).minus(usdConvertedTotal._sum.amountUsd ?? new Prisma.Decimal(0));

    const incomeDop = income.DOP;
    let monthStatus: 'ok' | 'warning' | 'critical' = 'ok';
    if (availableReal.DOP.isNegative()) {
      monthStatus = 'critical';
    } else if (
      incomeDop.greaterThan(0) &&
      availableReal.DOP.lessThan(incomeDop.mul(0.1))
    ) {
      monthStatus = 'warning';
    }

    return {
      period,
      income,
      committed,
      expenses: expensesTotal,
      availableReal,
      convertedToDop,
      savingsUsd,
      monthStatus,
      upcomingPayments,
    };
  }
}
