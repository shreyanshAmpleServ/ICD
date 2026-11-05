"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUnitSchema = exports.createUnitTypeSchema = exports.validateIdentitySchema = void 0;
const zod_1 = require("zod");
exports.validateIdentitySchema = zod_1.z.object({
    category: zod_1.z.enum(['CONTAINER', 'VEHICLE_VIN', 'BREAKBULK', 'CUSTOM']).optional().default('CONTAINER'),
    rawValue: zod_1.z.string().min(1, 'Value to validate cannot be empty')
});
exports.createUnitTypeSchema = zod_1.z.object({
    typeCode: zod_1.z.string().min(1, 'Type code is required').optional(),
    unitTypeCode: zod_1.z.string().min(1).optional(),
    typeName: zod_1.z.string().min(1, 'Type name is required').optional(),
    category: zod_1.z.string().optional().default('CONTAINER'),
    identityRules: zod_1.z.array(zod_1.z.string()).optional(),
    isActive: zod_1.z.boolean().optional().default(true)
}).passthrough();
exports.createUnitSchema = zod_1.z.object({
    unitNo: zod_1.z.string().min(3).optional(),
    category: zod_1.z.string().optional().default('CONTAINER'),
    isoType: zod_1.z.string().optional().default('40HC'),
    flow: zod_1.z.enum(['IMPORT', 'EXPORT', 'TRANSSHIPMENT', 'STORAGE']).optional().default('IMPORT'),
    sealNo: zod_1.z.string().optional(),
    tareWeightKg: zod_1.z.number().optional().default(3800),
    grossWeightKg: zod_1.z.number().optional()
}).passthrough();
