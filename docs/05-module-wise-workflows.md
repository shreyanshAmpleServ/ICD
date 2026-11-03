# Document 05: Module-Wise Workflows

This document details the functional and technical specifications for all 16 modules implemented in the **NG ICD – DCC Logistics Suite**.

---

## Module 1: Gate Management & Truck Visits

### 1. Module Name
**Gate Management & Truck Visits**

### 2. Module Purpose
Manages vehicular entry, queuing, gate inspection, driver/truck identification, lane allocation, and terminal exit for all container and cargo transport trucks.

### 3. Business Objective
Eliminate terminal congestion, guarantee valid gate passes, prevent unauthorized truck entry, enforce pre-advising/booking, and minimize truck turnaround time (TAT).

### 4. Users / Roles Involved
`GATE_CLERK`, `GATE_SUPERVISOR`, `ICD_ADMIN`, `SECURITY_GUARD`

### 5. Frontend Pages
- Gate Queue: `/gate` (`fe/src/features/gate-management/pages/GateQueuePage.tsx`)
- Tablet Lane Check-in: `/gate/lane` (`fe/src/features/gate-management/pages/GateLanePage.tsx`)
- Truck Visit Detail: `/gate/visits/:truckVisitId` (`fe/src/features/gate-management/pages/TruckVisitPage.tsx`)

### 6. Components and Modals
- `GateQueueTable.tsx`: Virtualized list of truck visits with live waiting time counters.
- `GatePassModal.tsx`: Visual preview and printable Gate Pass with QR code.
- `CheckinDrawer.tsx`: Driver verification, truck plate confirmation, container seal input.
- `CreateVisitDrawer.tsx`: Manual arrival registration form.

### 7. Frontend API Functions
- `gateApi.getVisits(params)` (`fe/src/features/gate-management/api.ts`)
- `gateApi.getVisitById(id)`
- `gateApi.createVisit(data)`
- `gateApi.checkin(id, data)`
- `gateApi.checkout(id, data)`
- `gateApi.cancelVisit(id, reason)`
- `gateApi.recordCheckpointEvent(id, data)`

### 8. Backend API Endpoints
- `GET /api/v1/truck-visits` (or `/api/v1/gate/visits`)
- `POST /api/v1/truck-visits`
- `GET /api/v1/truck-visits/:id`
- `PATCH /api/v1/truck-visits/:id`
- `POST /api/v1/truck-visits/:id:checkin`
- `POST /api/v1/truck-visits/:id:checkout`
- `POST /api/v1/truck-visits/:id:cancel`
- `POST /api/v1/truck-visits/:id/checkpoint-events`

### 9. Express Route Files
- `be/src/v1/routes/gate/gate.routes.ts`
- `be/src/modules/gate/gate.router.ts`

### 10. Controller Functions
- `gateVisitsController.getVisits` (`be/src/v1/controllers/gate/visits.controller.ts`)
- `gateVisitsController.getVisitById`
- `gateVisitsController.createVisit`
- `gateVisitsController.checkin`
- `gateVisitsController.checkout`
- `gateVisitsController.cancelVisit`
- `gateVisitsController.recordCheckpointEvent`

### 11. Service Functions
- `gateVisitsController` invokes direct Prisma queries: `prisma.truck_visit`, `prisma.visit_unit_txn`, `prisma.m_truck`, `prisma.m_driver`.

### 12. Database Tables Involved
- `truck_visit` (Primary transaction table)
- `m_truck` (Truck and trailer master)
- `m_driver` (Driver master)
- `m_party` (Transporter company)
- `m_visit_type` (Visit classification)
- `visit_unit_txn` (Container transaction linked to truck)
- `visit_checkpoint_event` (Gate milestone timestamp audit)
- `unit_stay` (Associated container stay)

### 13. Database Operations
- **SELECT**:
  - `prisma.truck_visit.findMany({ include: { m_truck: true, m_driver: true, m_party: true, visit_unit_txn: { include: { unit_stay: true } } } })`
- **INSERT**:
  - `prisma.truck_visit.create(...)`
  - `prisma.m_truck.create(...)` (if plate does not exist in master)
  - `prisma.m_driver.create(...)` (if driver license does not exist in master)
  - `prisma.visit_unit_txn.create(...)`
  - `prisma.visit_checkpoint_event.create(...)`
- **UPDATE**:
  - `prisma.truck_visit.update({ where: { truck_visit_id }, data: { status: 'ADMITTED', admitted_at: new Date(), current_seq_no: 2 } })`
  - `prisma.truck_visit.update({ where: { truck_visit_id }, data: { status: 'EXITED', exited_at: new Date(), current_seq_no: 4 } })`

### 14. Relationships Between Tables
- `truck_visit.truck_id` -> `m_truck.truck_id` (FK)
- `truck_visit.driver_id` -> `m_driver.driver_id` (FK)
- `truck_visit.transporter_party_id` -> `m_party.party_id` (FK)
- `truck_visit.visit_type_id` -> `m_visit_type.visit_type_id` (FK)
- `visit_unit_txn.truck_visit_id` -> `truck_visit.truck_visit_id` (FK)
- `visit_unit_txn.unit_stay_id` -> `unit_stay.unit_stay_id` (FK)
- `visit_checkpoint_event.truck_visit_id` -> `truck_visit.truck_visit_id` (FK)

### 15. Input Validations
- Valid plate format string (`plateNo`).
- Driver license number and name required.
- Visit type code must match existing master (`IMPORT_PICKUP`, `EXPORT_DROP`, `EMPTY_PICKUP`, `EMPTY_DROP`).
- Site ID must match active facility header `X-Site-Id`.

### 16. Business Rules
- A truck cannot be checked in if it has an existing active visit in status `ADMITTED` or `WORKING`.
- On check-in, `current_seq_no` advances from `1` (Outer Gate) to `2` (Inner Gate).
- Container drop-off requires matching pre-advise or booking reference.
- Container pick-up requires an `APPROVED` release order with active validity.

### 17. Status Changes
`ANNOUNCED` / `AT_OUTER_GATE` -> `ADMITTED` -> `WORKING` -> `EXITED` (or `CANCELLED` / `REJECTED`).

### 18. API Responses
- `201 Created` with `{ truckVisitId, visitNo, status: "AT_OUTER_GATE", nextCheckpointCode: "OUTER_IN" }`.
- `200 OK` on check-in with `{ success: true, status: "ADMITTED", admittedAt: "ISO_DATE" }`.

### 19. Error Scenarios
- `404 Site Not Found`: Invalid or unrecognized site ID.
- `400 Validation Error`: Missing truck plate or driver name.
- `409 Conflict`: Truck already admitted in yard.

### 20. Dependencies on Other Modules
- Depends on: Master Data (`m_truck`, `m_driver`, `m_visit_type`).
- Triggers: Weighbridge (`weighing`), Yard Operations (`move_order`), Release Orders (`release_order`).

---

## Module 2: Weighbridge Management

### 1. Module Name
**Weighbridge Management**

### 2. Module Purpose
Captures inbound gross weight and outbound tare weight of trucks and containers via physical weighbridge scale integrations to calculate net weight and enforce SOLAS VGM regulations.

### 3. Business Objective
Prevent overloaded road haulage vehicles, verify shipping line declared weight against physical cargo weight, calculate gross cargo mass, and ensure safety compliance.

### 4. Users / Roles Involved
`WEIGHBRIDGE_OP`, `GATE_CLERK`, `ICD_ADMIN`

### 5. Frontend Pages
- Weighbridge Tickets: `/weighbridge` (`fe/src/features/gate-management/pages/WeighbridgePage.tsx`)

### 6. Components and Modals
- `WeighbridgeTable.tsx`: Ticket registry showing gross, tare, net, declared weight, and variance %.
- `CaptureWeightModal.tsx`: Real-time serial scale reader and manual override capture form.
- `WeightVarianceBanner.tsx`: Highlighting overweight violations exceeding 5% tolerance.

### 7. Frontend API Functions
- `weighbridgeApi.getTickets()` (`fe/src/features/gate-management/api.ts`)
- `weighbridgeApi.createTicket(payload)`

### 8. Backend API Endpoints
- `GET /api/v1/weighbridge/tickets`
- `POST /api/v1/weighbridge/tickets`
- `GET /api/v1/weighings`
- `POST /api/v1/weighings`

### 9. Express Route Files
- `be/src/v1/routes/gate/gate.routes.ts`

### 10. Controller Functions
- `gateWeighbridgeController.getTickets` (`be/src/v1/controllers/gate/weighbridge.controller.ts`)
- `gateWeighbridgeController.createTicket`

### 11. Service Functions
Direct Prisma execution on `prisma.weighing`.

### 12. Database Tables Involved
- `weighing` (Scale transaction record)
- `truck_visit` (Associated truck visit)
- `unit_stay` (Associated container stay)
- `cargo_unit` (Container specifications)

### 13. Database Operations
- **SELECT**:
  - `prisma.weighing.findMany({ include: { truck_visit: true, unit_stay: true } })`
- **INSERT**:
  - `prisma.weighing.create({ data: { ticket_no, weigh_kind, truck_visit_id, unit_stay_id, gross_kg, tare_kg, container_tare_kg, declared_kg, variance_pct, within_tolerance, source, device_ref } })`

### 14. Relationships Between Tables
- `weighing.truck_visit_id` -> `truck_visit.truck_visit_id` (FK)
- `weighing.unit_stay_id` -> `unit_stay.unit_stay_id` (FK)
- `weighing.site_id` -> `m_site.site_id` (FK)

### 15. Input Validations
- `gross_kg` must be greater than zero.
- `tare_kg` must be less than `gross_kg`.
- `weigh_kind` must be `IN`, `OUT`, or `INTERNAL`.

### 16. Business Rules
- `net_kg = gross_kg - tare_kg - (container_tare_kg || 0)`.
- If `abs(net_kg - declared_kg) / declared_kg > 0.05` (5% variance threshold), `within_tolerance` is set to `false`.
- If `within_tolerance === false`, an approval request (`approval_request`) is triggered before the truck is permitted to gate-out.

