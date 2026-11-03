import type { Tone } from '@/ds/status';

export type StatusFilter = 'all' | 'BOOKED' | 'ARRIVED' | 'MISSED' | 'CANCELLED';

export interface SlotSelection {
  t: string;
  h: number;
}

export type Appt = {
  appointmentId?: number;
  appointmentNo?: string;
  apptNo?: string;
  date: string;
  hour: number;
  slotStart: string;
  slotEnd: string;
  visitTypeCode: string;
  visitType?: string;
  status: 'BOOKED' | 'ARRIVED' | 'COMPLETED' | 'MISSED' | 'CANCELLED' | string;
  plateNo: string;
  truckPlate?: string;
  driverName: string;
  driverPhone?: string;
  refNo?: string;
  transporterPartyId?: number;
  partyName?: string;
  transporterName?: string;
  bookedVia?: string;
  truckVisitId?: number;
};

export const APPOINTMENT_STATUS: Record<string, [string, Tone]> = {
  BOOKED: ['Booked', 'info'],
  ARRIVED: ['Arrived', 'go'],
  COMPLETED: ['Completed', 'idle'],
  MISSED: ['No show', 'stop'],
  CANCELLED: ['Cancelled', 'idle'],
};

export const weekday = (date: string) => new Date(date + 'T12:00:00+03:00').getUTCDay();

export const dayLabel = (date: string) =>
  new Date(date + 'T12:00:00+03:00').toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'Africa/Dar_es_Salaam',
  });

export const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;
