import { Link } from 'react-router-dom';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { Banner, Button, DL, Drawer, Money, fmtD, fmtDT } from '@/ds/components';
import type { GlPost } from '@/mock/money';
import { GlPill } from '../../components/shared';

export interface JournalDrawerProps {
  open: GlPost | null;
  onClose: () => void;
  onRetry: (g: GlPost) => void;
}

export function JournalDrawer({ open, onClose, onRetry }: JournalDrawerProps) {
  return (
    <Drawer
      wide
      open={!!open}
      onClose={onClose}
      title={open ? `Journal for ${open.sourceNo}` : ''}
      footer={
        open?.status === 'FAILED' ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              icon={<RefreshCw />}
              perm="finance.period.close"
              onClick={() => onRetry(open)}
            >
              Retry posting
            </Button>
          </>
        ) : undefined
      }
    >
      {open && <JournalContent g={open} />}
    </Drawer>
  );
}

function JournalContent({ g }: { g: GlPost }) {
  const dr = g.journalLines.reduce((a, l) => a + l.debit, 0);
  const cr = g.journalLines.reduce((a, l) => a + l.credit, 0);

  return (
    <div className="stack">
      <DL
        cols
        items={[
          ['Source', g.to ? <Link key="s" to={g.to}>{g.sourceNo}</Link> : g.sourceNo],
          ['Kind', g.sourceKind],
          ['Posting date', fmtD(g.postingDate)],
          ['Destination', 'NG Billing'],
          ['Status', <GlPill key="g" status={g.status} />],
          ['NG reference', g.externalRef ?? '—'],
          ['Attempts', g.attempts],
          ['Posted', fmtDT(g.postedAt)],
        ]}
      />
      {g.lastError && <Banner tone="stop" title="Last error">{g.lastError}</Banner>}
      <div className="table-wrap">
        <table className="dt">
          <thead>
            <tr>
              <th>Account</th>
              <th>Description</th>
              <th className="num">Debit (TZS)</th>
              <th className="num">Credit (TZS)</th>
            </tr>
          </thead>
          <tbody>
            {g.journalLines.map((l, i) => (
              <tr key={i}>
                <td className="small strong">{l.account}</td>
                <td className="small">{l.description}</td>
                <td className="num">{l.debit ? <Money amount={l.debit} currency="TZS" /> : ''}</td>
                <td className="num">{l.credit ? <Money amount={l.credit} currency="TZS" /> : ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>Totals</td>
              <td className="num">
                <Money amount={dr} currency="TZS" />
              </td>
              <td className="num">
                <Money amount={cr} currency="TZS" />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <span
        className="row small"
        style={{ gap: 6, color: Math.abs(dr - cr) < 1 ? 'var(--go)' : 'var(--stop)' }}
      >
        <CheckCircle2 size={16} />
        {Math.abs(dr - cr) < 1 ? 'Balanced: debits equal credits' : 'Not balanced'}
      </span>
      <p className="xs muted">
        Amounts in the base currency TZS at the document's frozen rate. Exchange differences on payments post to 7100 /
        7110.
      </p>
    </div>
  );
}
