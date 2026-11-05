import { Router } from 'express';
import { requireSite } from '../../../middlewares/siteScope';
import { notificationsController } from '../../controllers/notifications.controller';

export const notificationsRouter = Router();

// Dynamic Inbox notifications from DB
notificationsRouter.get('/notifications/inbox', requireSite(true), notificationsController.getInbox);
notificationsRouter.get('/me/inbox', requireSite(true), notificationsController.getInbox);

notificationsRouter.post('/notifications/:notificationId:read', requireSite(false), notificationsController.markRead);
notificationsRouter.post('/notifications/:notificationId/read', requireSite(false), notificationsController.markRead);
notificationsRouter.post('/me/inbox/:notificationId/mark-read', requireSite(false), notificationsController.markRead);

notificationsRouter.post('/notifications:read-all', requireSite(false), notificationsController.markAllRead);
notificationsRouter.post('/notifications/read-all', requireSite(false), notificationsController.markAllRead);
notificationsRouter.post('/me/inbox/mark-all-read', requireSite(false), notificationsController.markAllRead);

export default notificationsRouter;

