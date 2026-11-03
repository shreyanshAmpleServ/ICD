# Document 12: Status Lifecycles & State Machine Specifications

This document catalogs all 18 status fields across the **NG ICD** system, detailing their valid values, state machines, transition conditions, authorized roles, and database side effects.

---

## 1. Primary Operational State Machines

### 1.1 Truck Visit Status (`truck_visit.status`)

```mermaid
stateDiagram-v2
    [*] --> ANNOUNCED: Created via Portal / Pre-Advise
    [*] --> AT_OUTER_GATE: Truck arrives at terminal
    ANNOUNCED --> AT_OUTER_GATE: Truck detected by OCR / plate entered
    AT_OUTER_GATE --> ADMITTED: Gate Clerk checks in truck (POST :checkin)
    AT_OUTER_GATE --> REJECTED: Documentation invalid / turn back
    AT_OUTER_GATE --> CANCELLED: Operator cancels visit
    ADMITTED --> WORKING: Yard offload / loading in progress
    WORKING --> CHECKED_OUT: Final weighing & documents verified
    CHECKED_OUT --> EXITED: Outer gate pass validated (POST :checkout)
    EXITED --> [*]
    REJECTED --> [*]
    CANCELLED --> [*]
```

- **Initial Status**: `ANNOUNCED` (or `AT_OUTER_GATE` if walk-in).
- **Available Statuses**: `ANNOUNCED`, `AT_OUTER_GATE`, `ADMITTED`, `WORKING`, `CHECKED_OUT`, `EXITED`, `CANCELLED`, `REJECTED`, `HELD`.
- **API Endpoints**:
  - `POST /api/v1/truck-visits`: Creates visit in `AT_OUTER_GATE` (`current_seq_no = 1`).
  - `POST /api/v1/truck-visits/:id:checkin`: Transitions to `ADMITTED` (`current_seq_no = 2`, `admitted_at = NOW()`).
  - `POST /api/v1/truck-visits/:id:checkout`: Transitions to `EXITED` (`current_seq_no = 4`, `exited_at = NOW()`).
  - `POST /api/v1/truck-visits/:id:cancel`: Transitions to `CANCELLED`.
- **Authorized Roles**: `GATE_CLERK`, `GATE_SUPERVISOR`.

---

### 1.2 Container Physical Status (`unit_stay.physical_status`)

```mermaid
stateDiagram-v2
    [*] --> EXPECTED: Manifest Ingested
    EXPECTED --> IN_YARD: Truck Gate-In & Offload Complete
    IN_YARD --> CFS: Transferred to CFS warehouse bay
    CFS --> IN_YARD: De-stuffing complete (Empty container)
    IN_YARD --> CUSTOMS_EXAM: Positioned at customs inspection dock
    CUSTOMS_EXAM --> IN_YARD: Physical examination concluded
    IN_YARD --> DEPARTED: Truck Gate-Out Check-Out
    DEPARTED --> [*]
```

- **Initial Status**: `EXPECTED`.
- **Available Statuses**: `EXPECTED`, `IN_YARD`, `CFS`, `CUSTOMS_EXAM`, `DEPARTED`.
- **Database Updates**: `gated_in_at` stamped on `IN_YARD`, `departed_at` stamped on `DEPARTED`.

---

### 1.3 Container Customs Status (`unit_stay.customs_status`)

```mermaid
stateDiagram-v2
    [*] --> NOT_LODGED: Container discharged
    NOT_LODGED --> LODGED: TANSAD declaration filed
    LODGED --> QUERY: Revenue authority requests clarification
    QUERY --> LODGED: Query answered by agent
    LODGED --> EXAM_REQ: Physical inspection ordered
    EXAM_REQ --> CLEARED: Exam passed with new seal applied
    LODGED --> CLEARED: Direct documentary green channel release
    CLEARED --> [*]
```

- **Initial Status**: `NOT_LODGED`.
- **Available Statuses**: `NOT_LODGED`, `LODGED`, `QUERY`, `EXAM_REQ`, `CLEARED`.
- **API Endpoint**: `POST /api/v1/exams/:id:complete` (or `POST /api/v1/customs/refs`).
- **Authorized Roles**: `CUSTOMS_OFFICER`.

---

### 1.4 Container Billing Status (`unit_stay.billing_status`)

```mermaid
stateDiagram-v2
    [*] --> ACCRUING: Container dwell & activities accumulating
    ACCRUING --> INVOICED: Commercial invoice generated & issued
    INVOICED --> ACCRUING: Invoice cancelled / voided
    INVOICED --> PAID: Invoice fully settled at cashier desk
    PAID --> [*]
```

- **Initial Status**: `ACCRUING`.
- **Available Statuses**: `ACCRUING`, `INVOICED`, `PAID`.
- **Transition Condition**: Changes to `PAID` automatically when total payments allocated against all invoices for the `unit_stay` equal or exceed the total billed balance.

