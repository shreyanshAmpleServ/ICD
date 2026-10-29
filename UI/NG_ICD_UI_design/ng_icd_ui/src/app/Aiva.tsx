import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, Sparkles, Wrench, X } from 'lucide-react';
import { Button, Pill, UnitNo } from '@/ds/components';
import { HERO } from '@/mock/core';

/* Aiva on Claude. Answers stream over SSE (POST /aiva/conversations/{id}/messages).
   It calls read-only tools with the user's own permissions, shows which tools it
   used, and "prepares" drafts the user submits through normal approvals. */
interface Msg { from: 'user' | 'aiva'; text: string; tools?: string[]; draft?: boolean; unit?: boolean }

const SAMPLE: Msg[] = [
  { from: 'user', text: `Why can't ${HERO.cargoUnit.unitNo.slice(0, 4)} ${HERO.cargoUnit.unitNo.slice(4)} leave today?` },
  {
    from: 'aiva', unit: true, tools: ['get_unit', 'explain_gate_out', 'rating_preview'],
    text: `Two things are stopping it. Customs has an examination hold on it (notice EXN/DSM/26/04418); the exam is booked for 14:00 today at bay X-01. Charges of USD ${HERO.accruedCharges?.total} are also unpaid; free days ended on ${new Date(HERO.freeUntil!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}. Once customs records the release and the charges are paid, the release order can be approved.`,
  },
  { from: 'user', text: 'The exam was delayed by customs. Can we waive the extra days?' },
  {
    from: 'aiva', tools: ['get_charges', 'get_customs_refs'], draft: true,
    text: 'I prepared a waiver request for 4 storage days (USD 64.00) with the exam notice attached. It needs approval because it is above your limit. Review and submit it, or discard it.',
  },
];
const SUGGEST = ['Which trucks are waiting longest?', 'Units with free time ending tomorrow', 'Summarise today’s exceptions'];

export function AivaPanel({ onClose }: { onClose: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>(SAMPLE);
  const [q, setQ] = useState('');
  const ask = (text: string) => {
    if (!text.trim()) return;
    setMsgs((m) => [...m, { from: 'user', text }, { from: 'aiva', tools: ['search_units'], text: 'In the prototype Aiva answers only the sample questions. In the product this streams a live answer built from the tools you are allowed to use.' }]);
    setQ('');
  };
  return (
    <aside className="aiva" aria-label="Aiva assistant">
      <div className="aiva-head">
        <Sparkles size={18} />
        <strong className="spacer">Aiva</strong>
        <Pill tone="info">Read-only tools</Pill>
        <Button variant="ghost" size="sm" aria-label="Close Aiva" icon={<X />} onClick={onClose} />
      </div>
      <div className="aiva-body" aria-live="polite">
        {msgs.map((m, i) => m.from === 'user' ? (
          <div key={i} className="msg msg-user">{m.text}</div>
        ) : (
          <div key={i} className="msg msg-aiva">
            {m.tools && <div className="toolcall"><Wrench />Looked up: {m.tools.join(', ')}</div>}
            <div className="bubble">
              {m.unit && <div style={{ marginBottom: 6 }}><UnitNo no={HERO.cargoUnit.unitNo} to={`/units/${HERO.unitStayId}`} /></div>}
              {m.text}
              {m.draft && (
                <div className="draft">
                  <div className="small strong">Draft: waiver request</div>
                  <div className="xs muted">4 storage days · USD 64.00 · reason and exam notice attached</div>
                  <div className="row" style={{ marginTop: 8 }}>
                    <Button size="sm" variant="primary" perm="billing.waiver" level="REQ">Review and submit</Button>
                    <Button size="sm" variant="ghost">Discard</Button>
                  </div>
                </div>
              )}
            </div>
            {i === 1 && <div className="xs" style={{ marginTop: 4 }}><Link to={`/units/${HERO.unitStayId}`}>Open the unit</Link></div>}
          </div>
        ))}
        <div className="row-wrap">
          {SUGGEST.map((s) => <button key={s} className="chip" onClick={() => ask(s)}>{s}</button>)}
        </div>
      </div>
      <form className="aiva-foot" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about a unit, truck, invoice or today’s work" aria-label="Message Aiva" />
        <Button variant="primary" aria-label="Send" icon={<Send />} type="submit" />
      </form>
    </aside>
  );
}
