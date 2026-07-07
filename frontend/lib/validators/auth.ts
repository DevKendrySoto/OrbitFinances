import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Correo inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});
export type LoginValues = z.infer<typeof loginSchema>;