### 17. Status Changes
Ticket statuses: `OK`, `OVERRIDE_PENDING`, `OVERRIDDEN`, `NO_DECLARED`.

### 18. API Responses
`201 Created` returning the generated `weighingId`, `ticketNo`, `variancePct`, and `status`.

### 19. Error Scenarios
- `500 Database Unavailable`: Prisma connection failure.
- `400 Bad Request`: Tare weight exceeding gross weight.

### 20. Dependencies on Other Modules
- Consumes: Gate Management (`truck_visit`), Cargo Management (`unit_stay`).
- Triggers: Approvals (`approval_request`) if out of tolerance.

---

## Module 3: Yard Management & Move Orders

### 1. Module Name
**Yard Management & Move Orders**

### 2. Module Purpose
Manages 2D/3D yard layout, block/bay/row/tier stacking coordinates, automated slot recommendation, move order dispatching, and equipment execution.

### 3. Business Objective
Optimize equipment travel distance, minimize unproductive container shuffling, enforce hazardous cargo segregation, and track container locations with 100% precision.

### 4. Users / Roles Involved
`YARD_PLANNER`, `EQUIPMENT_OPERATOR`, `YARD_SUPERVISOR`, `ICD_ADMIN`

### 5. Frontend Pages
- Yard Map: `/yard` (`fe/src/features/yard-management/pages/YardMapPage.tsx`)
- Move Orders: `/moves` (`fe/src/features/yard-management/pages/MovesPage.tsx`)

### 6. Components and Modals
- `SitePlanSvg.tsx`: Interactive SVG rendering of yard blocks (`Block A`, `Block B`, `Reefer Block R`).
- `BlockBayView.tsx`: Cross-section visualization of Bay / Row / Tier container slots.
- `SlotDetailDrawer.tsx`: Container inspection, dwell days, and move dispatch trigger for selected slot.
- `CreateMoveDrawer.tsx`: Manual move order creation form.
- `AssignDrawer.tsx`: Equipment and operator assignment modal.
- `CompleteDrawer.tsx`: Reach stacker confirmation modal.

### 7. Frontend API Functions
- `yardApi.getYardMap()` (`fe/src/features/yard-management/services/yardApi.ts`)
- `yardApi.getMoveOrders(query)`
- `yardApi.createMoveOrder(payload)`
- `yardApi.startMove(moveOrderId)`
- `yardApi.completeMove(moveOrderId, payload)`
- `yardApi.assignMove(moveOrderId, payload)`
- `yardApi.getEquipment()`

### 8. Backend API Endpoints
- `GET /api/v1/yard/map`
- `GET /api/v1/moves` (or `/api/v1/yard/move-orders`)
- `POST /api/v1/moves`
- `POST /api/v1/moves/:moveOrderId/assign`
- `POST /api/v1/moves/:moveOrderId/start`
- `POST /api/v1/moves/:moveOrderId/complete`
- `GET /api/v1/yard/equipment`
- `GET /api/v1/yard/locations`

### 9. Express Route Files
- `be/src/v1/routes/yard/yard.routes.ts`
- `be/src/modules/yard/yard.router.ts`

### 10. Controller Functions
- `yardMapController.getYardMap` (`be/src/v1/controllers/yard/map.controller.ts`)
- `yardMovesController.getMoveOrders` (`be/src/v1/controllers/yard/moves.controller.ts`)
- `yardMovesController.createMoveOrder`
- `yardMovesController.assignMove`
- `yardMovesController.startMove`
- `yardMovesController.completeMove`
- `yardMovesController.getEquipment`
- `yardMovesController.getLocations`

### 11. Service Functions
Direct Prisma logic handling slot creation, move order status progression, and yard move ledger insertion.

### 12. Database Tables Involved
- `move_order` (Planned work order)
- `yard_move` (Immutable executed move audit)
- `m_yard_location` (Block-Bay-Row-Tier coordinate master)
- `m_yard_level` (Yard zones and stacking constraints)
- `m_equipment` (Reach stackers, cranes, terminal tractors)
- `unit_stay` (Container current location pointer)
- `cargo_unit` (Container master)

### 13. Database Operations
- **SELECT**:
  - `prisma.m_yard_location.findMany({ include: { unit_stay_yard_locations: { include: { unit_stay_cargo_units: true } } } })`
  - `prisma.move_order.findMany({ include: { unit_stay: true, m_equipment: true } })`
- **INSERT**:
  - `prisma.move_order.create({ data: { site_id, unit_stay_id, move_kind, from_location_id, to_location_id, status: 'OPEN', priority: 5 } })`
  - `prisma.yard_move.create({ data: { site_id, unit_stay_id, move_order_id, move_kind, from_location_id, to_location_id, equipment_id, operator_sub, occurred_at } })`
- **UPDATE**:
  - `prisma.move_order.update({ where: { move_order_id }, data: { status: 'DONE', to_location_id, completed_at } })`
  - `prisma.unit_stay.update({ where: { unit_stay_id }, data: { current_location_id: toLocationId } })`

### 14. Relationships Between Tables
- `move_order.unit_stay_id` -> `unit_stay.unit_stay_id` (FK)
- `move_order.from_location_id` -> `m_yard_location.yard_location_id` (FK)
- `move_order.to_location_id` -> `m_yard_location.yard_location_id` (FK)
- `move_order.assigned_equipment_id` -> `m_equipment.equipment_id` (FK)
- `yard_move.move_order_id` -> `move_order.move_order_id` (FK)
- `unit_stay.current_location_id` -> `m_yard_location.yard_location_id` (FK)

### 15. Input Validations
- `unitStayId` or `unitNo` must resolve to an active stay on site.
- `moveKind` must be one of: `OFFLOAD`, `LOAD`, `YARD_MOVE`, `CFS_TRANSFER`, `CUSTOMS_EXAM`, `REEFER_CONNECT`, `SHUFFLE`.
- Target slot must exist or allow on-the-fly creation.

### 16. Business Rules
- A container cannot be stacked higher than tier 4 (or block safety limit).
- Hazardous containers (IMO class) must respect segregation distance rules from `m_segregation_rule`.
- Completing a move automatically synchronizes `unit_stay.current_location_id`.

### 17. Status Changes
`OPEN` -> `ASSIGNED` -> `IN_PROGRESS` -> `DONE` (or `CANCELLED`).

### 18. API Responses
- `201 Created`: `{ moveOrderId, status: "OPEN", priority: 5 }`.
- `200 OK`: `{ success: true, moveOrderId, status: "DONE", completedAt: "ISO_DATE" }`.

### 19. Error Scenarios
- `400 Bad Request`: Target slot occupied by another unit.
- `404 Not Found`: Move order does not exist.
- `412 Precondition Failed`: Concurrency conflict via `If-Match`.

### 20. Dependencies on Other Modules
- Consumes: Gate Management (`truck_visit`), Cargo Management (`unit_stay`).
- Triggers: Inspections (`inspection`), Customs (`exam`), Billing (`billable_event` for Lift-on / Lift-off).

---

## Module 4: Container & Cargo Management

### 1. Module Name
**Container & Cargo Management**

### 2. Module Purpose
Serves as the core operational data registry for all physical containers, vehicles, consignments, and stays across the depot.

### 3. Business Objective
Maintain a single source of truth for container identity, physical location, customs classification, financial status, and ownership throughout its lifecycle.

### 4. Users / Roles Involved
`OPERATIONS_LEAD`, `LOGISTICS_COORDINATOR`, `CUSTOMER_SERVICE`, `ICD_ADMIN`

### 5. Frontend Pages
- Container Master List: `/units` (`fe/src/features/container-management/pages/ContainerList.tsx`)
- Container Timeline & Details: `/units/:unitStayId` (`fe/src/features/container-management/pages/ContainerDetails.tsx`)

### 6. Components and Modals
- `ContainerTable.tsx`: Full-text searchable container grid with multi-status filters.
- `ContainerDetailView.tsx`: Tabbed overview (Stays, Holds, Inspections, Billing, Move Orders).
- `ContainerTimeline.tsx`: Chronological milestone tracker (Discharged -> Gated In -> Stacked -> Inspected -> Cleared -> Gated Out).

### 7. Frontend API Functions
- `cargoApi.getUnits(params)` (`fe/src/features/container-management/api.ts`)
- `cargoApi.getUnit(unitStayId)`
- `cargoApi.updateUnit(unitStayId, data)`
- `cargoApi.getUnitTimeline(unitStayId)`

### 8. Backend API Endpoints
- `GET /api/v1/units` (or `/api/v1/cargo/units`)
- `POST /api/v1/units`
- `GET /api/v1/units/:unitStayId`
- `PATCH /api/v1/units/:unitStayId`
- `GET /api/v1/units/:unitStayId/timeline`

### 9. Express Route Files
- `be/src/v1/routes/units.routes.ts`
- `be/src/v1/routes/cargo/cargo.routes.ts`
- `be/src/modules/cargo/cargo.router.ts`

### 10. Controller Functions
- `unitsController.getUnits` (`be/src/v1/controllers/units.controller.ts`)
- `unitsController.getUnitById`
- `cargoUnitsController.getUnits` (`be/src/v1/controllers/cargo/units.controller.ts`)
- `CargoService.getUnits` (`be/src/modules/cargo/cargo.service.ts`)
- `CargoService.getUnit`
- `CargoService.updateUnit`

### 11. Service Functions
- `CargoService` (`be/src/modules/cargo/cargo.service.ts`): Orchestrates unit queries, status updates, and timeline collation.

### 12. Database Tables Involved
- `cargo_unit` (Physical asset)
- `unit_stay` (Terminal stay instance)
- `m_unit_type` (ISO size/type dimensions)
- `m_cargo_regime` (Transit, Domestic, Transit-Bonded)
- `m_party` (Shipping Line, Consignee)
- `m_yard_location` (Current slot)
- `consignment` (Bill of lading link)
- `unit_status_history` (Audit trail of status transitions)

