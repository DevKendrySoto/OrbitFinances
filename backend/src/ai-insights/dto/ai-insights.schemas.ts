import { z } from 'zod';

export const listInsightsQuerySchema = z.object({
  householdId: z.string().optional(),
  period: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El período debe tener formato YYYY-MM')
    .optional(),
});
export type ListInsightsQuery = z.infer<typeof listInsightsQuerySchema>;
