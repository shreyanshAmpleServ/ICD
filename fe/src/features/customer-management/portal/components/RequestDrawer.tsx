import { useState } from 'react';
import { FileText, MessageSquarePlus } from 'lucide-react';
import { Button, Drawer, Field, Select, Textarea, useToast } from '@/ds/components';
import { party as partyOf, type Stay } from '@/mock/core';
import { SR_KINDS, invoicesOf, type SR } from '@/mock/insight';

type ReqKind = 'DELIVERY' | 'DOCUMENT_SUBMISSION' | 'FREE_DAY_EXTENSION' | 'INVOICE_QUERY' | 'DAMAGE_CLAIM';

const KINDS: [ReqKind, string, string][] = [
  ['DELIVERY', 'Delivery', 'Ask us to release and load a unit for your truck'],
  ['DOCUMENT_SUBMISSION', 'Send a document', 'Customs entry, release, delivery order from the line'],
  ['FREE_DAY_EXTENSION', 'More free days', 'When the delay was not caused by you'],
  ['INVOICE_QUERY', 'Invoice query', 'A charge you think is wrong'],
  ['DAMAGE_CLAIM', 'Damage claim', 'Damage you found after collection'],
];

export function RequestDrawer({
  open,
  kind,
  unit,
  units,
  partyId,
  onClose,
  onSent,
}: {
  open: boolean;
  kind?: ReqKind;
  unit?: Stay;
  units: Stay[];
  partyId: number;
  onClose: () => void;
  onSent: (r: SR) => void;
}) {
  const toast = useToast();
  const [k, setK] = useState<ReqKind | null>(null);
  const [u, setU] = useState('');
  const [days, setDays] = useState('3');
  const [inv, setInv] = useState('');
  const [text, setText] = useState('');
  if (!open) return null;
  const cur = k ?? kind ?? 'DELIVERY';
  const uid = u || (unit ? String(unit.unitStayId) : '');
  const st = units.find((x) => String(x.unitStayId) === uid);
  const ok = text.trim().length >= 10 && (cur === 'INVOICE_QUERY' ? !!inv : !!uid);
  const close = () => {
    setK(null);
    setU('');
    setText('');
    setInv('');
    onClose();
  };
  const invs = invoicesOf(partyId);

  return (
    <Drawer
      open
      onClose={close}
      title="Request a service"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<MessageSquarePlus />}
            disabled={!ok}
            perm="portal.request.submit"
            onClick={() => {
              const sr: SR = {
                serviceRequestId: 7120,
                requestNo: 'SR-26-07120',
                requestKind: cur,
                partyId,
                partyName: partyOf(partyId)?.partyName ?? '',
                unitStayId: st?.unitStayId,
                unitNo: st?.cargoUnit.unitNo,
                consignmentId: st?.consignmentId,
                subject: `${KINDS.find((x) => x[0] === cur)![1]}${st ? ` · ${st.cargoUnit.unitNo}` : inv ? ` · ${inv}` : ''}`,
                details: text,
                status: 'SUBMITTED',
                createdAt: '2026-10-07T07:30:00Z',
                slaDueAt: new Date(Date.parse('2026-10-07T07:30:00Z') + SR_KINDS[cur].slaHours * 3600_000).toISOString(),
                payload:
                  cur === 'FREE_DAY_EXTENSION'
                    ? { days: Number(days) }
                    : cur === 'INVOICE_QUERY'
                    ? { invoiceNo: inv }
                    : null,
                messages: [{ from: 'customer', who: 'You', at: '2026-10-07T07:30:00Z', text }],
              };
              toast(`Request sent · ${sr.requestNo}`);
              setK(null);
              setU('');
              setText('');
              onSent(sr);
            }}
          >
            Send request
          </Button>
        </>
      }
    >
      <div className="stack-lg">
        <Field label="What do you need?">
          <div className="stack" style={{ gap: 6 }} role="radiogroup">
            {KINDS.map(([id, l, hint]) => (
              <label key={id} className="check" style={{ alignItems: 'flex-start' }}>
                <input type="radio" name="kind" checked={cur === id} onChange={() => setK(id)} />
                <span>
                  <span className="strong">{l}</span>
                  <span className="xs muted" style={{ display: 'block' }}>
                    {hint} · answer within {SR_KINDS[id].slaHours} h
                  </span>
                </span>
              </label>
            ))}
          </div>
        </Field>
        {cur === 'INVOICE_QUERY' ? (
          <Field label="Invoice" required>
            <Select
              value={inv}
              onChange={(e) => setInv(e.target.value)}
              options={[
                ['', 'Choose an invoice'],
                ...invs.map((i) => [i.invoiceNo!, `${i.invoiceNo} · USD ${Number(i.total).toLocaleString()}`] as [string, string]),
              ]}
            />
          </Field>
        ) : (
          <Field label="Unit" required>
            <Select
              value={uid}
              onChange={(e) => setU(e.target.value)}
              options={[
                ['', 'Choose a unit'],
                ...units.slice(0, 80).map((x) => [String(x.unitStayId), `${x.cargoUnit.unitNo} · ${x.unitSummary.consignmentRef}`] as [string, string]),
              ]}
            />
          </Field>
        )}
        {cur === 'FREE_DAY_EXTENSION' && (
          <Field label="Extra days asked for" hint="Approval needed; we reply with the decision and any new charges">
            <Select value={days} onChange={(e) => setDays(e.target.value)} options={['1', '2', '3', '5', '7']} />
          </Field>
        )}
        <Field
          label="Details"
          required
          hint={cur === 'DAMAGE_CLAIM' ? 'Say where the damage is and when you found it. Attach photos.' : 'At least 10 characters'}
        >
          <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <Field label="Attachments" hint="PDF or photo, up to 10 MB each">
          <Button icon={<FileText />}>Attach file</Button>
        </Field>
      </div>
    </Drawer>
  );
}
