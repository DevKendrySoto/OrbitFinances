import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { IncomesService } from './incomes.service';
import { PrismaService } from '../prisma/prisma.service';
import { HouseholdAccessService } from '../household/household-access.service';

describe('IncomesService', () => {
  let incomesService: IncomesService;
  let prisma: {
    income: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    householdMember: { findUnique: jest.Mock };
    auditLog: { create: jest.Mock };
  };
  let householdAccess: { getMembership: jest.Mock };

  beforeEach(() => {
    prisma = {
      income: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      householdMember: { findUnique: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    householdAccess = { getMembership: jest.fn() };

    incomesService = new IncomesService(
      prisma as unknown as PrismaService,
      householdAccess as unknown as HouseholdAccessService,
    );
  });

  describe('findOne', () => {
    it('throws NotFound for a soft-deleted income', async () => {
      prisma.income.findUnique.mockResolvedValue({
        id: 'income-1',
        householdId: 'household-1',
        deletedAt: new Date(),
      });

      await expect(
        incomesService.findOne('user-1', 'income-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFound when the income does not exist', async () => {
      prisma.income.findUnique.mockResolvedValue(null);

      await expect(incomesService.findOne('user-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects access when the user does not belong to the income household', async () => {
      prisma.income.findUnique.mockResolvedValue({
        id: 'income-1',
        householdId: 'household-other',
        deletedAt: null,
      });
      householdAccess.getMembership.mockRejectedValue(
        new ForbiddenException('No perteneces a este hogar'),
      );

      await expect(
        incomesService.findOne('user-1', 'income-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('assigns the income to the caller membership when no memberId is given', async () => {
      householdAccess.getMembership.mockResolvedValue({
        id: 'member-1',
        householdId: 'household-1',
      });
      let receivedData: { memberId: string; householdId: string } | undefined;
      prisma.income.create.mockImplementation(
        (args: { data: typeof receivedData }) => {
          receivedData = args.data;
          return Promise.resolve({ id: 'income-1' });
        },
      );

      await incomesService.create('user-1', {
        type: 'SALARY',
        currency: 'DOP',
        amount: 1000,
        period: '2026-07',
        receivedAt: '2026-07-01',
      });

      expect(receivedData?.memberId).toBe('member-1');
      expect(receivedData?.householdId).toBe('household-1');
    });

    it('rejects a memberId belonging to a different household', async () => {
      householdAccess.getMembership.mockResolvedValue({
        id: 'member-1',
        householdId: 'household-1',
      });
      prisma.householdMember.findUnique.mockResolvedValue({
        id: 'member-2',
        householdId: 'household-other',
      });

      await expect(
        incomesService.create('user-1', {
          type: 'SALARY',
          currency: 'DOP',
          amount: 1000,
          period: '2026-07',
          receivedAt: '2026-07-01',
          memberId: 'member-2',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
