# Document 08: Database Table Documentation & Data Dictionary

## 1. Relational Database Overview

The **NG ICD** database is engineered for **Microsoft SQL Server (MSSQL)** using **Prisma ORM**. The schema (`be/prisma/schema.prisma`) comprises **127 relational models** spanning master tables (`m_*`), core operational tables, financial ledgers, event outboxes, and AI assistant dialogues.

### Universal Database Conventions:
1. **Primary Keys**: Auto-incrementing integers (`Int @id @default(autoincrement())` or `BigInt @id @default(autoincrement())`), mapped with `PK_tablename`.
2. **Optimistic Locking**: Every mutating business entity contains `log_inst Int @default(1)` for lock validation via `If-Match`.
3. **Audit Columns**: Every table maintains creation and modification metadata:
   - `createdate DateTime @default(dbgenerated("sysutcdatetime()"))`
   - `updatedate DateTime?`
   - `createdby String @db.NVarChar(64)`
   - `updatedby String? @db.NVarChar(64)`
4. **Site Scoping**: Operational tables enforce multi-tenancy via foreign key `site_id Int` pointing to `m_site.site_id`.

---

## 2. Table Classification & Data Dictionary

### Domain 1: Operational Core & Container Stays

#### `cargo_unit`
The physical container, vehicle chassis, or breakbulk equipment asset.
- `cargo_unit_id` (BigInt, PK): Unique surrogate key.
- `unit_category` (VarChar(10)): Asset type: `CONTAINER`, `VEHICLE`, `BREAKBULK`.
- `unit_no` (VarChar(40)): Container ISO number (e.g., `MSKU 882014 9`) or Vehicle VIN.
- `unit_type_id` (Int, FK): References `m_unit_type.unit_type_id` (e.g., `40HC`, `20GP`).
- `owner_party_id` (Int?, FK): References shipping line `m_party.party_id`.
- `tare_kg`, `max_gross_kg` (Int?): Manufacturer physical plate weights.
- `engine_no`, `make`, `model`, `model_year`, `colour` (VarChar?): Vehicle-specific metadata.
- *Constraints*: Unique on `[unit_category, unit_no]`.

#### `unit_stay`
The central heartbeat of the ICD: represents a single continuous visit of a container at a specific site.
- `unit_stay_id` (BigInt, PK): Primary key referenced across 25+ transactional tables.
- `cargo_unit_id` (BigInt, FK): References `cargo_unit.cargo_unit_id`.
- `site_id` (Int, FK): Terminal facility reference (`m_site.site_id`).
- `consignment_id` (BigInt?, FK): Commercial Bill of Lading reference (`consignment.consignment_id`).
- `cargo_regime_id` (Int, FK): Customs regime (`m_cargo_regime.cargo_regime_id` - Transit, Domestic, Bonded).
- `flow` (VarChar(15)): Trade direction: `IMPORT`, `EXPORT`, `TRANSSHIPMENT`.
- `full_empty` (Char(1)): `F` (Full) or `E` (Empty).
- `physical_status` (VarChar(12)): `EXPECTED`, `IN_YARD`, `CFS`, `CUSTOMS_EXAM`, `DEPARTED`.
- `customs_status` (VarChar(12)): `NOT_LODGED`, `LODGED`, `QUERY`, `EXAM_REQ`, `CLEARED`.
- `billing_status` (VarChar(10)): `ACCRUING`, `INVOICED`, `PAID`.
- `release_status` (VarChar(10)): `NONE`, `REQUESTED`, `APPROVED`, `COMPLETED`.
- `active_hold_count` (SmallInt): Number of unresolved regulatory or line holds.
- `current_location_id` (Int?, FK): References `m_yard_location.yard_location_id`.
- `seal_no` (VarChar(30)): Current physical lead/bolt seal.
- `gross_weight_kg`, `vgm_kg` (Decimal(10,1)): Scale gross and verified gross mass.
- `gated_in_at`, `departed_at` (DateTime?): Gate entry and exit timestamps.
- `storage_start_at` (DateTime?): Dwell day calculation start date.

---

### Domain 2: Gate Management & Truck Visits

#### `truck_visit`
An external transport truck visit entering through terminal gates.
- `truck_visit_id` (BigInt, PK): Visit identifier.
- `site_id` (Int, FK): Terminal site.
- `visit_no` (VarChar(30)): Formatted reference (e.g., `VIS-26-88120`).
- `visit_type_id` (Int, FK): References `m_visit_type.visit_type_id`.
- `truck_id` (Int?, FK): References prime mover `m_truck.truck_id`.
- `trailer_id` (Int?, FK): References trailer `m_truck.truck_id`.
- `driver_id` (Int?, FK): References `m_driver.driver_id`.
- `transporter_party_id` (Int?, FK): Haulage company `m_party.party_id`.
- `status` (VarChar(14)): `ANNOUNCED`, `AT_OUTER_GATE`, `ADMITTED`, `WORKING`, `CHECKED_OUT`, `EXITED`, `CANCELLED`.
- `current_seq_no` (TinyInt): Gate stage: 1=Outer In, 2=Inner In, 3=Inner Out, 4=Outer Out.
- `arrived_at`, `admitted_at`, `checked_out_at`, `exited_at` (DateTime?): Gate timestamps.
- `gate_pass_no`, `gate_pass_token` (VarChar?): Printable pass and digital validation hash.

