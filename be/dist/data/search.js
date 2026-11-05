"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSearch = void 0;
exports.search = search;
const core_1 = require("./core");
const providers = [];
const registerSearch = (p) => { providers.push(p); };
exports.registerSearch = registerSearch;
const norm = (s) => s.replace(/[\s-]/g, '').toUpperCase();
(0, exports.registerSearch)((q) => {
    const n = norm(q);
    const hits = core_1.allStays
        .filter((s) => norm(s.cargoUnit.unitNo).includes(n) || (s.cargoUnit.make ?? '').toUpperCase().includes(n))
        .slice(0, 6)
        .map((s) => ({
        id: s.unitStayId, title: s.cargoUnit.unitNo, status: s.physicalStatus,
        subtitle: [s.cargoUnit.unitTypeCode, s.cargoUnit.make && `${s.cargoUnit.make} ${s.cargoUnit.model}`, s.currentLocation?.fullCode].filter(Boolean).join(' · '),
        link: { entityName: 'unit_stay', entityId: s.unitStayId }, to: `/units/${s.unitStayId}`,
    }));
    return hits.length ? { entity: 'UNIT', label: 'Units', hits } : null;
});
(0, exports.registerSearch)((q) => {
    const n = norm(q);
    const hits = core_1.consignments.filter((c) => norm(c.refNo).includes(n)).slice(0, 5).map((c) => ({
        id: c.consignmentId, title: c.refNo, subtitle: c.cargoDescription ?? undefined,
        link: { entityName: 'consignment', entityId: c.consignmentId }, to: `/consignments/${c.consignmentId}`,
    }));
    return hits.length ? { entity: 'CONSIGNMENT', label: 'Consignments', hits } : null;
});
(0, exports.registerSearch)((q) => {
    const n = q.toUpperCase();
    const hits = core_1.parties.filter((p) => p.partyName.toUpperCase().includes(n) || p.partyCode.includes(n)).slice(0, 5).map((p) => ({
        id: p.partyId, title: p.partyName, subtitle: p.roles.map((r) => r.toLowerCase().replace(/_/g, ' ')).join(', '),
        link: { entityName: 'party', entityId: p.partyId }, to: `/parties/${p.partyId}`,
    }));
    return hits.length ? { entity: 'PARTY', label: 'Customers & parties', hits } : null;
});
function search(q) {
    if (q.trim().length < 2)
        return [];
    return providers.map((p) => p(q.trim())).filter((g) => !!g);
}
