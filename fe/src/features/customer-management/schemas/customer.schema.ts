import { z } from 'zod';

export const customerPartySchema = z.object({
  partyName: z.string().min(2, 'Company or individual name is required').max(120),
  partyType: z.enum(['SHIPPING_LINE', 'CLEARING_AGENT', 'CONSIGNEE', 'TRANSPORTER', 'SHIPPER']),
  tin: z.string().min(5, 'Tax Identification Number (TIN) is required'),
  vrn: z.string().optional(),
  contactEmail: z.string().email('Valid contact email is required'),
  contactPhone: z.string().min(6, 'Valid contact phone number is required'),
  creditLimit: z.number().nonnegative().default(0),
  currency: z.enum(['TZS', 'USD']).default('TZS'),
  paymentTermsDays: z.number().int().min(0).max(120).default(30),
});

export const serviceRequestSchema = z.object({
  partyId: z.number().positive(),
  requestType: z.enum(['STRIPPING', 'STUFFING', 'SPECIAL_SURVEY', 'REEFER_MONITOR', 'EXTENSION']),
  unitStayId: z.number().positive().optional(),
  description: z.string().min(5, 'Detailed request description required'),
});

export type CustomerPartyFormValues = z.infer<typeof customerPartySchema>;
export type ServiceRequestFormValues = z.infer<typeof serviceRequestSchema>;

