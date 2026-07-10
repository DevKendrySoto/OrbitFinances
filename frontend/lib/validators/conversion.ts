import { z } from 'zod';

export const createConversionSchema = z.object({
  amountUsd: z.number().positive('El monto en USD debe ser mayor a cero'),
  exchangeRate: z.number().positive('La tasa debe ser mayor a cero'),
});
export type CreateConversionValues = z.infer<typeof createConversionSchema>;
