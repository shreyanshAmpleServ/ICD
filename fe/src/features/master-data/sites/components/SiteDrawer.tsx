import { useState } from 'react';
import { Check, Field, Input, Segmented, Select } from '@/ds/components';
import { EditDrawer, useDynamicCalendars } from '../../shared/AdminKit';
import { FACILITY_NAME, calendars as fallbackCalendars, type Site } from '@/mock/admin';

const FACILITIES = ['ICD', 'ICDV', 'CFS', 'EMPTY_DEPOT', 'WAREHOUSE'] as const;

interface SiteDrawerProps {
  open: boolean;
  onClose: () => void;
  site: Site;
  onSave: (s: Site) => void;
  isNew?: boolean;
}

export function SiteDrawer({ open, onClose, site, onSave, isNew }: SiteDrawerProps) {
  const { options: calendarOptions } = useDynamicCalendars();
  const [s, setS] = useState(site);
  const set = (p: Partial<Site>) => setS((x) => ({ ...x, ...p }));
  const codeOk = /^[A-Z0-9]{3,8}$/.test(s.siteCode);
  const calOpts = calendarOptions.length > 0 ? calendarOptions : fallbackCalendars.map((c) => [String(c.calendarId), c.calendarName] as [string, string]);

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      title={isNew ? 'Add site' : `Edit ${site.siteCode}`}
      saveLabel={isNew ? 'Add site' : 'Save site'}
      perm="admin.site.manage"
      disabled={!codeOk || !s.siteName}
      onSave={() => onSave(s)}
      wide
    >
      <div className="form-grid">
        <Field
          label="Site code"
          required
          error={s.siteCode && !codeOk ? '3 to 8 capital letters or digits' : undefined}
          hint={isNew ? 'Used in document numbers, e.g. INV-DAR1-26-…' : 'Cannot change: it is in issued numbers'}
        >
          <Input value={s.siteCode} disabled={!isNew} onChange={(e) => set({ siteCode: e.target.value.toUpperCase() })} />
        </Field>
        <Field label="Site name" required>
          <Input value={s.siteName} onChange={(e) => set({ siteName: e.target.value })} />
        </Field>
        <Field label="Time zone" hint="All times are stored in UTC and shown in this zone">
          <Select value={s.timeZone} onChange={(e) => set({ timeZone: e.target.value })} options={['Africa/Dar_es_Salaam', 'Africa/Nairobi', 'Africa/Kampala', 'Africa/Lusaka']} />
        </Field>
        <Field label="Customs station code" hint="TRA station code for this depot">
          <Input value={s.customsStationCode ?? ''} onChange={(e) => set({ customsStationCode: e.target.value.toUpperCase() })} />
        </Field>
        <Field label="Regulator licence">
          <Input value={s.regulatorLicenceNo ?? ''} onChange={(e) => set({ regulatorLicenceNo: e.target.value })} />
        </Field>
        <Field label="Calendar">
          <Select value={String(s.calendarId)} onChange={(e) => set({ calendarId: Number(e.target.value) })} options={calOpts} />
        </Field>
        <Field label="Offline gate limit (minutes)" hint="0 turns offline gate entry off">
          <Input type="number" min={0} max={240} value={s.offlineGateLimitMin} onChange={(e) => set({ offlineGateLimitMin: Number(e.target.value) })} />
        </Field>
      </div>
      <Field label="Customer signature on EIR and gate pass">
        <Segmented
          value={s.signatureMode ?? 'EITHER'}
          onChange={(v) => set({ signatureMode: v })}
          options={[{ id: 'SCREEN', label: 'On screen' }, { id: 'PAPER', label: 'Paper' }, { id: 'EITHER', label: 'Either' }]}
        />
      </Field>
      <Field label="Facilities at this site" hint="Turning a facility on adds its screens to the menu for this site">
        <div className="row-wrap" style={{ gap: 16 }}>
          {FACILITIES.map((f) => (
            <Check
              key={f}
              label={`${f.replace('_', ' ')} · ${FACILITY_NAME[f]}`}
              checked={s.facilities.includes(f)}
              onChange={(e) => set({ facilities: e.target.checked ? [...s.facilities, f] : s.facilities.filter((x) => x !== f) })}
            />
          ))}
        </div>
      </Field>
    </EditDrawer>
  );
}
