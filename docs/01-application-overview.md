# Document 01: Application Overview

## 1. Executive Summary & Purpose

The **NG ICD – DCC Logistics Suite** is an enterprise-grade digital operating platform designed to manage the end-to-end lifecycle of cargo, containers, vehicles, trucks, and financial transactions at Inland Container Depots (ICD), Dry Ports, Container Freight Stations (CFS), and Empty Container Depots.

Originating from real-world terminal operating specifications (modeled around Tanzanian / East African port corridors, specifically Dar es Salaam `DAR1`, `DAR2`, and Kibaha `KBH1`), the application digitizes physical gate movements, container yard stacking and moves, customs holds and physical examinations, stuffing/de-stuffing operations, reefer temperature monitoring, tariff rating, customer billing, cashiering, and cargo release management.

---

## 2. Core Domain Vocabulary & Key Concepts

The system is built upon strict international logistics conventions combined with specialized ICD multi-facility mechanics:

| Term | Domain Concept & Code Implementation | Source Model / Reference |
|---|---|---|
| **Cargo Unit (`cargo_unit`)** | Physical equipment asset independent of its trip (Container, Vehicle, Breakbulk item). Identified uniquely by `unit_category` + `unit_no` (e.g., ISO container `MSKU 882014 9` or Vehicle Chassis VIN). | `be/prisma/schema.prisma` (`model cargo_unit`) |
| **Unit Stay (`unit_stay`)** | A single continuous stay/visit of a Cargo Unit at a specific terminal site (`site_id`). Tracks flow (`IMPORT`, `EXPORT`, `TRANSSHIPMENT`), physical location (`current_location_id`), statuses (`physical_status`, `customs_status`, `billing_status`, `release_status`), and dates (`gated_in_at`, `departed_at`). | `be/prisma/schema.prisma` (`model unit_stay`) |
| **Truck Visit (`truck_visit`)** | An external truck and driver entering the terminal gates to drop off or pick up one or more Cargo Units. Sequenced through gate checkpoints (`current_seq_no`). | `be/prisma/schema.prisma` (`model truck_visit`) |
| **Consignment (`consignment`)** | A commercial shipping document (Bill of Lading or Delivery Order) representing ownership, shipping line, importer/exporter, clearing agent, and cargo details. | `be/prisma/schema.prisma` (`model consignment`) |
| **Yard Move Order (`move_order`)** | A work instruction issued to yard equipment (Reach Stacker, Empty Handler, Terminal Tractor) to move a container from location A to location B. | `be/prisma/schema.prisma` (`model move_order`) |
| **Yard Move (`yard_move`)** | The immutable transactional record created upon execution and completion of a `move_order`, detailing timestamp, actual operator, and equipment used. | `be/prisma/schema.prisma` (`model yard_move`) |
| **Weighing Ticket (`weighing`)** | Dual weighbridge gross/tare measurement to calculate net cargo weight and compare against declared weight / SOLAS VGM tolerance. | `be/prisma/schema.prisma` (`model weighing`) |
| **Handling Job (`handling_job`)** | Container Freight Station (CFS) stuffing, stripping (de-stuffing), re-packing, or cross-docking operation managed by labour gangs. | `be/prisma/schema.prisma` (`model handling_job`) |
| **Reefer Session (`reefer_session`)** | Cold-chain monitoring record tracking electrical plug-in, monitoring intervals, setpoint temperature, supply/return air temperatures, and unplugging. | `be/prisma/schema.prisma` (`model reefer_session`) |
| **Billable Event (`billable_event`)** | Normalized operational charge trigger (e.g., Lift-on/Lift-off, Storage Days, Reefer Electricity, Gate Fee) awaiting tariff rating. | `be/prisma/schema.prisma` (`model billable_event`) |
| **Charge (`charge`)** | A rated monetary line item generated from a `billable_event` via tariff rules, tax code calculation, and slab structures. | `be/prisma/schema.prisma` (`model charge`) |
| **Invoice (`invoice`)** | Formal commercial tax document grouping rated charges for a clearing agent or importer, subject to posting and fiscal receipting. | `be/prisma/schema.prisma` (`model invoice`) |
| **Cashier Shift (`cashier_shift`)** | Terminal cash desk session opened with a float, collecting cash, bank transfers, or mobile money payments against invoices. | `be/prisma/schema.prisma` (`model cashier_shift`) |
| **Payment (`payment`)** | Financial receipt recorded at the cashier desk, allocated directly to settle open invoices. | `be/prisma/schema.prisma` (`model payment`) |
| **Release Order (`release_order`)** | Terminal clearance permit authorizing a clearing agent and transporter to pick up cargo upon satisfying the 5 Release Pillars (Customs, Commercial, Holds, Line, Identity). | `be/prisma/schema.prisma` (`model release_order`) |

---

## 3. Supported Facility Types & Multi-Site Model

The system implements strict multi-tenancy at the site level via the `site_id` foreign key and HTTP header `X-Site-Id`:

