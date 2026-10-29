// How each status value reads and which signal colour it wears.
// Tone meaning: go = nothing blocking; stop = blocked/held; customs = with
// customs; wait = waiting on someone; idle = not started / not applicable.
export type Tone = 'go' | 'stop' | 'customs' | 'wait' | 'idle' | 'info';
type Map = Record<string, [label: string, tone: Tone]>;

export const PHYSICAL: Map = {
  EXPECTED: ['Expected', 'idle'], GATED_IN: ['Gated in', 'wait'], IN_YARD: ['In yard', 'go'],
  AT_ACTIVITY: ['At activity', 'wait'], LOADED_OUT: ['Loaded out', 'wait'], DEPARTED: ['Departed', 'idle'],
  CANCELLED: ['Cancelled', 'idle'],
};
export const CUSTOMS: Map = {
  NOT_REQUIRED: ['Not required', 'idle'], NOT_LODGED: ['Not lodged', 'wait'], LODGED: ['Lodged', 'customs'],
  UNDER_EXAM: ['Under exam', 'customs'], QUERY: ['Query', 'stop'], CLEARED: ['Cleared', 'go'], SEIZED: ['Seized', 'stop'],
};
export const BILLING: Map = {
  NONE: ['Nothing due', 'idle'], ACCRUING: ['Accruing', 'wait'], PROFORMA: ['Proforma issued', 'wait'],
  PAID: ['Paid', 'go'], CREDIT: ['On credit', 'go'],
};
export const RELEASE: Map = {
  NONE: ['Not requested', 'idle'], REQUESTED: ['Requested', 'wait'], APPROVED: ['Approved', 'go'],
  EXPIRED: ['Expired', 'stop'], USED: ['Used', 'idle'],
};
export const FLOW: Record<string, string> = {
  IMPORT: 'Import', EXPORT: 'Export', TRANSIT: 'Transit', EMPTY_RETURN: 'Empty return',
  EMPTY_RELEASE: 'Empty release', TRANSHIP: 'Tranship', STORAGE: 'Storage',
};
export const GENERIC: Map = {
  OPEN: ['Open', 'wait'], ASSIGNED: ['Assigned', 'wait'], IN_PROGRESS: ['In progress', 'wait'], RESOLVED: ['Resolved', 'go'],
  CLOSED: ['Closed', 'idle'], DONE: ['Done', 'go'], CANCELLED: ['Cancelled', 'idle'], PENDING: ['Pending', 'wait'],
  APPROVED: ['Approved', 'go'], REJECTED: ['Rejected', 'stop'], EXPIRED: ['Expired', 'stop'], DRAFT: ['Draft', 'info'],
  ACTIVE: ['Active', 'go'], RETIRED: ['Retired', 'idle'], PENDING_APPROVAL: ['Awaiting approval', 'wait'],
  POSTED: ['Posted', 'go'], PART_PAID: ['Part paid', 'wait'], PAID: ['Paid', 'go'], ISSUED: ['Issued', 'wait'],
  CREDITED: ['Credited', 'idle'], CONVERTED: ['Converted', 'idle'], LIFTED: ['Lifted', 'idle'],
  REQUESTED: ['Requested', 'wait'], PENDING_CHECKS: ['Checks pending', 'wait'], PARTLY_USED: ['Partly used', 'go'],
  USED: ['Used', 'idle'], ANNOUNCED: ['Announced', 'idle'], AT_OUTER_GATE: ['At outer gate', 'wait'],
  ADMITTED: ['Admitted', 'go'], WORKING: ['Working', 'wait'], HELD: ['Held', 'stop'], CHECKED_OUT: ['Checked out', 'go'],
  EXITED: ['Exited', 'idle'], SENT: ['Sent', 'wait'], FAILED: ['Failed', 'stop'], PROCESSED: ['Processed', 'go'],
  RECEIVED: ['Received', 'wait'], ALLOCATED: ['Allocated', 'go'], PART_ALLOC: ['Part allocated', 'wait'],
  REVERSED: ['Reversed', 'idle'], REFUNDED: ['Refunded', 'idle'], SYNCED: ['Synced', 'go'], PROVISIONAL: ['Provisional', 'wait'],
  LOCAL: ['Local', 'info'], COMPLETED: ['Completed', 'go'], REINSPECT: ['Re-inspect', 'stop'], PLANNED: ['Planned', 'idle'],
  CONFIRMED: ['Confirmed', 'go'], ARRIVED: ['Arrived', 'go'], NO_SHOW: ['No show', 'stop'], PLUGGED: ['Plugged in', 'go'],
  UNPLUGGED: ['Unplugged', 'idle'], SUBMITTED: ['Submitted', 'wait'], DISCARDED: ['Discarded', 'idle'],
  WRITTEN_OFF: ['Written off', 'idle'], RECOVERED: ['Recovered', 'go'], INVOICED: ['Invoiced', 'go'],
  CRITICAL: ['Critical', 'stop'], HIGH: ['High', 'stop'], MEDIUM: ['Medium', 'wait'], LOW: ['Low', 'idle'],
  PASS: ['Pass', 'go'], FAIL: ['Fail', 'stop'], OVERRIDDEN: ['Overridden', 'wait'], NOT_APPLIC: ['Not applicable', 'idle'],
  OK: ['OK', 'go'], WARN: ['Warning', 'wait'], DOWN: ['Down', 'stop'],
};

export function look(map: Map, v: string | null | undefined): [string, Tone] {
  if (!v) return ['—', 'idle'];
  return map[v] ?? GENERIC[v] ?? [v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' '), 'info'];
}
