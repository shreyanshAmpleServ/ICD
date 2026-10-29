import { z } from 'zod';

export const dispatchDecisionSchema = z.object({
  approvalId: z.number().positive(),
  decision: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().min(3, 'Reason / comment is required for dispatch decision'),
});

export const exceptionResolveSchema = z.object({
  caseId: z.number().positive(),
  resolutionType: z.enum(['OVERRIDE', 'RE_INSPECT', 'REVERT_ACTION', 'CLOSE']),
  resolutionNotes: z.string().min(5, 'Detailed resolution notes required'),
});

export type DispatchDecisionFormValues = z.infer<typeof dispatchDecisionSchema>;
export type ExceptionResolveFormValues = z.infer<typeof exceptionResolveSchema>;

