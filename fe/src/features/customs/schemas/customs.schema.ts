import { z } from 'zod';

export const customsDeclarationSchema = z.object({
  customsDocNo: z.string().min(3, 'Customs document / entry number is required'),
  declarantTin: z.string().min(5, 'Declarant TIN is required'),
  customsStatus: z.enum(['CLEARED', 'HELD', 'SCAN_REQUIRED', 'PHYSICAL_EXAM', 'PENDING']),
  examinerBadgeNo: z.string().optional(),
  inspectionNotes: z.string().max(1000).optional(),
});

export type CustomsDeclarationFormValues = z.infer<typeof customsDeclarationSchema>;