---

### 1.5 Cargo Release Status (`unit_stay.release_status`)

```mermaid
stateDiagram-v2
    [*] --> NONE: Initial state
    NONE --> REQUESTED: Release permit requested by agent
    REQUESTED --> APPROVED: 5 pillars evaluated and passed
    APPROVED --> REVALIDATED: Validity extended after expiry
    APPROVED --> COMPLETED: Container departs through outer gate
    REQUESTED --> CANCELLED: Request rejected or voided
    APPROVED --> CANCELLED: Permit revoked
    COMPLETED --> [*]
```

- **Initial Status**: `NONE`.
- **Available Statuses**: `NONE`, `REQUESTED`, `APPROVED`, `REVALIDATED`, `CANCELLED`, `COMPLETED`.
- **API Endpoint**: `POST /api/v1/release-orders/:id:approve`.
- **Side Effect**: Generates dynamic QR token for gate validation.

---

## 2. Yard, Inspection & Work Order Lifecycles

### 2.1 Yard Move Order Status (`move_order.status`)

```mermaid
stateDiagram-v2
    [*] --> OPEN: Created by yard planner
    OPEN --> ASSIGNED: Equipment & driver allocated
    ASSIGNED --> IN_PROGRESS: Equipment en route / lifting
    IN_PROGRESS --> DONE: Container stacked at destination slot
    OPEN --> CANCELLED: Move superseded or cancelled
    ASSIGNED --> CANCELLED: Operator reassigned
    DONE --> [*]
    CANCELLED --> [*]
```

- **Initial Status**: `OPEN`.
- **Available Statuses**: `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `DONE`, `CANCELLED`.
- **Side Effect on `DONE`**: Writes `yard_move` audit record, updates `unit_stay.current_location_id`.

---

### 2.2 Container Inspection Status (`inspection.status`)

```mermaid
stateDiagram-v2
    [*] --> IN_PROGRESS: Survey initiated on tablet
    IN_PROGRESS --> COMPLETED: Damage pins recorded, photos taken
    COMPLETED --> APPROVED: Surveyor lead confirms findings
    APPROVED --> [*]
```

- **Initial Status**: `IN_PROGRESS`.
- **Available Statuses**: `IN_PROGRESS`, `COMPLETED`, `APPROVED`, `CANCELLED`.
- **Side Effect**: If overall condition is `MAJOR_DAMAGE`, creates automatic `hold` and flags container for M&R quotation.

---

## 3. Financial & Governance Lifecycles

### 3.1 Commercial Invoice Status (`invoice.status`)

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Line items calculated
    DRAFT --> ISSUED: Finalized and presented to client
    ISSUED --> PARTIALLY_PAID: Partial receipt recorded
    PARTIALLY_PAID --> PAID: Remaining balance received
    ISSUED --> PAID: Full payment received
    ISSUED --> CANCELLED: Cancelled with approval before posting
    PAID --> CREDITED: Full credit note issued
```

- **Initial Status**: `DRAFT` (or `ISSUED`).
- **Available Statuses**: `DRAFT`, `ISSUED`, `PARTIALLY_PAID`, `PAID`, `CANCELLED`, `CREDITED`.

---

### 3.2 Cashier Shift Status (`cashier_shift.status`)

```mermaid
stateDiagram-v2
    [*] --> OPEN: Cashier opens desk with float
    OPEN --> CLOSED: Cash counted and reconciled at end of shift
    CLOSED --> APPROVED: Head cashier / finance supervisor signoff
    APPROVED --> [*]
```

- **Initial Status**: `OPEN`.
- **Available Statuses**: `OPEN`, `CLOSED`, `APPROVED`.
- **Rules**: Cashier cannot record payments unless shift status is `OPEN`.

---

### 3.3 Hold Status (`hold.status`)

```mermaid
stateDiagram-v2
    [*] --> ACTIVE: Hold placed (Customs, Line, Damage)
    ACTIVE --> LIFTED: Authorized officer lifts hold
    LIFTED --> [*]
```

- **Initial Status**: `ACTIVE`.
- **Available Statuses**: `ACTIVE`, `LIFTED`.
- **Side Effect**: Placing increments `unit_stay.active_hold_count`; lifting decrements it.

---

### 3.4 Approval Request Status (`approval_request.status`)

```mermaid
stateDiagram-v2
    [*] --> PENDING: Exception or override requested
    PENDING --> APPROVED: Designated manager signs off
    PENDING --> REJECTED: Request denied with reason
    PENDING --> CANCELLED: Requester retracts request
    APPROVED --> [*]
    REJECTED --> [*]
    CANCELLED --> [*]
```

- **Initial Status**: `PENDING`.
- **Available Statuses**: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`.
- **API Endpoint**: `POST /api/v1/approvals/:id:decide`.

