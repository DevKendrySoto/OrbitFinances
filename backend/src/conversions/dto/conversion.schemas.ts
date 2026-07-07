import { z } from 'zod';

export const createConversionSchema = z.object({
  incomeId: z.string().min(1, 'El ingreso es requerido'),
  amountUsd: z.number().positive('El monto en USD debe ser mayor a cero'),
  exchangeRate: z.number().positive('La tasa debe ser mayor a cero'),
  convertedAt: z.iso.datetime({ offset: true }).or(z.iso.date()).optional(),
});
export type CreateConversionDto = z.infer<typeof createConversionSchema>;

export const listConversionQuerySchema = z.object({
  householdId: z.string().optional(),
  incomeId: z.string().optional(),
});
export type ListConversionQuery = z.infer<typeof listConversionQuerySchema>;
