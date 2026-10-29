# DCC NG ICD — Backend Service (Node.js + Express + Prisma MSSQL)

A high-performance, modular backend API implementing the **DCC NG ICD** OpenAPI 3.1 contract following the **DCC SFA enterprise architecture**.

---

## Architecture Overview

```
be/
├── prisma/                          # Database schema and ORM definition
│   └── schema.prisma                # Prisma data models (SQL Server)
├── src/                             # Core application source code
│   ├── index.ts                     # Main entry point (loads env, connects DB, bootstraps server)
│   ├── server.ts                    # HTTP server startup, port management & graceful shutdown
│   ├── app.ts                       # Express app configuration & global middleware setup
│   ├── configs/                     # Centralized environment, logger, Prisma & RBAC config
│   │   ├── env.ts
│   │   ├── permissions.ts
│   │   ├── prisma.ts
│   │   └── swagger.ts
│   ├── middlewares/                 # Cross-cutting Express middlewares
│   │   ├── errorHandler.ts          # RFC 7807 problem details error responses
│   │   ├── notFoundHandler.ts       # 404 handler
│   │   ├── siteScope.ts             # Enforces mandatory X-Site-Id header (e.g., DAR1, DAR2)
│   │   ├── permission.ts            # Enforces x-permission RBAC grants (DO, REQ, APPR, VIEW)
│   │   ├── concurrency.ts           # Enforces Idempotency-Key and If-Match (optimistic locking)
│   │   └── validate.ts              # Zod request validation middleware
│   ├── helpers/                     # Domain helpers (notifications, status transitions)
│   ├── jobs/                        # Scheduled cron background tasks
│   ├── routes/                      # Main route aggregator (/api)
│   ├── types/                       # TypeScript declaration files & shared interfaces
│   ├── utils/                       # Shared utility functions (pagination, errors, asyncHandler)
│   ├── scripts/                     # Standalone CLI scripts (seeds, admin creation, migrations)
│   ├── data/                        # In-memory mock datasets and fallback store
│   └── v1/                          # Version 1 API Domain Layer
│       ├── routes/                  # Endpoint route definitions per resource
│       │   ├── units.routes.ts
│       │   └── index.ts
│       ├── controllers/             # Request handlers (parsing inputs, coordinating response)
│       │   └── units.controller.ts
│       ├── validations/             # Request validation rules (Zod schemas)
│       │   ├── common.validation.ts
│       │   └── units.validation.ts
│       └── services/                # Business logic & data access (UnitsService, etc.)
│           └── units.service.ts
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
- **Zero-Friction Fallback**: If MSSQL is not running or credentials are empty, the backend automatically operates with an in-memory repository pre-loaded with official seed data (sites `DAR1` and `DAR2`, users, containers, gate visits, yard blocks, and invoices). Once you point to a live MSSQL instance, Prisma automatically connects.

---

## Getting Started

### 1. Install Dependencies
```bash
cd be
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Run the Development Server
```bash
npm run dev
```

The server starts at `http://localhost:4000`:
- **API Base**: `http://localhost:4000/api`
- **V1 API**: `http://localhost:4000/api/v1`
- **Interactive Swagger Documentation**: `http://localhost:4000/api/docs`
- **Health Check**: `http://localhost:4000/api/health`
