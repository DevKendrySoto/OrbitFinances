import { z } from 'zod';

const dateOnly = z.iso.date();

export const reportRangeQuerySchema = z
  .object({
    householdId: z.string().optional(),
    from: dateOnly,
    to: dateOnly,
  })
  .refine((data) => data.from <= data.to, {
    message: 'La fecha "from" debe ser anterior o igual a "to"',
    path: ['to'],
  });
export type ReportRangeQuery = z.infer<typeof reportRangeQuerySchema>;

export const createClosingSchema = z.object({
  householdId: z.string().optional(),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El mes debe tener formato YYYY-MM'),
});
export type CreateClosingDto = z.infer<typeof createClosingSchema>;

export const listClosingsQuerySchema = z.object({
  householdId: z.string().optional(),
});
export type ListClosingsQuery = z.infer<typeof listClosingsQuerySchema>;
