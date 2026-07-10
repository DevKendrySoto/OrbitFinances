import { z } from 'zod';

export const createIncomeSchema = z.object({
  type: z.enum(['SALARY', 'FREELANCE', 'OTHER']),
  currency: z.enum(['USD', 'DOP']),
  amount: z.number().positive('El monto debe ser mayor a cero'),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Selecciona un período válido'),
  receivedAt: z.string().min(1, 'La fecha es requerida'),
  description: z.string().optional(),
});
export type CreateIncomeValues = z.infer<typeof createIncomeSchema>;

// La moneda no se puede editar tras crear el ingreso: si ya tiene
// conversiones USD->DOP asociadas, cambiarla dejaría el historial inconsistente.
export const editIncomeSchema = createIncomeSchema.omit({ currency: true });
export type EditIncomeValues = z.infer<typeof editIncomeSchema>;
