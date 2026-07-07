import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { HouseholdAccessService } from '../household/household-access.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: {
    income: { findMany: jest.Mock; aggregate: jest.Mock };
    variableExpense: { findMany: jest.Mock; aggregate: jest.Mock };
    recurringPaymentOccurrence: { findMany: jest.Mock; aggregate: jest.Mock };
    goalContribution: { aggregate: jest.Mock };
    monthlyClosing: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
    };
    household: { findUniqueOrThrow: jest.Mock };
    auditLog: { create: jest.Mock };
  };
  let householdAccess: { getMembership: jest.Mock };

  beforeEach(() => {
    prisma = {
      income: {
        findMany: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn(),
      },
      variableExpense: {
        findMany: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn(),
      },
      recurringPaymentOccurrence: {
        findMany: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn(),
      },
      goalContribution: { aggregate: jest.fn() },
      monthlyClosing: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      household: { findUniqueOrThrow: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    householdAccess = {
      getMembership: jest
        .fn()
        .mockResolvedValue({ householdId: 'household-1' }),
    };

    service = new ReportsService(
      prisma as unknown as PrismaService,
      householdAccess as unknown as HouseholdAccessService,
    );
  });

  describe('createClosing', () => {
    it('rejects creating a second closing for the same period (immutability)', async () => {
      prisma.monthlyClosing.findUnique.mockResolvedValue({ id: 'closing-1' });

      await expect(
        service.createClosing('user-1', { month: '2026-07' }),
      ).rejects.toThrow(ConflictException);
    });

    it('computes availableReal = income - expenses - payments in the base currency', async () => {
      prisma.monthlyClosing.findUnique.mockResolvedValue(null);
      prisma.household.findUniqueOrThrow.mockResolvedValue({
        baseCurrency: 'DOP',
      });
      prisma.income.aggregate.mockResolvedValue({
        _sum: { amount: new Prisma.Decimal(40000) },
      });
      prisma.variableExpense.aggregate.mockResolvedValue({
        _sum: { amount: new Prisma.Decimal(2500) },
      });
      prisma.recurringPaymentOccurrence.aggregate.mockResolvedValue({
        _sum: { amount: new Prisma.Decimal(15000) },
      });
      prisma.goalContribution.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });
      let receivedData:
        | { availableReal: Prisma.Decimal; totalIncome: Prisma.Decimal }
        | undefined;
      prisma.monthlyClosing.create.mockImplementation(
        (args: { data: typeof receivedData }) => {
          receivedData = args.data;
          return Promise.resolve({ id: 'closing-1' });
        },
      );

      await service.createClosing('user-1', { month: '2026-07' });

      expect(receivedData?.availableReal.toString()).toBe('22500');
      expect(receivedData?.totalIncome.toString()).toBe('40000');
    });
  });

  describe('getClosing', () => {
    it('throws NotFound when no closing exists for the period (does not leak other households)', async () => {
      prisma.monthlyClosing.findUnique.mockResolvedValue(null);

      await expect(service.getClosing('user-1', '2026-08')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
