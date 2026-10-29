import { z } from 'zod';

/**
 * Validates ISO 6346 Container Number (4 letters, 6 serial digits, 1 check digit)
 */
export function validateContainerCheckDigit(containerNo: string): boolean {
  const clean = containerNo.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{4}\d{7}$/.test(clean)) return false;

  const charValues: Record<string, number> = {
    A: 10, B: 12, C: 13, D: 14, E: 15, F: 16, G: 17, H: 18, I: 19, J: 20,
    K: 21, L: 23, M: 24, N: 25, O: 26, P: 27, Q: 28, R: 29, S: 30, T: 31,
    U: 32, V: 34, W: 35, X: 36, Y: 37, Z: 38,
  };

  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const char = clean[i];
    const val = char >= 'A' && char <= 'Z' ? charValues[char] : parseInt(char, 10);
    sum += val * Math.pow(2, i);
  }

  const checkDigit = (sum % 11) % 10;
  return checkDigit === parseInt(clean[10], 10);
}

export const containerSchema = z.object({
  unitNo: z
    .string()
    .min(1, 'Container number is required')
    .refine((val) => validateContainerCheckDigit(val), {
      message: 'Invalid ISO 6346 container number or check digit',
    }),
  isoCode: z.string().regex(/^[0-9A-Z]{4}$/, 'Must be a 4-character ISO equipment code (e.g. 22G1, 42G1)'),
  sealNo: z.string().min(1, 'Seal number is required').optional().or(z.literal('')),
  tareWeightKg: z.number().positive('Tare weight must be greater than 0'),
  grossWeightKg: z.number().positive('Gross weight must be greater than 0'),
  sealCondition: z.enum(['INTACT', 'BROKEN', 'MISSING', 'TAMPERED']).default('INTACT'),
  remarks: z.string().max(500).optional(),
});

export const containerFilterSchema = z.object({
  query: z.string().optional(),
  status: z.string().optional(),
  siteId: z.string().optional(),
  category: z.enum(['CONTAINER', 'VEHICLE', 'LOT', 'ALL']).default('ALL'),
});

export type ContainerFormValues = z.infer<typeof containerSchema>;
export type ContainerFilterValues = z.infer<typeof containerFilterSchema>;

