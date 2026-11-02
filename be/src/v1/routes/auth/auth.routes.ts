import { Router } from 'express';
import { requireSite } from '../../../middlewares/siteScope';
import { requirePermission } from '../../../middlewares/permission';
import {
  authSessionController,
  authAccessController,
} from '../../controllers/auth';

export const authRoutes = Router();

// Session & User Profile
authRoutes.get('/me', requireSite(true), authSessionController.getMe);
authRoutes.get('/auth/me', requireSite(true), authSessionController.getMe);
authRoutes.patch('/me', requireSite(true), authSessionController.updateProfile);
authRoutes.put('/me', requireSite(true), authSessionController.updateProfile);
authRoutes.patch('/me/profile', requireSite(true), authSessionController.updateProfile);
authRoutes.patch('/users/profile', requireSite(true), authSessionController.updateProfile);
authRoutes.post('/session/switch-site', requireSite(true), authSessionController.switchSite);

// Access
authRoutes.get('/access/permissions', requireSite(true), requirePermission('masters.view'), authAccessController.getPermissions);
authRoutes.get('/access/roles/:roleCode/grants', requireSite(true), requirePermission('masters.view'), authAccessController.getRoleGrants);

