/* One search across everything (GET /search). Modules add their own
   providers with registerSearch so the search box finds visits, invoices,
   release orders and so on without this file knowing about them. */
import type { S } from '../types';
import { allStays, consignments, parties } from './core';

type Hit = S<'SearchHit'> & { to: string };
export interface Group { entity: S<'SearchGroup'>['entity']; label: string; hits: Hit[] }
type Provider = (q: string) => Group | null;

const providers: Provider[] = [];
export const registerSearch = (p: Provider) => { providers.push(p); };

const norm = (s: string) => s.replace(/[\s-]/g, '').toUpperCase();

registerSearch((q) => {
  const n = norm(q);
  const hits = allStays
    .filter((s) => norm(s.cargoUnit.unitNo).includes(n) || (s.cargoUnit.make ?? '').toUpperCase().includes(n))
    .slice(0, 6)
    .map((s) => ({
      id: s.unitStayId!, title: s.cargoUnit.unitNo, status: s.physicalStatus,
      subtitle: [s.cargoUnit.unitTypeCode, s.cargoUnit.make && `${s.cargoUnit.make} ${s.cargoUnit.model}`, s.currentLocation?.fullCode].filter(Boolean).join(' · '),
      link: { entityName: 'unit_stay', entityId: s.unitStayId! }, to: `/units/${s.unitStayId}`,
    }));
  return hits.length ? { entity: 'UNIT', label: 'Units', hits } : null;
});
registerSearch((q) => {
  const n = norm(q);
  const hits = consignments.filter((c) => norm(c.refNo).includes(n)).slice(0, 5).map((c) => ({
    id: c.consignmentId!, title: c.refNo, subtitle: c.cargoDescription ?? undefined,
    link: { entityName: 'consignment', entityId: c.consignmentId! }, to: `/consignments/${c.consignmentId}`,
  }));
  return hits.length ? { entity: 'CONSIGNMENT', label: 'Consignments', hits } : null;
});
registerSearch((q) => {
  const n = q.toUpperCase();
  const hits = parties.filter((p) => p.partyName.toUpperCase().includes(n) || p.partyCode.includes(n)).slice(0, 5).map((p) => ({
    id: p.partyId!, title: p.partyName, subtitle: p.roles.map((r) => r.toLowerCase().replace(/_/g, ' ')).join(', '),
    link: { entityName: 'party', entityId: p.partyId! }, to: `/parties/${p.partyId}`,
  }));
  return hits.length ? { entity: 'PARTY', label: 'Customers & parties', hits } : null;
});

export function search(q: string): Group[] {
  if (q.trim().length < 2) return [];
  return providers.map((p) => p(q.trim())).filter((g): g is Group => !!g);
}
