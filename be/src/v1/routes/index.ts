import { Router } from 'express';
import { gateRoutes } from './gate';
import { yardRoutes } from './yard';
import { cargoRoutes } from './cargo';
import { setupRoutes } from './setup';
import { billingRoutes } from './billing';
import { controlRoutes } from './control';
import { customersRoutes } from './customers';
import { authRoutes } from './auth';

import { unitsRouter } from './units';
import { portalRouter } from './portal';
import { appointmentsRouter } from './appointments';
import { cfsRouter } from './cfs';
import { reefersRouter } from './reefers';
import { repairsRouter } from './repairs';
import { devicesRouter } from './devices';
import { partiesRouter } from './parties';
import { chargesRouter } from './charges';
import { invoicesRouter } from './invoices';
import { cashierRouter } from './cashier';
import { searchRouter } from './search';
import { notificationsRouter } from './notifications';

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

// Global Search & Notifications
v1Router.use(searchRouter);
v1Router.use(notificationsRouter);

// Mount structured category routes matching frontend views
v1Router.use(authRoutes);
v1Router.use(gateRoutes);
v1Router.use(yardRoutes);
v1Router.use(cargoRoutes);
v1Router.use(setupRoutes);
v1Router.use(billingRoutes);
v1Router.use(controlRoutes);
v1Router.use(customersRoutes);

// Mount domain routes
v1Router.use(portalRouter);
v1Router.use(unitsRouter);
v1Router.use(appointmentsRouter);
v1Router.use(cfsRouter);
v1Router.use(reefersRouter);
v1Router.use(repairsRouter);
v1Router.use(devicesRouter);
v1Router.use(partiesRouter);
v1Router.use(chargesRouter);
v1Router.use(invoicesRouter);
v1Router.use(cashierRouter);

// Mount legacy routers
// v1Router.use(sessionRouter);
// v1Router.use(setupRouter);
// v1Router.use(mastersRouter);
// v1Router.use(accessRouter);
// v1Router.use(cargoRouter);
// v1Router.use(gateRouter);
// v1Router.use(yardRouter);
// v1Router.use(operationsRouter);
// v1Router.use(controlRouter);
// v1Router.use(commercialRouter);
// v1Router.use(insightRouter);
// v1Router.use(depthRouter);

export default v1Router;
