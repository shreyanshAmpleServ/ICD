import express, { Application } from "express";
import cors from "cors";
import morgan from "morgan";
import { ENV } from "./configs/env";
import { apiRouter } from "./routes";
import { errorHandler, notFoundHandler } from "./middlewares";
import { responseEnhancer } from "./utils";

export function createApp(): Application {
  const app = express();

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
  app.use(
    cors({
      origin: (origin, callback) => callback(null, true),
      credentials: true,
      exposedHeaders: ["Idempotency-Key", "If-Match", "ETag", "X-Site-Id"],
    }),
  );

  // Body Parsing

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Response Enhancer (reusable res.success, res.created, res.error handlers)
  app.use(responseEnhancer);

  // HTTP Request Logging
  app.use(morgan("dev"));

  // Mount API Route Aggregator
  app.use(ENV.API_PREFIX, apiRouter);

  // 404 Catch-All Handler
  app.use(notFoundHandler);

  // Global Error Handler (RFC 7807)
  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
