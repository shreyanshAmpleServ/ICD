# DCC NG ICD — API endpoint catalogue

*Confidential — internal design document.* Generated from the same definition as `ng_icd_api.yaml`, so the two always match.

## Summary

| Milestone | Endpoints |
|---|---|
| M0 Foundations | 117 |
| M1 Inbound operations | 71 |
| M2 Control | 61 |
| M3 Commercial | 70 |
| M4 Insight & pilot | 35 |
| M5 Depth (Phase 2) | 64 |
| M6 Intelligence (Phase 2) | 8 |
| **Total** | **426** |

Plus 20 outbound events and 229 schemas.

Legend: 🔑 `Idempotency-Key` required · ⟳ `If-Match` (logInst) required · 🌐 not site-scoped (no `X-Site-Id`).

## M0 — Foundations

### Session

Signed-in user, sites and effective permissions.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/me` | Get the signed-in user | — | 🌐 |

### Setup

Company, sites, calendars, numbering, field rules.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/companies` | List companies | `masters.view` | 🌐 |
| POST | `/companies` | Create a company | `admin.site.manage` | 🌐 |
| GET | `/companies/{companyId}` | Get a company | `masters.view` | 🌐 |
| PATCH | `/companies/{companyId}` | Update a company | `admin.site.manage` | ⟳🌐 |
| GET | `/sites` | List sites | `masters.view` | 🌐 |
| POST | `/sites` | Create a site | `admin.site.manage` | 🌐 |
| GET | `/sites/{siteId}` | Get a site | `masters.view` | 🌐 |
| PATCH | `/sites/{siteId}` | Update a site | `admin.site.manage` | ⟳🌐 |
| GET | `/calendars` | List calendars | `masters.view` | 🌐 |
| POST | `/calendars` | Create a calendar | `admin.config.manage` | 🌐 |
| GET | `/calendars/{calendarId}` | Get a calendar | `masters.view` | 🌐 |
| PATCH | `/calendars/{calendarId}` | Update a calendar | `admin.config.manage` | ⟳🌐 |
| GET | `/calendars/{calendarId}/holidays` | List holidays in a calendar | `masters.view` | 🌐 |
| POST | `/calendars/{calendarId}/holidays` | Add a holiday | `admin.config.manage` | 🌐 |
| DELETE | `/calendars/{calendarId}/holidays/{calendarHolidayId}` | Remove a holiday | `admin.config.manage` | 🌐 |
| GET | `/number-sequences` | List number sequences | `admin.config.manage` | 🌐 |
| POST | `/number-sequences` | Create a number sequence | `admin.config.manage` | 🌐 |
| GET | `/number-sequences/{numberSequenceId}` | Get a number sequence | `admin.config.manage` | 🌐 |
| PATCH | `/number-sequences/{numberSequenceId}` | Update a number sequence | `admin.config.manage` | ⟳🌐 |
| GET | `/field-rules` | List field rules (mandatory, hidden, read-only per screen) | `masters.view` |  |
| PUT | `/field-rules/{screenCode}` | Replace the field rules for a screen | `admin.config.manage` |  |

### Yard design

Yard levels, locations, bulk generation, map geometry, tags.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/yard/levels` | List yard levels | `yard.map.view` |  |
| POST | `/yard/levels` | Create a yard level | `admin.yard.design` |  |
| GET | `/yard/levels/{yardLevelId}` | Get a yard level | `yard.map.view` |  |
| PATCH | `/yard/levels/{yardLevelId}` | Update a yard level | `admin.yard.design` | ⟳ |
| GET | `/yard/locations` | List yard locations | `yard.map.view` |  |
| POST | `/yard/locations` | Create a yard location | `admin.yard.design` |  |
| GET | `/yard/locations/{yardLocationId}` | Get a yard location | `yard.map.view` |  |
| PATCH | `/yard/locations/{yardLocationId}` | Update a yard location | `admin.yard.design` | ⟳ |
| GET | `/yard/locations/{yardLocationId}/children` | List child locations | `yard.map.view` |  |
| POST | `/yard/locations:generate` | Generate rows, bays and tiers in bulk | `admin.yard.design` |  |
| POST | `/yard/locations/{yardLocationId}:block` | Block a location | `admin.yard.design` |  |
| POST | `/yard/locations/{yardLocationId}:unblock` | Unblock a location | `admin.yard.design` |  |
| GET | `/yard/tags` | List location tags | `yard.map.view` |  |
| POST | `/yard/tags` | Create a location tag | `admin.yard.design` |  |
| GET | `/yard/tags/{locationTagId}` | Get a location tag | `yard.map.view` |  |
| PATCH | `/yard/tags/{locationTagId}` | Update a location tag | `admin.yard.design` | ⟳ |

### Gate setup

Gates, lanes, checkpoints, visit types.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/gates` | List gates | `masters.view` |  |
| POST | `/gates` | Create a gate | `admin.gate.configure` |  |
| GET | `/gates/{gateId}` | Get a gate | `masters.view` |  |
| PATCH | `/gates/{gateId}` | Update a gate | `admin.gate.configure` | ⟳ |
| GET | `/checkpoints` | List checkpoints | `masters.view` |  |
| POST | `/checkpoints` | Create a checkpoint | `admin.gate.configure` |  |
| GET | `/checkpoints/{checkpointId}` | Get a checkpoint | `masters.view` |  |
| PATCH | `/checkpoints/{checkpointId}` | Update a checkpoint | `admin.gate.configure` | ⟳ |
| GET | `/visit-types` | List visit types | `masters.view` |  |
| POST | `/visit-types` | Create a visit type | `admin.gate.configure` |  |
| GET | `/visit-types/{visitTypeId}` | Get a visit type | `masters.view` |  |
| PATCH | `/visit-types/{visitTypeId}` | Update a visit type | `admin.gate.configure` | ⟳ |

### Unit setup

