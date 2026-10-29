import { Plus, Trash2 } from 'lucide-react';
import { Banner, Button, DataTable, Panel, fmtD } from '@/ds/components';
import { calendars, holidays as seedHol } from '@/mock/admin';
import { AuditNote, VerifyPill } from '../../shared/AdminKit';
import { MiniMonth } from './MiniMonth';

type Hol = (typeof seedHol)[number];

export function CalendarTab({
  hols,
  onAddHoliday,
  onRemoveHoliday,
}: {
  hols: Hol[];
  onAddHoliday: () => void;
  onRemoveHoliday: (h: Hol) => void;
}) {
  return (
    <>
      <Banner tone="wait" title="Verify the 2026 holiday list" action={<VerifyPill>Verify</VerifyPill>}>
        Islamic holidays (Eid al-Fitr, Eid al-Adha, Maulid) move with the moon and are confirmed by government notice a few
        days before. Check every date against the official gazette and update when announced.
      </Banner>
      <div className="grid-main-side">
        <Panel
          flush
          title={calendars[0].calendarName}
          sub="Used by DAR1, DAR2 and KBH1"
          actions={
            <Button size="sm" icon={<Plus />} perm="admin.config.manage" onClick={onAddHoliday}>
              Add holiday
            </Button>
          }
        >
          <DataTable
            rows={[...hols].sort((a, b) => a.holidayDate.localeCompare(b.holidayDate))}
            rowKey={(h) => h.holidayDate}
            cols={[
              { key: 'd', header: 'Date', render: (h) => <span className="adm-cond strong">{fmtD(h.holidayDate)}</span> },
              {
                key: 'w',
                header: 'Day',
                render: (h) => (
                  <span className="small">
                    {new Date(h.holidayDate + 'T00:00:00Z').toLocaleDateString('en-GB', {
                      weekday: 'long',
                      timeZone: 'UTC',
                    })}
                  </span>
                ),
              },
              { key: 'n', header: 'Holiday', render: (h) => <strong className="small">{h.holidayName}</strong> },
              { key: 'v', header: '', render: (h) => (h.moves ? <VerifyPill>Date moves: verify</VerifyPill> : null) },
              {
                key: 'x',
                header: '',
                render: (h) => (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Trash2 />}
                    perm="admin.config.manage"
                    aria-label={`Remove ${h.holidayName}`}
                    onClick={() => onRemoveHoliday(h)}
                  />
                ),
              },
            ]}
          />
        </Panel>
        <div className="stack-lg">
          <Panel title="Free-day policy">
            <div className="stack small">
              <p style={{ margin: 0 }}>
                <strong>Sundays and public holidays count as free days.</strong> Free time is counted in calendar days from
                discharge at the port; a holiday inside the free period does not extend it.
              </p>
              <p style={{ margin: 0 }} className="muted">
                Holidays matter for working-day rules: release validity, SLA clocks on exceptions and approval expiry skip
                them.
              </p>
              <p style={{ margin: 0 }} className="muted">
                Free days per regime and customer are set in tariffs.
              </p>
            </div>
          </Panel>
          <Panel title="2026 at a glance">
            <div className="grid-2" style={{ gap: 12 }}>
              {[9, 10, 11].map((m) => (
                <MiniMonth key={m} month={m} hols={hols} />
              ))}
            </div>
          </Panel>
        </div>
      </div>
      <AuditNote />
    </>
  );
}
