import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HouseholdAccessService } from '../household/household-access.service';
import type {
  CreateIncomeDto,
  UpdateIncomeDto,
  ListIncomeQuery,
} from './dto/income.schemas';

@Injectable()
export class IncomesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly householdAccess: HouseholdAccessService,
  ) {}

  async create(userId: string, dto: CreateIncomeDto) {
    const membership = await this.householdAccess.getMembership(
      userId,
      dto.householdId,
    );

    const memberId = dto.memberId
      ? await this.resolveTargetMemberId(membership.householdId, dto.memberId)
      : membership.id;

    const income = await this.prisma.income.create({
      data: {
        householdId: membership.householdId,
        memberId,
        type: dto.type,
        currency: dto.currency,
        amount: dto.amount,
        description: dto.description,
        period: dto.period,
        receivedAt: new Date(dto.receivedAt),
        isRecurring: dto.isRecurring ?? false,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        householdId: membership.householdId,
        userId,
        action: 'income.create',
        entityType: 'Income',
        entityId: income.id,
      },
    });

    return income;
  }

  async findAll(userId: string, query: ListIncomeQuery) {
    const membership = await this.householdAccess.getMembership(
      userId,
      query.householdId,
    );

    return this.prisma.income.findMany({
      where: {
        householdId: membership.householdId,
        deletedAt: null,
        ...(query.memberId ? { memberId: query.memberId } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.period ? { period: query.period } : {}),
      },
      orderBy: { receivedAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const income = await this.prisma.income.findUnique({ where: { id } });
    if (!income || income.deletedAt) {
      throw new NotFoundException('Ingreso no encontrado');
    }
    await this.householdAccess.getMembership(userId, income.householdId);
    return income;
  }

  async update(userId: string, id: string, dto: UpdateIncomeDto) {
    const income = await this.findOne(userId, id);

    const memberId = dto.memberId
      ? await this.resolveTargetMemberId(income.householdId, dto.memberId)
      : undefined;

    const updated = await this.prisma.income.update({
      where: { id: income.id },
      data: {
        ...(dto.type ? { type: dto.type } : {}),
        ...(dto.currency ? { currency: dto.currency } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.period ? { period: dto.period } : {}),
        ...(dto.receivedAt ? { receivedAt: new Date(dto.receivedAt) } : {}),
        ...(dto.isRecurring !== undefined
          ? { isRecurring: dto.isRecurring }
          : {}),
        ...(memberId ? { memberId } : {}),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        householdId: income.householdId,
        userId,
        action: 'income.update',
        entityType: 'Income',
        entityId: income.id,
      },
    });

    return updated;
  }

  async remove(userId: string, id: string) {
    const income = await this.findOne(userId, id);

    const conversionCount = await this.prisma.currencyConversion.count({
      where: { incomeId: income.id },
    });
    if (conversionCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar un ingreso con conversiones registradas (el historial de conversiones es inmutable)',
      );
    }

    await this.prisma.income.update({
      where: { id: income.id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        householdId: income.householdId,
        userId,
        action: 'income.delete',
        entityType: 'Income',
        entityId: income.id,
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
