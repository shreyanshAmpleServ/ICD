"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsController = void 0;
const prisma_1 = require("../../db/prisma");
const cargo_1 = require("../../data/cargo");
exports.notificationsController = {
    getInbox: async (req, res) => {
        try {
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const dbNotifs = await prisma.notification.findMany({
                        orderBy: { notification_id: 'desc' },
                        take: 50,
                    });
                    if (dbNotifs && dbNotifs.length > 0) {
                        const items = dbNotifs.map((n) => {
                            const subj = (n.subject || '').toLowerCase();
                            let kind = 'EXCEPTION';
                            if (subj.includes('hold'))
                                kind = 'HOLD';
                            else if (subj.includes('approval'))
                                kind = 'APPROVAL';
                            else if (subj.includes('release'))
                                kind = 'RELEASE';
                            else if (subj.includes('customs'))
                                kind = 'CUSTOMS';
                            else if (subj.includes('capacity') || subj.includes('alert'))
                                kind = 'EXCEPTION';
                            let to = '/cargo/units';
                            if (n.link_entity === 'truck_visit')
                                to = '/gate/queue';
                            else if (n.link_entity === 'approval_request')
                                to = '/approvals';
                            else if (n.link_entity === 'yard_location')
                                to = '/yard/map';
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
                        const unreadCount = items.filter((n) => !n.readAt && !n.read).length;
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
            const unreadCount = cargo_1.notifications.filter((n) => !n.read).length;
            if (req.path.includes('/me/inbox')) {
                return res.json(cargo_1.notifications);
            }
            res.json({
                items: cargo_1.notifications,
                total: cargo_1.notifications.length,
                unreadCount,
                nextCursor: null,
            });
        }
        catch (err) {
            console.error('[NotificationsController] getInbox error:', err);
            res.status(500).json({ error: err.message });
        }
    },
    markRead: async (req, res) => {
        try {
            const notificationId = req.params.notificationId || req.params.id;
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
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
        }
        catch (err) {
            console.error('[NotificationsController] markRead error:', err);
            res.status(500).json({ error: err.message });
        }
    },
    markAllRead: async (_req, res) => {
        try {
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
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
        }
        catch (err) {
            console.error('[NotificationsController] markAllRead error:', err);
            res.status(500).json({ error: err.message });
        }
    },
};
