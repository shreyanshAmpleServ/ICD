import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ClipboardCheck, Gavel, Plus, Send, Trash2, Wrench } from 'lucide-react';
import {
  Banner,
  Button,
  DL,
  Empty,
  Input,
  Money,
  Page,
  PageHeader,
  Panel,
  Pill,
  Select,
  StatusPill,
  UnitNo,
  fmtDT,
  useToast,
} from '@/ds/components';
import type { S } from '@/api/types';
import { useQ } from '@/api/query';
import { partyName } from '@/mock/core';
import { LABOUR_RATE, repairCodes, repairName, type Estimate } from '@/mock/ops';
import { repairsApi } from '../api';
import { EST_STATUS } from './RepairsView';
import { DecisionDrawer } from './DecisionDrawer';

/* Repair estimate: PATCH while draft, :send to the line, :decision per line,
   :complete when the workshop is done. Responsibility decides who pays:
   OWNER = the line, USER = the consignee (via the line), DEPOT = our own cost. */
type L = S<'RepairEstimateLine'>;
const RESP: Record<string, string> = { OWNER: 'Line (owner)', USER: 'User (consignee)', DEPOT: 'Depot' };
const lineTotal = (l: L) => Number(l.labourCost ?? 0) + Number(l.materialCost ?? 0);

