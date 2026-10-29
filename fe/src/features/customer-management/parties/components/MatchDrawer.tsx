import { useState } from 'react';
import { Link2, Search } from 'lucide-react';
import { Banner, Button, Drawer, Field, SearchInput } from '@/ds/components';
import { NG_MATCHES } from '@/mock/insight';

export function MatchDrawer({
  open,
  name,
  onClose,
  onMatch,
}: {
  open: boolean;
  name: string;
  onClose: () => void;
  onMatch: (ref: string) => void;
}) {
  const [pick, setPick] = useState<string | null>(null);
  const [q, setQ] = useState(name);
  if (!open) return null;

  return (
    <Drawer
      open
      onClose={onClose}
      title="Match to NG record"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<Link2 />}
            disabled={!pick}
            perm="masters.local.edit"
            onClick={() => pick && onMatch(pick)}
          >
            Match to NG record
          </Button>
        </>
      }
    >
      <div className="stack-lg">
        <Field label="Search NG customers" hint="By name or TIN. Results come straight from NG.">
          <SearchInput icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
        <div className="stack" role="radiogroup" aria-label="NG records">
          {NG_MATCHES.map((m) => (
            <label
              key={m.ngRefId}
              className="panel"
              style={{
                padding: 12,
                cursor: 'pointer',
                borderColor: pick === m.ngRefId ? 'var(--ink)' : undefined,
              }}
            >
              <div className="row">
                <input type="radio" name="ng" checked={pick === m.ngRefId} onChange={() => setPick(m.ngRefId)} />
                <span className="spacer">
                  <strong>{m.name}</strong>
                  <div className="xs muted">
                    {m.ngRefId} · TIN {m.tin} · {m.city}
                  </div>
                </span>
                <span className="small muted">{m.score}% match</span>
              </div>
            </label>
          ))}
        </div>
        <Banner tone="info">
          Matching replaces this provisional party with the NG record everywhere: units, release orders and draft invoices.
          It is logged in the audit trail and cannot be undone here.
        </Banner>
        <p className="xs faint" style={{ margin: 0 }}>
          Not in NG yet? Ask finance to create the customer in NG first, then match.
        </p>
      </div>
    </Drawer>
  );
}