Unit types, identity rules, cargo regimes.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/unit-types` | List unit types | `masters.view` | 🌐 |
| POST | `/unit-types` | Create a unit type | `admin.config.manage` | 🌐 |
| GET | `/unit-types/{unitTypeId}` | Get a unit type | `masters.view` | 🌐 |
| PATCH | `/unit-types/{unitTypeId}` | Update a unit type | `admin.config.manage` | ⟳🌐 |
| GET | `/identity-rules` | List identity rules | `masters.view` | 🌐 |
| POST | `/identity:validate` | Validate a container number, VIN or lot reference | `masters.view` |  |
| GET | `/cargo-regimes` | List cargo regimes | `masters.view` | 🌐 |

### Masters

Parties, trucks, drivers, vessels, ports, commodities, equipment. NG-sourced masters are read-only here except local fields.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/parties` | List parties | `masters.view` | 🌐 |
| POST | `/parties` | Create a party | `masters.local.edit` | 🌐 |
| GET | `/parties/{partyId}` | Get a party | `masters.view` | 🌐 |
| PATCH | `/parties/{partyId}` | Update a party | `masters.local.edit` | ⟳🌐 |
| POST | `/parties:provisional` | Create a provisional party (pending NG) | `masters.local.edit` | 🌐 |
| POST | `/parties/{partyId}:match` | Match a provisional party to its NG record | `masters.local.edit` | 🌐 |
| GET | `/parties/{partyId}/contacts` | List party contacts | `masters.view` | 🌐 |
| PUT | `/parties/{partyId}/contacts` | Replace party contacts | `masters.local.edit` | ⟳🌐 |
| GET | `/trucks` | List trucks | `masters.view` | 🌐 |
| POST | `/trucks` | Create a truck | `masters.local.edit` | 🌐 |
| GET | `/trucks/{truckId}` | Get a truck | `masters.view` | 🌐 |
| PATCH | `/trucks/{truckId}` | Update a truck | `masters.local.edit` | ⟳🌐 |
| GET | `/drivers` | List drivers | `masters.view` | 🌐 |
| POST | `/drivers` | Create a driver | `masters.local.edit` | 🌐 |
| GET | `/drivers/{driverId}` | Get a driver | `masters.view` | 🌐 |
| PATCH | `/drivers/{driverId}` | Update a driver | `masters.local.edit` | ⟳🌐 |
| GET | `/vessels` | List vessels | `masters.view` | 🌐 |
| POST | `/vessels` | Create a vessel | `masters.local.edit` | 🌐 |
| GET | `/vessels/{vesselId}` | Get a vessel | `masters.view` | 🌐 |
| PATCH | `/vessels/{vesselId}` | Update a vessel | `masters.local.edit` | ⟳🌐 |
| GET | `/ports` | List ports | `masters.view` | 🌐 |
| POST | `/ports` | Create a port | `admin.config.manage` | 🌐 |
| GET | `/ports/{portId}` | Get a port | `masters.view` | 🌐 |
| PATCH | `/ports/{portId}` | Update a port | `admin.config.manage` | ⟳🌐 |
| GET | `/commodities` | List commodities | `masters.view` | 🌐 |
| POST | `/commodities` | Create a commodity | `admin.config.manage` | 🌐 |
| GET | `/commodities/{commodityId}` | Get a commodity | `masters.view` | 🌐 |
| PATCH | `/commodities/{commodityId}` | Update a commodity | `admin.config.manage` | ⟳🌐 |
| GET | `/equipment` | List equipment items | `masters.view` |  |
| POST | `/equipment` | Create a equipment item | `admin.config.manage` |  |
| GET | `/equipment/{equipmentId}` | Get a equipment item | `masters.view` |  |
| PATCH | `/equipment/{equipmentId}` | Update a equipment item | `admin.config.manage` | ⟳ |

### Access

Users, roles, permissions, devices.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/users` | List users | `admin.users.manage` | 🌐 |
| GET | `/users/{userId}` | Get a user | `admin.users.manage` | 🌐 |
| PATCH | `/users/{userId}` | Update a user | `admin.users.manage` | ⟳🌐 |
| POST | `/users` | Create a user (link an NG identity) | `admin.users.manage` | 🌐 |
| POST | `/users/{userId}/roles` | Grant a role at a site | `admin.roles.manage` | 🌐 |
| DELETE | `/users/{userId}/roles/{userRoleId}` | Revoke a role | `admin.roles.manage` | 🌐 |
| GET | `/roles` | List roles | `admin.roles.manage` | 🌐 |
| POST | `/roles` | Create a role | `admin.roles.manage` | 🌐 |
| GET | `/roles/{roleId}` | Get a role | `admin.roles.manage` | 🌐 |
| PATCH | `/roles/{roleId}` | Update a role | `admin.roles.manage` | ⟳🌐 |
| PUT | `/roles/{roleId}/permissions` | Replace a role's permissions | `admin.roles.manage` | ⟳🌐 |
| GET | `/permissions` | List permissions | `admin.roles.manage` | 🌐 |
| GET | `/devices` | List registered devices | `admin.device.manage` |  |
| POST | `/devices` | Register a device (gate tablet, handheld, gate agent) | `admin.device.manage` |  |
| POST | `/devices/{deviceId}:revoke` | Revoke a device | `admin.device.manage` |  |

### Documents

Document types, uploads and downloads for any entity.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/document-types` | List document types | `masters.view` | 🌐 |
| POST | `/document-types` | Create a document type | `admin.config.manage` | 🌐 |
| GET | `/document-types/{documentTypeId}` | Get a document type | `masters.view` | 🌐 |
| PATCH | `/document-types/{documentTypeId}` | Update a document type | `admin.config.manage` | ⟳🌐 |
| POST | `/documents` | Upload a document | — |  |
| GET | `/documents` | List documents for an entity | — |  |
| GET | `/documents/{documentId}` | Get document metadata | — |  |
| GET | `/documents/{documentId}/content` | Download the file | — |  |
| DELETE | `/documents/{documentId}` | Void a document | — |  |