### 13. Database Operations
- **SELECT**:
  - `prisma.unit_stay.findMany({ include: { unit_stay_cargo_units: true, unit_stay_yard_locations: true, unit_stay_consignments: true, unit_stay_cargo_regimes: true } })`
- **INSERT**:
  - `prisma.cargo_unit.create({ data: { unit_category, unit_no, unit_type_id } })`
  - `prisma.unit_stay.create({ data: { cargo_unit_id, site_id, flow, full_empty, physical_status: 'EXPECTED', cargo_regime_id } })`
- **UPDATE**:
  - `prisma.unit_stay.update({ where: { unit_stay_id }, data: { physical_status, customs_status, billing_status, release_status, seal_no, current_location_id } })`

### 14. Relationships Between Tables
- `unit_stay.cargo_unit_id` -> `cargo_unit.cargo_unit_id` (FK)
- `unit_stay.site_id` -> `m_site.site_id` (FK)
- `unit_stay.consignment_id` -> `consignment.consignment_id` (FK)
- `unit_stay.cargo_regime_id` -> `m_cargo_regime.cargo_regime_id` (FK)
- `unit_stay.current_location_id` -> `m_yard_location.yard_location_id` (FK)

### 15. Input Validations
- Container number ISO 6346 format verification (4 letters + 7 numbers).
- `flow` must be `IMPORT`, `EXPORT`, or `TRANSSHIPMENT`.
- `full_empty` must be `F` or `E`.

### 16. Business Rules
- A container can only have ONE active `unit_stay` (where `departed_at IS NULL`) per site at any point in time.
- Updating `physical_status` from `IN_YARD` to `DEPARTED` requires `departed_at` timestamp.

### 17. Status Changes
- `physical_status`: `EXPECTED` -> `IN_YARD` -> `CFS` -> `CUSTOMS_EXAM` -> `DEPARTED`.
- `customs_status`: `NOT_LODGED` -> `LODGED` -> `QUERY` -> `EXAM_REQ` -> `CLEARED`.
- `billing_status`: `ACCRUING` -> `INVOICED` -> `PAID`.
- `release_status`: `NONE` -> `REQUESTED` -> `APPROVED` -> `RELEASED`.

### 18. API Responses
`200 OK` with detailed unit stay DTO including embedded consignment, yard slot, and holds count.

### 19. Error Scenarios
- `404 Not Found`: Container stay does not exist.
- `422 Unprocessable Entity`: Invalid ISO container number check digit.

### 20. Dependencies on Other Modules
- Core entity consumed by EVERY other module in the suite.

---

## Module 5: Consignments, Vessel Calls & Manifest Ingestion

### 1. Module Name
**Consignments, Vessel Calls & Manifest Ingestion**

### 2. Module Purpose
Manages incoming vessel schedules, electronic shipping manifests, cargo declarations, and commercial Bills of Lading (BL).

### 3. Business Objective
Pre-advise incoming container flows prior to port discharge, establish legal cargo ownership, and link containers to clearing agents.

### 4. Users / Roles Involved
`MANIFEST_CLERK`, `DOCUMENTATION_OFFICER`, `ICD_ADMIN`

### 5. Frontend Pages
- Consignments: `/consignments` (`fe/src/features/container-management/consignments/index.tsx`)
- Vessel Calls: `/vessel-calls` (`fe/src/features/container-management/vessel-calls/index.tsx`)
- Manifest Upload: `/manifests` (`fe/src/features/container-management/manifests/index.tsx`)

### 6. Components and Modals
- `ConsignmentTable.tsx`: Grid showing BL Number, Vessel, Consignee, Units Count, Customs Status.
- `ManifestUploadModal.tsx`: Drag-and-drop CSV / Excel / EDIFACT manifest file parser.
- `VesselCallDrawer.tsx`: Form to schedule new vessel ETA/ETD and berthing terminal.

### 7. Frontend API Functions
- `cargoApi.getConsignments(query)` (`fe/src/features/container-management/api.ts`)
- `cargoApi.getVesselCalls(query)`
- `cargoApi.getManifests()`
- `cargoApi.uploadManifest(formData)`

### 8. Backend API Endpoints
- `GET /api/v1/consignments`
- `POST /api/v1/consignments`
- `GET /api/v1/vessel-calls`
- `POST /api/v1/vessel-calls`
- `GET /api/v1/manifests`
- `POST /api/v1/manifests`

### 9. Express Route Files
- `be/src/v1/routes/cargo/cargo.routes.ts`
- `be/src/modules/cargo/cargo.router.ts`

### 10. Controller Functions
- `cargoConsignmentsController.getConsignments` (`be/src/v1/controllers/cargo/consignments.controller.ts`)
- `cargoVesselCallsController.getVesselCalls` (`be/src/v1/controllers/cargo/vessel-calls.controller.ts`)
- `cargoManifestsController.getManifests` (`be/src/v1/controllers/cargo/manifests.controller.ts`)
- `CargoService.getConsignments` (`be/src/modules/cargo/cargo.service.ts`)

### 11. Service Functions
- `CargoService.createConsignment`
- `CargoService.getManifests`

### 12. Database Tables Involved
- `consignment` (Master shipping document)
- `consignment_line` (Commodity / package lines)
- `vessel_call` (Vessel voyage instance)
- `m_vessel` (Vessel name & IMO registry)
- `manifest` (EDI manifest header)
- `manifest_line` (Container pre-advise lines)
- `m_party` (Shipper, Consignee, Line)

### 13. Database Operations
- **SELECT**:
  - `prisma.consignment.findMany({ include: { vessel_call: { include: { m_vessel: true } }, m_party_consignment_consignee: true } })`
- **INSERT**:
  - `prisma.vessel_call.create(...)`
  - `prisma.manifest.create(...)`
  - `prisma.manifest_line.createMany(...)`
  - `prisma.consignment.create(...)`

### 14. Relationships Between Tables
- `consignment.vessel_call_id` -> `vessel_call.vessel_call_id` (FK)
- `vessel_call.vessel_id` -> `m_vessel.vessel_id` (FK)
- `manifest.vessel_call_id` -> `vessel_call.vessel_call_id` (FK)
- `manifest_line.manifest_id` -> `manifest.manifest_id` (FK)
- `unit_stay.consignment_id` -> `consignment.consignment_id` (FK)

### 15. Input Validations
- Unique Bill of Lading (`ref_no`).
- Mandatory Line Party (`line_party_id`) and Consignee Party (`consignee_party_id`).

### 16. Business Rules
- Uploading a manifest automatically creates pre-advised `cargo_unit` and `unit_stay` records in status `EXPECTED`.

### 17. Status Changes
- `consignment.status`: `DRAFT` -> `ACTIVE` -> `COMPLETED`.
- `manifest.status`: `RECEIVED` -> `VALIDATED` -> `PROCESSED`.

### 18. API Responses
`201 Created` returning imported line count and auto-generated `consignmentId`.

### 19. Error Scenarios
- `409 Conflict`: Duplicate Bill of Lading reference.

### 20. Dependencies on Other Modules
- Pre-requisite for: Container Management (`unit_stay`), Gate In (`truck_visit`), Billing (`invoice`).

---

## Module 6: Customs Declarations & Physical Examination

### 1. Module Name
**Customs Declarations & Physical Examination**

### 2. Module Purpose
Facilitates regulatory compliance with national revenue authorities (e.g., TRA - Tanzania Revenue Authority), customs clearance declarations (TANSAD / Single Administrative Document), and physical inspection of suspected cargo.

### 3. Business Objective
Prevent unauthorized release of un-cleared cargo, facilitate multi-agency physical cargo examinations, and record seal verification/replacement.

### 4. Users / Roles Involved
`CUSTOMS_OFFICER`, `EXAM_SUPERVISOR`, `CLEARING_AGENT`, `ICD_ADMIN`

### 5. Frontend Pages
- Customs & Exams: `/customs` (`fe/src/features/customs/pages/CustomsPage.tsx`)

### 6. Components and Modals
- `CustomsRefTable.tsx`: TANSAD reference declarations, declaration dates, and release statuses.
- `ExamQueueTable.tsx`: Active physical examination requests, scheduled times, and assigned exam bays.
- `CompleteExamDrawer.tsx`: Form to enter examination results (`CLEARED`, `DISCREPANCY`, `SEIZED`), old seal removed, and new customs seal applied.

### 7. Frontend API Functions
- `customsApi.getCustomsRefs()` (`fe/src/features/customs/api.ts`)
- `customsApi.createCustomsRef(payload)`
- `customsApi.getExams()`
- `customsApi.completeExam(examId, payload)`

### 8. Backend API Endpoints
- `GET /api/v1/customs/refs`
- `POST /api/v1/customs/refs`
- `GET /api/v1/exams`
- `POST /api/v1/exams`
- `POST /api/v1/exams/:examId:complete`

### 9. Express Route Files
- `be/src/v1/routes/cargo/cargo.routes.ts`
- `be/src/modules/control/control.router.ts`

### 10. Controller Functions
- `cargoCustomsController.getCustoms` (`be/src/v1/controllers/cargo/customs.controller.ts`)
- `CargoService.getCustomsRefs` (`be/src/modules/cargo/cargo.service.ts`)
- `CargoService.completeCustomsExam`

### 11. Service Functions
- `CargoService.completeCustomsExam`: Updates `exam` record, applies new seal to `unit_stay.seal_no`, and transitions `unit_stay.customs_status` to `CLEARED` (or `QUERY`).

### 12. Database Tables Involved
- `customs_ref` (TANSAD / Customs declaration)
- `m_customs_ref_type` (Declaration type)
- `exam` (Physical examination job)
- `unit_stay` (Container undergoing exam)
- `move_order` (Transfer to exam bay)
- `m_yard_location` (Customs examination bay)

