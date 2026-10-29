import { Link } from 'react-router-dom';
import { Button, Chips, DataTable, Empty, Panel, Pill, fmtT } from '@/ds/components';
import { partyName } from '@/mock/core';
import { VISIT_TYPES } from '@/screens/gate/types';
import type { Appt } from '@/mock/ops';
import { APPOINTMENT_STATUS, type SlotSelection, type StatusFilter } from '../types';

interface AppointmentsTableProps {
  list: Appt[];
  filter: StatusFilter;
  onFilterChange: (f: StatusFilter) => void;
  slot: SlotSelection | null;
  hh: (h: number) => string;
  onCancel: (a: Appt) => void;
  onClearSlot?: () => void;
}

export function AppointmentsTable({
  list,
  filter,
  onFilterChange,
  slot,
  hh,
  onCancel,
}: AppointmentsTableProps) {
  return (
    <Panel
      flush
      title={slot ? `Bookings · ${VISIT_TYPES[slot.t]} ${hh(slot.h)}` : 'Bookings'}
      sub={`${list.length} shown`}
      actions={
        <Chips<StatusFilter>
          value={filter}
          onChange={onFilterChange}
          options={[
            { id: 'all', label: 'All' },
            { id: 'BOOKED', label: 'Booked' },
            { id: 'ARRIVED', label: 'Arrived' },
            { id: 'MISSED', label: 'No show' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ]}
        />
      }
    >
      <DataTable
        rows={list}
        rowKey={(a) => a.appointmentId!}
        dense
        empty={
          <Empty title="No bookings match">
            Clear the slot or status filter, or book a truck into a free slot.
          </Empty>
        }
        cols={[
          {
            key: 'time',
            header: 'Slot',
            render: (a) => <span className="strong">{fmtT(a.slotStart)}</span>,
          },
          {
            key: 'plate',
            header: 'Truck',
            render: (a) => (
              <>
                <span className="unitno unitno-sm">{a.plateNo}</span>
                <div className="xs faint">{a.driverName}</div>
              </>
            ),
          },
          {
            key: 'co',
            header: 'Company',
            render: (a) => <span className="small">{partyName(a.transporterPartyId)}</span>,
          },
          {
            key: 'type',
            header: 'Visit type',
            render: (a) => <span className="small">{VISIT_TYPES[a.visitTypeCode]}</span>,
          },
          {
            key: 'ref',
            header: 'Reference',
            render: (a) => (
              <span className="small nowrap">
                {a.refNo}
                <div className="xs faint">
                  {a.appointmentNo} · {a.bookedVia?.toLowerCase()}
                </div>
              </span>
            ),
          },
          {
            key: 'st',
            header: 'Status',
            render: (a) => (
              <Pill tone={APPOINTMENT_STATUS[a.status!][1]}>
                {APPOINTMENT_STATUS[a.status!][0]}
              </Pill>
            ),
          },
          {
            key: 'act',
            header: '',
            render: (a) =>
              a.truckVisitId ? (
                <Link className="small" to={`/gate/visits/${a.truckVisitId}`}>
                  Open visit
                </Link>
              ) : a.status === 'BOOKED' ? (
                <Button
                  size="sm"
                  variant="ghost"
                  perm="appointment.book"
                  onClick={() => onCancel(a)}
                >
                  Cancel
                </Button>
              ) : null,
          },
        ]}
      />
    </Panel>
  );
}