### Audit

Field-level audit trail.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/audit-log` | Search the audit trail | `admin.audit.view` |  |
| GET | `/audit-log/{entityName}/{entityId}` | Audit history of one record | — |  |

### Sync

Master data sync from NG and outbox status.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/sync/status` | Master sync and outbox status | `admin.config.manage` | 🌐 |
| POST | `/sync/{masterCode}:run` | Run a master sync now | `admin.config.manage` | 🌐 |

## M1 — Inbound operations

### Vessel calls

Vessel calls with discharge dates (storage clock start).

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/vessel-calls` | List vessel calls | `consignment.view` | 🌐 |
| POST | `/vessel-calls` | Create a vessel call | `consignment.edit` | 🌐 |
| GET | `/vessel-calls/{vesselCallId}` | Get a vessel call | `consignment.view` | 🌐 |
| PATCH | `/vessel-calls/{vesselCallId}` | Update a vessel call | `consignment.edit` | ⟳🌐 |

### Manifests

Manifest import, line review and apply.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| POST | `/manifests` | Upload a manifest file | `manifest.import` |  |
| GET | `/manifests` | List manifests | `manifest.import` |  |
| GET | `/manifests/{manifestId}` | Get a manifest | `manifest.import` |  |
| GET | `/manifests/{manifestId}/lines` | List manifest lines with validation results | `manifest.import` |  |
| PATCH | `/manifests/{manifestId}/lines/{manifestLineId}` | Correct a manifest line | `manifest.import` | ⟳ |
| POST | `/manifests/{manifestId}:apply` | Apply manifest (create consignments and expected units) | `manifest.import` | 🔑 |
| POST | `/manifests/{manifestId}:cancel` | Cancel an unapplied manifest | `manifest.import` |  |

### Consignments

Bills of lading / bookings and their lines.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/consignments` | List consignments | `consignment.view` |  |
| POST | `/consignments` | Create a consignment | `consignment.edit` |  |
| GET | `/consignments/{consignmentId}` | Get a consignment | `consignment.view` |  |
| PATCH | `/consignments/{consignmentId}` | Update a consignment | `consignment.edit` | ⟳ |
| GET | `/consignments/{consignmentId}/lines` | List consignment lines | `consignment.view` |  |
| PUT | `/consignments/{consignmentId}/lines` | Replace consignment lines | `consignment.edit` | ⟳ |
| GET | `/consignments/{consignmentId}/units` | List units of a consignment | `consignment.view` |  |

### Units

Cargo units, stays, the one-search and the timeline.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/search` | One search across units, consignments, visits, invoices and parties | `consignment.view` |  |
| GET | `/units` | Search units at the site | `consignment.view` |  |
| POST | `/units` | Create an expected unit manually | `consignment.edit` |  |
| GET | `/units/{unitStayId}` | Get a unit stay (the unit card) | `consignment.view` |  |
| PATCH | `/units/{unitStayId}` | Update a unit stay | `consignment.edit` | ⟳ |
| GET | `/units/{unitStayId}/timeline` | Unit timeline | `consignment.view` |  |
| GET | `/cargo-units/{cargoUnitId}/stays` | History of stays for a physical unit | `consignment.view` | 🌐 |

### Gate

Truck visits, checkpoints and the gate queue. Works offline via the PWA queue.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| POST | `/truck-visits` | Announce a truck visit | `gate.visit.checkin` | 🔑 |
| GET | `/truck-visits` | Gate queue and visit search | `gate.visit.checkin` |  |
| GET | `/truck-visits/{truckVisitId}` | Get a truck visit | `gate.visit.checkin` |  |
| GET | `/gate-passes/{passToken}` | Find a visit by its gate pass QR | `gate.visit.checkin` |  |
| POST | `/truck-visits/{truckVisitId}/checkpoint-events` | Pass a checkpoint | `gate.visit.checkin` | 🔑 |
| GET | `/truck-visits/{truckVisitId}/checkpoint-events` | List checkpoint events | `gate.visit.checkin` |  |
| POST | `/truck-visits/{truckVisitId}/units` | Add a unit to a visit | `gate.visit.checkin` |  |
| DELETE | `/truck-visits/{truckVisitId}/units/{visitUnitId}` | Remove a planned unit | `gate.visit.checkin` |  |
| POST | `/truck-visits/{truckVisitId}/units/{visitUnitId}:complete` | Complete drop-off or pick-up of a unit | `gate.visit.checkin` | 🔑 |
| POST | `/truck-visits/{truckVisitId}:cancel` | Cancel a visit | `gate.visit.checkin` |  |
| POST | `/truck-visits/{truckVisitId}/gate-pass:print` | Print the gate pass | `gate.pass.print` |  |

### Inspections

Templates, damage codes, inspections and findings.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/inspection-templates` | List inspection templates | `inspection.perform` | 🌐 |
| POST | `/inspection-templates` | Create a inspection template | `admin.config.manage` | 🌐 |
| GET | `/inspection-templates/{inspectionTemplateId}` | Get a inspection template | `inspection.perform` | 🌐 |
| PATCH | `/inspection-templates/{inspectionTemplateId}` | Update a inspection template | `admin.config.manage` | ⟳🌐 |
| GET | `/damage-codes` | List damage codes | `inspection.perform` | 🌐 |
| POST | `/damage-codes` | Create a damage code | `admin.config.manage` | 🌐 |
| GET | `/damage-codes/{damageCodeId}` | Get a damage code | `inspection.perform` | 🌐 |
| PATCH | `/damage-codes/{damageCodeId}` | Update a damage code | `admin.config.manage` | ⟳🌐 |
| POST | `/inspections` | Start an inspection | `inspection.perform` | 🔑 |
| GET | `/inspections` | List inspections | `inspection.perform` |  |
| GET | `/inspections/{inspectionId}` | Get an inspection | `inspection.perform` |  |
| PUT | `/inspections/{inspectionId}/results` | Save checklist results | `inspection.perform` | ⟳ |
| POST | `/inspections/{inspectionId}/findings` | Add a damage finding | `inspection.perform` |  |
| DELETE | `/inspections/{inspectionId}/findings/{inspectionFindingId}` | Remove a finding | `inspection.perform` |  |
| POST | `/inspections/{inspectionId}:complete` | Complete an inspection (sign) | `inspection.perform` | 🔑 |
| POST | `/inspections/{inspectionId}:approve` | Approve major damage | `inspection.damage.approve` |  |

