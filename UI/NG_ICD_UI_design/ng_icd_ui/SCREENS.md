# NG ICD — screen catalogue

*Confidential — internal design document.* Every menu screen of the prototype, with its milestone and the permission that shows it. Phase 2 screens (M5, M6) hide when the phase switch is set to Phase 1.

## Today

| Screen | Path | Milestone | Shown with permission |
|---|---|---|---|
| Home | `/` | M4 | everyone |
| Control tower | `/control-tower` | M4 | `dashboard.control_tower` |
| Inbox | `/inbox` | M2 | everyone |

## Gate & yard

| Screen | Path | Milestone | Shown with permission |
|---|---|---|---|
| Gate queue | `/gate` | M1 | `gate.visit.checkin` |
| Gate lane (tablet) | `/gate/lane` | M1 | `gate.visit.checkin` |
| Appointments | `/appointments` | M5 | `appointment.manage` |
| Yard map | `/yard` | M1 | `yard.map.view` |
| Move orders | `/moves` | M1 | `yard.move.execute` |
| Inspections | `/inspections` | M1 | `inspection.perform` |
| Weighbridge | `/weighbridge` | M1 | `weighbridge.ticket` |
| Vehicle keys (vehicle sites only) | `/keys` | M1 | `yard.key.custody` |
| CFS jobs | `/cfs` | M5 | `cfs.job.manage` |
| Reefers | `/reefers` | M5 | `reefer.manage` |
| Repairs (M&R) | `/repairs` | M5 | `repair.estimate` |

## Cargo

| Screen | Path | Milestone | Shown with permission |
|---|---|---|---|
| Units | `/units` | M1 | `consignment.view` |
| Consignments | `/consignments` | M1 | `consignment.view` |
| Vessel calls | `/vessel-calls` | M1 | `consignment.view` |
| Manifest import | `/manifests` | M1 | `manifest.import` |
| Customs & exams | `/customs` | M2 | `consignment.view` |
| Holds | `/holds` | M2 | `consignment.view` |
| Release orders | `/releases` | M2 | `consignment.view` |
| Dangerous goods | `/dangerous-goods` | M5 | `dg.manage` |

## Money

| Screen | Path | Milestone | Shown with permission |
|---|---|---|---|
| Charges | `/charges` | M3 | `billing.invoice.view` |
| Invoices | `/invoices` | M3 | `billing.invoice.view` |
| Cashier | `/cashier` | M3 | `payment.record` |
| Refunds | `/refunds` | M3 | `payment.refund` |
| Disbursements | `/disbursements` | M3 | `finance.disbursement.record` |
| Statements | `/statements` | M3 | `billing.invoice.view` |
| Tariffs | `/tariffs` | M3 | `billing.rates.view` |
| Exchange rates | `/exchange-rates` | M3 | `billing.rates.view` |
| Ledger postings | `/ledger` | M3 | `finance.period.close` |

## Control

| Screen | Path | Milestone | Shown with permission |
|---|---|---|---|
| Approvals | `/approvals` | M2 | everyone |
| Exceptions | `/exceptions` | M2 | `exception.view` |
| Reports | `/reports` | M4 | `reports.operational` |
| KPIs & trends | `/kpis` | M4 | `dashboard.executive` |
| Forecasts | `/forecasts` | M6 | `yard.map.view` |
| Audit trail | `/audit` | M0 | `admin.audit.view` |

## Customers

| Screen | Path | Milestone | Shown with permission |
|---|---|---|---|
| Customer portal | `/portal` | M5 | `portal.request.submit` |
| Service requests | `/service-requests` | M5 | `portal.request.handle` |
| Customers & parties | `/parties` | M0 | `masters.view` |

## Setup

| Screen | Path | Milestone | Shown with permission |
|---|---|---|---|
| Company & sites | `/admin/sites` | M0 | `admin.site.manage` |
| Yard designer | `/admin/yard` | M0 | `admin.yard.design` |
| Gates & visit types | `/admin/gates` | M0 | `admin.gate.configure` |
| Unit types & checks | `/admin/units` | M0 | `admin.config.manage` |
| Trucks, drivers, vessels | `/admin/masters` | M0 | `masters.view` |
| Users & roles | `/admin/users` | M0 | `admin.users.manage` |
| Holds, release & approvals | `/admin/rules` | M2 | `admin.config.manage` |
| Inspection checklists | `/admin/inspection` | M1 | `admin.config.manage` |
| Finance setup | `/admin/finance` | M3 | `finance.period.close` |
| Notifications & printing | `/admin/notifications` | M4 | `admin.config.manage` |
| Numbering & documents | `/admin/documents` | M0 | `admin.config.manage` |
| Devices & integrations | `/admin/devices` | M0 | `admin.device.manage` |
| NG sync & messages | `/admin/sync` | M0 | `admin.config.manage` |
| Prediction models | `/admin/models` | M6 | `admin.config.manage` |
| Field rules & calendars | `/admin/settings` | M0 | `admin.config.manage` |

## Detail screens

| Screen | Path |
|---|---|
| Unit card | `/units/:unitStayId` |
| Consignment | `/consignments/:consignmentId` |
| Truck visit | `/gate/visits/:truckVisitId` |
| Inspection (tablet) | `/inspections/:inspectionId` |
| Release order | `/releases/:releaseOrderId` |
| Exception case | `/exceptions/:exceptionCaseId` |
| New invoice or proforma | `/invoices/new` |
| Invoice | `/invoices/:invoiceId` |
| Customer statement | `/statements/:partyId` |
| Tariff | `/tariffs/:tariffId` |
| CFS job and tally | `/cfs/:handlingJobId` |
| Repair estimate | `/repairs/:repairEstimateId` |
| Customer or party | `/parties/:partyId` |

**55 menu screens and 13 detail screens.**