### 13. Database Operations
- **SELECT**:
  - `prisma.customs_ref.findMany({ include: { m_customs_ref_type: true, consignment: true } })`
  - `prisma.exam.findMany({ include: { unit_stay: true, m_yard_location: true } })`
- **INSERT**:
  - `prisma.customs_ref.create(...)`
  - `prisma.exam.create(...)`
- **UPDATE**:
  - `prisma.exam.update({ where: { exam_id }, data: { status: 'COMPLETED', result, seal_removed, seal_applied, completed_at: new Date() } })`
  - `prisma.unit_stay.update({ where: { unit_stay_id }, data: { seal_no: seal_applied, customs_status: 'CLEARED' } })`

### 14. Relationships Between Tables
- `customs_ref.unit_stay_id` -> `unit_stay.unit_stay_id` (FK)
- `customs_ref.customs_ref_type_id` -> `m_customs_ref_type.customs_ref_type_id` (FK)
- `exam.unit_stay_id` -> `unit_stay.unit_stay_id` (FK)
- `exam.exam_location_id` -> `m_yard_location.yard_location_id` (FK)
- `exam.move_order_id` -> `move_order.move_order_id` (FK)

### 15. Input Validations
- Declaration reference number required (`ref_no`).
- When completing an exam, `result` and `seal_applied` are mandatory.

### 16. Business Rules
- If customs exam result is `DISCREPANCY`, an automatic customs `hold` is placed on the container.
- Container cannot gate out unless `unit_stay.customs_status === 'CLEARED'`.

### 17. Status Changes
- `exam.status`: `REQUESTED` -> `SCHEDULED` -> `IN_PROGRESS` -> `COMPLETED`.
- `unit_stay.customs_status`: `EXAM_REQ` -> `CLEARED`.

### 18. API Responses
`200 OK` returning `{ success: true, examId, status: "COMPLETED", customsStatus: "CLEARED" }`.

### 19. Error Scenarios
- `400 Bad Request`: Exam completed without entering replacement seal.

### 20. Dependencies on Other Modules
- Consumes: Container Management (`unit_stay`), Yard Moves (`move_order`).
- Triggers: Holds (`hold`), Release Management (`release_check`).

---

## Module 7: Regulatory, Line & Terminal Holds

### 1. Module Name
**Regulatory, Line & Terminal Holds**

### 2. Module Purpose
Manages administrative, legal, commercial, and safety holds placed on containers and consignments to prevent movement, loading, or gate exit.

### 3. Business Objective
Provide tamper-proof enforcement of stop-orders issued by Customs, Police, Shipping Lines (freight unpaid), Port Authorities, or Terminal Management.

### 4. Users / Roles Involved
`CUSTOMS_OFFICER`, `COMMERCIAL_MANAGER`, `OPERATIONS_MANAGER`, `ICD_ADMIN`

### 5. Frontend Pages
- Holds Management: `/holds` (`fe/src/features/container-management/holds/index.tsx`)

### 6. Components and Modals
- `HoldsTable.tsx`: Filterable board of active and lifted holds.
- `PlaceHoldModal.tsx`: Dialog to select hold type (`CUSTOMS`, `LINE_COMMERCIAL`, `DAMAGE`, `LEGAL`), reason, and attach evidence.
- `LiftHoldModal.tsx`: Dialog capturing lift authorization and reason.

### 7. Frontend API Functions
- `cargoApi.getHolds(query)` (`fe/src/features/container-management/api.ts`)
- `cargoApi.placeHold(payload)`
- `cargoApi.liftHold(holdId, payload)`

### 8. Backend API Endpoints
- `GET /api/v1/holds`
- `POST /api/v1/holds` (or `POST /api/v1/holds:place`)
- `POST /api/v1/holds/:holdId:lift`

### 9. Express Route Files
- `be/src/v1/routes/cargo/cargo.routes.ts`
- `be/src/modules/control/control.router.ts`

### 10. Controller Functions
- `cargoHoldsController.getHolds` (`be/src/v1/controllers/cargo/holds.controller.ts`)
- `CargoService.getHolds` (`be/src/modules/cargo/cargo.service.ts`)
- `CargoService.placeHold`
- `CargoService.liftHold`

### 11. Service Functions
- `CargoService.placeHold`: Inserts `hold` record and increments `unit_stay.active_hold_count = active_hold_count + 1`.
- `CargoService.liftHold`: Sets `hold.status = 'LIFTED'`, sets `lifted_at`, and decrements `unit_stay.active_hold_count`.

### 12. Database Tables Involved
- `hold` (Hold event record)
- `m_hold_type` (Hold classification master)
- `unit_stay` (Container stay affected)
- `document` (Attached legal evidence file)
- `approval_request` (Approval if lift requires 2-person signoff)

### 13. Database Operations
- **SELECT**:
  - `prisma.hold.findMany({ include: { hold_types: true, hold_unit_stays: true } })`
- **INSERT**:
  - `prisma.hold.create({ data: { unit_stay_id, hold_type_id, status: 'ACTIVE', reason, placed_at: new Date(), placed_by_sub } })`
- **UPDATE**:
  - `prisma.hold.update({ where: { hold_id }, data: { status: 'LIFTED', lifted_at: new Date(), lifted_by_sub, lift_reason } })`
  - `prisma.unit_stay.update({ where: { unit_stay_id }, data: { active_hold_count: { increment: 1 } } })`
  - `prisma.unit_stay.update({ where: { unit_stay_id }, data: { active_hold_count: { decrement: 1 } } })`

### 14. Relationships Between Tables
- `hold.unit_stay_id` -> `unit_stay.unit_stay_id` (FK)
- `hold.hold_type_id` -> `m_hold_type.hold_type_id` (FK)

### 15. Input Validations
- `unitStayId`, `holdTypeId`, and `reason` are mandatory.

### 16. Business Rules
- As long as `unit_stay.active_hold_count > 0`, the system physically blocks release order approval and gate-out pass issuance.

### 17. Status Changes
`ACTIVE` -> `LIFTED`.

### 18. API Responses
`201 Created` returning `{ holdId, status: "ACTIVE", placedAt: "ISO_DATE" }`.

### 19. Error Scenarios
- `400 Bad Request`: Attempting to lift an already lifted hold.

### 20. Dependencies on Other Modules
- Directly guards: Release Orders (`release_order`), Gate Out (`truck_visit`).

---

## Module 8: Cargo Release Order Management

### 1. Module Name
**Cargo Release Order Management**

### 2. Module Purpose
Manages terminal delivery permits, evaluates the Five Pillars of Cargo Release, generates digital QR gate passes, and authorizes cargo gate-out.

### 3. Business Objective
Guarantee that cargo is NEVER released without satisfying all statutory customs duties, commercial shipping line clearances, terminal invoices, hold clearances, and collector identity checks.

### 4. Users / Roles Involved
**The 5 Pillars of Release**:
1. Customs Clearance (`unit_stay.customs_status === 'CLEARED'`)
2. Commercial Line Clearance (Delivery Order validated)
3. Terminal Invoices Settled (`unit_stay.billing_status === 'PAID'`)
4. Zero Active Holds (`unit_stay.active_hold_count === 0`)
5. Authorized Transporter / Driver Identification

Roles: `RELEASE_OFFICER`, `TERMINAL_MANAGER`, `GATE_CLERK`

### 5. Frontend Pages
- Releases Board: `/releases` (`fe/src/features/container-management/releases/index.tsx`)
- Release Order Detail: `/releases/:releaseOrderId` (`fe/src/features/container-management/releases/ReleaseDetail.tsx`)

### 6. Components and Modals
- `ReleaseTable.tsx`: List of release orders with 5-pillar verification pill badges.
- `ReleaseQrModal.tsx`: High-resolution dynamic QR code modal for mobile driver presentation.
- `EvaluatePillarsDrawer.tsx`: Automated check screen showing real-time pass/fail evaluation across the 5 pillars.
- `ApproveReleaseModal.tsx`: Terminal manager signoff modal with electronic PIN / password re-entry.

### 7. Frontend API Functions
- `cargoApi.getReleaseOrders(query)` (`fe/src/features/container-management/api.ts`)
- `cargoApi.getReleaseOrder(id)`
- `cargoApi.createReleaseOrder(payload)`
- `cargoApi.evaluateRelease(id)`
- `cargoApi.approveReleaseOrder(id)`
- `cargoApi.cancelReleaseOrder(id, reason)`

### 8. Backend API Endpoints
- `GET /api/v1/releases` (or `/api/v1/release-orders`)
- `POST /api/v1/releases`
- `GET /api/v1/releases/:releaseOrderId`
- `POST /api/v1/release-orders/:releaseOrderId:approve`
- `POST /api/v1/release-orders/:releaseOrderId:cancel`
- `GET /api/v1/units/:unitStayId/gate-out-explanation`

### 9. Express Route Files
- `be/src/v1/routes/cargo/cargo.routes.ts`
- `be/src/modules/control/control.router.ts`

### 10. Controller Functions
- `cargoReleasesController.getReleases` (`be/src/v1/controllers/cargo/releases.controller.ts`)
- `CargoService.getReleaseOrders` (`be/src/modules/cargo/cargo.service.ts`)
- `CargoService.createReleaseOrder`
- `CargoService.evaluateRelease`
- `CargoService.approveReleaseOrder`

### 11. Service Functions
- `CargoService.evaluateRelease`: Queries `customs_status`, `billing_status`, `active_hold_count`, and creates `release_check` records.
- `CargoService.approveReleaseOrder`: Generates `qr_token`, stamps `approved_at`, and updates `release_order.status = 'APPROVED'`.

### 12. Database Tables Involved
- `release_order` (Clearance permit)
- `release_order_unit` (Linked containers authorized for release)
- `release_check` (5-pillar checklist audit)
- `release_validity_change` (Validity extension history)
- `unit_stay` (Container status update)

### 13. Database Operations
- **SELECT**:
  - `prisma.release_order.findMany({ include: { release_order_unit: { include: { unit_stay: true } }, release_check: true } })`
