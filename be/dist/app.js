"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("./configs/env");
const routes_1 = require("./routes");
const middlewares_1 = require("./middlewares");
const utils_1 = require("./utils");
function createApp() {
    const app = (0, express_1.default)();
    //   const allowedOrigins = [
    //   "http://localhost:5173",
    //   "http://localhost:3000",
    //   "https://yourdomain.com",
    // ];
    // app.use(
    //   cors({
    //     origin: (origin, callback) => {
    //       if (!origin || allowedOrigins.includes(origin)) {
    //         callback(null, true);
    //       } else {
    //         callback(new Error("Not allowed by CORS"));
    //       }
    //     },
    //     credentials: true,
    //     exposedHeaders: [
    //       "Idempotency-Key",
    //       "If-Match",
    //       "ETag",
    //       "X-Site-Id",
    //     ],
    //   }),
    // );
    // Cross-Origin Resource Sharing (CORS)
    app.use((0, cors_1.default)({
        origin: (origin, callback) => callback(null, true),
        credentials: true,
        exposedHeaders: ["Idempotency-Key", "If-Match", "ETag", "X-Site-Id"],
    }));
    // Body Parsing
    app.use(express_1.default.json({ limit: "10mb" }));
    app.use(express_1.default.urlencoded({ extended: true }));
    // Response Enhancer (reusable res.success, res.created, res.error handlers)
    app.use(utils_1.responseEnhancer);
    // HTTP Request Logging
    app.use((0, morgan_1.default)("dev"));
    // Mount API Route Aggregator
    app.use(env_1.ENV.API_PREFIX, routes_1.apiRouter);
    // 404 Catch-All Handler
    app.use(middlewares_1.notFoundHandler);
    // Global Error Handler (RFC 7807)
    app.use(middlewares_1.errorHandler);
    return app;
}
exports.app = createApp();
exports.default = exports.app;
