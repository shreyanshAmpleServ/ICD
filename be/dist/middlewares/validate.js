"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatZodError = formatZodError;
exports.validateRequest = validateRequest;
exports.validateBody = validateBody;
exports.validateQuery = validateQuery;
exports.validateParams = validateParams;
const errors_1 = require("../utils/errors");
function formatZodError(error, targetPrefix) {
    return error.errors.map(issue => {
        const fieldPath = issue.path.join('.');
        const fullPath = targetPrefix
            ? (fieldPath ? `${targetPrefix}.${fieldPath}` : targetPrefix)
            : fieldPath;
        const fieldName = issue.path.length > 0
            ? String(issue.path[issue.path.length - 1])
            : (targetPrefix || 'value');
        return {
            name: fieldName,
            reason: issue.message,
            path: fullPath
        };
    });
}
function validateRequest(schemas) {
    return (req, _res, next) => {
        const invalidParams = [];
        if (schemas.params) {
            const result = schemas.params.safeParse(req.params);
            if (!result.success) {
                invalidParams.push(...formatZodError(result.error, 'params'));
            }
            else {
                req.params = result.data;
            }
        }
        if (schemas.query) {
            const result = schemas.query.safeParse(req.query);
            if (!result.success) {
                invalidParams.push(...formatZodError(result.error, 'query'));
            }
            else {
                req.query = result.data;
            }
        }
        if (schemas.body) {
            const result = schemas.body.safeParse(req.body);
            if (!result.success) {
                invalidParams.push(...formatZodError(result.error, 'body'));
            }
            else {
                req.body = result.data;
            }
        }
        if (schemas.headers) {
            const result = schemas.headers.safeParse(req.headers);
            if (!result.success) {
                invalidParams.push(...formatZodError(result.error, 'headers'));
            }
        }
        if (invalidParams.length > 0) {
            return next(new errors_1.ValidationError(invalidParams));
        }
        next();
    };
}
function validateBody(schema) {
    return validateRequest({ body: schema });
}
function validateQuery(schema) {
    return validateRequest({ query: schema });
}
function validateParams(schema) {
    return validateRequest({ params: schema });
}
