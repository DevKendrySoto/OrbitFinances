import { z } from 'zod';

const periodRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

export const createIncomeSchema = z.object({
  householdId: z.string().optional(),
  memberId: z.string().optional(),
  type: z.enum(['SALARY', 'FREELANCE', 'OTHER']),
  currency: z.enum(['USD', 'DOP']),
  amount: z.number().positive('El monto debe ser mayor a cero'),
  description: z.string().optional(),
  period: z
    .string()
    .regex(periodRegex, 'El período debe tener formato YYYY-MM'),
  receivedAt: z.iso.datetime({ offset: true }).or(z.iso.date()),
  isRecurring: z.boolean().optional(),
});
export type CreateIncomeDto = z.infer<typeof createIncomeSchema>;

export const updateIncomeSchema = createIncomeSchema
  .omit({ householdId: true })
  .partial();
export type UpdateIncomeDto = z.infer<typeof updateIncomeSchema>;

export const listIncomeQuerySchema = z.object({
  householdId: z.string().optional(),
  memberId: z.string().optional(),
  type: z.enum(['SALARY', 'FREELANCE', 'OTHER']).optional(),
  period: z.string().regex(periodRegex).optional(),
});
export type ListIncomeQuery = z.infer<typeof listIncomeQuerySchema>;
