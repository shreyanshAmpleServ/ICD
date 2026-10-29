import { z } from 'zod';

export const gateCheckinSchema = z.object({
  plateNo: z
    .string()
    .min(3, 'Truck plate number is required')
    .max(15, 'Plate number too long')
    .toUpperCase(),
  driverName: z.string().min(2, 'Driver full name is required').max(100),
  driverLicenseNo: z.string().min(4, 'Valid driver license number is required'),
  transporterName: z.string().min(2, 'Transporter / haulage company is required'),
  checkpointCode: z.enum(['OUTER_IN', 'INNER_IN', 'WEIGH_IN', 'INNER_OUT', 'OUTER_OUT']),
  remarks: z.string().max(500).optional(),
});

export const gatePasscodeSchema = z.object({
  passcode: z.string().length(6, 'Gate pass code must be exactly 6 characters').toUpperCase(),
});

export type GateCheckinFormValues = z.infer<typeof gateCheckinSchema>;
export type GatePasscodeFormValues = z.infer<typeof gatePasscodeSchema>;

