"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.portalPaymentSchema = exports.portalRequestSchema = exports.bookAppointmentSchema = exports.portalQuerySchema = void 0;
const zod_1 = require("zod");
const common_validation_1 = require("./common.validation");
exports.portalQuerySchema = common_validation_1.paginationQuerySchema.extend({
    partyId: zod_1.z
        .string()
        .optional()
        .transform(val => (val ? parseInt(val, 10) : 2))
        .pipe(zod_1.z.number().int().positive())
});
exports.bookAppointmentSchema = zod_1.z.object({
    partyId: zod_1.z.number().int().optional().default(2),
    unitStayId: zod_1.z.number().int().optional(),
    unitNo: zod_1.z.string().optional(),
    slotTime: zod_1.z.string().optional(),
    slotStart: zod_1.z.string().optional(),
    slotEnd: zod_1.z.string().optional(),
    plate: zod_1.z.string().optional(),
    truckPlate: zod_1.z.string().optional(),
    driverLicense: zod_1.z.string().optional(),
    driver: zod_1.z.string().optional(),
    driverName: zod_1.z.string().optional(),
    driverPhone: zod_1.z.string().optional(),
    visitTypeCode: zod_1.z.string().optional(),
}).passthrough();
exports.portalRequestSchema = zod_1.z.object({
    partyId: zod_1.z.number().int().optional().default(2),
    kind: zod_1.z.enum(['DELIVERY', 'DOCUMENT_SUBMISSION', 'FREE_DAY_EXTENSION', 'INVOICE_QUERY', 'DAMAGE_CLAIM']).optional(),
    requestKind: zod_1.z.enum(['DELIVERY', 'DOCUMENT_SUBMISSION', 'FREE_DAY_EXTENSION', 'INVOICE_QUERY', 'DAMAGE_CLAIM']).optional(),
    unitStayId: zod_1.z.number().int().optional(),
    invoiceId: zod_1.z.number().int().optional(),
    subject: zod_1.z.string().optional(),
    details: zod_1.z.string().optional(),
    payload: zod_1.z.any().optional(),
}).passthrough();
exports.portalPaymentSchema = zod_1.z.object({
    amount: zod_1.z.number().positive('Payment amount must be greater than 0').optional(),
    paymentMethod: zod_1.z.string().optional().default('BANK_TRANSFER'),
    referenceNo: zod_1.z.string().optional().default('REF-PORTAL-ONLINE'),
    transactionRef: zod_1.z.string().optional(),
}).passthrough();