### Yard

Yard map, occupancy, allocation, move orders, moves.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/yard/map` | Yard map for a level or block | `yard.map.view` |  |
| GET | `/yard/blocks/{blockId}/slots` | Slots of a block with units | `yard.map.view` |  |
| GET | `/yard/occupancy` | Occupancy summary | `yard.map.view` |  |
| POST | `/yard/suggestions` | Suggest slots for a unit | `yard.allocate` |  |
| POST | `/move-orders` | Create a move order | `yard.allocate` |  |
| GET | `/move-orders` | Move order list (driver/handheld view) | `yard.move.execute` |  |
| GET | `/move-orders/{moveOrderId}` | Get a move order | `yard.move.execute` |  |
| POST | `/move-orders/{moveOrderId}:assign` | Assign equipment and operator | `yard.allocate` |  |
| POST | `/move-orders/{moveOrderId}:start` | Start a move | `yard.move.execute` | 🔑 |
| POST | `/move-orders/{moveOrderId}:complete` | Complete a move | `yard.move.execute` | 🔑 |
| POST | `/move-orders/{moveOrderId}:cancel` | Cancel a move order | `yard.allocate` |  |
| GET | `/yard-moves` | Move history | `yard.map.view` |  |

### Weighbridge

Weighing tickets and tolerance checks.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| POST | `/weighings` | Record a weighing ticket | `weighbridge.ticket` | 🔑 |
| GET | `/weighings` | List weighings | `weighbridge.ticket` |  |
| GET | `/weighings/{weighingId}` | Get a weighing | `weighbridge.ticket` |  |

### Keys

Vehicle key custody (ICDV).

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/keys` | List key custody records | `yard.key.custody` |  |
| POST | `/keys` | Register keys received | `yard.key.custody` |  |
| POST | `/keys/{keyCustodyId}/movements` | Record a key movement | `yard.key.custody` | 🔑 |
| GET | `/keys/{keyCustodyId}/movements` | Key movement history | `yard.key.custody` |  |

## M2 — Control

### Customs

Customs references and examinations.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/customs/ref-types` | Customs reference types for the country pack | `consignment.view` | 🌐 |
| POST | `/customs/refs` | Record a customs reference | `customs.ref.edit` |  |
| GET | `/customs/refs` | List customs references | `consignment.view` |  |
| GET | `/customs/refs/{customsRefId}` | Get a customs reference | `consignment.view` |  |
| PATCH | `/customs/refs/{customsRefId}` | Update a customs reference | `customs.ref.edit` | ⟳ |
| POST | `/customs/refs/{customsRefId}:cancel` | Cancel a customs reference | `customs.ref.edit` |  |
| POST | `/exams` | Schedule an examination | `customs.exam.record` |  |
| GET | `/exams` | List examinations | `consignment.view` |  |
| POST | `/exams/{examId}:complete` | Record the examination result | `customs.exam.record` |  |

### Holds

Holds as overlays on stays; place and lift with reasons.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/hold-types` | List hold types | `consignment.view` | 🌐 |
| POST | `/hold-types` | Create a hold type | `admin.config.manage` | 🌐 |
| GET | `/hold-types/{holdTypeId}` | Get a hold type | `consignment.view` | 🌐 |
| PATCH | `/hold-types/{holdTypeId}` | Update a hold type | `admin.config.manage` | ⟳🌐 |
| POST | `/holds` | Place holds on one or more stays | `customs.hold.place` |  |
| GET | `/holds` | List holds | `consignment.view` |  |
| GET | `/holds/{holdId}` | Get a hold | `consignment.view` |  |
| POST | `/holds/{holdId}:lift` | Lift a hold | `customs.hold.lift` |  |

### Release

Release orders and the eight-condition release engine.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/release-conditions` | The release conditions | `consignment.view` | 🌐 |
| GET | `/release-rules` | List release rules | `consignment.view` |  |
| POST | `/release-rules` | Create a release rule | `admin.config.manage` |  |
| GET | `/release-rules/{releaseRuleId}` | Get a release rule | `consignment.view` |  |
| PATCH | `/release-rules/{releaseRuleId}` | Update a release rule | `admin.config.manage` | ⟳ |
| POST | `/release-orders` | Request a release order | `release.issue` | 🔑 |
| GET | `/release-orders` | List release orders | `consignment.view` |  |
| GET | `/release-orders/{releaseOrderId}` | Get a release order | `consignment.view` |  |
| GET | `/release-qr/{qrToken}` | Find a release order by its QR | `gate.visit.checkout` |  |
| POST | `/release-orders/{releaseOrderId}:evaluate` | Evaluate release conditions | `consignment.view` |  |
| POST | `/release-orders/{releaseOrderId}:approve` | Approve and issue the release order | `release.issue` | 🔑 |
| POST | `/release-orders/{releaseOrderId}:cancel` | Cancel a release order | `release.issue` |  |
| POST | `/release-orders/{releaseOrderId}:revalidate` | Extend validity after further payment | `release.issue` |  |
| POST | `/release-orders/{releaseOrderId}/units:change` | Add or remove units | `release.issue` |  |
| POST | `/gate-out-checks` | Check whether units may leave | `gate.visit.checkout` |  |
| GET | `/units/{unitStayId}/gate-out-explanation` | Explain why a unit can or cannot leave | `consignment.view` |  |

### Approvals

Maker-checker approvals, policies and delegations.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/approvals` | Approval inbox | — |  |
| GET | `/approvals/{approvalRequestId}` | Get an approval request | — |  |
| POST | `/approvals/{approvalRequestId}:decide` | Approve or reject | — | 🔑 |
| POST | `/approvals/{approvalRequestId}:cancel` | Withdraw a request | — |  |
| GET | `/approval-policies` | List approval policies | `admin.config.manage` | 🌐 |
| POST | `/approval-policies` | Create a approval policy | `admin.config.manage` | 🌐 |
| GET | `/approval-policies/{approvalPolicyId}` | Get a approval policy | `admin.config.manage` | 🌐 |
| PATCH | `/approval-policies/{approvalPolicyId}` | Update a approval policy | `admin.config.manage` | ⟳🌐 |
| GET | `/delegations` | List delegations | — |  |
| POST | `/delegations` | Create a delegation (cover during leave) | — |  |
| POST | `/delegations/{delegationId}:revoke` | Revoke a delegation | — |  |

