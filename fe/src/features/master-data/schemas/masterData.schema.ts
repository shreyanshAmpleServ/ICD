import { z } from 'zod';

export const createUserSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(80),
  email: z.string().email('Please enter a valid work email address'),
  title: z.string().default('Operations Staff'),
  mobile: z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Invalid mobile phone number').optional().or(z.literal('')),
  preferredLanguage: z.enum(['en', 'sw']).default('en'),
  roleCode: z.string().min(1, 'Please select a role'),
  siteId: z.union([z.number(), z.literal('ALL')]).default('ALL'),
  mfaRequired: z.boolean().default(true),
});

export const registerDeviceSchema = z.object({
  deviceName: z.string().min(2, 'Device name is required (e.g. Gate Tablet 1)'),
  kind: z.enum(['TABLET', 'PHONE', 'GATE_PC', 'KIOSK']),
  siteId: z.number().positive('Site is required'),
  locationNote: z.string().optional(),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
export type RegisterDeviceFormValues = z.infer<typeof registerDeviceSchema>;

