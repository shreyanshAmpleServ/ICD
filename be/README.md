# DCC NG ICD — Backend Service (Node.js + Express + Prisma MSSQL)

A high-performance, modular backend API implementing the **DCC NG ICD** OpenAPI 3.1 contract.

---

## Architecture Overview

```
be/
├── prisma/
│   └── schema.prisma         # Complete MSSQL Schema (Sites, Masters, Units, Visits, Invoices, etc.)
├── src/
│   ├── config/
│   │   ├── env.ts            # Validated environment configuration
│   │   └── permissions.ts    # 59 official ICD permission codes & 19 roles
│   ├── db/
│   │   ├── prisma.ts         # PrismaClient manager for Microsoft SQL Server
│   │   ├── fallbackStore.ts  # In-memory seed store for instant development & offline testing
│   │   └── seed.ts           # Database seeder
│   ├── middleware/
│   │   ├── siteScope.ts      # Enforces mandatory X-Site-Id header (e.g., DAR1, DAR2)
│   │   ├── permission.ts     # Enforces x-permission RBAC grants (DO, REQ, APPR, VIEW)
│   │   ├── concurrency.ts    # Enforces Idempotency-Key and If-Match (optimistic locking)
│   │   └── errorHandler.ts   # RFC 7807 problem details error responses
│   ├── modules/              # One module per tag/milestone per the specification:
│   │   ├── session/          # /me (signed-in user, sites, effective permissions)
│   │   ├── setup/            # /sites, /companies, /number-sequences, /field-rules
│   │   ├── masters/          # /parties, /trucks, /drivers, /vessels, /ports
│   │   ├── yard/             # /yard/levels, /yard/locations, /yard/locations:generate
│   │   ├── gate/             # /gates, /checkpoints, /gate/visits
│   │   ├── units/            # /units, /unit-types, /identity:validate
│   │   ├── control/          # /holds, /releases, /approvals, /exceptions
│   │   ├── commercial/       # /tariffs, /charges, /invoices, /cashier/payments
│   │   └── insight/          # /dashboards/control-tower, /reports, /aiva/query
│   ├── docs/
│   │   └── swagger.ts        # Mounts ng_icd_api.yaml directly into Swagger UI at /api/docs
│   ├── routes.ts             # Dynamic API router aggregator
│   └── server.ts             # Express bootstrap & HTTP listener
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Database & ORM: Microsoft SQL Server (MSSQL) with Prisma

- **ORM**: [Prisma](https://www.prisma.io/) is configured with `provider = "sqlserver"`. It provides end-to-end type safety, auto-generated Prisma Client, migrations, and clean schema definitions.
- **Connection**: Configured via `DATABASE_URL` in `.env`:
  ```env
  DATABASE_URL="sqlserver://localhost:1433;database=ng_icd;user=sa;password=YourPassword;trustServerCertificate=true;encrypt=true"
  ```
- **Zero-Friction Fallback**: If MSSQL is not running or credentials are empty, the backend automatically operates with an in-memory repository pre-loaded with the official seed data (sites `DAR1` and `DAR2`, users, containers, gate visits, yard blocks, and invoices). Once you point to a live MSSQL instance, Prisma automatically connects.

### Prisma Commands
```bash
# Generate Prisma Client types
npm run prisma:generate

# Push schema directly to MSSQL database (without migration history)
npm run prisma:db-push

# Create and apply migrations
npm run prisma:migrate
```

---

## Getting Started

### 1. Install Dependencies
```bash
cd be
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and adjust the variables if needed:
```bash
cp .env.example .env
```

### 3. Run the Development Server
```bash
npm run dev
```

The server starts at `http://localhost:4000`:
- **API Base**: `http://localhost:4000/api`
- **Interactive Swagger Documentation**: `http://localhost:4000/api/docs`
- **Health Check**: `http://localhost:4000/api/health`

---

## Key Header Conventions (from API Specification)

| Header | Description | Example |
|---|---|---|
| `X-Site-Id` | Required on all site-scoped operations to enforce depot boundaries. | `DAR1` or `DAR2` |
| `X-Role-Code` | Used for role simulation or token claims to enforce `x-permission` RBAC. | `GATE_OFFICER`, `CASHIER`, `ALL_PERMISSIONS` |
| `Idempotency-Key` | Required on mutating operations to prevent duplicate executions. | `uuid-v4` |
| `If-Match` | Used for optimistic concurrency control (`logInst` version comparison). | `"1"` |
