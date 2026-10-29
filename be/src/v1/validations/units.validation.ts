import { z } from 'zod';
import { containerNumberSchema, vinNumberSchema } from './common.validation';

export const validateIdentitySchema = z.object({
  category: z.enum(['CONTAINER', 'VEHICLE_VIN', 'BREAKBULK', 'CUSTOM']).optional().default('CONTAINER'),
  rawValue: z.string().min(1, 'Value to validate cannot be empty')
});

export const createUnitTypeSchema = z.object({
  typeCode: z.string().min(1, 'Type code is required').optional(),
  unitTypeCode: z.string().min(1).optional(),
  typeName: z.string().min(1, 'Type name is required').optional(),
  category: z.string().optional().default('CONTAINER'),
  identityRules: z.array(z.string()).optional(),
  isActive: z.boolean().optional().default(true)
}).passthrough();

export const createUnitSchema = z.object({
  unitNo: z.string().min(3).optional(),
  category: z.string().optional().default('CONTAINER'),
  isoType: z.string().optional().default('40HC'),
  flow: z.enum(['IMPORT', 'EXPORT', 'TRANSSHIPMENT', 'STORAGE']).optional().default('IMPORT'),
  sealNo: z.string().optional(),
  tareWeightKg: z.number().optional().default(3800),
  grossWeightKg: z.number().optional()
}).passthrough();

