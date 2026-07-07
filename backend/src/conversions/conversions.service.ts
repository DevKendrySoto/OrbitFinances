import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HouseholdAccessService } from '../household/household-access.service';
import type {
  CreateConversionDto,
  ListConversionQuery,
} from './dto/conversion.schemas';

@Injectable()
export class ConversionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly householdAccess: HouseholdAccessService,
  ) {}

  async create(userId: string, dto: CreateConversionDto) {
    const income = await this.getUsdIncomeOrThrow(dto.incomeId);
    await this.householdAccess.getMembership(userId, income.householdId);

    const remaining = await this.getRemainingUsd(income.id, income.amount);
    const amountUsd = new Prisma.Decimal(dto.amountUsd);
    if (amountUsd.greaterThan(remaining)) {
      throw new BadRequestException(
        `Saldo USD insuficiente: disponible ${remaining.toFixed(2)}, solicitado ${amountUsd.toFixed(2)}`,
      );
    }

    const exchangeRate = new Prisma.Decimal(dto.exchangeRate);
    const amountDop = amountUsd.mul(exchangeRate).toDecimalPlaces(2);

    const conversion = await this.prisma.currencyConversion.create({
      data: {
        householdId: income.householdId,
        incomeId: income.id,
        amountUsd,
        exchangeRate,
        amountDop,
        convertedAt: dto.convertedAt ? new Date(dto.convertedAt) : new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        householdId: income.householdId,
        userId,
        action: 'conversion.create',
        entityType: 'CurrencyConversion',
        entityId: conversion.id,
      },
    });

    return conversion;
  }

  async findAll(userId: string, query: ListConversionQuery) {
    const membership = await this.householdAccess.getMembership(
      userId,
      query.householdId,
    );

    if (query.incomeId) {
      const income = await this.prisma.income.findUnique({
        where: { id: query.incomeId },
      });
      if (!income || income.householdId !== membership.householdId) {
        throw new NotFoundException('Ingreso no encontrado');
      }
    }

    return this.prisma.currencyConversion.findMany({
      where: {
        householdId: membership.householdId,
        ...(query.incomeId ? { incomeId: query.incomeId } : {}),
      },
      orderBy: { convertedAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const conversion = await this.prisma.currencyConversion.findUnique({
      where: { id },
    });
    if (!conversion) {
      throw new NotFoundException('Conversión no encontrada');
    }
    await this.householdAccess.getMembership(userId, conversion.householdId);
    return conversion;
  }

  async getBalance(userId: string, incomeId: string) {
    const income = await this.getUsdIncomeOrThrow(incomeId);
    await this.householdAccess.getMembership(userId, income.householdId);

    const remaining = await this.getRemainingUsd(income.id, income.amount);
    return {
      incomeId: income.id,
      totalUsd: income.amount,
      remainingUsd: remaining,
      convertedUsd: new Prisma.Decimal(income.amount).minus(remaining),
    };
  }

  private async getUsdIncomeOrThrow(incomeId: string) {
    const income = await this.prisma.income.findUnique({
      where: { id: incomeId },
    });
    if (!income || income.deletedAt) {
      throw new NotFoundException('Ingreso no encontrado');
    }
    if (income.currency !== 'USD') {
      throw new BadRequestException('Solo se pueden convertir ingresos en USD');
    }
    return income;
  }

  private async getRemainingUsd(incomeId: string, totalAmount: Prisma.Decimal) {
    const result = await this.prisma.currencyConversion.aggregate({
      where: { incomeId },
      _sum: { amountUsd: true },
    });
    const converted = result._sum.amountUsd ?? new Prisma.Decimal(0);
    return new Prisma.Decimal(totalAmount).minus(converted);
  }
}
