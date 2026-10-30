import { Router } from 'express';
import { unitsRouter } from './units.routes';
import { portalRouter } from './portal.routes';
import { appointmentsRouter } from './appointments.routes';
import { cfsRouter } from './cfs.routes';
import { reefersRouter } from './reefers.routes';
import { repairsRouter } from './repairs.routes';
import { devicesRouter } from './devices.routes';

// Legacy module routers
import { sessionRouter } from '../../modules/session/session.router';
import { setupRouter } from '../../modules/setup/setup.router';
import { mastersRouter } from '../../modules/masters/masters.router';
import { accessRouter } from '../../modules/access/access.router';
import { cargoRouter } from '../../modules/cargo/cargo.router';
import { gateRouter } from '../../modules/gate/gate.router';
import { yardRouter } from '../../modules/yard/yard.router';
import { operationsRouter } from '../../modules/operations/operations.router';
import { controlRouter } from '../../modules/control/control.router';
import { commercialRouter } from '../../modules/commercial/commercial.router';
import { insightRouter } from '../../modules/insight/insight.router';
import { depthRouter } from '../../modules/depth/depth.router';

export const v1Router = Router();

// Mount all v1 modular domain routes
v1Router.use(portalRouter);
v1Router.use(unitsRouter);
v1Router.use(appointmentsRouter);
v1Router.use(cfsRouter);
v1Router.use(reefersRouter);
v1Router.use(repairsRouter);
v1Router.use(devicesRouter);

// Mount legacy routers
v1Router.use(sessionRouter);
v1Router.use(setupRouter);
v1Router.use(mastersRouter);
v1Router.use(accessRouter);
v1Router.use(cargoRouter);
v1Router.use(gateRouter);
v1Router.use(yardRouter);
v1Router.use(operationsRouter);
v1Router.use(controlRouter);
v1Router.use(commercialRouter);
v1Router.use(insightRouter);
v1Router.use(depthRouter);

export default v1Router;
