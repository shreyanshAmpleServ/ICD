import { z } from 'zod';

export const invoiceItemSchema = z.object({
  chargeCode: z.string().min(1, 'Charge code required'),
  description: z.string().min(2, 'Description required'),
  quantity: z.number().positive('Quantity must be > 0'),
  rate: z.number().nonnegative('Rate must be >= 0'),
  currency: z.enum(['TZS', 'USD']).default('TZS'),
  taxRatePct: z.number().min(0).max(100).default(18),
});

export const newInvoiceSchema = z.object({
  partyId: z.number().positive('Please select a customer / billed party'),
  currency: z.enum(['TZS', 'USD']).default('TZS'),
  items: z.array(invoiceItemSchema).min(1, 'At least one charge line is required'),
  notes: z.string().max(500).optional(),
});

export const paymentReceiptSchema = z.object({
  invoiceId: z.number().positive(),
  amountPaid: z.number().positive('Payment amount must be greater than 0'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'MOBILE_MONEY']),
  referenceNo: z.string().min(3, 'Transaction reference number is required'),
});

export type InvoiceItemValues = z.infer<typeof invoiceItemSchema>;
export type NewInvoiceFormValues = z.infer<typeof newInvoiceSchema>;
export type PaymentReceiptFormValues = z.infer<typeof paymentReceiptSchema>;

