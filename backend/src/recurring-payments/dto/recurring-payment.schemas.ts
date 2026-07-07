import { z } from 'zod';

const dueDay = z.number().int().min(1).max(31);
const dateInput = z.iso.datetime({ offset: true }).or(z.iso.date());

export const createRecurringPaymentSchema = z
  .object({
    householdId: z.string().optional(),
    name: z.string().min(1, 'El nombre es requerido'),
    category: z.string().optional(),
    amount: z.number().positive('El monto debe ser mayor a cero'),
    currency: z.enum(['USD', 'DOP']),
    priority: z.enum(['CRITICAL', 'IMPORTANT', 'OPTIONAL']).optional(),
    frequency: z.enum(['MONTHLY', 'BIWEEKLY']).optional(),
    dueDay,
    secondaryDueDay: dueDay.optional(),
    startDate: dateInput,
    endDate: dateInput.optional(),
  })
  .refine(
    (data) =>
      data.frequency !== 'BIWEEKLY' || data.secondaryDueDay !== undefined,
    {
      message: 'secondaryDueDay es requerido para frecuencia quincenal',
      path: ['secondaryDueDay'],
    },
  );
export type CreateRecurringPaymentDto = z.infer<
  typeof createRecurringPaymentSchema
>;

export const updateRecurringPaymentSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional(),
  amount: z.number().positive().optional(),
  currency: z.enum(['USD', 'DOP']).optional(),
  priority: z.enum(['CRITICAL', 'IMPORTANT', 'OPTIONAL']).optional(),
  frequency: z.enum(['MONTHLY', 'BIWEEKLY']).optional(),
  dueDay: dueDay.optional(),
  secondaryDueDay: dueDay.optional(),
  endDate: dateInput.optional(),
  isActive: z.boolean().optional(),
});
export type UpdateRecurringPaymentDto = z.infer<
  typeof updateRecurringPaymentSchema
>;

export const listRecurringPaymentQuerySchema = z.object({
  householdId: z.string().optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  priority: z.enum(['CRITICAL', 'IMPORTANT', 'OPTIONAL']).optional(),
});
export type ListRecurringPaymentQuery = z.infer<
  typeof listRecurringPaymentQuerySchema
>;

export const listOccurrenceQuerySchema = z.object({
  householdId: z.string().optional(),
  recurringPaymentId: z.string().optional(),
  period: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
  status: z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
});
export type ListOccurrenceQuery = z.infer<typeof listOccurrenceQuerySchema>;

export const payOccurrenceSchema = z.object({
  paidAmount: z.number().positive().optional(),
});
export type PayOccurrenceDto = z.infer<typeof payOccurrenceSchema>;
