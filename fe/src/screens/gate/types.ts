export type SealStatus = 'MATCH' | 'MISMATCH' | 'MISSING' | 'NEW_APPLIED' | 'NOT_SEALED';

export const CHECKPOINTS = [
  { code: 'OUTER_IN', short: 'Outer in', name: 'Outer gate in' },
  { code: 'INNER_IN', short: 'Inner in', name: 'Inner gate in' },
  { code: 'INNER_OUT', short: 'Inner out', name: 'Inner gate out' },
  { code: 'OUTER_OUT', short: 'Outer out', name: 'Outer gate out' },
];

export const VISIT_TYPES: Record<string, string> = {
  IMPORT_PICKUP: 'Import pickup (laden out)',
  EMPTY_RETURN: 'Empty return (empty in)',
  EXPORT_DROP: 'Export drop (laden in)',
  EMPTY_PICKUP: 'Empty pickup (empty out)',
  INTERNAL_SHIFT: 'Internal transfer',
  BOBTAIL_IN: 'Bobtail tractor in',
  BOBTAIL_OUT: 'Bobtail tractor out',
};

export interface DynamicTruckVisitUnit {
  visitUnitTxnId: number;
  unitStayId: number;
  unitNo: string;
  direction: 'PICK' | 'DROP';
  status: string;
  sealExpected?: string;
  sealFound?: string;
  sealStatus?: SealStatus;
}

export interface DynamicTruckVisit {
  truckVisitId: number;
  visitNo: string;
  visitTypeCode: string;
  conveyance?: string;
  plateNo: string;
  driverName: string;
  driverLicence?: string;
  transporter: string;
  status: string;
  currentSeqNo?: number;
  nextCheckpointCode?: string;
  arrivedAt: string;
  admittedAt?: string;
  checkedOutAt?: string;
  exitedAt?: string;
  waitingMin: number;
  lane?: string;
  units?: DynamicTruckVisitUnit[];
  checkpoints?: Array<{
    checkpointCode: string;
    seqNo: number;
    result: string;
    failureReason?: string;
    occurredAt: string;
    by: string;
    isOffline?: boolean;
  }>;
  isOfflineEntry?: boolean;
  gatePassNo?: string;
  appointmentNo?: string;
  trailerPlate?: string;
  nominationRef?: string;
  blockedReason?: string;
}
