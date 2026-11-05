"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = notFoundHandler;
const errors_1 = require("../utils/errors");
function notFoundHandler(req, _res, next) {
    next(new errors_1.NotFoundError('Endpoint', `${req.method} ${req.originalUrl}`));
}
