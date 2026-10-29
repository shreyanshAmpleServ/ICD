import { Router } from 'express';
import { sessionRouter } from './modules/session/session.router';
import { setupRouter } from './modules/setup/setup.router';
import { mastersRouter } from './modules/masters/masters.router';
import { accessRouter } from './modules/access/access.router';
import { cargoRouter } from './modules/cargo/cargo.router';
import { unitsRouter } from './modules/units/units.router';
import { gateRouter } from './modules/gate/gate.router';
import { yardRouter } from './modules/yard/yard.router';
import { operationsRouter } from './modules/operations/operations.router';
import { controlRouter } from './modules/control/control.router';
import { commercialRouter } from './modules/commercial/commercial.router';
import { insightRouter } from './modules/insight/insight.router';
import { depthRouter } from './modules/depth/depth.router';
import { docsRouter } from './docs/swagger';

export const apiRouter = Router();

// Mount Documentation
apiRouter.use(docsRouter);

// Mount Business Modules (covers all M0-M6 tags in OpenAPI 3.1 specification)
apiRouter.use(sessionRouter);
apiRouter.use(setupRouter);
apiRouter.use(mastersRouter);
apiRouter.use(accessRouter);
apiRouter.use(cargoRouter);
apiRouter.use(unitsRouter);
apiRouter.use(gateRouter);
apiRouter.use(yardRouter);
apiRouter.use(operationsRouter);
apiRouter.use(controlRouter);
apiRouter.use(commercialRouter);
apiRouter.use(insightRouter);
apiRouter.use(depthRouter);

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'DCC NG ICD Backend',
    version: '1.0.0',
    modulesLoaded: [
      'session', 'setup', 'masters', 'access', 'cargo', 'units',
      'gate', 'yard', 'operations', 'control', 'commercial', 'insight', 'depth'
    ],
    timestamp: new Date().toISOString()
  });
});
