# Document 07: API Execution Flow & Contract Mapping

## 1. Overview of API Surface & Architecture

The application exposes **426 endpoints** according to the OpenAPI 3.1 specification (`ng_icd_api.yaml`). The backend routes these through versioned endpoints (`/api/v1/*`) and root-mounted fallbacks (`/api/*`).

Every HTTP transaction passes through the client interceptor chain, the Express middleware stack, the domain controller, and the Prisma ORM layer.

---

## 2. Mission-Critical API Execution Traces

### Trace 1: Truck Gate Check-In (`POST /api/v1/truck-visits/:id:checkin`)

| Step | Layer | Implementation Detail |
|---|---|---|
| **1. UI Trigger** | Component | User clicks **"Admit Truck"** button in `CheckinDrawer.tsx` |
| **2. Client Service**| `fe/src/features/gate-management/api.ts` | Calls `gateApi.checkin(truckVisitId)` |
| **3. Request Interceptor**| `fe/src/services/api/interceptors.ts` | Injects: `Authorization: Bearer <tok>`, `X-Site-Id: DAR1`, `X-Role-Code: GATE_CLERK`, `Idempotency-Key: UUID` |
| **4. HTTP Wire** | Protocol | `POST /api/v1/truck-visits/412:checkin` |
| **5. Routing Layer**| `be/src/v1/routes/gate/gate.routes.ts` | Matched route: `["/truck-visits/:id:checkin", "/truck-visits/:id/checkin"]` |
| **6. Middlewares** | Pipeline | 1. `requireSite(false)`: Resolves `req.siteId = 1`<br/>2. `requirePermission('gate.visit.checkin', 'DO')`: Verifies `GATE_CLERK` has `DO` grant<br/>3. `requireIdempotency(false)`: Checks key cache |
| **7. Controller** | Controller | `gateVisitsController.checkin` in `be/src/v1/controllers/gate/visits.controller.ts` |
| **8. Database Query**| Prisma ORM | `prisma.truck_visit.update({ where: { truck_visit_id: 412n }, data: { status: 'ADMITTED', admitted_at: new Date(), current_seq_no: 2, updatedate: new Date() } })` |
| **9. SQL Execution**| MSSQL | `UPDATE truck_visit SET status = 'ADMITTED', admitted_at = SYSUTCDATETIME(), current_seq_no = 2 WHERE truck_visit_id = 412` |
| **10. Response** | Wire | `HTTP 200 OK` `{ success: true, truckVisitId: 412, status: "ADMITTED", admittedAt: "2026-11-02T14:00:00.000Z" }` |
| **11. State Update**| React Query | `queryClient.invalidateQueries(['gate-visits'])`. Truck moves to "Working in Yard" lane. |

---

### Trace 2: Yard Move Order Creation & Dispatch (`POST /api/v1/moves`)

| Step | Layer | Implementation Detail |
|---|---|---|
| **1. UI Trigger** | Component | User submits `CreateMoveDrawer.tsx` on `/moves` or `/yard` |
| **2. Client Service**| `fe/src/features/yard-management/services/yardApi.ts` | Calls `yardApi.createMoveOrder(payload)` |
| **3. Payload** | JSON Body | `{ unitStayId: 42, unitNo: "MSKU 882014 9", moveKind: "OFFLOAD", toCode: "A-04-02-1", priority: 5 }` |
| **4. Middlewares** | Pipeline | `requireSite(false)`, `requirePermission('yard.move.execute', 'DO')`, `requireIdempotency(true)` |
| **5. Controller** | Controller | `yardMovesController.createMoveOrder` in `be/src/v1/controllers/yard/moves.controller.ts` |
| **6. Database Reads**| Prisma ORM | 1. `prisma.cargo_unit.findFirst({ where: { unit_no: 'MSKU 882014 9' } })`<br/>2. `prisma.m_yard_location.findFirst({ where: { full_code: 'A-04-02-1' } })` |
| **7. Database Writes**| Prisma ORM | `prisma.move_order.create({ data: { site_id: 1, unit_stay_id: 42n, move_kind: 'OFFLOAD', to_location_id: 104, priority: 5, status: 'OPEN', createdby: 'operator' } })` |
| **8. Response** | Wire | `HTTP 201 Created` `{ success: true, moveOrderId: 914, status: "OPEN", priority: 5 }` |
| **9. State Update**| React Query | `queryClient.invalidateQueries(['yard-moves'])`. Card appears in "Open Work Orders" column. |

---

### Trace 3: Complete Move Order (`POST /api/v1/moves/:id/complete`)

| Step | Layer | Implementation Detail |
|---|---|---|
| **1. UI Trigger** | Component | Reach stacker operator clicks **"Confirm Placed"** in `CompleteDrawer.tsx` |
| **2. Client Service**| `fe/src/features/yard-management/services/yardApi.ts` | Calls `yardApi.completeMove(914, { toLocationId: 104 })` |
| **3. Controller** | Controller | `yardMovesController.completeMove` in `be/src/v1/controllers/yard/moves.controller.ts` |
| **4. Database Writes**| Multi-Table Mutation | 1. `prisma.move_order.update({ where: { move_order_id: 914n }, data: { status: 'DONE', completed_at: NOW() } })`<br/>2. `prisma.unit_stay.update({ where: { unit_stay_id: 42n }, data: { current_location_id: 104 } })`<br/>3. `prisma.yard_move.create({ data: { site_id: 1, unit_stay_id: 42n, move_order_id: 914n, to_location_id: 104, ... } })` |
| **5. Response** | Wire | `HTTP 200 OK` `{ success: true, moveOrderId: 914, status: "DONE", completedAt: "ISO_DATE" }` |
| **6. State Update**| Canvas Re-render | `queryClient.invalidateQueries(['yard-map'])`. Slot turns blue on SVG canvas. |