#### `visit_unit_txn`
Links containers to the truck visit.
- `visit_unit_txn_id` (BigInt, PK).
- `truck_visit_id` (BigInt, FK): References `truck_visit`.
- `unit_stay_id` (BigInt, FK): References `unit_stay`.
- `direction` (VarChar(10)): `DROP` (Container delivered to yard) or `PICKUP` (Container collected from yard).
- `status` (VarChar(10)): `PLANNED`, `EXECUTED`, `CANCELLED`.

#### `weighing`
Weighbridge gross and tare weight measurements.
- `weighing_id` (BigInt, PK).
- `ticket_no` (VarChar(30)): Scale ticket number.
- `weigh_kind` (VarChar(10)): `IN`, `OUT`, `INTERNAL`.
- `truck_visit_id` (BigInt?, FK): Associated truck visit.
- `unit_stay_id` (BigInt?, FK): Associated container.
- `gross_kg`, `tare_kg`, `container_tare_kg`, `declared_kg` (Decimal(10,1)).
- `variance_pct` (Decimal(5,2)): Percentage deviation between scale weight and declared weight.
- `within_tolerance` (Boolean): True if variance is within legal threshold (<= 5%).

---

### Domain 3: Yard Stacking & Move Orders

#### `move_order`
Dispatched work order for yard handling equipment.
- `move_order_id` (BigInt, PK).
- `site_id` (Int, FK).
- `unit_stay_id` (BigInt, FK): Target container.
- `move_kind` (VarChar(14)): `OFFLOAD`, `LOAD`, `YARD_MOVE`, `CFS_TRANSFER`, `CUSTOMS_EXAM`, `REEFER_CONNECT`, `SHUFFLE`.
- `from_location_id`, `to_location_id` (Int?, FK): Source and destination slots in `m_yard_location`.
- `status` (VarChar(12)): `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `DONE`, `CANCELLED`.
- `assigned_equipment_id` (Int?, FK): Reach stacker or crane `m_equipment.equipment_id`.
- `assigned_operator_sub` (VarChar(64)): Reach stacker driver ID.
- `priority` (TinyInt): 1 (Lowest) to 10 (Urgent).

#### `yard_move`
Immutable audit ledger of completed moves.
- `yard_move_id` (BigInt, PK).
- `move_order_id` (BigInt?, FK): Linked work order.
- `unit_stay_id` (BigInt, FK): Container moved.
- `from_location_id`, `to_location_id` (Int, FK): Actual slots used.
- `equipment_id` (Int?, FK): Equipment used.
- `occurred_at` (DateTime): Exact execution timestamp.

#### `m_yard_location`
Physical yard slot coordinates.
- `yard_location_id` (Int, PK).
- `site_id` (Int, FK).
- `location_code` (VarChar(20)): E.g., `A-04-02-1`.
- `full_code` (VarChar(40)): E.g., `DAR1-BLOCK-A-04-02-1`.
- `location_kind` (VarChar(10)): `SLOT`, `BLOCK`, `BAY`, `LANE`, `EXAM_BAY`, `CFS_BAY`.
- `is_slot`, `is_blocked` (Boolean).
- `allows_20`, `allows_40`, `allows_reefer`, `allows_dg` (Boolean): Capability flags.
- `map_x`, `map_y`, `map_w`, `map_h` (Decimal?): 2D Canvas SVG coordinates.

---

### Domain 4: Customs, Holds & Release Control

#### `customs_ref`
Customs declarations (TANSAD).
- `customs_ref_id` (BigInt, PK).
- `customs_ref_type_id` (Int, FK): References `m_customs_ref_type`.
- `unit_stay_id` (BigInt?, FK), `consignment_id` (BigInt?, FK).
- `ref_no` (VarChar(40)): TANSAD declaration number.
- `status` (VarChar(10)): `ACTIVE`, `CANCELLED`.

#### `exam`
Physical customs examination job.
- `exam_id` (BigInt, PK).
- `unit_stay_id` (BigInt, FK).
- `status` (VarChar(12)): `REQUESTED`, `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`.
- `exam_location_id` (Int?, FK): Examination bay.
- `result` (VarChar(12)): `CLEARED`, `DISCREPANCY`, `SEIZED`.
- `seal_removed`, `seal_applied` (VarChar(30)): Seal tracking.

#### `hold`
Legal, commercial, or regulatory hold.
- `hold_id` (BigInt, PK).
- `unit_stay_id` (BigInt, FK).
- `hold_type_id` (Int, FK): References `m_hold_type` (`CUSTOMS`, `LINE_COMMERCIAL`, `DAMAGE`, `POLICE`).
- `status` (VarChar(8)): `ACTIVE`, `LIFTED`.
- `reason` (NVarChar(500)): Legal ground for stop-order.
- `placed_at`, `lifted_at` (DateTime?).

#### `release_order`
Official cargo release authorization permit.
- `release_order_id` (BigInt, PK).
- `site_id` (Int, FK).
- `release_no` (VarChar(30)): E.g., `REL-DAR1-26-00412`.
- `status` (VarChar(14)): `REQUESTED`, `EVALUATED`, `APPROVED`, `CANCELLED`, `COMPLETED`.
- `valid_from`, `valid_to` (DateTime?): Clearance validity window.
- `qr_token` (VarChar(100)): Cryptographic QR token presented at gate-out.
- `units_total`, `units_out` (Int): Container counts.

---

### Domain 5: Commercial, Invoicing & Cashier Desk

#### `billable_event`
Raw operational event awaiting rating.
- `billable_event_id` (BigInt, PK).
- `site_id` (Int, FK).
- `charge_code_id` (Int, FK): References `m_charge_code` (`LOLO`, `STORAGE`, `REEFER_PWR`, `EXAM_FEE`).
- `dedupe_key` (VarChar(100), Unique): Prevents double charging identical actions.
- `unit_stay_id` (BigInt?, FK), `truck_visit_id` (BigInt?, FK).
- `quantity` (Decimal(12,3)).
- `status` (VarChar(10)): `UNRATED`, `RATED`, `CANCELLED`.

#### `invoice`
Commercial tax invoice.
- `invoice_id` (BigInt, PK).
- `site_id` (Int, FK).
- `invoice_no` (VarChar(30)): E.g., `INV-DAR1-26-00812`.
- `bill_to_party_id` (Int, FK): Customer `m_party.party_id`.
- `currency` (Char(3)): `USD` or `TZS`.
- `subtotal`, `tax_total`, `total` (Decimal(19,4)).
- `amount_paid`, `amount_credited` (Decimal(19,4)).
- `status` (VarChar(10)): `DRAFT`, `ISSUED`, `PAID`, `CANCELLED`.
- `issued_at` (DateTime?).

#### `payment`
Cashier desk money collection.
- `payment_id` (BigInt, PK).
- `receipt_no` (VarChar(30)): Fiscal receipt reference.
- `party_id` (Int, FK): Paying customer.
- `payment_channel_id` (Int, FK): References `m_payment_channel`.
- `amount` (Decimal(19,4)).
- `currency` (Char(3)).
- `status` (VarChar(10)): `RECEIVED`, `ALLOCATED`, `REVERSED`.
- `cashier_shift_id` (BigInt?, FK): Cash desk shift.

#### `cashier_shift`
Cashier daily operational session.
- `cashier_shift_id` (BigInt, PK).
- `site_id` (Int, FK).
- `cashier_sub` (VarChar(64)): Cashier user ID.
- `opened_at`, `closed_at` (DateTime?).
- `opening_float`, `expected_cash`, `counted_cash`, `difference` (Decimal(19,4)).
- `status` (VarChar(10)): `OPEN`, `CLOSED`, `APPROVED`.

---

### Domain 6: Master Data, Security & AI Assistant

#### `app_user`
Terminal operator and external agent credentials.
- `user_id` (Int, PK).
- `user_sub` (VarChar(64), Unique): Subject identifier (e.g., `ashok.kumar`).
- `user_name`, `email`, `phone` (VarChar).
- `is_active`, `mfa_required` (Boolean).

#### `m_role` & `m_permission`
Role-Based Access Control matrix.
- `m_role.role_code` (VarChar(30), PK): E.g., `ICD_ADMIN`, `GATE_CLERK`, `CASHIER`.
- `m_permission.permission_code` (VarChar(60), PK): E.g., `gate.visit.checkin`, `billing.invoice.create`.
- `m_role_permission`: Connects roles to permissions with grant levels (`DO`, `APPR`, `REQ`, `VIEW`).

#### `aiva_conversation` & `aiva_draft_action`
AI Virtual Assistant operational memory.
- `aiva_conversation_id` (UniqueIdentifier, PK).
- `user_id` (Int, FK): Active chatter.
- `aiva_draft_action_id` (BigInt, PK): Proposed database action awaiting human confirmation.
- `action_kind` (VarChar(30)): E.g., `CREATE_MOVE_ORDER`, `WAIVE_CHARGE`.
- `payload_json` (NVarChar(Max)): Proposed parameter payload.
- `status` (VarChar(10)): `DRAFT`, `SUBMITTED`, `DISCARDED`.

