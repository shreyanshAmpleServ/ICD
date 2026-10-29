import { Settings2 } from 'lucide-react';
import { Button, Panel } from '@/ds/components';
import { APPT_TYPES, slotRules } from '@/mock/ops';
import { VISIT_TYPES } from '@/features/gate-management/types';

export function AppointmentsRulesPanel() {
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
            {APPT_TYPES.map((t) => {
              const wk = slotRules.find((r) => r.weekday === 1 && r.visitTypeCode === t)!;
              const sat = slotRules.find((r) => r.weekday === 6 && r.visitTypeCode === t)!;
              return (
                <tr key={t}>
                  <td className="small">
                    {VISIT_TYPES[t]}
                    <div className="xs faint">Late grace {wk.lateGraceMin} min</div>
                  </td>
                  <td className="small">
                    {wk.capacityTrucks}/h
                    <div className="xs faint">
                      {wk.slotStart}–{wk.slotEnd}
                    </div>
                  </td>
                  <td className="small">
                    {sat.capacityTrucks}/h
                    <div className="xs faint">
                      {sat.slotStart}–{sat.slotEnd}
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