### Exceptions

Exception cases with assignment, comments and resolution.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/exception-types` | List exception types | `exception.view` | 🌐 |
| POST | `/exception-types` | Create a exception type | `admin.config.manage` | 🌐 |
| GET | `/exception-types/{exceptionTypeId}` | Get a exception type | `exception.view` | 🌐 |
| PATCH | `/exception-types/{exceptionTypeId}` | Update a exception type | `admin.config.manage` | ⟳🌐 |
| GET | `/resolution-codes` | List resolution codes | `exception.view` | 🌐 |
| POST | `/resolution-codes` | Create a resolution code | `admin.config.manage` | 🌐 |
| GET | `/resolution-codes/{resolutionCodeId}` | Get a resolution code | `exception.view` | 🌐 |
| PATCH | `/resolution-codes/{resolutionCodeId}` | Update a resolution code | `admin.config.manage` | ⟳🌐 |
| POST | `/exceptions` | Open an exception case | `exception.manage` |  |
| GET | `/exceptions` | List exception cases | `exception.view` |  |
| GET | `/exceptions/{exceptionCaseId}` | Get an exception case | `exception.view` |  |
| POST | `/exceptions/{exceptionCaseId}:assign` | Assign a case | `exception.manage` |  |
| GET | `/exceptions/{exceptionCaseId}/comments` | List comments | `exception.view` |  |
| POST | `/exceptions/{exceptionCaseId}/comments` | Add a comment | `exception.view` |  |
| POST | `/exceptions/{exceptionCaseId}:resolve` | Resolve a case | `exception.manage` |  |
| POST | `/exceptions/{exceptionCaseId}:close` | Close a resolved case | `exception.manage` |  |
| POST | `/exceptions/{exceptionCaseId}:reopen` | Reopen a case | `exception.manage` |  |

## M3 — Commercial

### Finance setup

Periods, GL mapping, exchange rates, tax codes, charge codes, payment channels.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/accounting-periods` | List accounting periods | `finance.period.close` | 🌐 |
| POST | `/accounting-periods/{accountingPeriodId}:close` | Close a period | `finance.period.close` | 🌐 |
| POST | `/accounting-periods/{accountingPeriodId}:reopen` | Reopen a period | `finance.period.close` | 🌐 |
| GET | `/gl-settings` | GL account mapping | `finance.period.close` | 🌐 |
| PUT | `/gl-settings` | Replace GL account mapping | `finance.period.close` | 🌐 |
| GET | `/exchange-rates` | List exchange rates | `billing.rates.view` | 🌐 |
| GET | `/exchange-rates/effective` | Rate in force on a date | `billing.rates.view` | 🌐 |
| POST | `/exchange-rates` | Enter an exchange rate (daily or monthly) | `finance.exchange_rate.edit` | 🌐 |
| PATCH | `/exchange-rates/{exchangeRateId}` | Correct an unused exchange rate | `finance.exchange_rate.edit` | ⟳🌐 |
| GET | `/tax-codes` | List tax codes | `billing.rates.view` | 🌐 |
| POST | `/tax-codes` | Create a tax code | `admin.config.manage` | 🌐 |
| GET | `/tax-codes/{taxCodeId}` | Get a tax code | `billing.rates.view` | 🌐 |
| PATCH | `/tax-codes/{taxCodeId}` | Update a tax code | `admin.config.manage` | ⟳🌐 |
| GET | `/charge-codes` | List charge codes | `billing.rates.view` | 🌐 |
| POST | `/charge-codes` | Create a charge code | `billing.tariff.change` | 🌐 |
| GET | `/charge-codes/{chargeCodeId}` | Get a charge code | `billing.rates.view` | 🌐 |
| PATCH | `/charge-codes/{chargeCodeId}` | Update a charge code | `billing.tariff.change` | ⟳🌐 |
| GET | `/payment-channels` | List payment channels | `billing.rates.view` |  |
| POST | `/payment-channels` | Create a payment channel | `admin.config.manage` |  |
| GET | `/payment-channels/{paymentChannelId}` | Get a payment channel | `billing.rates.view` |  |
| PATCH | `/payment-channels/{paymentChannelId}` | Update a payment channel | `admin.config.manage` | ⟳ |

### Tariffs

Tariffs with versioned rules and slabs; rating preview.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/tariffs` | List tariffs | `billing.rates.view` |  |
| POST | `/tariffs` | Create a tariff | `billing.tariff.change` |  |
| GET | `/tariffs/{tariffId}` | Get a tariff | `billing.rates.view` |  |
| PATCH | `/tariffs/{tariffId}` | Update a tariff | `billing.tariff.change` | ⟳ |
| GET | `/tariffs/{tariffId}/rules` | List tariff rules | `billing.rates.view` |  |
| PUT | `/tariffs/{tariffId}/rules` | Replace tariff rules (draft only) | `billing.tariff.change` | ⟳ |
| POST | `/tariffs/{tariffId}:submit` | Submit a draft tariff for approval | `billing.tariff.change` |  |
| POST | `/tariffs/{tariffId}:new-version` | Create a new draft version | `billing.tariff.change` |  |
| POST | `/rating/preview` | Preview charges for a unit or consignment up to a date | `billing.rates.view` |  |

### Charges

Billable events, charges and waivers.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/billable-events` | List billable events | `billing.invoice.view` |  |
| POST | `/billable-events:manual` | Add a manual charge | `billing.invoice.create` |  |
| GET | `/charges` | Uninvoiced and invoiced charges | `billing.invoice.view` |  |
| POST | `/charges/{chargeId}:waive` | Request a waiver or discount | `billing.waiver` |  |
| POST | `/free-day-extensions` | Extend free days for a stay or consignment | `billing.freeday.extend` |  |

