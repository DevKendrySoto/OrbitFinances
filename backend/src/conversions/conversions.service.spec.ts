import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConversionsService } from './conversions.service';
import { PrismaService } from '../prisma/prisma.service';
import { HouseholdAccessService } from '../household/household-access.service';

describe('ConversionsService', () => {
  let conversionsService: ConversionsService;
  let prisma: {
    income: { findUnique: jest.Mock };
    currencyConversion: {
      create: jest.Mock;
      aggregate: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
    auditLog: { create: jest.Mock };
  };
  let householdAccess: { getMembership: jest.Mock };

  beforeEach(() => {
    prisma = {
      income: { findUnique: jest.fn() },
      currencyConversion: {
        create: jest.fn(),
        aggregate: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      auditLog: { create: jest.fn() },
    };
    householdAccess = { getMembership: jest.fn() };

    conversionsService = new ConversionsService(
      prisma as unknown as PrismaService,
      householdAccess as unknown as HouseholdAccessService,
    );
  });

  describe('create', () => {
    it('rejects converting a non-USD income', async () => {
      prisma.income.findUnique.mockResolvedValue({
        id: 'income-1',
        householdId: 'household-1',
        currency: 'DOP',
        amount: new Prisma.Decimal(1000),
        deletedAt: null,
      });

      await expect(
        conversionsService.create('user-1', {
          incomeId: 'income-1',
          amountUsd: 100,
          exchangeRate: 58.5,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a conversion that overdraws the remaining USD balance', async () => {
      prisma.income.findUnique.mockResolvedValue({
        id: 'income-1',
        householdId: 'household-1',
        currency: 'USD',
        amount: new Prisma.Decimal(500),
        deletedAt: null,
      });
      householdAccess.getMembership.mockResolvedValue({
        householdId: 'household-1',
      });
      prisma.currencyConversion.aggregate.mockResolvedValue({
        _sum: { amountUsd: new Prisma.Decimal(450) },
      });

      await expect(
        conversionsService.create('user-1', {
          incomeId: 'income-1',
          amountUsd: 100,
          exchangeRate: 58.5,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('computes amountDop precisely from amountUsd * exchangeRate', async () => {
      prisma.income.findUnique.mockResolvedValue({
        id: 'income-1',
        householdId: 'household-1',
        currency: 'USD',
        amount: new Prisma.Decimal(500),
        deletedAt: null,
      });
      householdAccess.getMembership.mockResolvedValue({
        householdId: 'household-1',
      });
      prisma.currencyConversion.aggregate.mockResolvedValue({
        _sum: { amountUsd: null },
      });
      let receivedData: { amountDop: Prisma.Decimal } | undefined;
      prisma.currencyConversion.create.mockImplementation(
        (args: { data: typeof receivedData }) => {
          receivedData = args.data;
          return Promise.resolve({ id: 'conversion-1' });
        },
      );

      await conversionsService.create('user-1', {
        incomeId: 'income-1',
        amountUsd: 200,
        exchangeRate: 58.5,
      });

      expect(receivedData?.amountDop.toFixed(2)).toBe('11700.00');
    });
  });

  describe('findOne', () => {
    it('throws NotFound when the conversion does not exist', async () => {
      prisma.currencyConversion.findUnique.mockResolvedValue(null);
      await expect(
        conversionsService.findOne('user-1', 'missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
