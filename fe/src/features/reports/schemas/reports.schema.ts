import { z } from 'zod';

export const reportFilterSchema = z.object({
  reportType: z.enum(['DWELL_TIME', 'GATE_THROUGHPUT', 'REVENUE_SUMMARY', 'AUDIT_TRAIL', 'OCCUPANCY']),
  startDate: z.string().min(10, 'Start date required (YYYY-MM-DD)'),
  endDate: z.string().min(10, 'End date required (YYYY-MM-DD)'),
  siteId: z.string().optional(),
  format: z.enum(['JSON', 'CSV', 'PDF']).default('JSON'),
});

export type ReportFilterFormValues = z.infer<typeof reportFilterSchema>;

