import { Router } from 'express';
import { requireSite } from '../../middleware/siteScope';
import { sites, users } from '../../data/admin';
import { ALL_PERMISSIONS, ROLES } from '../../config/permissions';

const router = Router();

/**
 * GET /me (Global 🌐)
 */
router.get('/me', requireSite(true), (req, res) => {
  const activeSiteId = (req.headers['x-site-id'] as string)?.toUpperCase() || 'DAR1';
  const roleCode = (req.headers['x-role-code'] as string) || 'ALL_PERMISSIONS';

  const user = users[0];
  const currentSite = sites.find(s => s.siteCode === activeSiteId) || sites[0];
  const permissionsGrants = ALL_PERMISSIONS.map(p => ({
    permissionCode: p,
    grant: (ROLES[roleCode]?.grants[p] || 'DO') as 'DO' | 'REQ' | 'APPR' | 'VIEW'
  }));

  res.json({
    // Standard OpenAPI Me schema properties
    userId: user.userId,
    userSub: user.userSub,
    name: user.userName,
    email: user.email,
    language: 'en',
    partyId: null,
    sites: sites.map(s => ({
      siteId: s.siteId,
      siteCode: s.siteCode,
      siteName: s.siteName,
      timeZone: s.timeZone,
      facilities: s.facilities,
      gates: s.gates,
      slots: s.slots,
      roles: [roleCode],
      permissions: permissionsGrants
    })),
    // Backward-compatible UI helper fields
    user: {
      userId: user.userId,
      userSub: user.userSub,
      userName: user.userName,
      title: user.title,
      email: user.email,
      phone: user.phone,
      roleCode,
      isActive: user.isActive
    },
    activeSite: {
      siteId: currentSite.siteId,
      siteCode: currentSite.siteCode,
      siteName: currentSite.siteName,
      timeZone: currentSite.timeZone,
      facilities: currentSite.facilities
    },
    permissions: ALL_PERMISSIONS,
    roles: Object.values(ROLES).map(r => ({
      roleCode: r.code,
      roleName: r.name,
      grants: r.grants
    }))
  });
});

router.post('/session/switch-site', requireSite(true), (req, res) => {
  const { siteCode } = req.body;
  const site = sites.find(s => s.siteCode === (siteCode || '').toUpperCase());
  if (!site) {
    return res.status(404).json({ error: `Site '${siteCode}' not found` });
  }
  res.json({ success: true, activeSite: site });
});

router.post('/auth/login', (req, res) => {
  const { username, siteId, roleCode, step } = req.body || {};

  const cleanUser = (username || '').toLowerCase().trim();
  const matchedUser = users.find(u =>
    u.email?.toLowerCase() === cleanUser ||
    u.userSub?.toLowerCase() === cleanUser ||
    u.userName?.toLowerCase() === cleanUser ||
    u.userName?.toLowerCase().replace(/\s+/g, '.') === cleanUser
  ) || users[0];

  const mfaRequired = Boolean(matchedUser.mfaRequired);

  // If user requires two-step sign-in and Step 2 role/facility has not been selected yet:
  if (mfaRequired && step !== 2 && !roleCode) {
    const grantedRoles = (matchedUser.roleGrants || []).map(g => ({
      roleCode: g.roleCode,
      siteId: g.siteId,
    }));
    return res.json({
      requiresTwoStep: true,
      mfaRequired: true,
      userId: matchedUser.userId,
      username: matchedUser.userName,
      title: matchedUser.title,
      email: matchedUser.email,
      availableSites: matchedUser.siteCodes,
      grantedRoles: grantedRoles.length > 0 ? grantedRoles : [{ roleCode: 'ALL_PERMISSIONS', siteId: null }],
      message: 'Two-step sign-in: Select your active facility and role to continue.'
    });
  }

  const assignedRole = roleCode || matchedUser.roleGrants?.[0]?.roleCode || 'ALL_PERMISSIONS';
  const assignedSite = siteId || (matchedUser.roleGrants?.[0]?.siteId === 2 ? 'DAR2' : matchedUser.roleGrants?.[0]?.siteId === 3 ? 'KBH1' : 'DAR1');
  const token = `icd_tok_${Buffer.from(`${matchedUser.userId}:${Date.now()}:${assignedRole}`).toString('base64url')}`;

  res.cookie('auth_token', token, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: false,
    sameSite: 'lax',
    path: '/'
  });

  res.json({
    requiresTwoStep: false,
    token,
    user: {
      userId: matchedUser.userId,
      username: matchedUser.userName,
      email: matchedUser.email,
      roleCode: assignedRole,
      siteId: assignedSite,
      isExternal: Boolean(matchedUser.title?.toLowerCase().includes('agent')),
    }
  });
});

router.post('/auth/logout', (_req, res) => {
  res.clearCookie('auth_token', { path: '/' });
  res.json({ success: true, message: 'Logged out successfully' });
});

export const sessionRouter = router;