- **INSERT**:
  - `prisma.release_order.create(...)`
  - `prisma.release_order_unit.createMany(...)`
  - `prisma.release_check.create(...)`
- **UPDATE**:
  - `prisma.release_order.update({ where: { release_order_id }, data: { status: 'APPROVED', approved_at: new Date(), qr_token } })`
  - `prisma.unit_stay.update({ where: { unit_stay_id }, data: { release_status: 'APPROVED' } })`

### 14. Relationships Between Tables
- `release_order.consignment_id` -> `consignment.consignment_id` (FK)
- `release_order_unit.release_order_id` -> `release_order.release_order_id` (FK)
- `release_order_unit.unit_stay_id` -> `unit_stay.unit_stay_id` (FK)
- `release_check.release_order_id` -> `release_order.release_order_id` (FK)

### 15. Input Validations
- At least one `unitStayId` must be assigned to the release order.
- `valid_to` date must be equal to or greater than current date.

### 16. Business Rules
- If ANY pillar fails during `evaluateRelease`, `approveReleaseOrder` returns `400 Release Conditions Not Met` unless an override approval (`override_approval_request_id`) is attached.
- Release orders automatically expire if current time exceeds `valid_to`.

### 17. Status Changes
`REQUESTED` -> `EVALUATED` -> `APPROVED` -> `COMPLETED` (or `CANCELLED` / `EXPIRED`).

### 18. API Responses
`200 OK` returning `{ success: true, releaseOrderId, status: "APPROVED", qrToken: "QR-REL-..." }`.

### 19. Error Scenarios
- `400 Bad Request`: Unpaid invoices exist for the container.
- `400 Bad Request`: Active customs hold exists.

### 20. Dependencies on Other Modules
- Gated by: Customs (`customs_ref`), Billing (`invoice`), Holds (`hold`).
- Authorizes: Gate Out (`truck_visit:checkout`).

---

## Module 9: Container & Vehicle Inspection (EIR / M&R)

### 1. Module Name
**Container & Vehicle Inspection (EIR / M&R)**

### 2. Module Purpose
Performs physical condition surveys (Equipment Interchange Receipt - EIR), logs container structural damage (dents, holes, floor gouges) or vehicle condition (odometer, fuel level, battery, scratch/dent map), and generates repair estimates.

### 3. Business Objective
Protect the terminal from liability for pre-existing maritime damages, bill responsible parties for container repairs, and track depot maintenance workflows.

### 4. Users / Roles Involved
`SURVEYOR`, `M&R_TECHNICIAN`, `OPERATIONS_SUPERVISOR`

### 5. Frontend Pages
- Inspections Board: `/inspections` (`fe/src/features/yard-management/pages/InspectionsPage.tsx`)
- Interactive Inspection Survey: `/inspections/:inspectionId` (`fe/src/features/yard-management/pages/InspectionFormPage.tsx`)
- Maintenance & Repairs: `/repairs` (`fe/src/features/yard-management/pages/RepairsPage.tsx`)

### 6. Components and Modals
- `DamageDiagram.tsx`: Interactive 2D container wireframe (Roof, Left Wall, Right Wall, Door, Floor, Front) allowing surveyors to click and drop damage pins.
- `FindingDrawer.tsx`: Form to specify damage code (e.g., `DT` Dent, `HL` Hole, `BR` Broken), severity (`MINOR`, `MAJOR`), size in cm, and photo uploads.
- `NewEstimateDrawer.tsx`: Repair estimate builder calculating labour hours, material costs, and tariff rates.

### 7. Frontend API Functions
- `yardApi.getInspections()` (`fe/src/features/yard-management/services/yardApi.ts`)
- `yardApi.getInspectionById(id)`
- `yardApi.createInspection(payload)`
- `yardApi.recordFinding(inspectionId, finding)`
- `yardApi.completeInspection(inspectionId, payload)`

### 8. Backend API Endpoints
- `GET /api/v1/yard/inspections`
- `POST /api/v1/yard/inspections`
- `GET /api/v1/yard/inspections/:inspectionId`
- `POST /api/v1/yard/inspections/:inspectionId/findings`
- `POST /api/v1/yard/inspections/:inspectionId:complete`
- `GET /api/v1/repairs`
- `POST /api/v1/repairs/estimates`

### 9. Express Route Files
- `be/src/v1/routes/yard/yard.routes.ts`
- `be/src/v1/routes/repairs.routes.ts`

### 10. Controller Functions
- `yardInspectionsController.getInspections` (`be/src/v1/controllers/yard/inspections.controller.ts`)
- `yardInspectionsController.getInspectionById`
- `yardInspectionsController.createInspection`
- `repairsController.getEstimates` (`be/src/v1/controllers/repairs.controller.ts`)

### 11. Service Functions
Direct Prisma CRUD handling `inspection`, `inspection_finding`, `repair_estimate`.

### 12. Database Tables Involved
- `inspection` (Survey header)
- `inspection_finding` (Individual damage line)
- `inspection_result` (Item checklist results)
- `m_inspection_template` (Standard checklist template)
- `m_damage_code` (ISO standard CEDEX damage codes)
- `repair_estimate` (Commercial quotation for repairs)
- `repair_estimate_line` (Detailed parts and labour lines)

### 13. Database Operations
- **SELECT**:
  - `prisma.inspection.findMany({ include: { unit_stay: true, inspection_finding: true, inspection_result: true } })`
- **INSERT**:
  - `prisma.inspection.create(...)`
  - `prisma.inspection_finding.createMany(...)`
  - `prisma.repair_estimate.create(...)`
- **UPDATE**:
  - `prisma.inspection.update({ where: { inspection_id }, data: { status: 'COMPLETED', overall_condition, completed_at: new Date() } })`

### 14. Relationships Between Tables
- `inspection.unit_stay_id` -> `unit_stay.unit_stay_id` (FK)
- `inspection.truck_visit_id` -> `truck_visit.truck_visit_id` (FK)
- `inspection_finding.inspection_id` -> `inspection.inspection_id` (FK)
- `inspection_finding.damage_code_id` -> `m_damage_code.damage_code_id` (FK)
- `repair_estimate.inspection_id` -> `inspection.inspection_id` (FK)

### 15. Input Validations
- Survey kind must be `GATE_IN`, `GATE_OUT`, `YARD_SURVEY`, or `ON_HIRE`.
- Damaged area must specify panel code.

### 16. Business Rules
- If overall condition is `MAJOR_DAMAGE` or `REJECTED`, the container is placed on automatic operational hold and cannot be loaded onto a truck without terminal manager approval.

### 17. Status Changes
`IN_PROGRESS` -> `COMPLETED` -> `APPROVED`.

### 18. API Responses
`201 Created` returning inspection ID and computed overall condition.

### 19. Error Scenarios
- `400 Bad Request`: Submitting inspection without completing mandatory template check items.

### 20. Dependencies on Other Modules
- Linked to: Gate Operations (`truck_visit`), Yard Stacking (`unit_stay`), Billing (`charge` for M&R).

---

## Module 10: CFS (Container Freight Station) & Handling Jobs

### 1. Module Name
**CFS (Container Freight Station) & Handling Jobs**

### 2. Module Purpose
Controls warehouse operations where Less-than-Container-Load (LCL) or Full-Container-Load (FCL) containers are stripped (unloaded), sorted into bonded warehouse lots, stored, or stuffed (loaded) into export containers.

### 3. Business Objective
Accurately track physical cargo package counts, pallet locations, damages during stripping, labour contractor gang hours, and partial lot deliveries to consignees.

### 4. Users / Roles Involved
`CFS_SUPERVISOR`, `WAREHOUSE_TALLY_CLERK`, `LABOUR_CONTRACTOR`

### 5. Frontend Pages
- CFS Jobs: `/cfs` (`fe/src/features/yard-management/cfs/index.tsx`)
- CFS Job Detail & Tally Sheet: `/cfs/:handlingJobId` (`fe/src/features/yard-management/cfs/components/CfsJobView.tsx`)

### 6. Components and Modals
- `PlanJobDrawer.tsx`: Form to schedule stripping/stuffing job, assign labour gang, and warehouse bay.
- `LotDrawer.tsx`: Sub-manifest lot balance and cargo package inspection form.
- `CompleteJobDrawer.tsx`: Final tally sheet signoff and discrepancy confirmation.

### 7. Frontend API Functions
- `cfsApi.getHandlingJobs()` (`fe/src/features/yard-management/cfs/api.ts`)
- `cfsApi.createHandlingJob(payload)`
- `cfsApi.startHandlingJob(jobId)`
- `cfsApi.completeHandlingJob(jobId, payload)`
- `cfsApi.getLotBalances(unitStayId)`

### 8. Backend API Endpoints
- `GET /api/v1/handling-jobs` (or `/api/v1/cfs/jobs`)
- `POST /api/v1/handling-jobs`
- `POST /api/v1/handling-jobs/:handlingJobId:start`
- `POST /api/v1/handling-jobs/:handlingJobId:complete`
- `GET /api/v1/lots/:unitStayId/balance`

### 9. Express Route Files
- `be/src/v1/routes/cfs.routes.ts`
- `be/src/modules/depth/depth.router.ts`

### 10. Controller Functions
- `cfsController.getJobs` (`be/src/v1/controllers/cfs.controller.ts`)
- `cfsController.createJob`
- `cfsController.startJob`
- `cfsController.completeJob`
- `cfsController.getLotBalance`

### 11. Service Functions
Direct Prisma logic handling warehouse lot inventory adjustments.

### 12. Database Tables Involved
- `handling_job` (CFS job header)
- `handling_job_line` (Package lines and cargo descriptions)
- `lot_balance` (Remaining packages in warehouse)
- `lot_delivery` (Partial gate-out of loose cargo)
- `labour_contractor` (Stevedoring / labour gang master)
- `unit_stay` (Source container stay)

