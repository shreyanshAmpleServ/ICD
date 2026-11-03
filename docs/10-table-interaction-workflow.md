# Document 10: Table Interaction Workflow & Mutation Mechanics

This document provides a deep, query-by-query analysis of how the backend reads, inserts, and updates database tables during mission-critical business transactions.

---

## Workflow 1: Truck Gate-In & Container Arrival

```mermaid
sequenceDiagram
    autonumber
    participant App as Express Controller (gateVisitsController.createVisit)
    participant Truck as m_truck
    participant Driver as m_driver
    participant Visit as truck_visit
    participant Cargo as cargo_unit
    participant Stay as unit_stay
    participant Txn as visit_unit_txn
    participant Event as visit_checkpoint_event

    App->>Truck: 1. SELECT WHERE plate_no = @plateNo
    alt Truck missing
        App->>Truck: 2. INSERT INTO m_truck (plate_no) -> returns truck_id
    end
    App->>Driver: 3. SELECT WHERE driver_name = @driverName
    alt Driver missing
        App->>Driver: 4. INSERT INTO m_driver (driver_name, license_no) -> returns driver_id
    end
    App->>Visit: 5. INSERT INTO truck_visit (site_id, visit_no, truck_id, driver_id, status='AT_OUTER_GATE', current_seq_no=1) -> returns truck_visit_id
    App->>Cargo: 6. SELECT WHERE unit_no = @unitNo
    App->>Stay: 7. SELECT unit_stay_id WHERE cargo_unit_id = @id AND departed_at IS NULL
    App->>Txn: 8. INSERT INTO visit_unit_txn (truck_visit_id, unit_stay_id, direction='DROP', status='PLANNED')
    App->>Event: 9. INSERT INTO visit_checkpoint_event (truck_visit_id, seq_no=1, checkpoint_code='OUTER_IN', result='PASS')
```

### Table Mutation Sequence:
1. **`m_truck` (Read/Insert)**: Queries truck by license plate string. Inserts a new record if not registered in fleet master. Retrieves `truck_id`.
2. **`m_driver` (Read/Insert)**: Queries driver by name and license number. Inserts if new. Retrieves `driver_id`.
3. **`truck_visit` (Insert)**: Inserts visit header linking `site_id`, `truck_id`, `driver_id`, and `transporter_party_id`. Sets `status = 'AT_OUTER_GATE'`, `current_seq_no = 1`, and `arrived_at = SYSUTCDATETIME()`.
4. **`cargo_unit` & `unit_stay` (Read)**: Resolves container number string to active `unit_stay_id`.
5. **`visit_unit_txn` (Insert)**: Establishes container-to-truck association:
   - Foreign Keys: `truck_visit_id` (from Step 3), `unit_stay_id` (from Step 4).
6. **`visit_checkpoint_event` (Insert)**: Appends immutable gate audit milestone.

---

## Workflow 2: Yard Move Order Execution & Placement

```mermaid
sequenceDiagram
    autonumber
    participant App as Express Controller (yardMovesController.completeMove)
    participant MoveOrder as move_order
    participant Slot as m_yard_location
    participant Stay as unit_stay
    participant YardMove as yard_move
    participant BillEvent as billable_event

    App->>MoveOrder: 1. SELECT WHERE move_order_id = @id
    App->>Slot: 2. SELECT WHERE yard_location_id = @toLocationId
    alt Slot code provided as string
        App->>Slot: 3. Find or INSERT INTO m_yard_location -> returns to_location_id
    end
    App->>MoveOrder: 4. UPDATE move_order SET status='DONE', to_location_id=@toId, completed_at=NOW()
    App->>Stay: 5. UPDATE unit_stay SET current_location_id=@toId, updatedate=NOW()
    App->>YardMove: 6. INSERT INTO yard_move (site_id, unit_stay_id, move_order_id, from_location_id, to_location_id, equipment_id, occurred_at)
    App->>BillEvent: 7. INSERT INTO billable_event (site_id, unit_stay_id, charge_code_id, dedupe_key, quantity=1)
```

### Table Mutation Sequence:
1. **`move_order` (Read)**: Fetches existing work order by `move_order_id`. Verifies status is `OPEN` or `ASSIGNED`.
2. **`m_yard_location` (Read/Insert)**: Resolves destination slot. If physical coordinates (`A-04-02-1`) do not exist, creates slot record on-the-fly. Retrieves `to_location_id`.
3. **`move_order` (Update)**: Sets `status = 'DONE'`, `completed_at = NOW()`, and increments `log_inst = log_inst + 1`.
4. **`unit_stay` (Update)**: Mutates the container's active physical position:
   - `UPDATE unit_stay SET current_location_id = @to_location_id WHERE unit_stay_id = @existing.unit_stay_id`.
5. **`yard_move` (Insert)**: Writes an immutable audit row linking:
   - `unit_stay_id`, `move_order_id`, `from_location_id`, `to_location_id`, `equipment_id`, and `occurred_at`.
6. **`billable_event` (Insert)**: If move kind was `OFFLOAD` or `LOAD`, registers a Lift-on / Lift-off (LOLO) billable trigger using deduplication key: `LOLO-${unitStayId}-${moveOrderId}`.

---

## Workflow 3: Commercial Invoicing & Demurrage Rating

