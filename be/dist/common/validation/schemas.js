"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.siteHeaderSchema = exports.vinNumberSchema = exports.containerNumberSchema = exports.searchQuerySchema = exports.paginationQuerySchema = exports.stringIdParamSchema = exports.numericIdParamSchema = void 0;
const zod_1 = require("zod");
const numericIdParamSchema = (paramName = "id") => zod_1.z.object({
    [paramName]: zod_1.z
        .string()
        .regex(/^\d+$/, { message: `${paramName} must be a positive integer` })
        .transform((val) => parseInt(val, 10)),
});
exports.numericIdParamSchema = numericIdParamSchema;
const stringIdParamSchema = (paramName = "id") => zod_1.z.object({
    [paramName]: zod_1.z
        .string()
        .min(1, { message: `${paramName} cannot be empty` })
        .trim(),
});
exports.stringIdParamSchema = stringIdParamSchema;
exports.paginationQuerySchema = zod_1.z.object({
    cursor: zod_1.z.string().optional().nullable(),
    limit: zod_1.z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : undefined))
        .pipe(zod_1.z.number().int().min(1).max(200).optional()),
    page: zod_1.z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : undefined))
        .pipe(zod_1.z.number().int().min(1).optional()),
    pageSize: zod_1.z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : undefined))
        .pipe(zod_1.z.number().int().min(1).max(200).optional()),
    sortBy: zod_1.z.string().optional(),
    sortOrder: zod_1.z
        .enum(["asc", "desc", "ASC", "DESC"])
        .optional()
        .default("asc")
        .transform((val) => val.toLowerCase()),
});
exports.searchQuerySchema = exports.paginationQuerySchema.extend({
    q: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
});
exports.containerNumberSchema = zod_1.z
    .string()
    .trim()
    .transform((val) => val.replace(/\s+/g, "").toUpperCase())
    .refine((val) => /^[A-Z]{4}\d{7}$/.test(val), {
    message: "Container number must follow ISO 6346 format (4 letters followed by 7 digits, e.g. MSKU1234567)",
});
exports.vinNumberSchema = zod_1.z
    .string()
    .trim()
    .toUpperCase()
    .refine((val) => /^[A-HJ-NPR-Z0-9]{17}$/.test(val), {
    message: "VIN must be exactly 17 alphanumeric characters, excluding I, O, Q",
});
exports.siteHeaderSchema = zod_1.z.object({
    "x-site-id": zod_1.z.string().optional(),
    "x-site": zod_1.z.string().optional(),
});