### 13. Database Operations
- **SELECT**:
  - `prisma.handling_job.findMany({ include: { unit_stay: true, labour_contractor: true, handling_job_line: true } })`
- **INSERT**:
  - `prisma.handling_job.create(...)`
  - `prisma.lot_balance.create(...)`
  - `prisma.lot_delivery.create(...)`
- **UPDATE**:
  - `prisma.handling_job.update({ where: { handling_job_id }, data: { status: 'COMPLETED', completed_at: new Date() } })`
  - `prisma.unit_stay.update({ where: { unit_stay_id }, data: { full_empty: 'E', physical_status: 'IN_YARD' } })` (when stripped)

### 14. Relationships Between Tables
- `handling_job.unit_stay_id` -> `unit_stay.unit_stay_id` (FK)
- `handling_job.contractor_id` -> `labour_contractor.labour_contractor_id` (FK)
- `lot_balance.unit_stay_id` -> `unit_stay.unit_stay_id` (FK)

### 15. Input Validations
- `jobKind` must be `STRIP`, `STUFF`, `CROSS_DOCK`, or `REPACK`.
- Package counts cannot be negative.

### 16. Business Rules
- Stripping a full container (`F`) automatically updates the container status to empty (`E`), freeing it for empty repatriation or export booking.
- Accrues CFS stripping billable event.

### 17. Status Changes
`PLANNED` -> `IN_PROGRESS` -> `COMPLETED` -> `APPROVED`.

### 18. API Responses
`200 OK` returning job completion status and updated warehouse lot balance.

### 19. Error Scenarios
- `400 Bad Request`: Discrepancy between manifest package count and tallied count without explanation remarks.

### 20. Dependencies on Other Modules
- Consumes: Container Management (`unit_stay`), Move Orders (`move_order` to CFS bay).
- Generates: Billing Events (`billable_event` for CFS Handling).

---

## Module 11: Reefer Container Monitoring

### 1. Module Name
**Reefer Container Monitoring**

### 2. Module Purpose
Monitors refrigerated containers carrying perishable goods requiring constant electrical power connection and temperature management.

### 3. Business Objective
Maintain strict cold-chain compliance, eliminate cargo spoilage risks, monitor power consumption, and provide audit logs of hourly temperature readings for insurance and shipping line claims.

### 4. Users / Roles Involved
`REEFER_TECHNICIAN`, `OPERATIONS_SUPERVISOR`

### 5. Frontend Pages
- Reefers Board: `/reefers` (`fe/src/features/yard-management/pages/ReefersPage.tsx`)

### 6. Components and Modals
- `ReeferDetailPanel.tsx`: Live dashboard showing Set Temp (°C), Supply Air, Return Air, Power Status (Plugged/Unplugged), and Defrost Cycles.
- `PlugInDrawer.tsx`: Form to record initial power connection, power cable ID, and initial temperatures.
- `UnplugDrawer.tsx`: Form to disconnect power prior to gate-out or vessel loading.

### 7. Frontend API Functions
- `reeferApi.getSessions()` (`fe/src/features/yard-management/reefers/api.ts`)
- `reeferApi.plugIn(payload)`
- `reeferApi.recordReading(sessionId, payload)`
- `reeferApi.unplug(sessionId, payload)`

### 8. Backend API Endpoints
- `GET /api/v1/reefer-sessions` (or `/api/v1/reefers`)
- `POST /api/v1/reefer-sessions`
- `POST /api/v1/reefer-sessions/:reeferSessionId:unplug`
- `GET /api/v1/reefer-sessions/:reeferSessionId/readings`
- `POST /api/v1/reefer-sessions/:reeferSessionId/readings`

### 9. Express Route Files
- `be/src/v1/routes/reefers.routes.ts`
- `be/src/modules/depth/depth.router.ts`

### 10. Controller Functions
- `reefersController.getSessions` (`be/src/v1/controllers/reefers.controller.ts`)
- `reefersController.createSession`
- `reefersController.unplug`
- `reefersController.recordReading`

### 11. Service Functions
Direct Prisma execution on `prisma.reefer_session` and `prisma.reefer_reading`.

### 12. Database Tables Involved
- `reefer_session` (Power connection session)
- `reefer_reading` (Hourly temperature and electrical log)
- `unit_stay` (Reefer container stay)
- `m_yard_location` (Reefer power point slot)

### 13. Database Operations
- **SELECT**:
  - `prisma.reefer_session.findMany({ include: { unit_stay: true, reefer_reading: true } })`
- **INSERT**:
  - `prisma.reefer_session.create({ data: { unit_stay_id, plugged_at: new Date(), set_temp_c, power_point_ref } })`
  - `prisma.reefer_reading.create({ data: { reefer_session_id, reading_at: new Date(), supply_temp_c, return_temp_c, ambient_temp_c, is_defrosting } })`
- **UPDATE**:
  - `prisma.reefer_session.update({ where: { reefer_session_id }, data: { unplugged_at: new Date(), status: 'UNPLUGGED' } })`

### 14. Relationships Between Tables
- `reefer_session.unit_stay_id` -> `unit_stay.unit_stay_id` (FK)
- `reefer_reading.reefer_session_id` -> `reefer_session.reefer_session_id` (FK)

### 15. Input Validations
- `set_temp_c` must be between -35.0°C and +30.0°C.
- `supply_temp_c` and `return_temp_c` required on readings.

### 16. Business Rules
- If temperature reading deviates more than ±3°C from `set_temp_c` for 2 consecutive cycles, an automated critical alert is triggered.
- Generates hourly/daily electricity billable events.

### 17. Status Changes
`PLUGGED` -> `UNPLUGGED`.

### 18. API Responses
`201 Created` returning reading confirmation and temperature status (`NORMAL`, `WARNING`, `DEFROST`).

### 19. Error Scenarios
- `400 Bad Request`: Container cannot be unplugged if not currently plugged in.

### 20. Dependencies on Other Modules
- Stacks in: Yard Management (`m_yard_location` Reefer Zone).
- Bills to: Billing (`billable_event` for Reefer Monitoring & Power).

---

## Module 12: Vehicle Key Custody & Processing

### 1. Module Name
**Vehicle Key Custody & Processing**

### 2. Module Purpose
Manages key cabinet allocations, physical key tags, custody logs, and movements for vehicle imports (Ro-Ro cars, trucks, heavy machinery) stored at the depot.

### 3. Business Objective
Eliminate lost keys, track which driver or inspector checked out keys, enforce secure key storage, and ensure keys are physically handed over upon authorized gate-out.

### 4. Users / Roles Involved
`KEY_CUSTODIAN`, `GATE_CLERK`, `YARD_DRIVER`, `ICD_ADMIN`

### 5. Frontend Pages
- Key Cabinet: `/keys` (`fe/src/features/yard-management/pages/KeysPage.tsx`)

### 6. Components and Modals
- `KeyCabinetGrid.tsx`: Visual matrix of key pegs in Key Cabinet A & B (Peg A-01 to A-50).
- `KeyDetailDrawer.tsx`: History of key custody, VIN, engine number, and current status.
- `MovementDrawer.tsx`: Check-out / Return form logging user sub, purpose (Inspection, Jumpstart, Yard Shuffle), and expected return time.

### 7. Frontend API Functions
- `keysApi.getKeys()` (`fe/src/features/yard-management/keys/api.ts`)
- `keysApi.checkoutKey(keyId, payload)`
- `keysApi.returnKey(keyId, payload)`

### 8. Backend API Endpoints
- `GET /api/v1/yard/keys`
- `POST /api/v1/yard/keys/:keyCustodyId/checkout`
- `POST /api/v1/yard/keys/:keyCustodyId/return`

### 9. Express Route Files
- `be/src/v1/routes/yard/yard.routes.ts`

### 10. Controller Functions
- `yardKeysController.getKeys` (`be/src/v1/controllers/yard/keys.controller.ts`)
- `yardKeysController.checkoutKey`
- `yardKeysController.returnKey`

### 11. Service Functions
Direct Prisma logic handling `key_custody` and `key_movement`.

### 12. Database Tables Involved
- `key_custody` (Key tag and cabinet peg record)
- `key_movement` (Check-out and check-in audit log)
- `unit_stay` (Vehicle stay link)
- `cargo_unit` (Chassis VIN and vehicle details)

### 13. Database Operations
- **SELECT**:
  - `prisma.key_custody.findMany({ include: { unit_stay: { include: { unit_stay_cargo_units: true } } } })`
- **INSERT**:
  - `prisma.key_movement.create({ data: { key_custody_id, action: 'CHECKOUT', handler_sub, purpose, occurred_at: new Date() } })`
- **UPDATE**:
  - `prisma.key_custody.update({ where: { key_custody_id }, data: { status: 'CHECKED_OUT', current_holder_sub } })`
  - `prisma.key_custody.update({ where: { key_custody_id }, data: { status: 'IN_CABINET', current_holder_sub: null } })`

### 14. Relationships Between Tables
- `key_custody.unit_stay_id` -> `unit_stay.unit_stay_id` (FK)
- `key_movement.key_custody_id` -> `key_custody.key_custody_id` (FK)

### 15. Input Validations
- Purpose and recipient user required on checkout.

### 16. Business Rules
- Vehicle cannot gate out if key status is `CHECKED_OUT` (keys must be physically confirmed in cabinet before delivery).

### 17. Status Changes
`IN_CABINET` -> `CHECKED_OUT` -> `DELIVERED_TO_DRIVER`.

### 18. API Responses
`200 OK` returning key status and custody movement ID.

### 19. Error Scenarios
- `400 Bad Request`: Checking out a key that is already checked out.

### 20. Dependencies on Other Modules
- Protects: Release & Gate Out (`truck_visit`) for vehicle units.

---

## Module 13: Commercial Billing, Charges & Invoicing

### 1. Module Name
**Commercial Billing, Charges & Invoicing**

### 2. Module Purpose
Automates operational event capture, tariff calculation, charge generation, fee waivers, proforma estimates, commercial invoice issuance, credit notes, and tax reporting.