```mermaid
sequenceDiagram
    autonumber
    participant App as Express Controller (billingInvoicesController.createInvoice)
    participant Party as m_party
    participant BillEvent as billable_event
    participant Tariff as tariff_slab
    participant Inv as invoice
    participant InvLine as invoice_line
    participant Charge as charge
    participant Stay as unit_stay

    App->>Party: 1. SELECT WHERE party_id = @billToPartyId
    App->>BillEvent: 2. SELECT WHERE unit_stay_id = @id AND status = 'UNRATED'
    App->>Tariff: 3. SELECT rates WHERE charge_code = @code AND day_no BETWEEN slab_from AND slab_to
    App->>Inv: 4. INSERT INTO invoice (site_id, invoice_no, bill_to_party_id, subtotal, tax_total, total, status='ISSUED') -> returns invoice_id
    loop For each rated charge
        App->>Charge: 5. INSERT INTO charge (billable_event_id, bill_to_party_id, amount, tax_amount) -> returns charge_id
        App->>InvLine: 6. INSERT INTO invoice_line (invoice_id, charge_id, line_amount, tax_amount)
        App->>BillEvent: 7. UPDATE billable_event SET status='RATED'
    end
    App->>Stay: 8. UPDATE unit_stay SET billing_status='INVOICED'
```

### Table Mutation Sequence:
1. **`billable_event` (Read)**: Gathers unbilled events (LOLO, Storage Days, Reefer Electricity, Customs Exam Fee).
2. **`tariff` & `tariff_slab` (Read)**: Evaluates tier pricing (e.g., Days 1–7 free; Days 8–14 @ $20/day; Days 15+ @ $40/day).
3. **`invoice` (Insert)**: Creates invoice header with calculated `subtotal`, `tax_total` (18% VAT), and `total`. Sets `status = 'ISSUED'`.
4. **`charge` & `invoice_line` (Insert)**: Creates line item rows pointing to `invoice.invoice_id` and `charge.charge_id`.
5. **`unit_stay` (Update)**: Advances `billing_status` from `ACCRUING` to `INVOICED`.

---

## Workflow 4: Cashier Payment & Automated Settlement

```mermaid
sequenceDiagram
    autonumber
    participant App as Express Controller (billingCashierController.recordPayment)
    participant Shift as cashier_shift
    participant Inv as invoice
    participant Pay as payment
    participant Alloc as payment_allocation
    participant Stay as unit_stay

    App->>Shift: 1. SELECT WHERE cashier_sub = @user AND status = 'OPEN'
    App->>Inv: 2. SELECT balance WHERE invoice_id = @id
    App->>Pay: 3. INSERT INTO payment (site_id, cashier_shift_id, party_id, amount, receipt_no, status='COMPLETED') -> returns payment_id
    App->>Alloc: 4. INSERT INTO payment_allocation (payment_id, invoice_id, allocated_amount)
    App->>Inv: 5. UPDATE invoice SET paid_amount = paid_amount + @amount, status = 'PAID'
    App->>Stay: 6. Check all invoices for unit_stay. If all PAID: UPDATE unit_stay SET billing_status = 'PAID'
```

### Table Mutation Sequence:
1. **`cashier_shift` (Read)**: Confirms the acting cashier currently has an open cash desk session.
2. **`payment` (Insert)**: Inserts payment record linking `cashier_shift_id`, `party_id`, `payment_channel_id`, `receipt_no`, and monetary amount.
3. **`payment_allocation` (Insert)**: Creates cross-reference record binding `payment_id` to `invoice_id`.
4. **`invoice` (Update)**: Increments `paid_amount`. If `paid_amount >= total`, sets `status = 'PAID'`.
5. **`unit_stay` (Update)**: If all invoices associated with the stay are settled, updates `billing_status = 'PAID'`.

---

## Workflow 5: Five-Pillar Cargo Release Clearance

```mermaid
sequenceDiagram
    autonumber
    participant App as CargoService.approveReleaseOrder
    participant RO as release_order
    participant Stay as unit_stay
    participant Check as release_check

    App->>RO: 1. SELECT WHERE release_order_id = @id (include release_order_unit)
    loop For each container in order
        App->>Stay: 2. SELECT customs_status, billing_status, active_hold_count FROM unit_stay
        Note over App: Evaluates Pillars:<br/>1. customs_status == 'CLEARED'<br/>2. billing_status == 'PAID'<br/>3. active_hold_count == 0
    end
    App->>RO: 3. UPDATE release_order SET status='APPROVED', approved_at=NOW(), qr_token=@token, valid_to=NOW()+24H
    App->>Check: 4. INSERT INTO release_check (release_order_id, checked_at, result='PASS', snapshot_json=@json)
    App->>Stay: 5. UPDATE unit_stay SET release_status='APPROVED'
```

### Table Mutation Sequence:
1. **`release_order` (Read)**: Loads clearance permit and linked containers via `release_order_unit`.
2. **`unit_stay` (Read & Validate)**:
   - Pillar 1: Asserts `customs_status === 'CLEARED'`.
   - Pillar 2: Asserts `billing_status === 'PAID'`.
   - Pillar 3: Asserts `active_hold_count === 0`.
3. **`release_order` (Update)**: Sets `status = 'APPROVED'`, stamps `approved_at`, creates `qr_token`, and establishes a 24-hour expiration window (`valid_to`).
4. **`release_check` (Insert)**: Saves serialized JSON snapshot of all 5 pillar statuses.
5. **`unit_stay` (Update)**: Advances container `release_status = 'APPROVED'`, authorizing security guards and gate lane tablets to permit physical exit.

