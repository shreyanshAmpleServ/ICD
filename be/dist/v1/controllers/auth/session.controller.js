"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authSessionController = void 0;
const admin_1 = require("../../../data/admin");
const permissions_1 = require("../../../configs/permissions");
const prisma_1 = require("../../../db/prisma");
exports.authSessionController = {
    getMe: async (req, res) => {
        try {
            const activeSiteId = req.headers['x-site-id']?.toUpperCase() || 'DAR1';
            const roleCode = req.headers['x-role-code'] || 'ALL_PERMISSIONS';
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const [dbUser, dbSites, dbRoles] = await Promise.all([
                        prisma.app_user.findFirst({
                            where: { user_id: 1 },
                            include: {
                                user_site_role: {
                                    include: {
                                        m_role: true,
                                        m_site: true,
                                    },
                                },
                            },
                        }),
                        prisma.m_site.findMany({
                            where: { is_active: true },
                            orderBy: { site_id: 'asc' },
                        }),
                        prisma.m_role.findMany({
                            where: { is_active: true },
                            orderBy: { role_id: 'asc' },
                        }),
                    ]);
                    if (dbUser) {
                        const currentSite = dbSites.find((s) => s.site_code.toUpperCase() === activeSiteId) ||
                            dbSites[0] || {
                            site_id: 1,
                            site_code: 'DAR1',
                            site_name: 'Dar es Salaam main yard',
                            facilities: ['ICD', 'CFS', 'EMPTY_DEPOT'],
                            timezone: 'Africa/Dar_es_Salaam',
                        };
                        const permissionsGrants = permissions_1.ALL_PERMISSIONS.map((p) => ({
                            permissionCode: p,
                            grant: (permissions_1.ROLES[roleCode]?.grants?.[p] || 'APPR'),
                        }));
                        const assignedRoles = (dbUser.user_site_role || [])
                            .map((usr) => ({
                            roleCode: usr.m_role?.role_code,
                            roleName: usr.m_role?.role_name,
                            siteCode: usr.m_site?.site_code,
                        }))
                            .filter((r) => r.roleCode);
                        const primaryRole = assignedRoles[0]?.roleCode || roleCode;
                        return res.json({
                            userId: dbUser.user_id,
                            userSub: dbUser.user_sub,
                            name: dbUser.user_name,
                            userName: dbUser.user_name,
                            email: dbUser.email,
                            phone: dbUser.phone || '+255 754 000 001',
                            language: dbUser.preferred_language || 'en',
                            preferredLanguage: dbUser.preferred_language || 'en',
                            partyId: dbUser.party_id,
                            isNgUser: dbUser.is_ng_user,
                            mfaRequired: dbUser.mfa_required,
                            isActive: dbUser.is_active,
                            lastLoginAt: dbUser.last_login_at?.toISOString() || null,
                            createdAt: dbUser.createdate?.toISOString(),
                            assignedRoles,
                            sites: dbSites.map((s) => ({
                                siteId: s.site_id,
                                siteCode: s.site_code,
                                siteName: s.site_name,
                                timeZone: s.timezone || 'Africa/Dar_es_Salaam',
                                facilities: ['ICD', 'CFS', 'EMPTY_DEPOT'],
                                roles: [primaryRole],
                                permissions: permissionsGrants,
                            })),
                            user: {
                                userId: dbUser.user_id,
                                userSub: dbUser.user_sub,
                                userName: dbUser.user_name,
                                title: 'Senior Operations Lead',
                                email: dbUser.email,
                                phone: dbUser.phone || '+255 754 000 001',
                                roleCode: primaryRole,
                                roleName: assignedRoles[0]?.roleName || 'ICD Operations Lead',
                                preferredLanguage: dbUser.preferred_language || 'en',
                                mfaRequired: dbUser.mfa_required,
                                isActive: dbUser.is_active,
                                createdAt: dbUser.createdate?.toISOString(),
                            },
                            activeSite: {
                                siteId: currentSite.site_id,
                                siteCode: currentSite.site_code,
                                siteName: currentSite.site_name,
                                timeZone: currentSite.timezone || 'Africa/Dar_es_Salaam',
                                facilities: ['ICD', 'CFS', 'EMPTY_DEPOT'],
                            },
                            permissions: permissions_1.ALL_PERMISSIONS,
                            roles: dbRoles.map((r) => ({
                                code: r.role_code,
                                name: r.role_name,
                                external: !r.is_internal,
                                grants: permissions_1.ROLES[r.role_code]?.grants || {},
                            })),
                        });
                    }
                }
            }
            // Fallback
            const user = admin_1.users[0];
            const currentSite = admin_1.sites.find((s) => s.siteCode === activeSiteId) || admin_1.sites[0];
            const permissionsGrants = permissions_1.ALL_PERMISSIONS.map((p) => ({
                permissionCode: p,
                grant: (permissions_1.ROLES[roleCode]?.grants?.[p] || 'DO'),
            }));
            res.json({
                userId: user.userId,
                userSub: user.userSub,
                name: user.userName,
                userName: user.userName,
                email: user.email,
                phone: user.phone,
                language: 'en',
                preferredLanguage: 'en',
                partyId: null,
                sites: admin_1.sites.map((s) => ({
                    siteId: s.siteId,
                    siteCode: s.siteCode,
                    siteName: s.siteName,
                    timeZone: s.timeZone,
                    facilities: s.facilities,
                    roles: [roleCode],
                    permissions: permissionsGrants,
                })),
                user: {
                    userId: user.userId,
                    userSub: user.userSub,
                    userName: user.userName,
                    title: user.title,
                    email: user.email,
                    phone: user.phone,
                    roleCode,
                    isActive: user.isActive,
                },
                activeSite: {
                    siteId: currentSite.siteId,
                    siteCode: currentSite.siteCode,
                    siteName: currentSite.siteName,
                    facilities: currentSite.facilities,
                },
                permissions: permissionsGrants,
            });
        }
        catch (err) {
            console.error('[SessionController] getMe error:', err);
            res.status(500).json({ error: err.message });
        }
    },
    updateProfile: async (req, res) => {
        try {
            const { name, userName, phone, preferredLanguage, language, title } = req.body || {};
            const newName = (name || userName || '').trim();
            const newPhone = (phone || '').trim();
            let newLang = (preferredLanguage || language || 'en').toLowerCase().trim();
            if (!['en', 'sw', 'fr'].includes(newLang)) {
                newLang = 'en';
            }
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const updateData = {
                        updatedate: new Date(),
                        updatedby: 'user:1',
                    };
                    if (newName)
                        updateData.user_name = newName;
                    if (newPhone)
                        updateData.phone = newPhone;
                    if (newLang)
                        updateData.preferred_language = newLang;
                    const updated = await prisma.app_user.update({
                        where: { user_id: 1 },
                        data: updateData,
                        include: {
                            user_site_role: {
                                include: {
                                    m_role: true,
                                    m_site: true,
                                },
                            },
                        },
                    });
                    return res.json({
                        success: true,
                        message: 'Profile updated successfully in database',
                        user: {
                            userId: updated.user_id,
                            userSub: updated.user_sub,
                            userName: updated.user_name,
                            name: updated.user_name,
                            email: updated.email,
                            phone: updated.phone,
                            preferredLanguage: updated.preferred_language,
                            language: updated.preferred_language,
                            title: title || 'Senior Operations Lead',
                            isActive: updated.is_active,
                            updatedAt: updated.updatedate,
                        },
                    });
                }
            }
            res.json({
                success: true,
                message: 'Profile updated (in-memory)',
                user: {
                    userId: 1,
                    name: newName || 'Ashok Kumar',
                    phone: newPhone || '+255 754 000 001',
                    preferredLanguage: newLang,
                },
            });
        }
        catch (err) {
            console.error('[SessionController] updateProfile error:', err);
            res.status(500).json({ error: err.message });
        }
    },
    switchSite: async (req, res) => {
        try {
            const { siteCode } = req.body;
            const targetCode = (siteCode || 'DAR1').toUpperCase();
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const matched = await prisma.m_site.findFirst({
                        where: { site_code: targetCode },
                    });
                    if (matched) {
                        return res.json({
                            success: true,
                            activeSite: {
                                siteId: matched.site_id,
                                siteCode: matched.site_code,
                                siteName: matched.site_name,
                                timeZone: matched.timezone || 'Africa/Dar_es_Salaam',
                                facilities: ['ICD', 'CFS', 'EMPTY_DEPOT'],
                            },
                            switchedAt: new Date().toISOString(),
                        });
                    }
                }
            }
            const targetSite = admin_1.sites.find((s) => s.siteCode === targetCode) || admin_1.sites[0];
            res.json({
                success: true,
                activeSite: targetSite,
                switchedAt: new Date().toISOString(),
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
