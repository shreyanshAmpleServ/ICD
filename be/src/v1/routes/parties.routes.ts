import { Router } from 'express';
import { requireSite } from '../../middlewares/siteScope';
import { requirePermission } from '../../middlewares/permission';
import { asyncHandler } from '../../utils';
import { partiesController } from '../controllers/parties.controller';

const router = Router();

// Global master entity (requireSite(true) allows global access without site parameter)
router.get(
  '/parties',
  requireSite(true),
  requirePermission('masters.view'),
  asyncHandler(partiesController.getParties)
);

router.post(
  '/parties',
  requireSite(true),
  requirePermission('masters.local.edit', 'DO'),
  asyncHandler(partiesController.createParty)
);

router.post(
  '/parties:provisional',
  requireSite(true),
  requirePermission('masters.local.edit', 'DO'),
  asyncHandler(partiesController.createProvisional)
);

router.get(
  '/parties/:partyId',
  requireSite(true),
  requirePermission('masters.view'),
  asyncHandler(partiesController.getPartyDetail)
);

router.patch(
  '/parties/:partyId',
  requireSite(true),
  requirePermission('masters.local.edit', 'DO'),
  asyncHandler(partiesController.updateParty)
);

router.post(
  ['/parties/:partyId/match', '/parties/:partyId([0-9a-zA-Z_.-]+):match'],
  requireSite(true),
  requirePermission('masters.local.edit', 'DO'),
  asyncHandler(partiesController.matchParty)
);

router.get(
  '/parties/:partyId/contacts',
  requireSite(true),
  requirePermission('masters.view'),
  asyncHandler(partiesController.getContacts)
);

router.put(
  '/parties/:partyId/contacts',
  requireSite(true),
  requirePermission('masters.local.edit', 'DO'),
  asyncHandler(partiesController.updateContacts)
);

router.patch(
  '/parties/:partyId/contacts/:contactId',
  requireSite(true),
  requirePermission('masters.local.edit', 'DO'),
  asyncHandler(partiesController.patchContact)
);

export const partiesRouter = router;
export default router;

