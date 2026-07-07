import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RecurringPayment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HouseholdAccessService } from '../household/household-access.service';
import {
  computeDueDate,
  formatPeriod,
  isPeriodWithinRange,
  nextPeriod,
} from './lib/period';
import type {
  CreateRecurringPaymentDto,
  UpdateRecurringPaymentDto,
  ListRecurringPaymentQuery,
  ListOccurrenceQuery,
  PayOccurrenceDto,
} from './dto/recurring-payment.schemas';

@Injectable()
export class RecurringPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly householdAccess: HouseholdAccessService,
  ) {}

  async create(userId: string, dto: CreateRecurringPaymentDto) {
    const membership = await this.householdAccess.getMembership(
      userId,
      dto.householdId,
    );

    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    const payment = await this.prisma.recurringPayment.create({
      data: {
        householdId: membership.householdId,
        name: dto.name,
        category: dto.category,
        amount: dto.amount,
        currency: dto.currency,
        priority: dto.priority ?? 'IMPORTANT',
        frequency: dto.frequency ?? 'MONTHLY',
        dueDay: dto.dueDay,
        secondaryDueDay: dto.secondaryDueDay,
        startDate,
        endDate,
      },
    });

    await this.generateOccurrencesForPeriod(payment, formatPeriod(startDate));

    await this.prisma.auditLog.create({
      data: {
        householdId: membership.householdId,
        userId,
        action: 'recurringPayment.create',
        entityType: 'RecurringPayment',
        entityId: payment.id,
      },
    });

    return this.findOne(userId, payment.id);
  }

  async findAll(userId: string, query: ListRecurringPaymentQuery) {
    const membership = await this.householdAccess.getMembership(
      userId,
      query.householdId,
    );

    return this.prisma.recurringPayment.findMany({
      where: {
        householdId: membership.householdId,
        deletedAt: null,
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
        ...(query.priority ? { priority: query.priority } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const payment = await this.getActivePaymentOrThrow(id);
    await this.householdAccess.getMembership(userId, payment.householdId);

    const occurrences = await this.prisma.recurringPaymentOccurrence.findMany({
      where: { recurringPaymentId: id },
      orderBy: { dueDate: 'desc' },
    });

    return { ...payment, occurrences };
  }

  async update(userId: string, id: string, dto: UpdateRecurringPaymentDto) {
    const payment = await this.getActivePaymentOrThrow(id);
    await this.householdAccess.getMembership(userId, payment.householdId);

    await this.prisma.recurringPayment.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.currency ? { currency: dto.currency } : {}),
        ...(dto.priority ? { priority: dto.priority } : {}),
        ...(dto.frequency ? { frequency: dto.frequency } : {}),
        ...(dto.dueDay !== undefined ? { dueDay: dto.dueDay } : {}),
        ...(dto.secondaryDueDay !== undefined
          ? { secondaryDueDay: dto.secondaryDueDay }
          : {}),
        ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        householdId: payment.householdId,
        userId,
        action: 'recurringPayment.update',
        entityType: 'RecurringPayment',
        entityId: payment.id,
      },
    });

    return this.findOne(userId, id);
  }

  /** Regla de negocio: "eliminar" solo afecta ocurrencias futuras (PENDING);
   * el historial de pagos ya realizados nunca se borra ni se toca. */
  async remove(userId: string, id: string) {
    const payment = await this.getActivePaymentOrThrow(id);
    await this.householdAccess.getMembership(userId, payment.householdId);

    await this.prisma.$transaction([
      this.prisma.recurringPayment.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      }),
      this.prisma.recurringPaymentOccurrence.updateMany({
        where: { recurringPaymentId: id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      }),
    ]);

    await this.prisma.auditLog.create({
      data: {
        householdId: payment.householdId,
        userId,
        action: 'recurringPayment.delete',
        entityType: 'RecurringPayment',
        entityId: payment.id,
      },
    });
  }

  async listOccurrences(userId: string, query: ListOccurrenceQuery) {
    const membership = await this.householdAccess.getMembership(
      userId,
      query.householdId,
    );

    if (query.recurringPaymentId) {
      const payment = await this.prisma.recurringPayment.findUnique({
        where: { id: query.recurringPaymentId },
      });
      if (!payment || payment.householdId !== membership.householdId) {
        throw new NotFoundException('Pago recurrente no encontrado');
      }
    }

    return this.prisma.recurringPaymentOccurrence.findMany({
      where: {
        recurringPayment: { householdId: membership.householdId },
        ...(query.recurringPaymentId
          ? { recurringPaymentId: query.recurringPaymentId }
          : {}),
        ...(query.period ? { period: query.period } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      include: {
        recurringPayment: {
          select: {
            name: true,
            category: true,
            priority: true,
            currency: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /** Marca una ocurrencia como pagada y genera automáticamente la del
   * siguiente período (regla de negocio: generación automática). */
  async payOccurrence(
    userId: string,
    occurrenceId: string,
    dto: PayOccurrenceDto,
  ) {
    const occurrence = await this.getOccurrenceOrThrow(occurrenceId);
    const payment = await this.getActivePaymentOrThrow(
      occurrence.recurringPaymentId,
    );
    await this.householdAccess.getMembership(userId, payment.householdId);

    if (occurrence.status !== 'PENDING' && occurrence.status !== 'OVERDUE') {
      throw new BadRequestException(
        'Solo se pueden marcar como pagadas ocurrencias pendientes',
      );
    }

    const updated = await this.prisma.recurringPaymentOccurrence.update({
      where: { id: occurrenceId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paidAmount: dto.paidAmount ?? occurrence.amount,
      },
    });

    if (payment.isActive) {
      await this.generateOccurrencesForPeriod(
        payment,
        nextPeriod(occurrence.period),
      );
    }

    await this.prisma.auditLog.create({
      data: {
        householdId: payment.householdId,
        userId,
        action: 'recurringPaymentOccurrence.pay',
        entityType: 'RecurringPaymentOccurrence',
        entityId: occurrence.id,
      },
    });

    return updated;
  }

  /** Regla de negocio: solo se pueden cancelar ocurrencias futuras (PENDING);
   * las ya pagadas quedan como historial inmutable. */
  async cancelOccurrence(userId: string, occurrenceId: string) {
    const occurrence = await this.getOccurrenceOrThrow(occurrenceId);
    const payment = await this.getActivePaymentOrThrow(
      occurrence.recurringPaymentId,
    );
    await this.householdAccess.getMembership(userId, payment.householdId);

    if (occurrence.status !== 'PENDING') {
      throw new BadRequestException(
        'Solo se pueden cancelar ocurrencias pendientes',
      );
    }

    const updated = await this.prisma.recurringPaymentOccurrence.update({
      where: { id: occurrenceId },
      data: { status: 'CANCELLED' },
    });

    await this.prisma.auditLog.create({
      data: {
        householdId: payment.householdId,
        userId,
        action: 'recurringPaymentOccurrence.cancel',
        entityType: 'RecurringPaymentOccurrence',
        entityId: occurrence.id,
      },
    });

    return updated;
  }

  private async generateOccurrencesForPeriod(
    payment: RecurringPayment,
    period: string,
  ) {
    if (!isPeriodWithinRange(period, payment.startDate, payment.endDate)) {
      return;
    }

    const dueDays = [payment.dueDay];
    if (payment.frequency === 'BIWEEKLY' && payment.secondaryDueDay) {
      dueDays.push(payment.secondaryDueDay);
    }

    for (const day of dueDays) {
      const dueDate = computeDueDate(period, day);
      await this.prisma.recurringPaymentOccurrence.upsert({
        where: {
          recurringPaymentId_period_dueDate: {
            recurringPaymentId: payment.id,
            period,
            dueDate,
          },
        },
        create: {
          recurringPaymentId: payment.id,
          period,
          dueDate,
          amount: payment.amount,
        },
        update: {},
      });
    }
  }

  private async getActivePaymentOrThrow(id: string) {
    const payment = await this.prisma.recurringPayment.findUnique({
      where: { id },
    });
    if (!payment || payment.deletedAt) {
      throw new NotFoundException('Pago recurrente no encontrado');
    }
    return payment;
  }

  private async getOccurrenceOrThrow(id: string) {
    const occurrence = await this.prisma.recurringPaymentOccurrence.findUnique({
      where: { id },
    });
    if (!occurrence) {
      throw new NotFoundException('Ocurrencia no encontrada');
    }
    return occurrence;
  }
}
