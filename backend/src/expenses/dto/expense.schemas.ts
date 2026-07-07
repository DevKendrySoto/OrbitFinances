import { z } from 'zod';

const expenseCategory = z.enum([
  'SUPERMARKET',
  'COLMADO',
  'FOOD',
  'TRANSPORT',
  'OUTINGS',
  'OTHER',
  'UNEXPECTED',
]);

export const createExpenseSchema = z.object({
  householdId: z.string().optional(),
  memberId: z.string().optional(),
  category: expenseCategory,
  currency: z.enum(['USD', 'DOP']),
  amount: z.number().positive('El monto debe ser mayor a cero'),
  description: z.string().optional(),
  spentAt: z.iso.datetime({ offset: true }).or(z.iso.date()),
});
export type CreateExpenseDto = z.infer<typeof createExpenseSchema>;

export const updateExpenseSchema = createExpenseSchema
  .omit({ householdId: true })
  .partial();
export type UpdateExpenseDto = z.infer<typeof updateExpenseSchema>;

export const listExpenseQuerySchema = z.object({
  householdId: z.string().optional(),
  memberId: z.string().optional(),
  category: expenseCategory.optional(),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El mes debe tener formato YYYY-MM')
    .optional(),
});
export type ListExpenseQuery = z.infer<typeof listExpenseQuerySchema>;
