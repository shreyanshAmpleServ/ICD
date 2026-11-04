# NG ICD – DCC Logistics Suite
## Complete Application Architecture & End-to-End Workflow Documentation

This directory contains the authoritative, production-grade technical and business workflow documentation for the **NG ICD – DCC Logistics Suite** (Inland Container Depot / Dry Port & Container Freight Station Management System).

The documentation has been reverse-engineered and compiled through deep static analysis of the complete application source code:
- **Frontend (`fe/`)**: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Custom Design System (`@/ds`), Interceptor Architecture.
- **Backend (`be/`)**: Node.js, Express, TypeScript, Layered Architecture (Routes, Middlewares, Controllers, Services), Prisma ORM (Microsoft SQL Server), In-Memory Development Fallback Store.
- **Database (`be/prisma/schema.prisma`)**: 127 Relational Models, Optimistic Locking (`log_inst`), Foreign Key Constraints, Multi-site Scoping (`site_id`).
- **API Contracts (`API/`)**: OpenAPI 3.1 specification (`ng_icd_api.yaml`), 426 Endpoint Catalogue, RFC 7807 Problem Details.
- **UI Design Specifications (`UI/`)**: Screen Catalogue, Design System Patterns, Role-based Visibility.

---

## 📚 Documentation Index

| File | Title | Description |
|---|---|---|
| [`01-application-overview.md`](./01-application-overview.md) | **Application Overview** | Executive summary, business domain, core logistics vocabulary, personas, multi-facility capabilities. |
| [`02-complete-system-architecture.md`](./02-complete-system-architecture.md) | **Complete System Architecture** | Layered end-to-end architecture (Client → Interceptors → Express → Middlewares → Controllers → Services → Prisma → MSSQL), concurrency model, and site isolation. |
| [`03-frontend-workflow.md`](./03-frontend-workflow.md) | **Frontend Workflow & Architecture** | React component tree, feature modules, routing engine, hooks, state management, HTTP interceptor pipeline, and form/drawer lifecycle. |
| [`04-backend-workflow.md`](./04-backend-workflow.md) | **Backend Workflow & Architecture** | Express server lifecycle, route aggregation, middleware pipeline (SiteScope, RBAC, Idempotency, ETag/If-Match), error handling, and Prisma data access. |
| [`05-module-wise-workflows.md`](./05-module-wise-workflows.md) | **Module-Wise Workflows** | Exhaustive breakdown of all 16 business modules: frontend components, endpoints, controllers, services, database tables, validations, and rules. |
| [`06-complete-icd-business-process.md`](./06-complete-icd-business-process.md) | **Complete ICD Business Process** | Chronological end-to-end cargo lifecycle: Manifest Pre-Advise → Gate-In → Weighbridge → Yard Allocation → CFS/Reefer → Customs → Invoicing → Cashiering → Release → Gate-Out. |
| [`07-api-execution-flow.md`](./07-api-execution-flow.md) | **API Execution Flow** | Sequence flows for mission-critical operations, request payloads, header contracts, Prisma execution, response shapes, and route mapping analysis. |
| [`08-database-table-documentation.md`](./08-database-table-documentation.md) | **Database Table Documentation** | Data dictionary for all 127 Prisma models: field types, constraints, default expressions, indexes, and functional classifications. |
| [`09-database-relationship-erd.md`](./09-database-relationship-erd.md) | **Database Relationship ERDs** | Mermaid Entity-Relationship Diagrams across Operational Core, Gate & Yard, Financial, Customs & Control, and Master Data domains. |
| [`10-table-interaction-workflow.md`](./10-table-interaction-workflow.md) | **Table Interaction Workflow** | Step-by-step database mutations (Read/Insert/Update order), foreign key propagation, transaction scoping, and audit trailing for key operations. |
| [`11-module-dependencies.md`](./11-module-dependencies.md) | **Module Dependency Workflows** | Inter-module coupling, shared foreign keys (`unit_stay_id`, `truck_visit_id`), event propagations, and modular independence boundaries. |
| [`12-status-lifecycle.md`](./12-status-lifecycle.md) | **Status Lifecycles & State Machines** | Complete state machine documentation for 15 status fields across Units, Visits, Moves, Inspections, Invoices, Shifts, Holds, and Releases with Mermaid diagrams. |
| [`13-authentication-and-permissions.md`](./13-authentication-and-permissions.md) | **Authentication & Permissions** | Two-step authentication, JWT session persistence, RBAC matrix (70+ permission codes, 4 grant levels: DO, APPR, REQ, VIEW), and site context scoping. |
| [`14-exception-and-error-workflows.md`](./14-exception-and-error-workflows.md) | **Exception & Error Workflows** | Error handling architecture, RFC 7807 Problem Details, optimistic lock violations (`412 Precondition Failed`), idempotency retries, and failure recoveries. |
| [`15-application-gaps-and-recommendations.md`](./15-application-gaps-and-recommendations.md) | **Application Gaps & Recommendations** | Critical audit of codebase gaps, mock data fallbacks, missing Prisma transactions, dual-routing anomalies, unlinked endpoints, and remediation roadmap. |

---

## 📊 Visual Diagrams (`docs/diagrams/`)

Standalone Mermaid diagrams ready for viewing or rendering:
1. [`application-architecture.mmd`](./diagrams/application-architecture.mmd) — Full Stack Layered Architecture.
2. [`complete-icd-workflow.mmd`](./diagrams/complete-icd-workflow.mmd) — End-to-End Operational Lifecycle of a Container.
3. [`frontend-backend-flow.mmd`](./diagrams/frontend-backend-flow.mmd) — Request/Response Interceptor & Middleware Pipeline.
4. [`database-erd.mmd`](./diagrams/database-erd.mmd) — Core Entity-Relationship Diagram.
5. [`module-dependencies.mmd`](./diagrams/module-dependencies.mmd) — Inter-Module Dependency Network.
6. [`status-lifecycle.mmd`](./diagrams/status-lifecycle.mmd) — Multi-Entity State Transition Flows.
7. [`exception-workflows.mmd`](./diagrams/exception-workflows.mmd) — Exception Escalation and Concurrency Handling.

---

## 🛠️ Quick System Reference

- **Backend Entrypoint**: `be/src/server.ts` → `be/src/app.ts`
- **Backend Port**: `http://localhost:4000` (API prefix: `/api`)
- **Frontend Entrypoint**: `fe/src/main.tsx` → `fe/src/app/App.tsx`
- **Frontend Dev Server**: `http://localhost:5173` (Vite dev proxy `/api` → port 4000)
- **Database Engine**: Microsoft SQL Server (MSSQL) using Prisma (`be/prisma/schema.prisma`)
- **Default Site Context**: `DAR1` (Dar es Salaam Main Yard)
- **Default Superuser / Dev Role**: `ALL_PERMISSIONS` (Full grant across all subsystems)

