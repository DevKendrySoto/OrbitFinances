import { BadRequestException } from '@nestjs/common';
import { RecurringPaymentsService } from './recurring-payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { HouseholdAccessService } from '../household/household-access.service';

describe('RecurringPaymentsService', () => {
  let service: RecurringPaymentsService;
  let prisma: {
    recurringPayment: { findUnique: jest.Mock; update: jest.Mock };
    recurringPaymentOccurrence: {
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      upsert: jest.Mock;
    };
    auditLog: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let householdAccess: { getMembership: jest.Mock };

  beforeEach(() => {
    prisma = {
      recurringPayment: { findUnique: jest.fn(), update: jest.fn() },
      recurringPaymentOccurrence: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        upsert: jest.fn(),
      },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    };
    householdAccess = { getMembership: jest.fn() };

    service = new RecurringPaymentsService(
      prisma as unknown as PrismaService,
      householdAccess as unknown as HouseholdAccessService,
    );
  });

  describe('payOccurrence', () => {
    it('rejects marking an already-paid occurrence as paid again', async () => {
      prisma.recurringPaymentOccurrence.findUnique.mockResolvedValue({
        id: 'occ-1',
        recurringPaymentId: 'rp-1',
        status: 'PAID',
        period: '2026-07',
        amount: 15000,
      });
      prisma.recurringPayment.findUnique.mockResolvedValue({
        id: 'rp-1',
        householdId: 'household-1',
        deletedAt: null,
        isActive: true,
      });

      await expect(
        service.payOccurrence('user-1', 'occ-1', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects marking a cancelled occurrence as paid', async () => {
      prisma.recurringPaymentOccurrence.findUnique.mockResolvedValue({
        id: 'occ-1',
        recurringPaymentId: 'rp-1',
        status: 'CANCELLED',
        period: '2026-07',
        amount: 15000,
      });
      prisma.recurringPayment.findUnique.mockResolvedValue({
        id: 'rp-1',
        householdId: 'household-1',
        deletedAt: null,
        isActive: true,
      });

      await expect(
        service.payOccurrence('user-1', 'occ-1', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelOccurrence', () => {
    it('rejects cancelling an occurrence that is already paid (history is immutable)', async () => {
      prisma.recurringPaymentOccurrence.findUnique.mockResolvedValue({
        id: 'occ-1',
        recurringPaymentId: 'rp-1',
        status: 'PAID',
      });
      prisma.recurringPayment.findUnique.mockResolvedValue({
        id: 'rp-1',
        householdId: 'household-1',
        deletedAt: null,
      });

      await expect(service.cancelOccurrence('user-1', 'occ-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('soft-deletes the payment and cancels only PENDING occurrences, preserving paid history', async () => {
      prisma.recurringPayment.findUnique.mockResolvedValue({
        id: 'rp-1',
        householdId: 'household-1',
        deletedAt: null,
      });
      householdAccess.getMembership.mockResolvedValue({
        householdId: 'household-1',
      });

      await service.remove('user-1', 'rp-1');

      expect(prisma.recurringPaymentOccurrence.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { recurringPaymentId: 'rp-1', status: 'PENDING' },
        }),
      );
    });
  });
});
