import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HouseholdAccessService } from '../household/household-access.service';
import type {
  CreateExpenseDto,
  UpdateExpenseDto,
  ListExpenseQuery,
} from './dto/expense.schemas';

function monthRange(month: string): { gte: Date; lt: Date } {
  const [year, monthNum] = month.split('-').map(Number);
  const gte = new Date(Date.UTC(year, monthNum - 1, 1));
  const lt =
    monthNum === 12
      ? new Date(Date.UTC(year + 1, 0, 1))
      : new Date(Date.UTC(year, monthNum, 1));
  return { gte, lt };
}

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly householdAccess: HouseholdAccessService,
  ) {}

  async create(userId: string, dto: CreateExpenseDto) {
    const membership = await this.householdAccess.getMembership(
      userId,
      dto.householdId,
    );

    const memberId = dto.memberId
      ? await this.resolveTargetMemberId(membership.householdId, dto.memberId)
      : membership.id;

    const expense = await this.prisma.variableExpense.create({
      data: {
        householdId: membership.householdId,
        memberId,
        category: dto.category,
        currency: dto.currency,
        amount: dto.amount,
        description: dto.description,
        spentAt: new Date(dto.spentAt),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        householdId: membership.householdId,
        userId,
        action: 'expense.create',
        entityType: 'VariableExpense',
        entityId: expense.id,
      },
    });

    return expense;
  }

  async findAll(userId: string, query: ListExpenseQuery) {
    const membership = await this.householdAccess.getMembership(
      userId,
      query.householdId,
    );

    return this.prisma.variableExpense.findMany({
      where: {
        householdId: membership.householdId,
        deletedAt: null,
        ...(query.memberId ? { memberId: query.memberId } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.month ? { spentAt: monthRange(query.month) } : {}),
      },
      orderBy: { spentAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const expense = await this.prisma.variableExpense.findUnique({
      where: { id },
    });
    if (!expense || expense.deletedAt) {
      throw new NotFoundException('Gasto no encontrado');
    }
    await this.householdAccess.getMembership(userId, expense.householdId);
    return expense;
  }

  async update(userId: string, id: string, dto: UpdateExpenseDto) {
    const expense = await this.findOne(userId, id);

    const memberId = dto.memberId
      ? await this.resolveTargetMemberId(expense.householdId, dto.memberId)
      : undefined;

    const updated = await this.prisma.variableExpense.update({
      where: { id: expense.id },
      data: {
        ...(dto.category ? { category: dto.category } : {}),
        ...(dto.currency ? { currency: dto.currency } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.spentAt ? { spentAt: new Date(dto.spentAt) } : {}),
        ...(memberId ? { memberId } : {}),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        householdId: expense.householdId,
        userId,
        action: 'expense.update',
        entityType: 'VariableExpense',
        entityId: expense.id,
      },
    });

    return updated;
  }

  async remove(userId: string, id: string) {
    const expense = await this.findOne(userId, id);

    await this.prisma.variableExpense.update({
      where: { id: expense.id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        householdId: expense.householdId,
        userId,
        action: 'expense.delete',
        entityType: 'VariableExpense',
        entityId: expense.id,
      },
    });
  }

  private async resolveTargetMemberId(householdId: string, memberId: string) {
    const target = await this.prisma.householdMember.findUnique({
      where: { id: memberId },
    });
    if (!target || target.householdId !== householdId) {
      throw new ForbiddenException(
        'El miembro indicado no pertenece a este hogar',
      );
    }
    return target.id;
  }
}
