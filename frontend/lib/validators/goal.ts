import { z } from 'zod';

export const createGoalSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  targetAmount: z.number().positive('El monto objetivo debe ser mayor a cero'),
  currency: z.enum(['USD', 'DOP']),
  targetDate: z.string().optional(),
});
export type CreateGoalValues = z.infer<typeof createGoalSchema>;
