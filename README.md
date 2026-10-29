# DCC NG ICD — Project Workspace

This monorepo houses the **DCC NG ICD** system:
- **Backend (`be/`)**: Modular Node.js + Express + Prisma MSSQL API server (runs on `http://localhost:4000`)
- **Frontend (`fe/`)**: React + Vite + TypeScript web application (runs on `http://localhost:5173`)
- **API Specs (`API/`)**: OpenAPI 3.1 contract specifications and documentation
- **UI Designs (`UI/`)**: Screen specifications and UI previews

---

## Quick Start (Concurrent Execution)

Run both the backend API and frontend dev server simultaneously with one command:

```bash
npm run dev
```

This starts:
- 🔵 **Backend (`[BACKEND]`)**: Express API at `http://localhost:4000` (Swagger UI at `http://localhost:4000/api/docs`)
- 🟢 **Frontend (`[FRONTEND]`)**: Vite Dev Server at `http://localhost:5173` (proxies `/api` requests to port 4000)

Press `Ctrl + C` in the terminal to stop both services concurrently.

---

## Available Scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `concurrently ...` | Starts both Backend and Frontend in watch/dev mode |
| `npm run dev:be` | `npm run dev --prefix be` | Starts only the Backend API server |
| `npm run dev:fe` | `npm run dev --prefix fe` | Starts only the Frontend Vite dev server |
| `npm run build` | `concurrently ...` | Builds both Backend and Frontend for production |
| `npm run build:be` | `npm run build --prefix be` | Builds only the Backend TypeScript project |
| `npm run build:fe` | `npm run build --prefix fe` | Builds only the Frontend React/Vite project |
| `npm run install:all` | `npm install ...` | Installs dependencies across root, `be`, and `fe` |