### 3. Business Objective
Capture 100% of billable terminal activities, calculate demurrage / storage slabs without human error, enforce statutory VAT / tax compliance, and streamline revenue collection.

### 4. Users / Roles Involved
`BILLING_SPECIALIST`, `COMMERCIAL_MANAGER`, `FINANCE_DIRECTOR`, `ICD_ADMIN`

### 5. Frontend Pages
- Accrued Charges: `/charges` (`fe/src/features/billing/pages/ChargesPage.tsx`)
- Invoices Board: `/invoices` (`fe/src/features/billing/pages/InvoicesPage.tsx`)
- Multi-Unit Invoice Builder: `/invoices/new` (`fe/src/features/billing/pages/InvoiceNewPage.tsx`)
- Commercial Invoice Detail: `/invoices/:invoiceId` (`fe/src/features/billing/pages/InvoiceDetailPage.tsx`)
- Tariffs & Rate Cards: `/tariffs` (`fe/src/features/billing/pages/TariffsPage.tsx`)

### 6. Components and Modals
- `ChargesTable.tsx`: Grid showing unbilled/billed events, event date, quantity, tariff rate, and VAT amount.
- `WaiveDrawer.tsx`: Form to request or approve fee waiver with reason and approval reference.
- `InvoiceSheet.tsx`: Pixel-perfect printable commercial tax invoice layout.
- `CreateInvoiceModal.tsx`: Selection modal grouping multiple containers under one customer invoice.

### 7. Frontend API Functions
- `billingApi.getCharges(query)` (`fe/src/features/billing/charges/api.ts`)
- `billingApi.waiveCharge(chargeId, payload)`
- `billingApi.getInvoices(query)` (`fe/src/features/billing/invoices/api.ts`)
- `billingApi.createInvoice(payload)`
- `billingApi.postInvoice(invoiceId)`
- `billingApi.cancelInvoice(invoiceId, reason)`
- `billingApi.getTariffs()` (`fe/src/features/billing/tariffs/api.ts`)

### 8. Backend API Endpoints
- `GET /api/v1/charges`
- `POST /api/v1/charges/:chargeId:waive`
- `GET /api/v1/invoices`
- `POST /api/v1/invoices`
- `GET /api/v1/invoices/:invoiceId`
- `POST /api/v1/invoices/:invoiceId:post`
- `POST /api/v1/invoices/:invoiceId:cancel`
- `GET /api/v1/tariffs`
- `POST /api/v1/tariffs`

### 9. Express Route Files
- `be/src/v1/routes/billing/billing.routes.ts`
- `be/src/modules/commercial/commercial.router.ts`

### 10. Controller Functions
- `billingChargesController.getCharges` (`be/src/v1/controllers/billing/charges.controller.ts`)
- `billingInvoicesController.getInvoices` (`be/src/v1/controllers/billing/invoices.controller.ts`)
- `billingInvoicesController.createInvoice`
- `billingInvoicesController.getInvoiceById`
- `billingTariffsController.getTariffs` (`be/src/v1/controllers/billing/tariffs.controller.ts`)

### 11. Service Functions
Direct Prisma logic handling invoice consolidation, line items, and financial postings.

### 12. Database Tables Involved
- `billable_event` (Operational trigger: Gate In, Lift, Storage, Reefer)
- `charge` (Monetized charge line)
- `invoice` (Commercial tax invoice header)
- `invoice_line` (Line item breakdown)
- `tariff` (Master rate card)
- `tariff_rule` (Applicability conditions)
- `tariff_slab` (Stepped demurrage day pricing)
- `m_tax_code` (VAT 18%, Zero-rated, Exempt)
- `m_charge_code` (Standard billing nomenclature)
- `unit_stay` (Billing status tracking)

### 13. Database Operations
- **SELECT**:
  - `prisma.invoice.findMany({ include: { parties: true, invoice_line: true } })`
  - `prisma.charge.findMany({ include: { billable_event: true, m_party_charge: true } })`
- **INSERT**:
  - `prisma.invoice.create({ data: { invoice_no, party_id, subtotal, tax_total, total, status: 'DRAFT', currency: 'USD' } })`
  - `prisma.invoice_line.createMany(...)`
- **UPDATE**:
  - `prisma.invoice.update({ where: { invoice_id }, data: { status: 'ISSUED', issued_at: new Date() } })`
  - `prisma.unit_stay.update({ where: { unit_stay_id }, data: { billing_status: 'INVOICED' } })`

### 14. Relationships Between Tables
- `invoice.bill_to_party_id` -> `m_party.party_id` (FK)
- `invoice_line.invoice_id` -> `invoice.invoice_id` (FK)
- `invoice_line.charge_id` -> `charge.charge_id` (FK)
- `charge.billable_event_id` -> `billable_event.billable_event_id` (FK)
- `charge.tax_code_id` -> `m_tax_code.tax_code_id` (FK)

### 15. Input Validations
- Valid customer party ID.
- Invoice currency must match active price list (`USD` or `TZS`).

### 16. Business Rules
- Waiving a charge above $100 requires multi-level managerial approval (`approval_request`).
- Storage days begin counting automatically after free days threshold (e.g., 7 free days for import, 14 free days for transit).
- Invoices posted to the ledger cannot be deleted; they must be reversed via credit notes (`credit-notes`).

### 17. Status Changes
- `invoice.status`: `DRAFT` -> `ISSUED` -> `PARTIALLY_PAID` -> `PAID` (or `CANCELLED` / `CREDITED`).
- `unit_stay.billing_status`: `ACCRUING` -> `INVOICED` -> `PAID`.

### 18. API Responses
`201 Created` returning generated `invoiceId`, `invoiceNo`, `totalAmount`, `taxAmount`.

### 19. Error Scenarios
- `400 Bad Request`: Invoicing unrated billable events.
- `412 Precondition Failed`: Modifying an invoice already posted.

### 20. Dependencies on Other Modules
- Consumes events from: Gate, Yard, CFS, Reefers, Inspections.
- Unlocks: Cashier Payments (`payment`), Cargo Release (`release_order`).

---

## Module 14: Cashier Desk & Payments

### 1. Module Name
**Cashier Desk & Payments**

### 2. Module Purpose
Manages cashier shifts, cash desk opening floats, physical cash counting, mobile money payments (M-Pesa, Airtel Money), bank transfers, automated payment allocations to open invoices, and fiscal electronic receipting.

### 3. Business Objective
Ensure complete financial accountability of cash desk operators, prevent cash leakage, accelerate customer checkout, and provide instant payment allocation to release cargo.

### 4. Users / Roles Involved
`CASHIER`, `HEAD_CASHIER`, `FINANCE_CONTROLLER`

### 5. Frontend Pages
- Cashier Desk: `/cashier` (`fe/src/features/billing/pages/CashierPage.tsx`)
- Refunds Board: `/refunds` (`fe/src/features/billing/pages/RefundsPage.tsx`)
- General Ledger: `/ledger` (`fe/src/features/billing/pages/LedgerPage.tsx`)

### 6. Components and Modals
- `OpenShiftPanel.tsx`: Shift initiation form capturing cashier float balance and currency.
- `TakePaymentForm.tsx`: Fast invoice search, balance lookup, payment method selection, and amount capture.
- `ReceiptModal.tsx`: Printable official receipt with fiscal signature and invoice settlement list.
- `CloseShiftDrawer.tsx`: End-of-day reconciliation modal showing system expected cash vs cashier counted cash with variance calculation.

### 7. Frontend API Functions
- `cashierApi.getShifts()` (`fe/src/features/billing/cashier/api.ts`)
- `cashierApi.openShift(payload)`
- `cashierApi.closeShift(shiftId, payload)`
- `cashierApi.getPayments()`
- `cashierApi.recordPayment(payload)`
- `cashierApi.allocatePayment(paymentId, payload)`

### 8. Backend API Endpoints
- `GET /api/v1/cashier-shifts`
- `POST /api/v1/cashier-shifts`
- `POST /api/v1/cashier-shifts/:shiftId:close`
- `GET /api/v1/payments`
- `POST /api/v1/payments`
- `POST /api/v1/payments/:paymentId:allocate`
- `GET /api/v1/fiscal-receipts`

### 9. Express Route Files
- `be/src/v1/routes/billing/billing.routes.ts`
- `be/src/modules/commercial/commercial.router.ts`

### 10. Controller Functions
- `billingCashierController.getPayments` (`be/src/v1/controllers/billing/cashier.controller.ts`)
- `billingCashierController.getShifts`
- `billingCashierController.recordPayment`

### 11. Service Functions
Direct Prisma execution on `prisma.cashier_shift`, `prisma.payment`, `prisma.payment_allocation`, `prisma.fiscal_receipt`.

### 12. Database Tables Involved
- `cashier_shift` (Cash desk session)
- `payment` (Money received record)
- `payment_allocation` (Invoice settlement linkage)
- `fiscal_receipt` (Electronic Tax Register - EFD/TRA signature)
- `invoice` (Invoice balance update)
- `m_payment_channel` (Cash, Bank Transfer, M-Pesa, Card)

### 13. Database Operations
- **SELECT**:
  - `prisma.payment.findMany({ include: { invoices: true, m_party_payment: true } })`
  - `prisma.cashier_shift.findFirst({ where: { cashier_sub, status: 'OPEN' } })`
- **INSERT**:
  - `prisma.cashier_shift.create(...)`
  - `prisma.payment.create({ data: { receipt_no, invoice_id, amount, currency, payment_method, status: 'COMPLETED', paid_at: new Date() } })`
  - `prisma.payment_allocation.create(...)`
- **UPDATE**:
  - `prisma.invoice.update({ where: { invoice_id }, data: { paid_amount: { increment: amount }, status: 'PAID' } })`
  - `prisma.unit_stay.update({ where: { unit_stay_id }, data: { billing_status: 'PAID' } })`
  - `prisma.cashier_shift.update({ where: { cashier_shift_id }, data: { status: 'CLOSED', closed_at: new Date(), counted_cash, difference } })`

