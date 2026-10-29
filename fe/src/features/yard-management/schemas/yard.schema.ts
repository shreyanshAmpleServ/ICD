import { z } from 'zod';

export const yardMoveSchema = z.object({
  unitStayId: z.number().positive(),
  targetSlotCode: z.string().min(2, 'Slot coordinate is required (e.g. A-02-03-1)'),
  equipmentType: z.enum(['REACH_STACKER', 'TERMINAL_TRACTOR', 'FORKLIFT', 'EMPTY_HANDLER']),
  priority: z.enum(['LOW', 'NORMAL', 'URGENT']).default('NORMAL'),
  assignedOperatorId: z.number().optional(),
});

export const reeferMonitoringSchema = z.object({
  unitStayId: z.number().positive(),
  temperatureCelsius: z.number(),
  setPointCelsius: z.number(),
  powerStatus: z.enum(['CONNECTED', 'DISCONNECTED', 'FAULT']).default('CONNECTED'),
  voltage: z.number().optional(),
});

export type YardMoveFormValues = z.infer<typeof yardMoveSchema>;
export type ReeferMonitoringFormValues = z.infer<typeof reeferMonitoringSchema>;

