import { z } from 'zod';

export const createGoalSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  targetAmount: z.number().positive('El monto objetivo debe ser mayor a cero'),
  currency: z.enum(['USD', 'DOP']),
  targetDate: z.string().optional(),
});
export type CreateGoalValues = z.infer<typeof createGoalSchema>;

// La moneda no se puede editar (los aportes ya existentes quedarían
// en una moneda distinta a la meta). El estado se maneja aparte
// (pausar/reanudar), no desde este formulario.
export const editGoalSchema = createGoalSchema.omit({ currency: true });
export type EditGoalValues = z.infer<typeof editGoalSchema>;
