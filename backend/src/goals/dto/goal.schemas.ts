import { z } from 'zod';

const dateInput = z.iso.datetime({ offset: true }).or(z.iso.date());
const goalStatus = z.enum(['IN_PROGRESS', 'COMPLETED', 'PAUSED']);

export const createGoalSchema = z.object({
  householdId: z.string().optional(),
  name: z.string().min(1, 'El nombre es requerido'),
  targetAmount: z.number().positive('El monto objetivo debe ser mayor a cero'),
  currency: z.enum(['USD', 'DOP']),
  targetDate: dateInput.optional(),
});
export type CreateGoalDto = z.infer<typeof createGoalSchema>;

export const updateGoalSchema = z.object({
  name: z.string().min(1).optional(),
  targetAmount: z.number().positive().optional(),
  targetDate: dateInput.optional(),
  status: goalStatus.optional(),
});
export type UpdateGoalDto = z.infer<typeof updateGoalSchema>;

export const listGoalQuerySchema = z.object({
  householdId: z.string().optional(),
  status: goalStatus.optional(),
});
export type ListGoalQuery = z.infer<typeof listGoalQuerySchema>;

export const createContributionSchema = z.object({
  amount: z.number().positive('El monto debe ser mayor a cero'),
  currency: z.enum(['USD', 'DOP']),
  contributedAt: dateInput.optional(),
});
export type CreateContributionDto = z.infer<typeof createContributionSchema>;
