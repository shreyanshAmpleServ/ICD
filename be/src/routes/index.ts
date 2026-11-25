import { Router } from "express";
import { swaggerRouter } from "../configs/swagger";
import { v1Router } from "../v1/routes";

export const apiRouter = Router();

apiRouter.use(swaggerRouter);

apiRouter.get("/health", (_req, res) => {
  res.json({
    status: "HEALTHY",
    service: "DCC NG ICD Backend",
    version: "1.0.0",
    architecture: "dcc-sfa-layered",
    timestamp: new Date().toISOString(),
  });
});

apiRouter.use("/v1", v1Router);

apiRouter.use(v1Router);

export default apiRouter;
