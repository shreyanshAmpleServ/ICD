import { Settings2 } from 'lucide-react';
import { Button, Panel } from '@/ds/components';
import { VISIT_TYPES } from '@/features/gate-management/types';

export interface SlotRuleItem {
  weekday: number;
  visitTypeCode: string;
  slotStart: string;
  slotEnd: string;
  capacityTrucks: number;
  lateGraceMin: number;
}

export function AppointmentsRulesPanel({ rules = [] }: { rules?: SlotRuleItem[] }) {
  const visitTypes = Array.from(new Set(rules.map((r) => r.visitTypeCode))).filter(Boolean);
  const typesToRender = visitTypes.length > 0 ? visitTypes : ['IMPORT_PICKUP', 'EXPORT_DROP', 'EMPTY_RETURN', 'EMPTY_PICKUP', 'TRANSFER_IN'];

  return (
    <Panel
      title="Slot rules"
      sub="Trucks per hour, by visit type"
      actions={
        <Button size="sm" icon={<Settings2 />} perm="appointment.manage">
          Edit rules
        </Button>
      }
    >
      <div className="stack">
        <table className="dt" style={{ fontSize: 13 }}>
          <thead>
            <tr>
              <th>Visit type</th>
              <th>Mon–Fri</th>
              <th>Sat</th>
            </tr>
          </thead>
          <tbody>
            {typesToRender.map((t) => {
              const wk = rules.find((r) => r.weekday >= 1 && r.weekday <= 5 && r.visitTypeCode === t) || rules.find((r) => r.visitTypeCode === t);
              const sat = rules.find((r) => r.weekday === 6 && r.visitTypeCode === t) || wk;
              return (
                <tr key={t}>
                  <td className="small">
                    {VISIT_TYPES[t] || t.replace(/_/g, ' ')}
                    <div className="xs faint">Late grace {wk?.lateGraceMin ?? 30} min</div>
                  </td>
                  <td className="small">
                    {wk?.capacityTrucks ?? 6}/h
                    <div className="xs faint">
                      {wk?.slotStart || '06:00'}–{wk?.slotEnd || '22:00'}
                    </div>
                  </td>
                  <td className="small">
                    {sat?.capacityTrucks ?? 4}/h
                    <div className="xs faint">
                      {sat?.slotStart || '06:00'}–{sat?.slotEnd || '18:00'}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <ul className="list-plain small muted stack" style={{ gap: 6 }}>
          <li>Sunday and public holidays: closed.</li>
          <li>A truck more than the grace late is a no show; the slot goes back to the pool.</li>
          <li>Import pick-ups need an approved release order to book.</li>
        </ul>
      </div>
    </Panel>
  );
}