export function RepairEstimateView() {
  const { repairEstimateId } = useParams();
  const id = Number(repairEstimateId);
  const { data: est, isLoading } = useQ(['repair-estimate', id], () => repairsApi.getRepairEstimate(id));
  const toast = useToast();
  const [status, setStatus] = useState<Estimate['status']>();
  const [lines, setLines] = useState<L[]>([]);
  const [decideOpen, setDecideOpen] = useState(false);
  const [ref, setRef] = useState<string | undefined>();

  useEffect(() => {
    if (est) {
      setStatus(est.status);
      setLines(est.lines);
      setRef(est.approverRef ?? undefined);
    }
  }, [est]);

  if (isLoading) return <Page><Empty title="Loading estimate" /></Page>;
  if (!est) return <Page><Empty title="No estimate with this number" action={<Link to="/repairs">Back to repairs</Link>} /></Page>;

  const draft = status === 'DRAFT';
  const upd = (i: number, p: Partial<L>) =>
    setLines((ls) =>
      ls.map((l, k) => {
        if (k !== i) return l;
        const n = { ...l, ...p };
        return { ...n, labourCost: (Number(n.labourHours ?? 0) * LABOUR_RATE).toFixed(2) };
      })
    );
  const sum = (f: (l: L) => boolean) => lines.filter(f).reduce((a, l) => a + lineTotal(l), 0);
  const labour = lines.reduce((a, l) => a + Number(l.labourCost ?? 0), 0);
  const material = lines.reduce((a, l) => a + Number(l.materialCost ?? 0), 0);
  const approved = sum((l) => l.lineStatus === 'APPROVED' || l.lineStatus === 'DONE');

  return (
    <Page wide>
      <PageHeader
        crumbs={[['Repairs (M&R)', '/repairs'], [est.estimateNo ?? '']]}
        title={`Estimate ${est.estimateNo}`}
        ms="M5"
        sub={
          <span className="row-wrap" style={{ marginTop: 8 }}>
            <Pill tone={EST_STATUS[status ?? est.status!][1]}>{EST_STATUS[status ?? est.status!][0]}</Pill>
            <UnitNo no={est.unitNo} to={`/units/${est.unitStayId}`} />
            <span className="small muted">
              {est.unitType} · {est.location} · to {partyName(est.approverPartyId)} ({est.lineCode})
            </span>
          </span>
        }
        actions={
          <>
            {draft && (
              <Button
                variant="primary"
                icon={<Send />}
                perm="repair.estimate"
                disabled={!lines.length}
                onClick={async () => {
                  await repairsApi.sendToLine(est.repairEstimateId!);
                  setStatus('SENT');
                  toast(`Estimate sent to ${est.lineCode}`);
                }}
              >
                Send to line
              </Button>
            )}
            {status === 'SENT' && (
              <Button variant="primary" icon={<Gavel />} perm="repair.estimate" onClick={() => setDecideOpen(true)}>
                Record line decision
              </Button>
            )}
            {(status === 'APPROVED' || status === 'PARTIAL') && (
              <Button
                variant="primary"
                icon={<Wrench />}
                perm="repair.estimate"
                onClick={async () => {
                  await repairsApi.markRepairsDone(est.repairEstimateId!);
                  setLines((ls) => ls.map((l) => (l.lineStatus === 'APPROVED' ? { ...l, lineStatus: 'DONE' } : l)));
                  setStatus('COMPLETED');
                  toast('Repairs marked done. Unit back to available stock.');
                }}
              >
                Mark repairs done
              </Button>
            )}
          </>
        }
      />

      <div className="stack-lg">
        {status === 'SENT' && (
          <Banner tone="wait" title={`Waiting for ${est.lineCode} since ${fmtDT(est.sentAt)}`}>
            The line approves or rejects each line. Record their answer when the email or EDI reply arrives. The unit is
            not offered for release until then.
          </Banner>
        )}
        {status === 'PARTIAL' && (
          <Banner tone="wait" title="Part approved">
            Repair only the approved lines. Rejected lines stay as found and are noted on the next EIR.
          </Banner>
        )}
        {status === 'REJECTED' && (
          <Banner tone="stop" title="Line rejected the estimate">
            The unit goes back to stock as it is, marked damaged. Raise a new estimate if the line asks for one.
          </Banner>
        )}
        {status === 'COMPLETED' && (
          <Banner tone="go" title="Repaired">
            Approved lines done{est.completedAt ? ` ${fmtDT(est.completedAt)}` : ''}. Billable to the line and the user
            per line.
          </Banner>
        )}

        <div className="grid-main-side ops-gms">
          <style>{'.ops-gms > * { min-width: 0; }'}</style>
          <Panel
            title="Repair lines"
            flush
            sub={`Labour USD ${LABOUR_RATE}/h, agreed rate`}
            actions={
              draft && (
                <Button
                  size="sm"
                  icon={<Plus />}
                  perm="repair.estimate"
                  onClick={() =>
                    setLines((ls) => [
                      ...ls,
                      {
                        repairEstimateLineId: 99900 + ls.length,
                        lineNo: ls.length + 1,
                        repairCode: 'STR-DT',
                        locationDetail: '',
                        quantity: '1',
                        labourHours: '1.5',
                        labourCost: (1.5 * LABOUR_RATE).toFixed(2),
                        materialCost: '0.00',
                        responsibility: 'OWNER',
                        lineStatus: 'PROPOSED',
                      },
                    ])
                  }
                >
                  Add line
                </Button>
              )
            }
          >
            <div className="table-wrap">
              <table className="dt">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Repair</th>
                    <th>Where</th>
                    <th className="num">Qty</th>
                    <th className="num">Hours</th>
                    <th className="num">Labour</th>
                    <th className="num">Material</th>
                    <th>Who pays</th>
                    {!draft && <th>Status</th>}
                    {draft && <th />}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={l.repairEstimateLineId}>
                      <td className="small">{l.lineNo}</td>
                      <td style={{ minWidth: 190 }}>
                        {draft ? (
                          <Select
                            style={{ minWidth: 220 }}
                            value={l.repairCode}
                            onChange={(e) =>
                              upd(i, {
                                repairCode: e.target.value,
                                labourHours: (
                                  Number(
                                    repairCodes.find((r) => r.repairCode === e.target.value)?.defaultLabourHours ?? 1
                                  ) * Number(l.quantity ?? 1)
                                ).toFixed(1),
                              })
                            }
                            options={repairCodes.map((r) => [r.repairCode, `${r.repairCode} · ${r.repairName}`])}
                          />
                        ) : (
                          <>
                            <strong className="small">{repairName(l.repairCode)}</strong>
                            <div className="xs faint">{l.repairCode}</div>
                          </>
                        )}
                      </td>
                      <td className="small" style={{ minWidth: 130 }}>
                        {draft ? (
                          <Input
                            value={l.locationDetail ?? ''}
                            onChange={(e) => upd(i, { locationDetail: e.target.value })}
                            placeholder="e.g. Left side, panel 3"
                          />
                        ) : (
                          l.locationDetail
                        )}
                      </td>
                      <td className="num">
                        {draft ? (
                          <Input
                            value={l.quantity ?? ''}
                            inputMode="numeric"
                            style={{ width: 56, textAlign: 'right' }}
                            aria-label="Quantity"
                            onChange={(e) => {
                              const q = e.target.value.replace(/\D/g, '');
                              upd(i, {
                                quantity: q,
                                labourHours: (
                                  Number(
                                    repairCodes.find((r) => r.repairCode === l.repairCode)?.defaultLabourHours ?? 1
                                  ) * Number(q || 0)
                                ).toFixed(1),
                              });
                            }}
                          />
                        ) : (
                          l.quantity
                        )}
                      </td>
                      <td className="num">{l.labourHours}</td>
                      <td className="num">
                        <Money amount={l.labourCost} />
                      </td>
                      <td className="num">
                        {draft ? (
                          <Input
                            value={l.materialCost ?? ''}
                            inputMode="decimal"
                            style={{ width: 84, textAlign: 'right' }}
                            aria-label="Material cost"
                            onChange={(e) => upd(i, { materialCost: e.target.value })}
                          />
                        ) : (
                          <Money amount={l.materialCost} />
                        )}
                      </td>
                      <td>
                        {draft ? (
                          <Select
                            style={{ minWidth: 150 }}
                            value={l.responsibility ?? 'OWNER'}
                            onChange={(e) => upd(i, { responsibility: e.target.value as L['responsibility'] })}
                            options={Object.entries(RESP)}
                          />
                        ) : (
                          <span className="small">{RESP[l.responsibility ?? 'OWNER']}</span>
                        )}
                      </td>
                      {!draft && (
                        <td>
                          <StatusPill value={l.lineStatus === 'PROPOSED' ? 'PENDING' : l.lineStatus} />
                        </td>
                      )}
                      {draft && (
                        <td>
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<Trash2 />}
                            aria-label={`Remove line ${l.lineNo}`}
                            onClick={() => setLines((ls) => ls.filter((_, k) => k !== i))}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td />
                    <td className="strong" colSpan={4}>
                      Total
                    </td>
                    <td className="num strong">
                      <Money amount={labour} />
                    </td>
                    <td className="num strong">
                      <Money amount={material} />
                    </td>
                    <td colSpan={2} className="strong">
                      <Money amount={labour + material} currency="USD" strong />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Panel>
          <div className="stack-lg">
            <Panel title="Who pays">
              <DL
                items={[
                  ['Line (owner)', <Money key="o" amount={sum((l) => l.responsibility === 'OWNER')} currency="USD" />],
                  [
                    'User (consignee)',
                    <Money key="u" amount={sum((l) => l.responsibility === 'USER')} currency="USD" />,
                  ],
                  ['Depot', <Money key="d" amount={sum((l) => l.responsibility === 'DEPOT')} currency="USD" />],
                  ['Total', <Money key="t" amount={labour + material} currency="USD" strong />],
                  ['Approved so far', <Money key="a" amount={approved} currency="USD" />],
                ]}
              />
              <p className="xs faint" style={{ marginTop: 8 }}>
                Amounts exclude VAT 18%, added on the invoice to the line.
              </p>
            </Panel>
            <Panel title="Estimate">
              <DL
                items={[
                  ['Line', partyName(est.approverPartyId)],
                  ['Line reference', ref ?? '—'],
                  ['Created', fmtDT(est.createdAt)],
                  ['Sent', fmtDT(est.sentAt)],
                  ['Decided', fmtDT(est.decidedAt)],
                  [
                    'From inspection',
                    est.inspectionId ? (
                      <Link key="i" to={`/inspections/${est.inspectionId}`} className="row" style={{ gap: 4 }}>
                        <ClipboardCheck size={14} />
                        {est.inspectionId}
                      </Link>
                    ) : (
                      '—'
                    ),
                  ],
                ]}
              />
            </Panel>
            <Panel title="Photos">
              <div className="grid-2">
                {['Before, overview', 'Before, close-up', 'After, overview', 'After, close-up'].map((p) => (
                  <div key={p} className="photo">
                    {p}
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </div>

      <DecisionDrawer
        open={decideOpen}
        est={est}
        lines={lines}
        onClose={() => setDecideOpen(false)}
        onSave={async (dec, r) => {
          await repairsApi.recordDecision(est.repairEstimateId!, { decisions: dec, ref: r });
          const next = lines.map((l) => ({ ...l, lineStatus: dec[l.repairEstimateLineId!] }));
          const ap = next.filter((l) => l.lineStatus === 'APPROVED').length;
          setLines(next);
          setRef(r);
          setStatus(ap === next.length ? 'APPROVED' : ap === 0 ? 'REJECTED' : 'PARTIAL');
          toast(`Line decision recorded: ${ap} of ${next.length} lines approved`);
        }}
      />
    </Page>
  );
}

export const RepairEstimate = RepairEstimateView;
export default RepairEstimateView;
