# DCC NG ICD — UI design (React prototype, M0–M6)

*Confidential: internal design document.*

This is the full UI of NG ICD as a working React + TypeScript app on sample data. It covers 55 menu screens and 13 detail screens across both phases: the office, the gate tablet, the yard handheld and the customer portal. `SCREENS.md` lists every screen with its milestone and permission.

## Open it
- **No install:** open `NG_ICD_UI_preview.html` in Chrome or Edge. It is one file and works offline.
- **For developers:** run `npm install`, then `npm run dev` (Vite) or `npm run build`. Use Node 20 or later.

## Demo settings (the avatar menu, top right)
- **Role:** "All permissions" for design review, or any of the 19 roles from the database seed. Menus, buttons and price columns follow that role's grants.
  - A button the role can't use shows a lock.
  - A role with only request rights (REQ) gets a button that sends an approval request.
  - Portal roles (clearing agent, customer) see only the portal.
- **Phase:** Phase 1 (M0–M4) hides the Phase 2 screens and tabs. "Phase 1 + 2" shows everything. Each page header carries its milestone tag.
- **Also there:**
  - Light or dark theme.
  - English or Swahili. Swahili covers only the menu and top bar, as a first draft for a native speaker to review.
  - Offline mode, which shows the gate's queued-events banner.
- **Site switcher:** DAR1 is the container yard. DAR2 is the vehicle yard, with the vehicle keys screen.

## Flows worth clicking through
1. **Can this unit leave?** Open Units, then BMLU 402117 3. Three of the eight conditions fail, and "See why" explains each one and how to clear it.
2. **Release with an override.** Release orders → RO-DAR1-26-01942:
   - Only the charges condition can be overridden, and the override goes to a second approver.
   - A hold or a customs failure blocks the release outright.
3. **Gate lane (tablet):**
   - Pick a truck, confirm the plate the camera read, and the lane runs the checks.
   - Visit 4410 is stopped by a seal mismatch; visit 4402 is turned back because its release expired.
4. **Yard:** the site plan with occupancy, dwell, hold and customs overlays. Click a block to see its bays, then place or move a unit using the suggested slots. A full or blocked slot needs override rights.
5. **Inspection:** the checklist, a damage diagram, photos and a signature. Major damage goes for approval.
6. **Money:**
   - Charges are grouped by bill-to, then by B/L. From there you build a proforma or invoice.
   - Posting freezes the exchange rate. The fiscal receipt (VFD) status is shown, with a retry for a failed one.
   - At the cashier you take a payment by cash, bank or mobile money and allocate it to invoices. Closing the shift asks for the cash count before it shows the expected figure.
7. **Tariffs:** versioned rules and slabs, with a rating preview to any date. The charges list, invoices and preview all use the same rating logic, so their numbers agree.
8. **Approvals and exceptions:**
   - The approvals inbox has "To decide" and "I asked" lists, and no one can approve their own request.
   - Exception cases can be assigned, commented on and resolved.
9. **Portal (Phase 2):** the clearing agent sees one plain status per unit, "Why can't I collect?", invoices and payment, truck booking and service requests.
10. **Setup:**
    - The yard designer generates rows, bays and tiers.
    - The users and roles screen has a permission matrix with DO, REQ, APPR and VIEW grants.
    - Also covered: release rules, field rules, number sequences, devices and NG sync status.

## How it is built
- **`src/ds`**, the design system:
  - tokens (`tokens.css`), components (`components.tsx`) and charts
  - status colours that carry meaning: green for clear, red for stopped or held, blue for with customs, amber for waiting
  - hazard stripes, used only for holds
  - Barlow and Barlow Semi Condensed type
- **`src/app`:** the shell, menu (`nav.ts`), demo session, roles (generated from the database seed), Aiva panel and Swahili strings.
- **`src/screens/<module>`:** one folder per module. Each folder exports its routes.
- **Data:**
  - **`src/mock`:** deterministic sample data, typed against the API contract. All companies and people are fictional.
  - **`src/api`:** the contract types (`contract.d.ts`, generated from `ng_icd_api.yaml`) and `useQ`, a TanStack Query wrapper. Every screen reads data through `useQ`.
- **`CONVENTIONS.md`:** the rules every screen follows. Give it to the team as the UI coding standard.

## Moving to the real backend (build step)
- **Data:** replace the mock functions behind `useQ` with typed `openapi-fetch` calls against the same contract. The data shapes are the contract's, so screens don't change. Mutations become `useMutation` calls with the `Idempotency-Key` and `If-Match` headers the contract describes.
- **Offline:** add the PWA service worker and the IndexedDB offline queue for the gate and yard screens. The offline banner and the "queued" states are already designed.
- **Yard map:** the prototype draws it in SVG, which is fine at this size. For yards above roughly 5,000 slots, switch the bay view to canvas (Konva), as planned.
- **Code splitting:** split routes by module with `React.lazy`. The prototype ships as one bundle.

## Assumptions to confirm
These are visible in the screens and match the database seed unless noted:
1. **Approval limits.** Personal limits are an approver USD 1,000, a doer USD 250 and request-only 0. Waivers and credit notes need two levels from USD 1,000, refunds from USD 500.
2. **Transit cargo.** It gets 14 free days and 0% VAT; this is flagged in the screen to confirm with your tax adviser.
3. **Disbursements and the handling fee.** Rebilled disbursements are outside VAT scope, and the handling fee carries 18% VAT.
4. **Lift on and lift off** are billed as a single charge.
5. **Credit customers.** Credit terms are 30 days. Only credit customers within their limit get a tax invoice directly; everyone else gets a proforma first.
6. **Exchange rates.** None are entered on Sundays or holidays; the last rate carries forward. The ledger base currency is TZS.
7. **Gate pass printing.** The paper sizes in the database don't include A6, so the gate pass prints 2-up on A5. Add A6 if you prefer it.
8. **Mandatory field rules.** The screens and API enforce "mandatory" field rules, but `m_field_rule` stores only hidden and read-only. Add a column if admins should set mandatory fields themselves.
9. **Moving holidays.** Holidays that move each year are flagged on the calendar for checking.
10. **Swahili text** needs a native speaker.

## Checks done
- The app compiles under TypeScript strict mode with no errors.
- An automated browser pass opened all 68 screens:
  - at 1440 px and 390 px wide, and in the dark theme
  - as all-permissions, gate officer, cashier and clearing-agent roles
- On that pass there were no script errors, no page wider than the screen and no blank pages, and the key screens were reviewed by eye.

**Not done:** usability testing with real gate, yard and billing staff. That is the best next check before the build.
