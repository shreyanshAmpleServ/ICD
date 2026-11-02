import { Router } from 'express';
import { requireSite } from '../../../middlewares/siteScope';
import { requirePermission } from '../../../middlewares/permission';
import {
  customerPortalController,
  customerServiceRequestsController,
  customerPartiesController,
} from '../../controllers/customers';

export const customersRoutes = Router();

// Customer Portal
customersRoutes.get('/portal/overview', requireSite(false), requirePermission('portal.request.submit'), customerPortalController.getOverview);
customersRoutes.get('/portal/requests', requireSite(false), requirePermission('portal.request.submit'), customerPortalController.getRequests);

// Service Requests
customersRoutes.get('/service-requests', requireSite(false), requirePermission('portal.request.handle'), customerServiceRequestsController.getServiceRequests);
customersRoutes.post('/service-requests', requireSite(false), requirePermission('portal.request.handle', 'DO'), customerServiceRequestsController.createServiceRequest);

// Parties
customersRoutes.get('/parties', requireSite(false), requirePermission('masters.view'), customerPartiesController.getParties);
customersRoutes.post('/parties', requireSite(false), requirePermission('masters.view', 'DO'), customerPartiesController.createParty);
customersRoutes.get('/parties/:partyId', requireSite(false), requirePermission('masters.view'), customerPartiesController.getPartyById);
customersRoutes.patch('/parties/:partyId', requireSite(false), requirePermission('masters.view', 'DO'), customerPartiesController.updateParty);