### Invoicing

Proformas, invoices, credit and debit notes, fiscal receipts.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| POST | `/proformas` | Create a proforma | `billing.invoice.create` |  |
| POST | `/invoices` | Create a draft invoice | `billing.invoice.create` |  |
| POST | `/invoices:from-proforma` | Convert a proforma to an invoice | `billing.invoice.create` |  |
| GET | `/invoices` | List invoices, proformas and notes | `billing.invoice.view` |  |
| GET | `/invoices/{invoiceId}` | Get an invoice | `billing.invoice.view` |  |
| PATCH | `/invoices/{invoiceId}` | Edit a draft | `billing.invoice.create` | ⟳ |
| POST | `/invoices/{invoiceId}:post` | Post an invoice | `billing.invoice.post` | 🔑 |
| POST | `/invoices/{invoiceId}:cancel` | Cancel a draft or proforma | `billing.invoice.create` |  |
| GET | `/invoices/{invoiceId}/pdf` | Invoice PDF | `billing.invoice.view` |  |
| POST | `/credit-notes` | Issue a credit note | `billing.creditnote` | 🔑 |
| POST | `/debit-notes` | Issue a debit note | `billing.invoice.post` | 🔑 |
| GET | `/fiscal-receipts` | Fiscal receipt (VFD) log | `billing.invoice.view` |  |
| POST | `/fiscal-receipts/{fiscalReceiptId}:retry` | Retry a failed fiscal receipt | `billing.invoice.post` |  |

### Cashier

Cashier shifts, payments, allocations, refunds.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| POST | `/cashier-shifts` | Open a cashier shift | `payment.record` |  |
| GET | `/cashier-shifts` | List shifts | `payment.record` |  |
| GET | `/cashier-shifts/current` | My open shift | `payment.record` |  |
| POST | `/cashier-shifts/{cashierShiftId}:close` | Close a shift with counted totals | `payment.record` |  |
| POST | `/cashier-shifts/{cashierShiftId}:approve` | Approve a shift cash-up | `payment.cashup.approve` |  |
| POST | `/payments` | Record a payment | `payment.record` | 🔑 |
| GET | `/payments` | List payments | `payment.record` |  |
| GET | `/payments/{paymentId}` | Get a payment | `payment.record` |  |
| POST | `/payments/{paymentId}:allocate` | Allocate a payment to invoices | `payment.record` | 🔑 |
| POST | `/payments/{paymentId}:reverse` | Reverse a payment | `payment.refund` |  |
| GET | `/payments/{paymentId}/receipt` | Payment receipt PDF | `payment.record` |  |
| POST | `/refunds` | Request a refund | `payment.refund` |  |
| GET | `/refunds` | List refunds | `payment.refund` |  |
| POST | `/refunds/{refundId}:mark-paid` | Mark a refund paid | `payment.refund` |  |

### Disbursements

Charges paid on behalf of the customer (port, shipping line, customs).

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| POST | `/disbursements` | Record a disbursement | `finance.disbursement.record` |  |
| GET | `/disbursements` | List disbursements | `finance.disbursement.record` |  |
| GET | `/disbursements/{disbursementId}` | Get a disbursement | `finance.disbursement.record` |  |
| POST | `/disbursements/{disbursementId}:write-off` | Write off an unrecovered disbursement | `finance.disbursement.record` |  |

### Accounting

GL postings to NG and customer statements.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/gl-postings` | GL postings to NG | `finance.period.close` |  |
| POST | `/gl-postings/{glPostingId}:retry` | Retry a failed posting | `finance.period.close` |  |
| GET | `/statements/{partyId}` | Customer statement with ageing | `billing.invoice.view` |  |
| GET | `/statements/{partyId}/pdf` | Customer statement PDF | `billing.invoice.view` |  |

## M4 — Insight & pilot

### Dashboards

Control tower, role dashboards and KPIs.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/dashboards/control-tower` | Control tower snapshot | `dashboard.control_tower` |  |
| GET | `/dashboards/{dashboardCode}` | Role dashboard (gate, yard, cashier, executive...) | — |  |
| GET | `/kpis` | KPI series for trend charts | `dashboard.executive` |  |

### Reports

Report catalogue, runs, exports and saved reports.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/reports` | Report catalogue (filtered by permission) | — | 🌐 |
| POST | `/reports/{reportCode}/runs` | Run or export a report | — |  |
| GET | `/report-runs/{reportRunId}` | Get a report run | — |  |
| GET | `/report-runs/{reportRunId}/file` | Download the exported file | — |  |
| GET | `/saved-reports` | List saved reports | — |  |
| POST | `/saved-reports` | Create a saved report | — |  |
| GET | `/saved-reports/{savedReportId}` | Get a saved report | — |  |
| PATCH | `/saved-reports/{savedReportId}` | Update a saved report | — | ⟳ |
| DELETE | `/saved-reports/{savedReportId}` | Delete a saved report | — |  |

### Notifications

In-app inbox, templates and routing rules.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/notifications/inbox` | My in-app notifications | — | 🌐 |
| POST | `/notifications/{notificationId}:read` | Mark one read | — | 🌐 |
| POST | `/notifications:read-all` | Mark all read | — | 🌐 |
| GET | `/notification-templates` | List notification templates | `admin.config.manage` | 🌐 |
| POST | `/notification-templates` | Create a notification template | `admin.config.manage` | 🌐 |
| GET | `/notification-templates/{notificationTemplateId}` | Get a notification template | `admin.config.manage` | 🌐 |
| PATCH | `/notification-templates/{notificationTemplateId}` | Update a notification template | `admin.config.manage` | ⟳🌐 |
| GET | `/notification-rules` | List notification rules | `admin.config.manage` | 🌐 |
| POST | `/notification-rules` | Create a notification rule | `admin.config.manage` | 🌐 |
| GET | `/notification-rules/{notificationRuleId}` | Get a notification rule | `admin.config.manage` | 🌐 |
| PATCH | `/notification-rules/{notificationRuleId}` | Update a notification rule | `admin.config.manage` | ⟳🌐 |

