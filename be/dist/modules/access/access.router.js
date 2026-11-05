"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accessRouter = void 0;
const express_1 = require("express");
const siteScope_1 = require("../../middlewares/siteScope");
const permission_1 = require("../../middlewares/permission");
const admin_1 = require("../../data/admin");
const permissions_1 = require("../../configs/permissions");
let roles = Object.values(permissions_1.ROLES).map((r, i) => ({
    roleId: i + 1,
    roleCode: r.code,
    roleName: r.name,
    code: r.code,
    name: r.name,
    external: !!r.external,
    grants: r.grants,
    logInst: 1,
}));
const router = (0, express_1.Router)();
// ------------------------------------------------------------------ Users (Global 🌐)
router.get("/users", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.users.manage"), (req, res) => {
    const { role, roleCode, active, isActive, siteId, q } = req.query;
    let items = admin_1.users;
    // Role filter
    const rFilter = (role || roleCode);
    if (rFilter && rFilter !== "all") {
        items = items.filter((u) => u.roleGrants?.some((g) => g.roleCode.toUpperCase() === rFilter.toUpperCase()));
    }
    // Active filter
    const actFilter = active !== undefined ? active : isActive;
    if (actFilter !== undefined && actFilter !== "all") {
        const actStr = String(actFilter).toLowerCase();
        if (actStr === "true" || actStr === "active") {
            items = items.filter((u) => u.isActive === true);
        }
        else if (actStr === "false" || actStr === "inactive") {
            items = items.filter((u) => u.isActive === false);
        }
    }
    // Site filter
    if (siteId && siteId !== "all") {
        const sIdStr = String(siteId);
        items = items.filter((u) => {
            const matchGrant = u.roleGrants?.some((g) => g.siteId === null || String(g.siteId) === sIdStr);
            const matchCode = u.siteCodes?.some((c) => c === "All sites" ||
                c === sIdStr ||
                (sIdStr === "1" && c === "DAR1") ||
                (sIdStr === "2" && c === "DAR2") ||
                (sIdStr === "3" && c === "KBH1"));
            return matchGrant || matchCode;
        });
    }
    // Search query (name, email, title, sub, role)
    if (q && typeof q === "string" && q.trim()) {
        const term = q.trim().toLowerCase();
        items = items.filter((u) => (u.userName && u.userName.toLowerCase().includes(term)) ||
            (u.email && u.email.toLowerCase().includes(term)) ||
            (u.title && u.title.toLowerCase().includes(term)) ||
            (u.userSub && u.userSub.toLowerCase().includes(term)) ||
            (u.roleGrants &&
                u.roleGrants.some((g) => g.roleCode?.toLowerCase().includes(term))));
    }
    res.json({ items, total: items.length, nextCursor: null });
});
router.post("/users", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.users.manage", "DO"), (req, res) => {
    const nextId = admin_1.users.reduce((max, u) => Math.max(max, u.userId || 0), 0) + 1;
    const fullName = req.body.fullName ||
        req.body.userName ||
        req.body.displayName ||
        "New User";
    const email = req.body.email || `user${nextId}@mlimani-icd.example`;
    const roleCode = req.body.roleCode;
    const siteId = req.body.siteId;
    const grants = [];
    if (roleCode && roleCode !== "NONE") {
        grants.push({
            userRoleId: 1,
            roleCode,
            siteId: siteId && siteId !== "ALL" ? Number(siteId) : null,
            validFrom: req.body.validFrom || new Date().toISOString().slice(0, 10),
            validTo: req.body.validTo || undefined,
            grantedBy: req.user?.username || "Ashok K. (admin)",
        });
    }
    const siteCodes = grants.length > 0
        ? [
            ...new Set(grants.map((r) => r.siteId === 1
                ? "DAR1"
                : r.siteId === 2
                    ? "DAR2"
                    : r.siteId === 3
                        ? "KBH1"
                        : "All sites")),
        ]
        : ["All sites"];
    const newUser = {
        userId: nextId,
        userSub: `ng|${8100 + nextId}`,
        userName: fullName,
        title: req.body.title || "Staff",
        email,
        phone: req.body.phone || req.body.mobile || null,
        preferredLanguage: req.body.preferredLanguage === "sw" ? "sw" : "en",
        isNgUser: true,
        mfaRequired: !!req.body.mfaRequired,
        isActive: true,
        lastLoginAt: null,
        roleGrants: grants,
        siteCodes,
        logInst: 1,
    };
    admin_1.users.unshift(newUser);
    res.status(201).json(newUser);
});
router.get("/users/:userId", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.users.manage"), (req, res) => {
    const user = admin_1.users.find((u) => String(u.userId) === req.params.userId);
    if (!user)
        return res.status(404).json({ error: "User not found" });
    res.json(user);
});
router.patch("/users/:userId", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.users.manage", "DO"), (req, res) => {
    const user = admin_1.users.find((u) => String(u.userId) === req.params.userId);
    if (!user)
        return res.status(404).json({ error: "User not found" });
    Object.assign(user, req.body, {
        logInst: (user.logInst || 1) + 1,
    });
    if (user.roleGrants) {
        user.siteCodes = [
            ...new Set(user.roleGrants.map((r) => r.siteId === 1
                ? "DAR1"
                : r.siteId === 2
                    ? "DAR2"
                    : r.siteId === 3
                        ? "KBH1"
                        : "All sites")),
        ];
        if (user.siteCodes.length === 0)
            user.siteCodes = ["All sites"];
    }
    res.json(user);
});
router.post(["/users/:userId/deactivate", "/users/:userId:deactivate"], (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.users.manage", "DO"), (req, res) => {
    const user = admin_1.users.find((u) => String(u.userId) === req.params.userId);
    if (!user)
        return res.status(404).json({ error: "User not found" });
    user.isActive = false;
    user.deactivatedAt = new Date().toISOString();
    user.deactivatedReason =
        req.body.reason || "Deactivated by administrator";
    res.json({ success: true, user });
});
router.post(["/users/:userId/activate", "/users/:userId:activate"], (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.users.manage", "DO"), (req, res) => {
    const user = admin_1.users.find((u) => String(u.userId) === req.params.userId);
    if (!user)
        return res.status(404).json({ error: "User not found" });
    user.isActive = true;
    delete user.deactivatedAt;
    delete user.deactivatedReason;
    res.json({ success: true, user });
});
router.post("/users/:userId/roles", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.roles.manage", "DO"), (req, res) => {
    const user = admin_1.users.find((u) => String(u.userId) === req.params.userId);
    if (!user)
        return res.status(404).json({ error: "User not found" });
    const roleGrants = (user.roleGrants =
        user.roleGrants || []);
    const nextGrantId = roleGrants.reduce((m, g) => Math.max(m, g.userRoleId || 0), 0) + 1;
    const newRoleGrant = {
        userRoleId: nextGrantId,
        roleCode: req.body.roleCode,
        siteId: req.body.siteId ? Number(req.body.siteId) : null,
        validFrom: req.body.validFrom || new Date().toISOString().slice(0, 10),
        validTo: req.body.validTo || undefined,
        grantedBy: req.body.grantedBy || req.user?.username || "Ashok K. (admin)",
    };
    roleGrants.push(newRoleGrant);
    user.siteCodes = [
        ...new Set(roleGrants.map((r) => r.siteId === 1
            ? "DAR1"
            : r.siteId === 2
                ? "DAR2"
                : r.siteId === 3
                    ? "KBH1"
                    : "All sites")),
    ];
    res.status(201).json(newRoleGrant);
});
router.delete("/users/:userId/roles/:userRoleId", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.roles.manage", "DO"), (req, res) => {
    const user = admin_1.users.find((u) => String(u.userId) === req.params.userId);
    if (!user)
        return res.status(404).json({ error: "User not found" });
    if (user.roleGrants) {
        const idx = user.roleGrants.findIndex((g) => String(g.userRoleId) === req.params.userRoleId ||
            g.roleCode === req.params.userRoleId);
        if (idx >= 0)
            user.roleGrants.splice(idx, 1);
        user.siteCodes = [
            ...new Set(user.roleGrants.map((r) => r.siteId === 1
                ? "DAR1"
                : r.siteId === 2
                    ? "DAR2"
                    : r.siteId === 3
                        ? "KBH1"
                        : "All sites")),
        ];
        if (user.siteCodes.length === 0)
            user.siteCodes = ["All sites"];
    }
    res.status(204).end();
});
// ------------------------------------------------------------------ Delegations (Global 🌐)
router.get("/delegations", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.users.manage"), (req, res) => {
    res.json({ items: admin_1.delegations, total: admin_1.delegations.length });
});
router.post("/delegations", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.users.manage", "DO"), (req, res) => {
    const nextId = admin_1.delegations.reduce((m, d) => Math.max(m, d.approvalDelegationId || 0), 0) + 1;
    const newD = {
        approvalDelegationId: nextId,
        fromUserId: Number(req.body.fromUserId),
        toUserId: Number(req.body.toUserId),
        fromName: req.body.fromName || "Staff Member",
        toName: req.body.toName || "Covering Staff",
        permissionCode: req.body.permissionCode || null,
        siteId: req.body.siteId ? Number(req.body.siteId) : null,
        validFrom: req.body.validFrom || new Date().toISOString(),
        validTo: req.body.validTo || new Date(Date.now() + 7 * 86400000).toISOString(),
        reason: req.body.reason || "Delegation of authority",
    };
    admin_1.delegations.unshift(newD);
    res.status(201).json(newD);
});
// ------------------------------------------------------------------ Roles (Global 🌐)
router.get("/roles", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.roles.manage"), (req, res) => {
    res.json({ items: roles, total: roles.length, nextCursor: null });
});
router.post("/roles", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.roles.manage", "DO"), (req, res) => {
    const newRole = {
        roleId: roles.length + 1,
        roleCode: req.body.roleCode || `ROLE_${roles.length + 1}`,
        roleName: req.body.roleName || "Custom Role",
        external: false,
        grants: req.body.grants || {},
        logInst: 1,
        ...req.body,
    };
    roles.push(newRole);
    res.status(201).json(newRole);
});
router.get("/roles/:roleId", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.roles.manage"), (req, res) => {
    const role = roles.find((r) => String(r.roleId) === req.params.roleId ||
        r.roleCode === req.params.roleId);
    if (!role)
        return res.status(404).json({ error: "Role not found" });
    res.json(role);
});
router.patch("/roles/:roleId", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.roles.manage", "DO"), (req, res) => {
    const role = roles.find((r) => String(r.roleId) === req.params.roleId ||
        r.roleCode === req.params.roleId);
    if (!role)
        return res.status(404).json({ error: "Role not found" });
    Object.assign(role, req.body, { logInst: role.logInst + 1 });
    res.json(role);
});
router.put("/roles/:roleId/permissions", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.roles.manage", "DO"), (req, res) => {
    const role = roles.find((r) => String(r.roleId) === req.params.roleId ||
        r.roleCode === req.params.roleId);
    if (!role)
        return res.status(404).json({ error: "Role not found" });
    role.grants = req.body.grants || req.body;
    role.logInst += 1;
    res.json(role);
});
// ------------------------------------------------------------------ Permissions (Global 🌐)
router.get("/permissions", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.roles.manage"), (req, res) => {
    res.json({
        items: admin_1.permissions,
        total: admin_1.permissions.length,
        nextCursor: null,
    });
});
// ------------------------------------------------------------------ Devices (Site-scoped)
router.get("/devices", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.device.manage"), (req, res) => {
    res.json({ items: admin_1.devices, total: admin_1.devices.length, nextCursor: null });
});
router.post("/devices", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.device.manage", "DO"), (req, res) => {
    const newDev = {
        deviceId: admin_1.devices.length + 1,
        siteId: 1,
        deviceCode: req.body.deviceCode || `DEV-${admin_1.devices.length + 1}`,
        deviceName: req.body.deviceName || "New Tablet",
        deviceKind: req.body.deviceKind || "TABLET",
        registeredAt: new Date().toISOString(),
        registeredBy: req.user?.username || "Ashok K.",
        lastSeenAt: new Date().toISOString(),
        queue: 0,
        appVersion: "1.4.2",
        assignedTo: req.body.assignedTo || "Unassigned",
        ...req.body,
    };
    admin_1.devices.push(newDev);
    res.status(201).json(newDev);
});
router.post("/devices/:deviceId([0-9a-zA-Z_.-]+):revoke", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.device.manage", "DO"), (req, res) => {
    const dev = admin_1.devices.find((d) => String(d.deviceId) === req.params.deviceId ||
        d.deviceCode === req.params.deviceId);
    if (!dev)
        return res.status(404).json({ error: "Device not found" });
    dev.revokedAt = new Date().toISOString();
    dev.revokedReason =
        req.body.reason || "Decommissioned by administrator";
    res.json({ success: true, device: dev });
});
exports.accessRouter = router;
