import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HouseholdAccessService } from '../household/household-access.service';
import type {
  CreateGoalDto,
  UpdateGoalDto,
  ListGoalQuery,
  CreateContributionDto,
} from './dto/goal.schemas';

@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly householdAccess: HouseholdAccessService,
  ) {}

  async create(userId: string, dto: CreateGoalDto) {
    const membership = await this.householdAccess.getMembership(
      userId,
      dto.householdId,
    );

    const goal = await this.prisma.savingsGoal.create({
      data: {
        householdId: membership.householdId,
        name: dto.name,
        targetAmount: dto.targetAmount,
        currency: dto.currency,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        householdId: membership.householdId,
        userId,
        action: 'goal.create',
        entityType: 'SavingsGoal',
        entityId: goal.id,
      },
    });

    return this.withProgress(goal, []);
  }

  async findAll(userId: string, query: ListGoalQuery) {
    const membership = await this.householdAccess.getMembership(
      userId,
      query.householdId,
    );

    const goals = await this.prisma.savingsGoal.findMany({
      where: {
        householdId: membership.householdId,
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      goals.map(async (goal) => {
        const sum = await this.prisma.goalContribution.aggregate({
          where: { goalId: goal.id },
          _sum: { amount: true },
        });
        return this.withProgress(goal, undefined, sum._sum.amount);
      }),
    );
  }

  async findOne(userId: string, id: string) {
    const goal = await this.getGoalOrThrow(id);
    await this.householdAccess.getMembership(userId, goal.householdId);

    const contributions = await this.prisma.goalContribution.findMany({
      where: { goalId: id },
      orderBy: { contributedAt: 'desc' },
    });

    return this.withProgress(goal, contributions);
  }

  async update(userId: string, id: string, dto: UpdateGoalDto) {
    const goal = await this.getGoalOrThrow(id);
    await this.householdAccess.getMembership(userId, goal.householdId);

    await this.prisma.savingsGoal.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.targetAmount !== undefined
          ? { targetAmount: dto.targetAmount }
          : {}),
        ...(dto.targetDate ? { targetDate: new Date(dto.targetDate) } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        householdId: goal.householdId,
        userId,
        action: 'goal.update',
        entityType: 'SavingsGoal',
        entityId: goal.id,
      },
    });

    return this.findOne(userId, id);
  }

  async addContribution(
    userId: string,
    goalId: string,
    dto: CreateContributionDto,
  ) {
    const goal = await this.getGoalOrThrow(goalId);
    await this.householdAccess.getMembership(userId, goal.householdId);

    if (dto.currency !== goal.currency) {
      throw new BadRequestException(
        `El aporte debe estar en ${goal.currency}, la moneda de la meta`,
      );
    }

    const contribution = await this.prisma.goalContribution.create({
      data: {
        goalId,
        amount: dto.amount,
        currency: dto.currency,
        contributedAt: dto.contributedAt
          ? new Date(dto.contributedAt)
          : new Date(),
      },
    });

    const sum = await this.prisma.goalContribution.aggregate({
      where: { goalId },
      _sum: { amount: true },
    });
    const currentAmount = sum._sum.amount ?? new Prisma.Decimal(0);

    if (
      goal.status === 'IN_PROGRESS' &&
      currentAmount.greaterThanOrEqualTo(goal.targetAmount)
    ) {
      await this.prisma.savingsGoal.update({
        where: { id: goalId },
        data: { status: 'COMPLETED' },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        householdId: goal.householdId,
        userId,
        action: 'goal.contribution.create',
        entityType: 'GoalContribution',
        entityId: contribution.id,
      },
    });

    return this.findOne(userId, goalId);
  }

  private async getGoalOrThrow(id: string) {
    const goal = await this.prisma.savingsGoal.findUnique({ where: { id } });
    if (!goal) {
      throw new NotFoundException('Meta no encontrada');
    }
    return goal;
  }

  private withProgress(
    goal: {
      id: string;
      householdId: string;
      name: string;
      targetAmount: Prisma.Decimal;
      currency: string;
      targetDate: Date | null;
      status: string;
      createdAt: Date;
      updatedAt: Date;
    },
    contributions?: unknown[],
    precomputedSum?: Prisma.Decimal | null,
  ) {
    const currentAmount =
      precomputedSum ??
      (contributions
        ? (contributions as { amount: Prisma.Decimal }[]).reduce(
            (acc, c) => acc.add(c.amount),
            new Prisma.Decimal(0),
          )
        : new Prisma.Decimal(0));

    const target = new Prisma.Decimal(goal.targetAmount);
    const progressPercent = target.greaterThan(0)
      ? Prisma.Decimal.min(
          currentAmount.div(target).mul(100),
          100,
        ).toDecimalPlaces(2)
      : new Prisma.Decimal(0);
    const remaining = Prisma.Decimal.max(target.minus(currentAmount), 0);

    return {
      ...goal,
      currentAmount,
      progressPercent,
      remaining,
      ...(contributions ? { contributions } : {}),
    };
  }
}
