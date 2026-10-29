import { z } from 'zod';

export const numericIdParamSchema = (paramName = 'id') =>
  z.object({
    [paramName]: z
      .string()
      .regex(/^\d+$/, { message: `${paramName} must be a positive integer` })
      .transform(val => parseInt(val, 10))
  });

export const stringIdParamSchema = (paramName = 'id') =>
  z.object({
    [paramName]: z
      .string()
      .min(1, { message: `${paramName} cannot be empty` })
      .trim()
  });

export const paginationQuerySchema = z.object({
  cursor: z.string().optional().nullable(),
  limit: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().min(1).max(200).optional()),
  page: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().min(1).optional()),
  pageSize: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().min(1).max(200).optional()),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc', 'ASC', 'DESC']).optional().default('asc').transform(val => val.toLowerCase() as 'asc' | 'desc')
});

export const searchQuerySchema = paginationQuerySchema.extend({
  q: z.string().optional(),
  search: z.string().optional()
});

export const containerNumberSchema = z
  .string()
  .trim()
  .transform(val => val.replace(/\s+/g, '').toUpperCase())
  .refine(val => /^[A-Z]{4}\d{7}$/.test(val), {
    message: 'Container number must follow ISO 6346 format (4 letters followed by 7 digits, e.g. MSKU1234567)'
  });

export const vinNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine(val => /^[A-HJ-NPR-Z0-9]{17}$/.test(val), {
    message: 'VIN must be exactly 17 alphanumeric characters, excluding I, O, Q'
  });

export const siteHeaderSchema = z.object({
  'x-site-id': z.string().optional(),
  'x-site': z.string().optional()
});