---

### Trace 4: Commercial Invoicing (`POST /api/v1/invoices`)

| Step | Layer | Implementation Detail |
|---|---|---|
| **1. UI Trigger** | Component | Billing clerk clicks **"Generate Commercial Invoice"** on `/invoices/new` |
| **2. Payload** | JSON Body | `{ partyId: 14, consignmentId: 12, currency: "USD", totalAmount: 247.80 }` |
| **3. Controller** | Controller | `billingInvoicesController.createInvoice` in `be/src/v1/controllers/billing/invoices.controller.ts` |
| **4. Database Writes**| Prisma ORM | `prisma.invoices.create({ data: { invoice_no: 'INV-171890000', party_id: 14, total_amount: 247.80, status: 'ISSUED', issued_at: NOW() } })` |
| **5. Response** | Wire | `HTTP 201 Created` with generated invoice object |
| **6. State Update**| Navigation | Router redirects to `/invoices/INV-171890000` to view the printable sheet. |

---

### Trace 5: Cashier Desk Payment (`POST /api/v1/payments`)

| Step | Layer | Implementation Detail |
|---|---|---|
| **1. UI Trigger** | Component | Cashier submits `TakePaymentForm.tsx` on `/cashier` |
| **2. Payload** | JSON Body | `{ invoiceId: 501, amount: 247.80, currency: "USD", paymentMethod: "BANK_TRANSFER" }` |
| **3. Controller** | Controller | `billingCashierController.recordPayment` in `be/src/v1/controllers/billing/cashier.controller.ts` |
| **4. Database Writes**| Prisma ORM | `prisma.payments.create({ data: { receipt_no: 'REC-171890000', invoice_id: 501, amount: 247.80, payment_method: 'BANK_TRANSFER', status: 'COMPLETED', paid_at: NOW() } })` |
| **5. Response** | Wire | `HTTP 201 Created` returning receipt record |
| **6. UI Action** | Modal | `ReceiptModal.tsx` opens automatically with thermal receipt print trigger. |

---

### Trace 6: 5-Pillar Cargo Release Approval (`POST /api/v1/release-orders/:id:approve`)

| Step | Layer | Implementation Detail |
|---|---|---|
| **1. UI Trigger** | Component | Terminal Manager clicks **"Approve Release"** in `ReleaseDetail.tsx` |
| **2. Controller** | Controller | `CargoService.approveReleaseOrder` in `be/src/modules/cargo/cargo.service.ts` |
| **3. Pillar Evaluation**| Business Logic | Verifies: `customs_status === 'CLEARED'`, `billing_status === 'PAID'`, `active_hold_count === 0`. |
| **4. Database Writes**| Prisma ORM | `prisma.release_order.update({ where: { release_order_id: 88n }, data: { status: 'APPROVED', approved_at: NOW(), qr_token: 'QR-REL-88' } })` |
| **5. Response** | Wire | `HTTP 200 OK` `{ success: true, releaseOrderId: 88, status: "APPROVED", qrToken: "QR-REL-88" }` |
| **6. State Update**| UI Component | Dynamic QR code renders on screen with 24-hour expiration countdown. |

---

## 3. Duplicate Routes, Controller Aliases, and Discrepancy Analysis

A deep scan of `be/src/v1/routes` against `be/src/modules` reveals intentional design patterns and duplicate endpoints:

| Feature Area | OpenAPI Spec Path | Frontend Client Path | Backend Controller Mapping | Status |
|---|---|---|---|---|
| **Gate Visits** | `/truck-visits` | `/gate/visits` | Both route to `gateVisitsController.getVisits` via array route `["/truck-visits", "/gate/visits"]` | **Harmonized** (Clean) |
| **Gate Check-In** | `/truck-visits/{id}:checkin` | `/gate/visits/{id}/checkin` | Both patterns handled in `gate.routes.ts` | **Harmonized** (Clean) |
| **Move Orders** | `/moves` | `/yard/move-orders` | Both handled via `yardMovesController` | **Harmonized** (Clean) |
| **Releases** | `/release-orders` | `/releases` | Handled via `cargoReleasesController` & `control.router.ts` | **Harmonized** (Clean) |
| **CFS Jobs** | `/handling-jobs` | `/cfs/jobs` | Mounted in both `cfs.routes.ts` and `depth.router.ts` | **Duplicate Router** (Needs unification) |
| **Reefers** | `/reefer-sessions` | `/reefers` | Mounted in both `reefers.routes.ts` and `depth.router.ts` | **Duplicate Router** (Needs unification) |
| **Invoices** | `/invoices` | `/billing/invoices` | Mounted in both `billing.routes.ts` and `commercial.router.ts` | **Dual Router** (Legacy vs Modern) |