1. **Inland Container Depot (ICD)**: Full container handling, storage, customs examination, rail/road transfer.
2. **Container Freight Station (CFS)**: LCL (Less-than-Container-Load) de-stuffing, cargo sorting, palletization, and lot delivery.
3. **Empty Container Depot**: Empty container storage, surveying, cleaning, M&R (Maintenance and Repair), and shipping line repositioning.
4. **Vehicle Processing Yard**: Ro-Ro car terminal operations, vehicle inspection, key cabinet custody (`key_custody`), odometer logging, and driver delivery.

### Configured Operational Sites in Codebase (`be/src/data/admin.ts`, `fe/src/app/session.ts`):
- `DAR1` (`site_id: 1`): Dar es Salaam Main Terminal (ICD, CFS, Empty Depot)
- `DAR2` (`site_id: 2`): Dar es Salaam CFS & Logistics Hub
- `KBH1` (`site_id: 3`): Kibaha Dry Port & Transit Staging Terminal

---

## 4. Personas, User Roles & Operational Actors

The application enforces Role-Based Access Control (RBAC) across 70+ discrete permission codes defined in `be/src/configs/permissions.ts` and `fe/src/app/roles.ts`. The operational actors include:

| Role Code | Role Name | Primary Responsibility & Operational Surface |
|---|---|---|
| `ICD_ADMIN` | Terminal General Manager / SysAdmin | Complete site configuration, tariff creation, user management, and global overrides. |
| `GATE_CLERK` | Gate In / Gate Out Operator | Managing truck queue, scanning plates/containers, validating booking/manifest, admitting trucks (`/gate`). |
| `YARD_PLANNER` | Yard Operations Controller | Slot allocation, move order sequencing, equipment assignment, and stack housekeeping (`/yard`, `/moves`). |
| `EQUIPMENT_OPERATOR`| Crane / Reach Stacker Operator | Mobile tablet user executing dispatched move orders and updating container physical positions. |
| `WEIGHBRIDGE_OP` | Weighbridge Inspector | Capturing inbound gross weight and outbound tare weight; handling tolerance variances (`/weighbridge`). |
| `CUSTOMS_OFFICER` | Revenue Authority / Customs Inspector | Placing regulatory holds, scheduling physical examinations, verifying seals, and clearing customs status (`/customs`, `/holds`). |
| `SURVEYOR` | Container & Vehicle Surveyor | Conducting EDI/EIR damage surveys, annotating diagrams, logging severity, and estimating repair costs (`/inspections`, `/repairs`). |
| `CFS_SUPERVISOR` | Freight Station Supervisor | Planning and completing container de-stuffing jobs, tracking cargo lot balances, and supervising labour gangs (`/cfs`). |
| `REEFER_TECH` | Cold-Chain Technician | Monitoring reefer temperatures, logging hourly readings, identifying power trips, and handling pre-trip inspections (`/reefers`). |
| `BILLING_CLERK` | Commercial Billing Specialist | Reviewing accrued charges, waiving fees with approval, generating proformas and commercial invoices (`/charges`, `/invoices`). |
| `CASHIER` | Cash Desk Operator | Opening shifts, recording cash/bank payments, issuing fiscal receipts, and reconciling counted float (`/cashier`). |
| `CLEARING_AGENT` | External Importer / Broker | Booking truck appointments, tracking container dwell time, downloading tax invoices, and submitting release orders (`/portal`). |

---

## 5. Technology Stack Verification

Based on direct inspection of `be/package.json` and `fe/package.json`:

### Backend Technology Stack
- **Runtime**: Node.js (v18+) with TypeScript (`tsx` dev runner, `tsc` build)
- **Framework**: Express 4.19
- **Database ORM**: Prisma 5.16 (`@prisma/client`)
- **Target RDBMS**: Microsoft SQL Server (MSSQL) with T-SQL dialect
- **Validation**: Zod 3.23 (schema-driven request validation)
- **Security & RBAC**: JWT, CORS, Header-based site and role propagation (`X-Site-Id`, `X-Role-Code`, `Idempotency-Key`, `If-Match`)
- **Documentation**: OpenAPI 3.1 (`swagger-ui-express`, `yamljs`)
- **HTTP Problem Standard**: RFC 7807 (`application/problem+json`)

### Frontend Technology Stack
- **Framework**: React 18.2 with TypeScript
- **Bundler & Tooling**: Vite 5.2, PostCSS, Autoprefixer
- **Routing**: React Router DOM 6.23 (Central route registry in `fe/src/routes/routes.tsx`)
- **Server State & Caching**: TanStack Query (React Query) 5.35
- **Icons**: Lucide React
- **Design System**: DCC Custom Design System (`fe/src/ds`: `Button`, `Input`, `Field`, `Select`, `Table`, `Drawer`, `Modal`, `Banner`, `Badge`)
- **Styling**: Tailwind CSS + Custom CSS Modules for specialized logistics screens (e.g., `money.css`, Yard Map Canvas)

