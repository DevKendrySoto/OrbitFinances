import { z } from 'zod';

export const createExpenseSchema = z.object({
  category: z.enum([
    'SUPERMARKET',
    'COLMADO',
    'FOOD',
    'TRANSPORT',
    'OUTINGS',
    'OTHER',
    'UNEXPECTED',
  ]),
  currency: z.enum(['USD', 'DOP']),
  amount: z.number().positive('El monto debe ser mayor a cero'),
  spentAt: z.string().min(1, 'La fecha es requerida'),
  description: z.string().optional(),
});
export type CreateExpenseValues = z.infer<typeof createExpenseSchema>;

export const editExpenseSchema = createExpenseSchema.omit({ currency: true });
export type EditExpenseValues = z.infer<typeof editExpenseSchema>;
