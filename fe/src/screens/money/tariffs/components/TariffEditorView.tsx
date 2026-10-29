import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Copy, Plus, Send } from 'lucide-react';
import {
  Banner, Button, DL, Empty, Input, Money, Page, PageHeader, Panel, Pill, StatusPill, fmtD, useToast,
} from '@/ds/components';
import { useSession } from '@/app/session';
import { useQ } from '@/api/query';
import { partyName } from '@/mock/core';
import { BASIS_LABEL, CHARGE_NAMES, TAX, tariffs, type Rule, type Tariff } from '@/mock/money';
import { tariffsApi } from '../api';
import { SlabDrawer, filtersOf } from './SlabDrawer';
import { RatingPreview } from './RatingPreview';

const LEVEL: Record<string, string> = { SITE: 'Site', REGIME: 'Regime', LINE: 'Shipping line', CUSTOMER: 'Customer' };

const scopeOf = (t: Tariff) =>
  t.level === 'SITE'
    ? ({ 1: 'DAR1 main yard', 2: 'DAR2 vehicle yard', 3: 'KBH1 warehouse' } as Record<number, string>)[t.siteId ?? 1]
    : t.level === 'REGIME'
    ? `${t.regimeCode?.toLowerCase()} cargo`
    : partyName(t.partyId);

export function TariffEditorView() {
  const { tariffId } = useParams();
  const { data } = useQ<Tariff | undefined>(['tariff', tariffId], () => tariffsApi.getTariff(Number(tariffId)));
  if (!data) {
    return (
      <Page>
        <Empty title="Loading tariff" />
      </Page>
    );
  }
  return <Editor key={data.tariffId} base={data} />;
}

