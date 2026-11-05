"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireIdempotency = requireIdempotency;
exports.verifyIfMatch = verifyIfMatch;
const idempotencyCache = new Map();
function requireIdempotency(isMandatory = false) {
    return (req, res, next) => {
        const key = req.headers['idempotency-key'];
        if (isMandatory && !key) {
            res.status(400).json({
                type: 'https://api.icd.dcc/errors/missing-idempotency-key',
                title: 'Missing Idempotency-Key',
                status: 400,
                detail: 'An Idempotency-Key header is required for this operation to prevent duplicate execution.'
            });
            return;
        }
        if (key && idempotencyCache.has(key)) {
            const cached = idempotencyCache.get(key);
            res.setHeader('X-Cache-Lookup', 'HIT');
            res.status(cached.status).json(cached.body);
            return;
        }
        if (key) {
            const originalJson = res.json.bind(res);
            res.json = (body) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    idempotencyCache.set(key, { status: res.statusCode, body });
                }
                return originalJson(body);
            };
        }
        next();
    };
}
function verifyIfMatch(currentLogInst, req, res) {
    const ifMatchHeader = req.headers['if-match'];
    if (!ifMatchHeader) {
        return true;
    }
    const expectedInst = parseInt(String(ifMatchHeader).replace(/"/g, ''), 10);
    if (!isNaN(expectedInst) && expectedInst !== currentLogInst) {
        res.status(412).json({
            type: 'https://api.icd.dcc/errors/concurrency-precondition-failed',
            title: 'Precondition Failed',
            status: 412,
            detail: `Record has been modified by another transaction. Expected logInst: ${expectedInst}, current: ${currentLogInst}.`
        });
        return false;
    }
    return true;
}
