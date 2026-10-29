import { Page, fmtD, NOW } from '@/ds/components';
import { useSession } from '@/app/session';
import { useQ, delay } from '@/api/query';
import { approvals as mockApprovals, exceptions as mockExceptions, holds as mockHolds } from '@/mock/control';
import { visits as mockVisits } from '@/mock/gate';
import { allStays as mockStays } from '@/mock/core';
import { moveOrders as mockMoves } from '@/mock/ops';
import { HomeQueuesPanel, type QueueItem } from './components/HomeQueuesPanel';
import { HomeGateActivityPanel } from './components/HomeGateActivityPanel';

export { homeApi } from './api';

export function HomeView() {
  const { userName, site, can } = useSession();
  const { data: liveApprovals = [] } = useQ(['approvals'], () => delay(mockApprovals));
  const { data: liveVisits = [] } = useQ(['visits'], () => delay(mockVisits));
  const { data: liveExceptions = [] } = useQ(['exceptions'], () => delay(mockExceptions));
  const { data: liveMoves = [] } = useQ(['move-orders'], () => delay(mockMoves));
  const { data: liveHolds = [] } = useQ(['holds'], () => delay(mockHolds));
  const { data: liveStays = [] } = useQ(['units'], () => delay(mockStays));

  const all: QueueItem[] = [
    {
      label: 'Approvals waiting for you',
      count: liveApprovals.filter((a: any) => a.status === 'PENDING' && (a.canDecide ?? true)).length,
      note: 'Oldest waiting 20 h',
      to: '/approvals',
      perm: 'billing.waiver',
      level: 'APPR',
      urgent: true,
    },
    {
      label: 'Trucks held at a checkpoint',
      count: liveVisits.filter((v: any) => v.status === 'HELD' || v.status === 'REJECTED').length || 1,
      note: 'Seal check discrepancy',
      to: '/gate',
      perm: 'gate.visit.checkin',
      urgent: true,
    },
    {
      label: 'Exceptions overdue',
      count: liveExceptions.filter((e: any) => e.isOverdue || e.status === 'OPEN').length,
      note: 'Discrepancy inspection open',
      to: '/exceptions',
      perm: 'exception.view',
      urgent: true,
    },
    {
      label: 'Move orders open',
      count: liveMoves.filter((m: any) => m.status !== 'DONE' && m.status !== 'CANCELLED').length || 2,
      note: 'Transfers & customs shuttle',
      to: '/moves',
      perm: 'yard.move.execute',
    },
    { label: 'Inspections to do', count: 3, note: 'Gate-in, lane In 1', to: '/inspections', perm: 'inspection.perform' },
    {
      label: 'Release requests to check',
      count: 4,
      note: 'RO-DAR1-26-01942 has 2 conditions',
      to: '/releases',
      perm: 'release.issue',
    },
    {
      label: 'Free time ends soon',
      count:
        liveStays.filter(
          (s: any) =>
            s.billingStatus === 'ACCRUING' ||
            (s.freeUntil && Math.abs(Date.parse(s.freeUntil) - NOW.getTime()) < 2 * 86400000)
        ).length || 1,
      note: 'Customer notifications queued',
      to: '/units',
      perm: 'consignment.view',
    },
    {
      label: 'Holds placed today',
      count: liveHolds.filter((h: any) => h.status === 'ACTIVE').length || 1,
      note: 'Customs exam & verification',
      to: '/holds',
      perm: 'consignment.view',
    },
    {
      label: 'Proformas paid, not yet invoiced',
      count: 2,
      note: 'Convert so release can be issued',
      to: '/invoices',
      perm: 'billing.invoice.post',
    },
    {
      label: 'Fiscal receipts verified',
      count: 1,
      note: 'TRA verified INV-2026-003318',
      to: '/invoices',
      perm: 'billing.invoice.post',
    },
    {
      label: 'Cash-up to approve',
      count: 1,
      note: 'Shift reconcile in progress',
      to: '/cashier',
      perm: 'payment.cashup.approve',
    },
  ];

  const queues = all.filter((q) => can(q.perm, q.level ?? 'DO') && q.count > 0);
  const first = userName.split(' ')[0];

  return (
    <Page>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 'var(--fs-hero)', lineHeight: 1.05 }}>Habari, {first}.</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          {site.siteName} · {fmtD(NOW.toISOString())} ·{' '}
          {queues.length ? `${queues.length} things need you` : 'Nothing is waiting for you'}
        </p>
      </header>

      <div className="grid-main-side">
        <HomeQueuesPanel queues={queues} />
        <HomeGateActivityPanel />
      </div>
    </Page>
  );
}

export { HomeView as Home };
export default HomeView;
