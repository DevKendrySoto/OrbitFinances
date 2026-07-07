import { z } from 'zod';

export const dashboardSummaryQuerySchema = z.object({
  householdId: z.string().optional(),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El mes debe tener formato YYYY-MM')
    .optional(),
});
export type DashboardSummaryQuery = z.infer<typeof dashboardSummaryQuerySchema>;
