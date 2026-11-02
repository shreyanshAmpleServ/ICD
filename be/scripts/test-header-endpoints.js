async function testEndpoints() {
  const base = 'http://localhost:4000/api';
  console.log('Testing Header & Profile endpoints on:', base);

  // 1. Search MSKU
  const s1 = await fetch(`${base}/search?q=MSKU`, { headers: { 'x-site-id': 'DAR1' } }).then(r => r.json());
  console.log('\n[1] Search MSKU:', { query: s1.query, total: s1.total, groups: s1.groups?.map(g => ({ label: g.label, hits: g.hits.length })) });

  // 2. Search T412
  const s2 = await fetch(`${base}/search?q=T412`, { headers: { 'x-site-id': 'DAR1' } }).then(r => r.json());
  console.log('\n[2] Search T412:', { query: s2.query, total: s2.total, groups: s2.groups?.map(g => ({ label: g.label, hits: g.hits.length })) });

  // 3. Search Consignment "Wheat"
  const s3 = await fetch(`${base}/search?q=Wheat`, { headers: { 'x-site-id': 'DAR1' } }).then(r => r.json());
  console.log('\n[3] Search Wheat:', { query: s3.query, total: s3.total, groups: s3.groups?.map(g => ({ label: g.label, hits: g.hits.length })) });

  // 4. Search Party "Maersk"
  const s4 = await fetch(`${base}/search?q=Maersk`, { headers: { 'x-site-id': 'DAR1' } }).then(r => r.json());
  console.log('\n[4] Search Maersk:', { query: s4.query, total: s4.total, groups: s4.groups?.map(g => ({ label: g.label, hits: g.hits.length })) });

  // 5. GET /me (Profile)
  const me = await fetch(`${base}/me`, { headers: { 'x-site-id': 'DAR1' } }).then(r => r.json());
  console.log('\n[5] GET /me:', {
    userId: me.userId,
    name: me.name,
    email: me.email,
    phone: me.phone,
    language: me.language,
    activeSite: me.activeSite?.siteCode,
    sitesCount: me.sites?.length,
    rolesCount: me.roles?.length
  });

  // 6. PATCH /me (Update Profile)
  const patch = await fetch(`${base}/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-site-id': 'DAR1' },
    body: JSON.stringify({ phone: '+255 754 000 999', preferredLanguage: 'en' })
  }).then(r => r.json());
  console.log('\n[6] PATCH /me result:', patch);

  // 7. GET /approvals
  const apprv = await fetch(`${base}/approvals?status=PENDING&siteId=1`).then(r => r.json());
  console.log('\n[7] Approvals:', {
    total: apprv.total,
    firstItem: apprv.items?.[0] ? {
      no: apprv.items[0].requestNo,
      summary: apprv.items[0].summary,
      status: apprv.items[0].status,
      requestedBy: apprv.items[0].requestedBy
    } : null
  });

  // 8. GET /notifications/inbox
  const notifs = await fetch(`${base}/notifications/inbox`, { headers: { 'x-site-id': 'DAR1' } }).then(r => r.json());
  console.log('\n[8] Notifications Inbox:', {
    total: notifs.total,
    unreadCount: notifs.unreadCount,
    firstItem: notifs.items?.[0] ? {
      subject: notifs.items[0].subject,
      kind: notifs.items[0].kind,
      to: notifs.items[0].to,
      read: notifs.items[0].read
    } : null
  });
}

testEndpoints().catch(console.error);

