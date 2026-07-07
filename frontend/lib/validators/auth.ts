import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Correo inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.email('Correo inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  householdName: z.string().optional(),
});
export type RegisterValues = z.infer<typeof registerSchema>;

export const registerFormSchema = registerSchema
  .extend({
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
