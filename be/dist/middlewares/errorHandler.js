"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const errors_1 = require("../utils/errors");
const validate_1 = require("./validate");
const env_1 = require("../configs/env");
/**
 * Global Error Handler Middleware
 * Implements RFC 7807 Problem Details for HTTP APIs
 */
function errorHandler(err, req, res, _next) {
    res.setHeader('Content-Type', 'application/problem+json');
    // 1. Default Error State
    let statusCode = 500;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let errorTitle = 'Internal Server Error';
    let errorDetail = 'An unexpected error occurred while processing your request.';
    let errorType = 'https://api.icd.dcc/errors/internal-error';
    let invalidParams = undefined;
    let meta = undefined;
    // 2. Classify Known Error Types
    if (err instanceof errors_1.AppError) {
        statusCode = err.status;
        errorCode = err.code;
        errorTitle = err.title;
        errorType = err.type;
        errorDetail = err.detail;
        invalidParams = err.invalidParams;
        meta = err.meta;
    }
    else if (err instanceof zod_1.ZodError) {
        statusCode = 422;
        errorCode = 'VALIDATION_FAILED';
        errorTitle = 'Validation Failed';
        errorType = 'https://api.icd.dcc/errors/validation-failed';
        errorDetail = 'One or more request parameters failed validation.';
        invalidParams = (0, validate_1.formatZodError)(err);
    }
    else if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
        statusCode = 400;
        errorCode = 'BAD_JSON_SYNTAX';
        errorTitle = 'Invalid JSON Body';
        errorType = 'https://api.icd.dcc/errors/bad-json-syntax';
        errorDetail = 'Malformed JSON payload received in request body.';
    }
    else if (err?.constructor?.name === 'PrismaClientKnownRequestError' || (typeof err?.code === 'string' && err.code.startsWith('P'))) {
        if (err.code === 'P2002') {
            statusCode = 409;
            errorCode = 'RECORD_ALREADY_EXISTS';
            errorTitle = 'Conflict';
            errorType = 'https://api.icd.dcc/errors/conflict';
            const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
            errorDetail = `A record with this ${target} already exists.`;
        }
        else if (err.code === 'P2025') {
            statusCode = 404;
            errorCode = 'RECORD_NOT_FOUND';
            errorTitle = 'Record Not Found';
            errorType = 'https://api.icd.dcc/errors/not-found';
            errorDetail = err.meta?.cause || 'The requested database record does not exist.';
        }
        else if (err.code === 'P2003') {
            statusCode = 400;
            errorCode = 'FOREIGN_KEY_VIOLATION';
            errorTitle = 'Foreign Key Constraint Failed';
            errorType = 'https://api.icd.dcc/errors/foreign-key-violation';
            errorDetail = 'The referenced foreign entity does not exist.';
        }
        else {
            statusCode = 500;
            errorCode = 'DATABASE_ERROR';
            errorTitle = 'Database Query Error';
            errorType = 'https://api.icd.dcc/errors/database-error';
            errorDetail = env_1.ENV.NODE_ENV === 'production' ? 'Database operation failed.' : (err.message || 'Database error');
        }
    }
    else if (typeof err?.status === 'number' || typeof err?.statusCode === 'number') {
        statusCode = err.status || err.statusCode;
        errorTitle = err.title || (statusCode >= 500 ? 'Internal Server Error' : 'Request Error');
        errorDetail = err.message || errorDetail;
        errorType = err.type || `https://api.icd.dcc/errors/http-${statusCode}`;
        errorCode = err.code || `HTTP_${statusCode}`;
    }
    else if (err instanceof Error) {
        errorDetail = env_1.ENV.NODE_ENV === 'production' ? errorDetail : err.message;
    }
    // 3. Structured Logging
    const logMethod = statusCode >= 500 ? console.error : console.warn;
    logMethod(`[API Error] ${req.method} ${req.originalUrl} - HTTP ${statusCode} [${errorCode}]:`, err?.stack || err?.message || err);
    // 4. Send RFC 7807 Response
    const responsePayload = {
        type: errorType,
        title: errorTitle,
        status: statusCode,
        code: errorCode,
        detail: errorDetail,
        instance: req.originalUrl,
        timestamp: new Date().toISOString()
    };
    if (invalidParams && invalidParams.length > 0) {
        responsePayload.invalidParams = invalidParams;
    }
    if (meta) {
        responsePayload.meta = meta;
    }
    if (env_1.ENV.NODE_ENV !== 'production' && statusCode >= 500 && err?.stack) {
        responsePayload.stack = err.stack;
    }
    res.status(statusCode).json(responsePayload);
}
