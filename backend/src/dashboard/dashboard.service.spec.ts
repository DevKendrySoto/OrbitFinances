import { Prisma } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { HouseholdAccessService } from '../household/household-access.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: {
    income: { findMany: jest.Mock; aggregate: jest.Mock };
    variableExpense: { findMany: jest.Mock };
    recurringPaymentOccurrence: { findMany: jest.Mock };
    currencyConversion: { aggregate: jest.Mock };
  };
  let householdAccess: { getMembership: jest.Mock };

  beforeEach(() => {
    prisma = {
      income: {
        findMany: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn(),
      },
      variableExpense: { findMany: jest.fn().mockResolvedValue([]) },
      recurringPaymentOccurrence: { findMany: jest.fn().mockResolvedValue([]) },
      currencyConversion: { aggregate: jest.fn() },
    };
    householdAccess = {
      getMembership: jest
        .fn()
        .mockResolvedValue({ householdId: 'household-1' }),
    };

    service = new DashboardService(
      prisma as unknown as PrismaService,
      householdAccess as unknown as HouseholdAccessService,
    );
  });

  it('returns availableReal = income - committed - expenses per currency', async () => {
    prisma.income.findMany.mockResolvedValue([
      { amount: new Prisma.Decimal(60000), currency: 'DOP' },
      { amount: new Prisma.Decimal(500), currency: 'USD' },
    ]);
    prisma.variableExpense.findMany.mockResolvedValue([
      { amount: new Prisma.Decimal(3000), currency: 'DOP' },
    ]);
    prisma.recurringPaymentOccurrence.findMany
      .mockResolvedValueOnce([
        {
          amount: new Prisma.Decimal(20000),
          recurringPayment: { currency: 'DOP' },
        },
      ])
      .mockResolvedValueOnce([]);
    prisma.income.aggregate.mockResolvedValue({
      _sum: { amount: new Prisma.Decimal(500) },
    });
    prisma.currencyConversion.aggregate.mockResolvedValue({
      _sum: { amountUsd: new Prisma.Decimal(200) },
    });

    const result = await service.getSummary('user-1', { month: '2026-07' });

    expect(result.availableReal.DOP.toString()).toBe('37000');
    expect(result.availableReal.USD.toString()).toBe('500');
    expect(result.savingsUsd.toString()).toBe('300');
    expect(result.monthStatus).toBe('ok');
  });

  it('flags monthStatus as critical when availableReal.DOP goes negative', async () => {
    prisma.income.findMany.mockResolvedValue([
      { amount: new Prisma.Decimal(10000), currency: 'DOP' },
    ]);
    prisma.recurringPaymentOccurrence.findMany
      .mockResolvedValueOnce([
        {
          amount: new Prisma.Decimal(20000),
          recurringPayment: { currency: 'DOP' },
        },
      ])
      .mockResolvedValueOnce([]);
    prisma.income.aggregate.mockResolvedValue({ _sum: { amount: null } });
    prisma.currencyConversion.aggregate.mockResolvedValue({
      _sum: { amountUsd: null },
    });

    const result = await service.getSummary('user-1', { month: '2026-07' });

    expect(result.availableReal.DOP.toString()).toBe('-10000');
    expect(result.monthStatus).toBe('critical');
  });

  it('adds DOP converted this period to availableReal.DOP', async () => {
    prisma.income.findMany.mockResolvedValue([
      { amount: new Prisma.Decimal(10000), currency: 'DOP' },
    ]);
    prisma.income.aggregate.mockResolvedValue({ _sum: { amount: null } });
    // First aggregate call is the all-time USD-converted total (savingsUsd),
    // second is this period's amountDop converted — same mocked method, order matters.
    prisma.currencyConversion.aggregate
      .mockResolvedValueOnce({ _sum: { amountUsd: new Prisma.Decimal(200) } })
      .mockResolvedValueOnce({
        _sum: { amountDop: new Prisma.Decimal(11800) },
      });

    const result = await service.getSummary('user-1', { month: '2026-07' });

    expect(result.convertedToDop.toString()).toBe('11800');
    expect(result.availableReal.DOP.toString()).toBe('21800');
  });
});