### Printing

Print templates and logged printing with reprint watermark.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/print-templates` | List print templates | `admin.config.manage` | 🌐 |
| POST | `/print-templates` | Create a print template | `admin.config.manage` | 🌐 |
| GET | `/print-templates/{printTemplateId}` | Get a print template | `admin.config.manage` | 🌐 |
| PATCH | `/print-templates/{printTemplateId}` | Update a print template | `admin.config.manage` | ⟳🌐 |
| POST | `/print` | Print a document (logged) | — |  |

### Aiva

Aiva assistant on Claude: conversations (SSE), tools, feedback.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/aiva/conversations` | My conversations | `aiva.use` |  |
| POST | `/aiva/conversations` | Start a conversation | `aiva.use` |  |
| GET | `/aiva/conversations/{aivaConversationId}/messages` | Conversation messages | `aiva.use` |  |
| POST | `/aiva/conversations/{aivaConversationId}/messages` | Ask Aiva (streamed answer) | `aiva.use` |  |
| POST | `/aiva/messages/{aivaMessageId}/feedback` | Rate an answer | `aiva.use` |  |
| GET | `/aiva/messages/{aivaMessageId}/tool-calls` | Tool calls behind an answer | `aiva.use` |  |
| GET | `/aiva/tools` | Tools available to the signed-in user | `aiva.use` |  |

## M5 — Depth (Phase 2)

### Appointments

Truck appointment slots and bookings.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/appointment-slot-rules` | List appointment slot rules | `appointment.manage` |  |
| POST | `/appointment-slot-rules` | Create a appointment slot rule | `appointment.manage` |  |
| GET | `/appointment-slot-rules/{appointmentSlotRuleId}` | Get a appointment slot rule | `appointment.manage` |  |
| PATCH | `/appointment-slot-rules/{appointmentSlotRuleId}` | Update a appointment slot rule | `appointment.manage` | ⟳ |
| GET | `/appointments/availability` | Free capacity per slot | `appointment.book` |  |
| POST | `/appointments` | Book an appointment | `appointment.book` | 🔑 |
| GET | `/appointments` | List appointments | `appointment.book` |  |
| GET | `/appointments/{appointmentId}` | Get an appointment | `appointment.book` |  |
| POST | `/appointments/{appointmentId}:cancel` | Cancel an appointment | `appointment.book` |  |
| POST | `/appointments/{appointmentId}:reschedule` | Move to another slot | `appointment.book` |  |

### CFS

Stuffing, de-stuffing, tally and lot balances.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/labour-contractors` | List labour contractors | `cfs.job.manage` | 🌐 |
| POST | `/labour-contractors` | Create a labour contractor | `cfs.job.manage` | 🌐 |
| GET | `/labour-contractors/{labourContractorId}` | Get a labour contractor | `cfs.job.manage` | 🌐 |
| PATCH | `/labour-contractors/{labourContractorId}` | Update a labour contractor | `cfs.job.manage` | ⟳🌐 |
| POST | `/handling-jobs` | Plan a handling job | `cfs.job.manage` |  |
| GET | `/handling-jobs` | List handling jobs | `cfs.job.manage` |  |
| GET | `/handling-jobs/{handlingJobId}` | Get a handling job | `cfs.job.manage` |  |
| PATCH | `/handling-jobs/{handlingJobId}` | Update a planned job | `cfs.job.manage` | ⟳ |
| PUT | `/handling-jobs/{handlingJobId}/lines` | Save tally lines | `cfs.job.manage` | ⟳ |
| POST | `/handling-jobs/{handlingJobId}:start` | Start a job | `cfs.job.manage` |  |
| POST | `/handling-jobs/{handlingJobId}:complete` | Complete a job (sign tally) | `cfs.job.manage` | 🔑 |
| POST | `/handling-jobs/{handlingJobId}:approve` | Approve a completed job | `cfs.job.approve` |  |
| GET | `/lots/{unitStayId}/balance` | Lot balance and deliveries | `consignment.view` |  |

### Portal

Customer and agent portal: invitations and service requests.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| POST | `/portal/invitations` | Invite a customer or agent user | `portal.invite` | 🌐 |
| GET | `/portal/invitations` | List invitations | `portal.invite` | 🌐 |
| POST | `/portal/invitations/{invitationId}:revoke` | Revoke an invitation | `portal.invite` | 🌐 |
| POST | `/portal/invitations:accept` | Accept an invitation | — | 🌐 |
| POST | `/service-requests` | Submit a service request | `portal.request.submit` |  |
| GET | `/service-requests` | List service requests | `portal.request.submit` |  |
| GET | `/service-requests/{serviceRequestId}` | Get a service request | `portal.request.submit` |  |
| POST | `/service-requests/{serviceRequestId}:respond` | Respond to a service request | `portal.request.handle` |  |

### Reefer

