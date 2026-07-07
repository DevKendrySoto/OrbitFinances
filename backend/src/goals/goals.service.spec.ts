import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GoalsService } from './goals.service';
import { PrismaService } from '../prisma/prisma.service';
import { HouseholdAccessService } from '../household/household-access.service';

describe('GoalsService', () => {
  let service: GoalsService;
  let prisma: {
    savingsGoal: { findUnique: jest.Mock; update: jest.Mock };
    goalContribution: {
      create: jest.Mock;
      aggregate: jest.Mock;
      findMany: jest.Mock;
    };
    auditLog: { create: jest.Mock };
  };
  let householdAccess: { getMembership: jest.Mock };

  beforeEach(() => {
    prisma = {
      savingsGoal: { findUnique: jest.fn(), update: jest.fn() },
      goalContribution: {
        create: jest.fn(),
        aggregate: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      auditLog: { create: jest.fn() },
    };
    householdAccess = { getMembership: jest.fn() };

    service = new GoalsService(
      prisma as unknown as PrismaService,
      householdAccess as unknown as HouseholdAccessService,
    );
  });

  describe('addContribution', () => {
    it('rejects a contribution in a different currency than the goal', async () => {
      prisma.savingsGoal.findUnique.mockResolvedValue({
        id: 'goal-1',
        householdId: 'household-1',
        currency: 'DOP',
        targetAmount: new Prisma.Decimal(50000),
        status: 'IN_PROGRESS',
      });
      householdAccess.getMembership.mockResolvedValue({
        householdId: 'household-1',
      });

      await expect(
        service.addContribution('user-1', 'goal-1', {
          amount: 100,
          currency: 'USD',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFound for a goal that does not exist', async () => {
      prisma.savingsGoal.findUnique.mockResolvedValue(null);

      await expect(
        service.addContribution('user-1', 'missing', {
          amount: 100,
          currency: 'DOP',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('auto-completes the goal once contributions reach the target', async () => {
      prisma.savingsGoal.findUnique.mockResolvedValue({
        id: 'goal-1',
        householdId: 'household-1',
        currency: 'DOP',
        targetAmount: new Prisma.Decimal(50000),
        status: 'IN_PROGRESS',
      });
      householdAccess.getMembership.mockResolvedValue({
        householdId: 'household-1',
      });
      prisma.goalContribution.create.mockResolvedValue({
        id: 'contribution-1',
      });
      prisma.goalContribution.aggregate.mockResolvedValue({
        _sum: { amount: new Prisma.Decimal(50000) },
      });

      await service.addContribution('user-1', 'goal-1', {
        amount: 50000,
        currency: 'DOP',
      });

      expect(prisma.savingsGoal.update).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
        data: { status: 'COMPLETED' },
      });
    });

    it('does not re-trigger completion when the goal is already completed', async () => {
      prisma.savingsGoal.findUnique.mockResolvedValue({
        id: 'goal-1',
        householdId: 'household-1',
        currency: 'DOP',
        targetAmount: new Prisma.Decimal(50000),
        status: 'COMPLETED',
      });
      householdAccess.getMembership.mockResolvedValue({
        householdId: 'household-1',
      });
      prisma.goalContribution.create.mockResolvedValue({
        id: 'contribution-2',
      });
      prisma.goalContribution.aggregate.mockResolvedValue({
        _sum: { amount: new Prisma.Decimal(55000) },
      });

      await service.addContribution('user-1', 'goal-1', {
        amount: 5000,
        currency: 'DOP',
      });

      expect(prisma.savingsGoal.update).not.toHaveBeenCalled();
    });
  });
});
