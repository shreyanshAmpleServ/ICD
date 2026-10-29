# DCC NG ICD — API contract (both phases, M0–M6)

*Confidential: internal design document.*

| File | What it is |
|---|---|
| `ng_icd_api.yaml` | OpenAPI 3.1 contract of the NG ICD backend: 426 operations, 295 paths, 229 schemas and 20 outbound events (as `webhooks`). |
| `ng_icd_ng_side.yaml` | OpenAPI 3.1 contract the **NG team** implements: master sync for parties, trucks and drivers, the event receiver, and journal posting. |
| `NG_ICD_API_catalogue.md` | Endpoint list by milestone and module, with the permission code and flags for each endpoint. |
| `NG_ICD_API_reference.html` | Browsable reference (Redoc). Open it in a browser; it works offline. |
| `ng_icd_api.d.ts` | TypeScript types generated from the contract, for the React app and NestJS DTOs. |
| `generator/gen.py`, `generator/gen_schemas.py` | The single source. Edit these, run `python3 gen.py` (needs `pyyaml`), and every file above is regenerated. |

## How to use it
- **Backend (NestJS):** one module per tag. Controllers follow the paths and Zod or DTO schemas follow `components/schemas`. Enforce `x-permission` with a guard that reads the `X-Site-Id` header.
- **Frontend (React):** generate a typed client with `openapi-typescript` and `openapi-fetch`, or use `ng_icd_api.d.ts` directly with TanStack Query. A mock server (`npx @stoplight/prism-cli mock ng_icd_api.yaml`) lets the UI start before the backend exists.
- **Contract tests:** run Schemathesis or Dredd against the backend in CI so the code can't drift from the contract.

## Checks done
- Both specs pass `openapi-spec-validator` and Redocly's recommended lint with no errors or warnings.
- Every `$ref` resolves, there are no unused schemas, and all operationIds are unique.
- Every permission code is checked against the database seed (all 59 codes exist).
- The generated TypeScript types compile with `tsc --strict`.

## Not done
- No running server yet, so behaviour is design-only until the build step.
