import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { PrismaService } from '../prisma/prisma.service';
import { HouseholdAccessService } from '../household/household-access.service';

describe('ExpensesService', () => {
  let expensesService: ExpensesService;
  let prisma: {
    variableExpense: {
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
      variableExpense: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      householdMember: { findUnique: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    householdAccess = { getMembership: jest.fn() };

    expensesService = new ExpensesService(
      prisma as unknown as PrismaService,
      householdAccess as unknown as HouseholdAccessService,
    );
  });

  describe('findOne', () => {
    it('throws NotFound for a soft-deleted expense', async () => {
      prisma.variableExpense.findUnique.mockResolvedValue({
        id: 'expense-1',
        householdId: 'household-1',
        deletedAt: new Date(),
      });

      await expect(
        expensesService.findOne('user-1', 'expense-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects access when the user does not belong to the expense household', async () => {
      prisma.variableExpense.findUnique.mockResolvedValue({
        id: 'expense-1',
        householdId: 'household-other',
        deletedAt: null,
      });
      householdAccess.getMembership.mockRejectedValue(
        new ForbiddenException('No perteneces a este hogar'),
      );

      await expect(
        expensesService.findOne('user-1', 'expense-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('assigns the expense to the caller membership when no memberId is given', async () => {
      householdAccess.getMembership.mockResolvedValue({
        id: 'member-1',
        householdId: 'household-1',
      });
      let receivedData: { memberId: string; householdId: string } | undefined;
      prisma.variableExpense.create.mockImplementation(
        (args: { data: typeof receivedData }) => {
          receivedData = args.data;
          return Promise.resolve({ id: 'expense-1' });
        },
      );

      await expensesService.create('user-1', {
        category: 'SUPERMARKET',
        currency: 'DOP',
        amount: 1000,
        spentAt: '2026-07-01',
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
        expensesService.create('user-1', {
          category: 'SUPERMARKET',
          currency: 'DOP',
          amount: 1000,
          spentAt: '2026-07-01',
          memberId: 'member-2',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