function Editor({ base }: { base: Tariff }) {
  const toast = useToast();
  const nav = useNavigate();
  const { can, site } = useSession();
  const [t, setT] = useState<Tariff>(base);
  const [slabRule, setSlabRule] = useState<Rule | null>(null);
  const draft = t.status === 'DRAFT';
  const versions = tariffs.filter((x) => x.tariffCode === t.tariffCode).sort((a, b) => b.versionNo - a.versionNo);
  const setRule = (r: Rule) =>
    setT((x) => ({ ...x, rules: x.rules.map((y) => (y.tariffRuleId === r.tariffRuleId ? r : y)) }));

  return (
    <Page>
      <PageHeader
        crumbs={[['Tariffs', '/tariffs'], [`${t.tariffCode} v${t.versionNo}`]]}
        title={t.tariffName}
        ms="M3"
        sub={
          <span className="row-wrap" style={{ marginTop: 6 }}>
            <StatusPill value={t.status} />
            <Pill tone="info">
              {LEVEL[t.level]}: {scopeOf(t)}
            </Pill>
            <span className="small muted">
              {t.tariffCode} · v{t.versionNo} · {t.currency}
            </span>
          </span>
        }
        actions={
          <>
            {t.status === 'ACTIVE' && (
              <Button
                icon={<Copy />}
                perm="billing.tariff.change"
                level="REQ"
                onClick={() => {
                  toast(`Draft v${t.versionNo + 1} created`);
                  nav('/tariffs/32');
                }}
              >
                New version
              </Button>
            )}
            {draft && (
              <Button
                variant="primary"
                icon={<Send />}
                perm="billing.tariff.change"
                level="REQ"
                onClick={() => {
                  setT((x) => ({ ...x, status: 'PENDING_APPROVAL', approvalNote: 'Submitted just now' }));
                  toast('Tariff submitted for approval');
                }}
              >
                Submit for approval
              </Button>
            )}
            {t.status === 'PENDING_APPROVAL' && can('billing.tariff.change', 'APPR') && (
              <Button
                variant="primary"
                icon={<CheckCircle2 />}
                perm="billing.tariff.change"
                level="APPR"
                onClick={() => {
                  setT((x) => ({ ...x, status: 'ACTIVE', approvalNote: undefined }));
                  toast('Tariff approved');
                }}
              >
                Approve tariff
              </Button>
            )}
          </>
        }
      />
      <div className="stack-lg">
        {t.status === 'PENDING_APPROVAL' && (
          <Banner tone="wait" title="Awaiting approval">
            {t.approvalNote ?? 'Waiting for the finance manager.'} Rules are locked until it is approved or sent back.
          </Banner>
        )}
        {t.status === 'ACTIVE' && (
          <Banner title="Active tariffs can't be edited">
            Create a new version with its own effective date. Events keep the version active on their service date.
          </Banner>
        )}
        {t.status === 'RETIRED' && (
          <Banner title="Retired">Kept for invoices with service dates up to {fmtD(t.effectiveTo)}.</Banner>
        )}
        <div className="grid-main-side">
          <div className="stack-lg" style={{ minWidth: 0 }}>
            <Panel title="Header">
              <DL
                cols
                items={[
                  [
                    'Effective from',
                    draft ? (
                      <Input
                        key="f"
                        type="date"
                        value={t.effectiveFrom}
                        onChange={(e) => setT({ ...t, effectiveFrom: e.target.value })}
                      />
                    ) : (
                      fmtD(t.effectiveFrom)
                    ),
                  ],
                  ['Effective to', t.effectiveTo ? fmtD(t.effectiveTo) : 'Until replaced'],
                  ['Currency', t.currency],
                  ['Regulator ref.', t.regulatorRef],
                  ['Updated by', t.updatedBy],
                ]}
              />
              {t.remarks && <p className="small muted" style={{ marginTop: 12 }}>{t.remarks}</p>}
            </Panel>
            <Panel flush title="Rules" sub={draft ? 'Click a time-based rule to edit its slabs' : `${t.rules.length} rules`}>
              <div className="table-wrap">
                <table className="dt">
                  <thead>
                    <tr>
                      <th>Charge</th>
                      <th>Basis</th>
                      <th>Applies to</th>
                      <th>Free time</th>
                      <th className="num">Rate (USD)</th>
                      <th className="num">Min / max</th>
                      <th>VAT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.rules.map((r) => {
                      const timed = r.slabs.length > 0;
                      return (
                        <tr
                          key={r.tariffRuleId}
                          className={timed ? 'clickable' : undefined}
                          tabIndex={timed ? 0 : undefined}
                          onClick={timed ? () => setSlabRule(r) : undefined}
                          onKeyDown={
                            timed
                              ? (e) => {
                                  if (e.key === 'Enter') setSlabRule(r);
                                }
                              : undefined
                          }
                        >
                          <td>
                            <span className="strong small">{CHARGE_NAMES[r.chargeCode]}</span>
                            <div className="xs faint">{r.chargeCode}</div>
                          </td>
                          <td className="small nowrap">{BASIS_LABEL[r.basis]}</td>
                          <td>
                            <span className="row" style={{ gap: 4 }}>
                              {filtersOf(r).length ? (
                                filtersOf(r).map((f) => (
                                  <span key={f} className="tag">
                                    {f}
                                  </span>
                                ))
                              ) : (
                                <span className="xs faint">All units</span>
                              )}
                            </span>
                          </td>
                          <td className="small nowrap">
                            {r.freeDays ? (
                              <span>
                                {r.freeDays} days from {r.clockStart === 'GATE_IN' ? 'gate-in' : 'discharge'}
                                <div className="xs faint">
                                  {r.freeExclSundays || r.freeExclHolidays
                                    ? 'Sundays, holidays skipped'
                                    : 'Sundays, holidays count'}
                                </div>
                              </span>
                            ) : (
                              <span className="faint">—</span>
                            )}
                          </td>
                          <td className="num small">
                            {timed ? (
                              <span className="nowrap">
                                {r.slabs
                                  .filter((s) => Number(s.rate) > 0)
                                  .map((s) => Number(s.rate).toFixed(2))
                                  .join(' / ')}{' '}
                                <span className="xs faint">slabs</span>
                              </span>
                            ) : (
                              <Money amount={r.flatRate} />
                            )}
                          </td>
                          <td className="num small">
                            {r.minCharge || r.maxCharge ? `${r.minCharge ?? '—'} / ${r.maxCharge ?? '—'}` : '—'}
                          </td>
                          <td className="small">{TAX[r.taxCode ?? 'VAT18']?.name}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {draft && (
                <div style={{ padding: 12 }}>
                  <Button size="sm" icon={<Plus />} perm="billing.tariff.change" onClick={() => toast('Rule added')}>
                    Add rule
                  </Button>
                </div>
              )}
            </Panel>
            {t.rules.some((r) => r.taxCode === 'VAT0') && (
              <Banner tone="wait" title="Zero-rated rules">
                Transit services carry VAT 0% in this tariff. Verify with tax adviser.
              </Banner>
            )}
          </div>
          <div className="stack-lg">
            <RatingPreview t={t} siteId={site.siteId} />
            <Panel title="Versions" flush>
              <ul className="list-plain">
                {versions.map((v) => (
                  <li key={v.tariffId} style={{ padding: '10px 16px', borderBottom: '1px solid var(--steel-2)' }}>
                    <Link
                      to={`/tariffs/${v.tariffId}`}
                      className="row"
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <span className="strong spacer">
                        v{v.versionNo}
                        {v.tariffId === t.tariffId ? ' (this)' : ''}
                      </span>
                      <StatusPill value={v.tariffId === t.tariffId ? t.status : v.status} />
                    </Link>
                    <div className="xs muted">
                      {fmtD(v.effectiveFrom)} – {v.effectiveTo ? fmtD(v.effectiveTo) : 'open'}
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      </div>
      <SlabDrawer
        rule={slabRule}
        editable={draft}
        onClose={() => setSlabRule(null)}
        onSave={(r) => {
          setRule(r);
          toast('Slabs saved to draft');
        }}
      />
    </Page>
  );
}
