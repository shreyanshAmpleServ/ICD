import { Router } from 'express';
import { swaggerRouter } from '../configs/swagger';
import { v1Router } from '../v1/routes';

export const apiRouter = Router();

// Mount Documentation (/api/docs, /api/openapi.json)
apiRouter.use(swaggerRouter);

// Health check endpoint (/api/health)
apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'DCC NG ICD Backend',
    version: '1.0.0',
    architecture: 'dcc-sfa-layered',
    timestamp: new Date().toISOString()
  });
});

// Version 1 API Layer (/api/v1/...)
apiRouter.use('/v1', v1Router);

// Direct mount for 100% backward compatibility with existing UI / OpenAPI contract
apiRouter.use(v1Router);

export default apiRouter;

