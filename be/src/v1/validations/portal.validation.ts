import { z } from 'zod';
import { paginationQuerySchema } from './common.validation';

export const portalQuerySchema = paginationQuerySchema.extend({
  partyId: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 2))
    .pipe(z.number().int().positive())
});

export const bookAppointmentSchema = z.object({
  partyId: z.number().int().optional().default(2),
  unitStayId: z.number().int().optional(),
  unitNo: z.string().optional(),
  slotTime: z.string().optional(),
  slotStart: z.string().optional(),
  slotEnd: z.string().optional(),
  plate: z.string().optional(),
  truckPlate: z.string().optional(),
  driverLicense: z.string().optional(),
  driver: z.string().optional(),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
  visitTypeCode: z.string().optional(),
}).passthrough();

export const portalRequestSchema = z.object({
  partyId: z.number().int().optional().default(2),
  kind: z.enum(['DELIVERY', 'DOCUMENT_SUBMISSION', 'FREE_DAY_EXTENSION', 'INVOICE_QUERY', 'DAMAGE_CLAIM']).optional(),
  requestKind: z.enum(['DELIVERY', 'DOCUMENT_SUBMISSION', 'FREE_DAY_EXTENSION', 'INVOICE_QUERY', 'DAMAGE_CLAIM']).optional(),
  unitStayId: z.number().int().optional(),
  invoiceId: z.number().int().optional(),
  subject: z.string().optional(),
  details: z.string().optional(),
  payload: z.any().optional(),
}).passthrough();

export const portalPaymentSchema = z.object({
  amount: z.number().positive('Payment amount must be greater than 0').optional(),
  paymentMethod: z.string().optional().default('BANK_TRANSFER'),
  referenceNo: z.string().optional().default('REF-PORTAL-ONLINE'),
  transactionRef: z.string().optional(),
}).passthrough();
