# Document 09: Database Relationship ERDs

This document provides comprehensive Mermaid Entity-Relationship Diagrams (ERDs) illustrating the primary keys, foreign keys, cardinalities, and relational dependencies across the **NG ICD – DCC Logistics Suite**.

---

## 1. Core Operational & Cargo ERD

```mermaid
erDiagram
    cargo_unit ||--o{ unit_stay : "has stays"
    m_unit_type ||--o{ cargo_unit : "defines size/type"
    m_site ||--o{ unit_stay : "locates at"
    consignment ||--o{ unit_stay : "covers"
    vessel_call ||--o{ consignment : "transports"
    m_vessel ||--o{ vessel_call : "operates"
    manifest ||--o{ manifest_line : "contains"
    manifest_line ||--o{ unit_stay : "pre-advises"
    m_cargo_regime ||--o{ unit_stay : "governs"
    m_yard_location ||--o{ unit_stay : "currently stacks"
    m_party ||--o{ consignment : "consignee / line"

    cargo_unit {
        BigInt cargo_unit_id PK
        VarChar unit_category
        VarChar unit_no
        Int unit_type_id FK
        Int owner_party_id FK
    }

    unit_stay {
        BigInt unit_stay_id PK
        BigInt cargo_unit_id FK
        Int site_id FK
        BigInt consignment_id FK
        Int cargo_regime_id FK
        VarChar flow
        Char full_empty
        VarChar physical_status
        VarChar customs_status
        VarChar billing_status
        VarChar release_status
        SmallInt active_hold_count
        Int current_location_id FK
    }

    consignment {
        BigInt consignment_id PK
        BigInt vessel_call_id FK
        Int bill_to_party_id FK
        VarChar ref_no
        VarChar status
    }
```

---

## 2. Gate & Transport Movements ERD

```mermaid
erDiagram
    m_site ||--o{ truck_visit : "admits"
    m_truck ||--o{ truck_visit : "prime mover"
    m_driver ||--o{ truck_visit : "drives"
    m_party ||--o{ truck_visit : "transporter"
    m_visit_type ||--o{ truck_visit : "classifies"
    truck_visit ||--o{ visit_unit_txn : "manifests"
    unit_stay ||--o{ visit_unit_txn : "carried on"
    truck_visit ||--o{ visit_checkpoint_event : "logs timestamps"
    truck_visit ||--o{ weighing : "weighed on"
    unit_stay ||--o{ weighing : "weighed on"

    truck_visit {
        BigInt truck_visit_id PK
        Int site_id FK
        VarChar visit_no
        Int visit_type_id FK
        Int truck_id FK
        Int driver_id FK
        Int transporter_party_id FK
        VarChar status
        TinyInt current_seq_no
        DateTime arrived_at
        DateTime admitted_at
        DateTime exited_at
    }

    visit_unit_txn {
        BigInt visit_unit_txn_id PK
        BigInt truck_visit_id FK
        BigInt unit_stay_id FK
        VarChar direction
        VarChar status
    }

    weighing {
        BigInt weighing_id PK
        VarChar ticket_no
        VarChar weigh_kind
        BigInt truck_visit_id FK
        BigInt unit_stay_id FK
        Decimal gross_kg
        Decimal tare_kg
        Boolean within_tolerance
    }
```

---

## 3. Yard Management & Equipment Execution ERD

```mermaid
erDiagram
    m_site ||--o{ m_yard_location : "contains slots"
    unit_stay ||--o{ move_order : "targeted by"
    m_yard_location ||--o{ move_order : "from / to slots"
    m_equipment ||--o{ move_order : "assigned to"
    move_order ||--o{ yard_move : "completed by"
    unit_stay ||--o{ yard_move : "history of"
    m_yard_location ||--o{ yard_move : "actual slots"

    move_order {
        BigInt move_order_id PK
        Int site_id FK
        BigInt unit_stay_id FK
        VarChar move_kind
        Int from_location_id FK
        Int to_location_id FK
        VarChar status
        Int assigned_equipment_id FK
        VarChar assigned_operator_sub
        TinyInt priority
    }

    yard_move {
        BigInt yard_move_id PK
        BigInt move_order_id FK
        BigInt unit_stay_id FK
        Int from_location_id FK
        Int to_location_id FK
        Int equipment_id FK
        VarChar operator_sub
        DateTime occurred_at
    }

    m_yard_location {
        Int yard_location_id PK
        Int site_id FK
        VarChar location_code
        VarChar full_code
        VarChar location_kind
        Boolean is_slot
        Boolean is_blocked
    }
```

---

## 4. Customs, Holds & Release Pillars ERD

```mermaid
erDiagram
    unit_stay ||--o{ customs_ref : "declared under"
    m_customs_ref_type ||--o{ customs_ref : "categorizes"
    unit_stay ||--o{ exam : "physically inspected"
    m_yard_location ||--o{ exam : "conducted at"
    unit_stay ||--o{ hold : "blocked by"
    m_hold_type ||--o{ hold : "grounds"
    unit_stay ||--o{ release_order_unit : "authorized for exit"
    release_order ||--o{ release_order_unit : "lists"
    release_order ||--o{ release_check : "verifies 5 pillars"

    hold {
        BigInt hold_id PK
        BigInt unit_stay_id FK
        Int hold_type_id FK
        VarChar status
        NVarChar reason
        DateTime placed_at
        DateTime lifted_at
    }

    exam {
        BigInt exam_id PK
        BigInt unit_stay_id FK
        VarChar status
        VarChar result
        VarChar seal_removed
        VarChar seal_applied
    }

    release_order {
        BigInt release_order_id PK
        Int site_id FK
        VarChar release_no
        VarChar status
        DateTime valid_to
        VarChar qr_token
    }
```

---

## 5. Commercial, Invoicing & Cashier Desk ERD

```mermaid
erDiagram
    unit_stay ||--o{ billable_event : "triggers"
    m_charge_code ||--o{ billable_event : "rates"
    billable_event ||--o{ charge : "monetizes"
    m_party ||--o{ invoice : "billed to"
    invoice ||--o{ invoice_line : "details"
    charge ||--o{ invoice_line : "consolidated into"
    cashier_shift ||--o{ payment : "received in"
    m_party ||--o{ payment : "paid by"
    payment ||--o{ payment_allocation : "settles"
    invoice ||--o{ payment_allocation : "applied against"

    billable_event {
        BigInt billable_event_id PK
        Int site_id FK
        Int charge_code_id FK
        VarChar dedupe_key
        BigInt unit_stay_id FK
        Decimal quantity
        VarChar status
    }

    invoice {
        BigInt invoice_id PK
        Int site_id FK
        VarChar invoice_no
        Int bill_to_party_id FK
        Decimal total
        Decimal amount_paid
        VarChar status
    }

    payment {
        BigInt payment_id PK
        VarChar receipt_no
        Int party_id FK
        Int payment_channel_id FK
        Decimal amount
        VarChar status
        BigInt cashier_shift_id FK
    }

    cashier_shift {
        BigInt cashier_shift_id PK
        Int site_id FK
        VarChar cashier_sub
        DateTime opened_at
        DateTime closed_at
        Decimal expected_cash
        Decimal counted_cash
        VarChar status
    }
```

