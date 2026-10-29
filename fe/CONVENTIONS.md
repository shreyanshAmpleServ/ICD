# NG ICD UI — conventions for every screen

This is the design prototype of DCC NG ICD: a React + TypeScript (Vite) app with sample data.
NG ICD runs inland container depots (ICD), vehicle yards (ICDV), CFS, empty depots and warehouses in Tanzania.
It covers gate, yard, customs, release, billing and cashier work. Users include gate officers on tablets, yard staff on handhelds, documentation and clearance officers, billing and cashier staff, managers, admins, and external customers and agents through a portal (Phase 2).

## Read first
- `src/ds/components.tsx` lists every component. Use them; don't invent parallel ones.
  - Components: Button (with `perm`), Pill, StatusPill, HoldPill, Ms, UnitNo, Tracks, MiniTracks, PageHeader, Page, Panel, Banner, Empty, DataTable, Tabs, Chips, Segmented, Field, Input, Select, Textarea, Check, SearchInput, DL, Kpi, Meter, Conditions, Timeline, Stepper, Drawer, Modal, useToast, Money.
  - Helpers: fmtDT, fmtD, fmtT, ago, NOW.
- `src/ds/charts.tsx` provides BarChart, LineChart and Sparkline. Charts are single-axis with at most 3 series, and they already have a legend and hover.
- `src/ds/ds.css` holds the CSS classes. Use the existing layout classes before writing inline styles:
  - layout: page, panel, grid-2, grid-3, grid-4, grid-main-side, stack, stack-lg, row, row-wrap, spacer, toolbar, form-grid, kpi-strip
  - text: muted, faint, small, xs, strong, cond, num
  - other: dl, list-plain, photo, sig
- `src/ds/status.ts` maps status values to their labels and colour tones.
- Exemplar screens show the quality bar and patterns:
  - `src/screens/cargo/UnitCard.tsx`: detail page with tabs and a drawer form
  - `src/screens/cargo/Units.tsx`: list with toolbar and quick filters
  - `src/screens/gate/GateQueue.tsx`: board plus KPIs
  - `src/screens/gate/GateLane.tsx`: tablet flow with stepper and big targets
  - `src/screens/yard/YardMap.tsx`: SVG map and drawer
  - `src/screens/today/Home.tsx`: dashboard
- Sample data you can import, but **must not edit**:
  - `src/mock/core.ts`: parties, vessels, vesselCalls, consignments, blocks, allStays, stay(), staysAt(), unitsOf(), equipment, HERO
  - `src/mock/control.ts`: holdTypes, holds, customsRefs, CONDITIONS, evaluate(), releaseOrders, approvals, exceptions
  - `src/mock/gate.ts`: visits, CHECKPOINTS, VISIT_TYPES
  - `src/mock/gen.ts`: at(hoursAgo), day(daysFromToday), int, pick, rnd, money, containerNo, vin
- Session: `useSession()` from `src/app/session.tsx` gives site, can(perm, level), phase, offline and isExternal. Roles come from `src/app/roles.ts`, which is generated from the database seed.
- API contract types: `import type { S } from '@/api/types'`, e.g. `S<'Invoice'>`.
  - To see a schema's fields, read `/home/claude/ng_icd_api/gen_schemas.py`, which is compact and easier to scan than `src/api/contract.d.ts`.
  - The endpoint list with permission codes is `/home/claude/ng_icd_api/out/NG_ICD_API_catalogue.md`.
  - The database design notes are `/home/claude/ng_icd_db/out/*.md`. They cover domain rules such as free days, tariffs and VAT.

## Rules
1. **Ownership.** Edit only:
   - your own module folders under `src/screens/<module>/`, including that module's `index.tsx` route list
   - your own new mock files under `src/mock/` (named in your brief)

   Never edit `src/ds/*`, `src/app/*`, `src/main.tsx` or the existing mock files. If you need a shared component that is missing, build it locally in your module and say so in your final report.
2. **Routes.** Each module's `index.tsx` exports `routes: RouteDef[]`. The left menu paths are fixed in `src/app/nav.ts`; implement exactly those paths, plus any detail paths such as `/invoices/:invoiceId`.
3. **Data.**
   - Type sample data against the contract: `S<'X'>`. Where the UI needs extra fields, use `S<'X'> & { ... }`.
   - Read data through `useQ(key, () => delay(data))` from `@/api/query`.
   - Keep data deterministic: no `Math.random()`; use `rnd`, `pick` and `int` from gen.ts. Use `at()`, `day()` and `NOW` for times; never `Date.now()`.
   - If your entities should be findable from the top search box, call `registerSearch` from `@/mock/search` in your mock file.
4. **Permissions.**
   - Every action button gets `perm="<code>"`, using the codes in the catalogue or seed. Pass `level="REQ"` where the action becomes an approval request. Button handles locking and the request label itself.
   - Columns showing rates or prices to operational roles get `perm: 'billing.rates.view'`.
5. **Milestones.** Pass `ms="M1"` (etc.) to PageHeader. Phase 2 screens are M5 and M6.
6. **Writing.**
   - Use sentence case and plain words a depot worker uses. Don't use all-caps labels.
   - Buttons say exactly what happens ("Post invoice", not "Submit"), and the toast repeats the same verb ("Invoice posted").
   - Errors and empty states tell the person what to do next. Don't write filler copy or marketing tone.
   - Tanzania context: currencies USD and TZS, VAT 18%, TRA fiscal receipts (VFD), mobile money (M-Pesa, Tigo Pesa, Airtel Money), banks (CRDB, NMB). Places: Dar es Salaam port, transit to Zambia, DRC, Rwanda and Uganda.
   - All companies and people are fictional. Never use real customer or company names.
7. **Visual.**
   - No new colours: use the CSS variables only.
   - Signal colours carry meaning: go = clear, stop = blocked or held, customs = with customs, wait = waiting on someone. Hazard stripes (HoldPill / `.pill-hold`) are for holds only.
   - Show container numbers and VINs with `<UnitNo>`. Show plate numbers with `className="unitno unitno-sm"`.
   - Dense tables are fine for office roles. Gate and yard tablet or handheld screens use `size="xl"` buttons and `Input xl`.
   - Every screen must work at 1440 px and 390 px wide, in light and dark themes, with visible keyboard focus.
8. **Behaviour.** Make the main flows clickable with local state: open a drawer, fill the form, confirm, toast, and the status changes. It's a prototype, so nothing persists, but it must feel real and show the rules: maker-checker, approval above a limit, holds blocking, offline queue, and so on.
9. **Verify before you finish.**
   - Run `npx tsc -b` from `/home/claude/ng_icd_ui` and fix every error in your files.
   - Then run `npx vite build --outDir dist-<yourname>`, followed by `python3 shoot.py <scratch_dir> /your/route,... --dist dist-<yourname>`. Add `--w 390` for mobile and `--dark` for the dark theme.
   - Read the PNGs and fix layout problems such as overflow, overlap, clipped text and empty states.
   - Delete your `dist-<yourname>` folder at the end.