Reefer plug sessions and temperature readings.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| POST | `/reefer-sessions` | Plug in a reefer | `reefer.manage` | 🔑 |
| GET | `/reefer-sessions` | Reefer monitor list | `reefer.manage` |  |
| GET | `/reefer-sessions/{reeferSessionId}` | Get a reefer session | `reefer.manage` |  |
| POST | `/reefer-sessions/{reeferSessionId}:unplug` | Unplug a reefer | `reefer.manage` | 🔑 |
| POST | `/reefer-sessions/{reeferSessionId}/readings` | Record a temperature reading | `reefer.manage` | 🔑 |
| GET | `/reefer-sessions/{reeferSessionId}/readings` | Temperature log | `reefer.manage` |  |

### Dangerous goods

IMO classes, segregation rules and DG lines.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/imo-classes` | IMO hazard classes | `masters.view` | 🌐 |
| GET | `/segregation-rules` | Segregation rules | `masters.view` | 🌐 |
| PUT | `/segregation-rules` | Replace segregation rules (load from IMDG Code) | `admin.config.manage` | 🌐 |
| GET | `/units/{unitStayId}/dg-lines` | DG lines of a unit | `consignment.view` |  |
| PUT | `/units/{unitStayId}/dg-lines` | Replace DG lines of a unit | `dg.manage` | ⟳ |

### M&R

Repair codes and repair estimates for empty depots.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/repair-codes` | List repair codes | `repair.estimate` | 🌐 |
| POST | `/repair-codes` | Create a repair code | `admin.config.manage` | 🌐 |
| GET | `/repair-codes/{repairCodeId}` | Get a repair code | `repair.estimate` | 🌐 |
| PATCH | `/repair-codes/{repairCodeId}` | Update a repair code | `admin.config.manage` | ⟳🌐 |
| POST | `/repair-estimates` | Create a repair estimate (from inspection findings) | `repair.estimate` |  |
| GET | `/repair-estimates` | List repair estimates | `repair.estimate` |  |
| GET | `/repair-estimates/{repairEstimateId}` | Get a repair estimate | `repair.estimate` |  |
| PATCH | `/repair-estimates/{repairEstimateId}` | Edit a draft estimate | `repair.estimate` | ⟳ |
| POST | `/repair-estimates/{repairEstimateId}:send` | Send to the line | `repair.estimate` |  |
| POST | `/repair-estimates/{repairEstimateId}:decision` | Record the line's decision | `repair.estimate` |  |
| POST | `/repair-estimates/{repairEstimateId}:complete` | Mark repairs done | `repair.estimate` |  |

### Devices

ANPR, OCR, weighbridge, RFID, barrier and reefer IoT integrations.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/device-integrations` | List device integrations | `device.configure` |  |
| POST | `/device-integrations` | Create a device integration | `device.configure` |  |
| GET | `/device-integrations/{deviceIntegrationId}` | Get a device integration | `device.configure` |  |
| PATCH | `/device-integrations/{deviceIntegrationId}` | Update a device integration | `device.configure` | ⟳ |
| POST | `/device-reads:ingest` | Ingest device reads (gate agent) | — | 🔑 |
| GET | `/device-reads` | List device reads | `device.configure` |  |
| POST | `/device-reads/{deviceReadId}:match` | Match a read to a visit manually | `gate.visit.checkin` |  |

### EDI

Inbound and outbound integration messages.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/integration-messages` | Integration message log | `integration.monitor` | 🌐 |
| GET | `/integration-messages/{integrationMessageId}` | Get a message | `integration.monitor` | 🌐 |
| POST | `/integration-messages/{integrationMessageId}:retry` | Retry a failed message | `integration.monitor` | 🌐 |
| POST | `/edi/inbound/{partnerCode}` | Receive an inbound message (CODECO, COARRI, BAPLIE, customs...) | — | 🔑🌐 |

## M6 — Intelligence (Phase 2)

### Aiva

Aiva assistant on Claude: conversations (SSE), tools, feedback.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/aiva/drafts` | My Aiva drafts | `aiva.use` |  |
| POST | `/aiva/drafts/{aivaDraftActionId}:submit` | Submit an Aiva draft | `aiva.use` | 🔑 |
| POST | `/aiva/drafts/{aivaDraftActionId}:discard` | Discard an Aiva draft | `aiva.use` |  |

### Intelligence

Model versions, dwell predictions, occupancy forecasts, suggestion log.

| Method | Path | Summary | Permission | |
|---|---|---|---|---|
| GET | `/models` | Model versions | `admin.config.manage` | 🌐 |
| POST | `/models/{mlModelVersionId}:activate` | Activate a model version | `admin.config.manage` | 🌐 |
| GET | `/predictions/dwell` | Dwell predictions | `yard.map.view` |  |
| GET | `/forecasts/occupancy` | Occupancy forecast | `yard.map.view` |  |
| GET | `/yard/suggestion-log` | Allocation suggestions versus choices | `yard.allocate` |  |

## Outbound events

Delivered from the outbox to NG (`POST /icd-events`), the socket rooms and notification rules. Envelope: `EventEnvelope`.

`UnitExpected`, `TruckArrived`, `UnitGatedIn`, `UnitInspected`, `UnitMoved`, `UnitWeighed`, `HoldPlaced`, `HoldLifted`, `CustomsStatusChanged`, `ReleaseRequested`, `ReleaseApproved`, `ReleaseExpired`, `GateOutBlocked`, `UnitGatedOut`, `InvoicePosted`, `CreditNoteIssued`, `PaymentReceived`, `FreeTimeExpiring`, `ExceptionOpened`, `ExceptionEscalated`

## NG-side endpoints (`ng_icd_ng_side.yaml`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/icd-sync/parties` | Changed parties since a point (updatedSince + afterRefId) |
| GET | `/icd-sync/trucks` | Changed trucks |
| GET | `/icd-sync/drivers` | Changed drivers |
| POST | `/icd-events` | Receive ICD events (202, dedupe on eventId) |
| POST | `/billing/icd-journals` | Post a balanced journal; idempotent on sourceRef; returns ngDocumentNo |
| GET | `/billing/icd-journals/{sourceRef}` | Journal status |

## Permission codes used

59 distinct codes, all present in the database seed.
