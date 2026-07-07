import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HouseholdAccessService } from '../household/household-access.service';
import { computeDueDate, nextPeriod } from '../recurring-payments/lib/period';
import type {
  ReportRangeQuery,
  CreateClosingDto,
  ListClosingsQuery,
} from './dto/report.schemas';

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

/** `to` es inclusivo en la API; las consultas necesitan un límite superior
 * exclusivo (el día siguiente a medianoche UTC). */
function exclusiveUpperBound(to: string): Date {
  const [year, month, day] = to.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1));
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly householdAccess: HouseholdAccessService,
  ) {}

  async getRangeReport(userId: string, query: ReportRangeQuery) {
    const membership = await this.householdAccess.getMembership(
      userId,
      query.householdId,
    );
    const householdId = membership.householdId;
    const from = new Date(query.from);
    const to = exclusiveUpperBound(query.to);

    const [incomes, expenses, payments] = await Promise.all([
      this.prisma.income.findMany({
        where: {
          householdId,
          deletedAt: null,
          receivedAt: { gte: from, lt: to },
        },
        orderBy: { receivedAt: 'asc' },
      }),
      this.prisma.variableExpense.findMany({
        where: { householdId, deletedAt: null, spentAt: { gte: from, lt: to } },
        orderBy: { spentAt: 'asc' },
      }),
      this.prisma.recurringPaymentOccurrence.findMany({
        where: {
          recurringPayment: { householdId },
          status: 'PAID',
          paidAt: { gte: from, lt: to },
        },
        include: {
          recurringPayment: {
            select: { name: true, category: true, currency: true },
          },
        },
        orderBy: { paidAt: 'asc' },
      }),
    ]);

    const totalIncome = zeroTotals();
    for (const row of incomes) addTo(totalIncome, row.currency, row.amount);

    const totalExpenses = zeroTotals();
    for (const row of expenses) addTo(totalExpenses, row.currency, row.amount);

    const totalPaid = zeroTotals();
    for (const row of payments)
      addTo(totalPaid, row.recurringPayment.currency, row.amount);

    const byExpenseCategory = this.groupByCurrencyTotals(
      expenses,
      (e) => e.category,
      (e) => e.currency,
      (e) => e.amount,
    );
    const byIncomeType = this.groupByCurrencyTotals(
      incomes,
      (i) => i.type,
      (i) => i.currency,
      (i) => i.amount,
    );

    return {
      from: query.from,
      to: query.to,
      totals: { income: totalIncome, expenses: totalExpenses, paid: totalPaid },
      byExpenseCategory,
      byIncomeType,
      incomes,
      expenses,
      payments,
    };
  }

  async createClosing(userId: string, dto: CreateClosingDto) {
    const membership = await this.householdAccess.getMembership(
      userId,
      dto.householdId,
    );
    const householdId = membership.householdId;

    const existing = await this.prisma.monthlyClosing.findUnique({
      where: { householdId_period: { householdId, period: dto.month } },
    });
    if (existing) {
      throw new ConflictException('Ya existe un cierre para este período');
    }

    const household = await this.prisma.household.findUniqueOrThrow({
      where: { id: householdId },
    });
    const baseCurrency = household.baseCurrency;
    const monthStart = computeDueDate(dto.month, 1);
    const monthEnd = computeDueDate(nextPeriod(dto.month), 1);

    const [incomeSum, expenseSum, paymentSum, savingsSum] = await Promise.all([
      this.prisma.income.aggregate({
        where: {
          householdId,
          deletedAt: null,
          currency: baseCurrency,
          period: dto.month,
        },
        _sum: { amount: true },
      }),
      this.prisma.variableExpense.aggregate({
        where: {
          householdId,
          deletedAt: null,
          currency: baseCurrency,
          spentAt: { gte: monthStart, lt: monthEnd },
        },
        _sum: { amount: true },
      }),
      this.prisma.recurringPaymentOccurrence.aggregate({
        where: {
          recurringPayment: { householdId, currency: baseCurrency },
          period: dto.month,
          status: 'PAID',
        },
        _sum: { amount: true },
      }),
      this.prisma.goalContribution.aggregate({
        where: {
          currency: baseCurrency,
          contributedAt: { gte: monthStart, lt: monthEnd },
          goal: { householdId },
        },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = incomeSum._sum.amount ?? new Prisma.Decimal(0);
    const totalExpenses = expenseSum._sum.amount ?? new Prisma.Decimal(0);
    const totalPayments = paymentSum._sum.amount ?? new Prisma.Decimal(0);
    const savingsTotal = savingsSum._sum.amount ?? new Prisma.Decimal(0);
    const availableReal = totalIncome.minus(totalExpenses).minus(totalPayments);

    const closing = await this.prisma.monthlyClosing.create({
      data: {
        householdId,
        period: dto.month,
        totalIncome,
        totalExpenses,
        totalPayments,
        availableReal,
        savingsTotal,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        householdId,
        userId,
        action: 'monthlyClosing.create',
        entityType: 'MonthlyClosing',
        entityId: closing.id,
      },
    });

    return closing;
  }

  async listClosings(userId: string, query: ListClosingsQuery) {
    const membership = await this.householdAccess.getMembership(
      userId,
      query.householdId,
    );
    return this.prisma.monthlyClosing.findMany({
      where: { householdId: membership.householdId },
      orderBy: { period: 'desc' },
    });
  }

  async getClosing(userId: string, period: string, householdId?: string) {
    const membership = await this.householdAccess.getMembership(
      userId,
      householdId,
    );
    const closing = await this.prisma.monthlyClosing.findUnique({
      where: {
        householdId_period: { householdId: membership.householdId, period },
      },
    });
    if (!closing) {
      throw new NotFoundException('Cierre no encontrado para este período');
    }
    return closing;
  }

  private groupByCurrencyTotals<T>(
    rows: T[],
    getKey: (row: T) => string | null,
    getCurrency: (row: T) => 'DOP' | 'USD',
    getAmount: (row: T) => Prisma.Decimal,
  ) {
    const groups = new Map<string, CurrencyTotals>();
    for (const row of rows) {
      const key = getKey(row) ?? 'OTHER';
      const totals = groups.get(key) ?? zeroTotals();
      addTo(totals, getCurrency(row), getAmount(row));
      groups.set(key, totals);
    }
    return Array.from(groups.entries()).map(([key, totals]) => ({
      key,
      ...totals,
    }));
  }
}
