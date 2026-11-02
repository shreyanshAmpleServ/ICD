import { Request, Response } from 'express';
import { getPrisma, isDbLive } from '../../db/prisma';
import { notifications as mockNotifications } from '../../data/cargo';

export const notificationsController = {
  getInbox: async (req: Request, res: Response) => {
    try {
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          const dbNotifs = await prisma.notification.findMany({
            orderBy: { notification_id: 'desc' },
            take: 50,
          });

          if (dbNotifs && dbNotifs.length > 0) {
            const items = dbNotifs.map((n: any) => {
              const subj = (n.subject || '').toLowerCase();
              let kind = 'EXCEPTION';
              if (subj.includes('hold')) kind = 'HOLD';
              else if (subj.includes('approval')) kind = 'APPROVAL';
              else if (subj.includes('release')) kind = 'RELEASE';
              else if (subj.includes('customs')) kind = 'CUSTOMS';
              else if (subj.includes('capacity') || subj.includes('alert')) kind = 'EXCEPTION';

              let to = '/cargo/units';
              if (n.link_entity === 'truck_visit') to = '/gate/queue';
              else if (n.link_entity === 'approval_request') to = '/approvals';
              else if (n.link_entity === 'yard_location') to = '/yard/map';

              return {
                id: Number(n.notification_id),
                notificationId: Number(n.notification_id),
                channel: n.channel,
                subject: n.subject || 'System Notification',
                title: n.subject || 'System Notification',
                body: n.body,
                message: n.body,
                linkEntity: n.link_entity,
                linkId: n.link_id ? Number(n.link_id) : null,
                kind,
                status: n.status,
                to,
                createdAt: n.createdate?.toISOString() || new Date().toISOString(),
                readAt: n.read_at?.toISOString() || null,
                read: Boolean(n.read_at),
              };
            });

            const unreadCount = items.filter((n: any) => !n.readAt && !n.read).length;

            if (req.path.includes('/me/inbox')) {
              return res.json(items);
            }

            return res.json({
              items,
              total: items.length,
              unreadCount,
              nextCursor: null,
            });
          }
        }
      }

      const unreadCount = mockNotifications.filter((n: any) => !(n as any).read).length;
      if (req.path.includes('/me/inbox')) {
        return res.json(mockNotifications);
      }
      res.json({
        items: mockNotifications,
        total: mockNotifications.length,
        unreadCount,
        nextCursor: null,
      });
    } catch (err: any) {
      console.error('[NotificationsController] getInbox error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  markRead: async (req: Request, res: Response) => {
    try {
      const notificationId = req.params.notificationId || req.params.id;
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma && notificationId) {
          const updated = await prisma.notification.update({
            where: { notification_id: BigInt(notificationId) },
            data: {
              read_at: new Date(),
              updatedate: new Date(),
            },
          });
          return res.json({
            success: true,
            notificationId: Number(updated.notification_id),
            readAt: updated.read_at,
          });
        }
      }

      res.json({ success: true, notificationId, read: true });
    } catch (err: any) {
      console.error('[NotificationsController] markRead error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  markAllRead: async (_req: Request, res: Response) => {
    try {
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          const result = await prisma.notification.updateMany({
            where: { read_at: null },
            data: {
              read_at: new Date(),
              updatedate: new Date(),
            },
          });
          return res.json({ success: true, updatedCount: result.count });
        }
      }

      res.json({ success: true, updatedCount: 0 });
    } catch (err: any) {
      console.error('[NotificationsController] markAllRead error:', err);
      res.status(500).json({ error: err.message });
    }
  },
};