### 14. Relationships Between Tables
- `payment.cashier_shift_id` -> `cashier_shift.cashier_shift_id` (FK)
- `payment.party_id` -> `m_party.party_id` (FK)
- `payment.payment_channel_id` -> `m_payment_channel.payment_channel_id` (FK)
- `payment_allocation.payment_id` -> `payment.payment_id` (FK)
- `payment_allocation.invoice_id` -> `invoice.invoice_id` (FK)

### 15. Input Validations
- Payment amount must be greater than zero.
- Shift must be in status `OPEN` to record payments.

### 16. Business Rules
- Settling all invoices linked to a `unit_stay` automatically updates `unit_stay.billing_status` from `INVOICED` to `PAID`.
- If cashier shift has cash variance (`difference !== 0`), closing the shift requires supervisor approval.

### 17. Status Changes
- `cashier_shift.status`: `OPEN` -> `CLOSED` -> `APPROVED`.
- `payment.status`: `RECEIVED` -> `ALLOCATED` (or `REVERSED`).
- `invoice.status`: `ISSUED` -> `PAID`.

### 18. API Responses
`201 Created` returning official `receiptNo`, amount allocated, remaining invoice balance (`0.00`), and fiscal signature.

### 19. Error Scenarios
- `400 Bad Request`: Over-allocation of payment exceeding invoice total.

### 20. Dependencies on Other Modules
- Settles: Billing (`invoice`).
- Clears 5th Pillar: Release Orders (`release_order`).

---

## Module 15: Approvals, Delegations & Exceptions Management

### 1. Module Name
**Approvals, Delegations & Exceptions Management**

### 2. Module Purpose
Provides a centralized multi-level governance framework for approval workflows (e.g., fee waivers, overweight variances, major damage gate-ins, manual releases) and tracking operational exception tickets.

### 3. Business Objective
Enforce strict separation of duties, prevent unauthorized override of safety or revenue rules, and provide full auditability of managerial decisions.

### 4. Users / Roles Involved
`OPERATIONS_MANAGER`, `FINANCE_DIRECTOR`, `TERMINAL_MANAGER`, `ICD_ADMIN`

### 5. Frontend Pages
- Approvals Inbox: `/approvals` (`fe/src/features/transport/pages/ApprovalsPage.tsx`)
- Exceptions Board: `/exceptions` (`fe/src/features/transport/pages/ExceptionsPage.tsx`)
- Exception Case Detail: `/exceptions/:exceptionCaseId` (`fe/src/features/transport/pages/ExceptionDetail.tsx`)

### 6. Components and Modals
- `ApprovalsTable.tsx`: Multi-tier approval request cards with policy name, requester, entity, monetary amount, and decision buttons (`Approve`, `Reject`).
- `ActionApprovalModal.tsx`: Mandatory approval comments and signature dialog.
- `CreateExceptionDrawer.tsx`: Incident logging form capturing root cause, severity, and photo documents.

### 7. Frontend API Functions
- `controlApi.getApprovals(query)` (`fe/src/features/transport/api.ts`)
- `controlApi.actionApproval(approvalId, payload)`
- `controlApi.getExceptions(query)`
- `controlApi.resolveException(caseId, payload)`

### 8. Backend API Endpoints
- `GET /api/v1/approvals`
- `POST /api/v1/approvals/:approvalRequestId:decide`
- `GET /api/v1/exceptions`
- `POST /api/v1/exceptions`
- `POST /api/v1/exceptions/:exceptionCaseId:resolve`

### 9. Express Route Files
- `be/src/v1/routes/control/control.routes.ts`
- `be/src/modules/control/control.router.ts`

### 10. Controller Functions
- `controlApprovalsController.getApprovals` (`be/src/v1/controllers/control/approvals.controller.ts`)
- `controlApprovalsController.actionApproval`
- `controlExceptionsController.getExceptions` (`be/src/v1/controllers/control/exceptions.controller.ts`)

### 11. Service Functions
Direct Prisma updates on `prisma.approval_request`, `prisma.approval_step`, `prisma.exception_case`.

### 12. Database Tables Involved
- `approval_request` (Approval header)
- `approval_step` (Step level and decision)
- `m_approval_policy` (Policy thresholds and rules)
- `approval_delegation` (Temporary delegation of authority)
- `exception_case` (Operational incident ticket)
- `exception_comment` (Collaboration thread)

### 13. Database Operations
- **SELECT**:
  - `prisma.approval_request.findMany({ include: { m_permission: true, m_site: true } })`
  - `prisma.exception_case.findMany({ include: { unit_stay: true, truck_visit: true } })`
- **INSERT**:
  - `prisma.approval_request.create(...)`
  - `prisma.exception_case.create(...)`
- **UPDATE**:
  - `prisma.approval_request.update({ where: { approval_request_id }, data: { status: 'APPROVED', decided_at: new Date(), updatedby: userSub } })`
  - `prisma.exception_case.update({ where: { exception_case_id }, data: { status: 'RESOLVED', resolution_notes } })`

### 14. Relationships Between Tables
- `approval_request.site_id` -> `m_site.site_id` (FK)
- `approval_step.approval_request_id` -> `approval_request.approval_request_id` (FK)
- `exception_case.unit_stay_id` -> `unit_stay.unit_stay_id` (FK)
- `exception_case.truck_visit_id` -> `truck_visit.truck_visit_id` (FK)

### 15. Input Validations
- Action must be `APPROVE` or `REJECT`.
- Reason comments required on rejection.

### 16. Business Rules
- A user cannot approve their own request (separation of duties enforced via `requested_by_sub !== current_user_sub`).
- If an approval policy requires 2 levels, approving level 1 increments `current_level` to 2; the request remains `PENDING` until level 2 confirms.

### 17. Status Changes
`PENDING` -> `APPROVED` (or `REJECTED` / `CANCELLED`).

### 18. API Responses
`200 OK` returning `{ success: true, approvalRequestId, status: "APPROVED", decidedAt: "ISO_DATE" }`.

### 19. Error Scenarios
- `403 Forbidden`: User lacks necessary delegation or managerial authority.

### 20. Dependencies on Other Modules
- Invoked by: Billing Waivers, Weighbridge Overweight, Gate Exception, Release Overrides.

---

## Module 16: Master Data, Admin & AIVA AI Assistant

### 1. Module Name
**Master Data, Admin & AIVA AI Assistant**

### 2. Module Purpose
Configures physical sites, gates, lanes, unit types, charge codes, exchange rates, users, roles, device integrations (CCTV, OCR, Scales), and powers the built-in AI Virtual Assistant (AIVA).

### 3. Business Objective
Provide scalable multi-facility administration and assist operators via natural language query execution and draft action suggestions.

### 4. Users / Roles Involved
`ICD_ADMIN`, `SYS_ADMIN`, `ALL_USERS` (for AIVA chat)

### 5. Frontend Pages
- Master Data Suite: `/admin/*` (`fe/src/features/master-data/pages/*`)
  - Sites (`/admin/sites`), Gates (`/admin/gates`), Yard Designer (`/admin/yard`), Users (`/admin/users`), Rules (`/admin/rules`), Devices (`/admin/devices`).
- AI Assistant Drawer: Floating chat widget available across all screens.

### 6. Components and Modals
- `SiteManager.tsx`: Terminal facility configuration.
- `YardDesignerCanvas.tsx`: Drag-and-drop yard block and slot layout designer.
- `AivaChatDrawer.tsx`: Real-time chat interface displaying conversation history, tool calls, and draft action cards.

### 7. Frontend API Functions
- `setupApi.getSites()` (`fe/src/features/master-data/services/setupApi.ts`)
- `setupApi.getUsers()`
- `aivaApi.sendMessage(payload)`

### 8. Backend API Endpoints
- `GET /api/v1/sites`
- `POST /api/v1/sites`
- `GET /api/v1/users`
- `POST /api/v1/aiva/conversations`
- `POST /api/v1/aiva/conversations/:id/messages`
- `POST /api/v1/aiva/drafts/:draftId:submit`

### 9. Express Route Files
- `be/src/v1/routes/setup/setup.routes.ts`
- `be/src/modules/setup/setup.router.ts`
- `be/src/modules/insight/insight.router.ts`

### 10. Controller Functions
- `setupSitesController.getSites` (`be/src/v1/controllers/setup/sites.controller.ts`)
- `setupUsersController.getUsers` (`be/src/v1/controllers/setup/users.controller.ts`)
- `SetupService.getSites` (`be/src/modules/setup/setup.service.ts`)

### 11. Service Functions
- `SetupService`: Manages company, site, calendar, and numbering sequence generation.

### 12. Database Tables Involved
- `m_site`, `m_company`, `app_user`, `m_role`, `m_permission`, `m_device`, `m_unit_type`, `m_party`
- `aiva_conversation`, `aiva_message`, `aiva_tool_call`, `aiva_draft_action`

### 13. Database Operations
- Complete CRUD across master tables (`m_*`).
- Sequential generation of message logs and AI proposed action drafts in `aiva_*`.

### 14. Relationships Between Tables
- Master tables anchor all transaction tables via foreign key references (`site_id`, `user_id`, `party_id`).

### 15. Input Validations
- Unique site codes, role codes, and ISO container types.

### 16. Business Rules
- Master records linked to active transaction stays cannot be hard deleted.
- AIVA actions require human confirmation (`aiva_draft_action:submit`) before mutating live operational tables.

### 17. Status Changes
Master records: `is_active` (`true`/`false`). AIVA drafts: `DRAFT` -> `SUBMITTED` (or `DISCARDED`).

### 18. API Responses
`200 OK` / `201 Created` with configured entities.

### 19. Error Scenarios
- `409 Conflict`: Duplicate site code or user email.

### 20. Dependencies on Other Modules
- Core foundation for the entire suite.

