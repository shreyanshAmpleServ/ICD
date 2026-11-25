import { useState } from "react";
import { CheckCircle2, Paperclip, Plus } from "lucide-react";
import {
  Button,
  Drawer,
  Field,
  Input,
  Segmented,
  Select,
} from "@/ds/components";
import { useQ } from "@/api/query";
import { consignmentsApi } from "@/features/container-management/consignments/api";
import { CHARGE_NAMES, TODAY, m2, type Disb } from "@/mock/money";
import { disbursementsApi } from "../api";

export type DisbRow = Disb & { pending?: boolean };

export interface RecordDisbursementDrawerProps {
  open: boolean;
  onClose: () => void;
  onDone: (d: DisbRow) => void;
}

export function RecordDisbursementDrawer({
  open,
  onClose,
  onDone,
}: RecordDisbursementDrawerProps) {
  const { data: consignmentsList = [] } = useQ(["consignments-for-disb"], () =>
    consignmentsApi.getConsignments(),
  );
  const [cons, setCons] = useState("");
  const [code, setCode] = useState("DISB_PORT");
  const [payee, setPayee] = useState("Port authority, Dar es Salaam port");
  const [cur, setCur] = useState<"USD" | "TZS">("USD");
  const [amt, setAmt] = useState("");
  const [rct, setRct] = useState("");
  const [mode, setMode] = useState<"AT_COST" | "COST_PLUS_FEE">(
    "COST_PLUS_FEE",
  );
  const [fee, setFee] = useState("15");
  const [file, setFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const activeConsignmentId =
    cons ||
    (consignmentsList[0]?.consignmentId
      ? String(consignmentsList[0].consignmentId)
      : "1");
  const selectedCon = consignmentsList.find(
    (x: any) => String(x.consignmentId) === activeConsignmentId,
  );
  const ok = Number(amt) > 0 && rct.trim() && file && !submitting;

  const handleRecord = async () => {
    try {
      setSubmitting(true);
      const payload = {
        consignmentId: Number(activeConsignmentId),
        billToPartyId: selectedCon?.billToPartyId ?? 2,
        payeeName: payee,
        chargeCode: code,
        description:
          CHARGE_NAMES[code]?.replace(" (paid on your behalf)", "") ||
          "Disbursement",
        currency: cur,
        amountPaid: m2(Number(amt)),
        paidAt: TODAY,
        payeeReceiptNo: rct,
        rebillMode: mode,
        handlingFee: m2(mode === "AT_COST" ? 0 : Number(fee)),
      };

      const result = await disbursementsApi.recordDisbursement(payload);
      onDone(
        result || {
          disbursementId: Date.now(),
          disbNo: `DSB-DAR1-26-${Date.now().toString().slice(-4)}`,
          ...payload,
          status: "RECORDED",
          recordedBy: "Current User",
        },
      );
      onClose();
      setAmt("");
      setRct("");
      setFile(false);
    } catch (err: any) {
      console.error("Failed to record disbursement:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Record a disbursement"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<Plus />}
            perm="finance.disbursement.record"
            disabled={!ok}
            loading={submitting}
            onClick={handleRecord}
          >
            Record disbursement
          </Button>
        </>
      }
    >
      <div className="stack">
        <div className="form-grid">
          <Field
            label="Consignment"
            required
            hint={
              selectedCon?.billToPartyName
                ? `Billed to ${selectedCon.billToPartyName}`
                : undefined
            }
          >
            <Select
              value={activeConsignmentId}
              onChange={(e) => setCons(e.target.value)}
              options={
                consignmentsList.length > 0
                  ? consignmentsList.map((x: any) => [
                      String(x.consignmentId),
                      x.refNo || `Consignment #${x.consignmentId}`,
                    ])
                  : [
                      ["1", "IOSL0926S0457"],
                      ["2", "MSCU20261019"],
                    ]
              }
            />
          </Field>
          <Field label="What was paid" required>
            <Select
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setPayee(
                  e.target.value === "DISB_DUTY"
                    ? "TRA customs (duty and taxes)"
                    : e.target.value === "DISB_LINE"
                      ? "Shipping Line"
                      : "Port authority, Dar es Salaam port",
                );
              }}
              options={["DISB_PORT", "DISB_LINE", "DISB_DUTY"].map((x) => [
                x,
                CHARGE_NAMES[x]?.replace(" (paid on your behalf)", "") || x,
              ])}
            />
          </Field>
          <Field label="Paid to" required>
            <Input value={payee} onChange={(e) => setPayee(e.target.value)} />
          </Field>
          <Field label="Currency">
            <Segmented
              value={cur}
              onChange={setCur}
              options={[
                { id: "USD", label: "USD" },
                { id: "TZS", label: "TZS" },
              ]}
            />
          </Field>
          <Field label={`Amount paid (${cur})`} required>
            <Input
              type="number"
              min={0}
              value={amt}
              onChange={(e) => setAmt(e.target.value)}
            />
          </Field>
          <Field label="Payee receipt no." required>
            <Input
              value={rct}
              onChange={(e) => setRct(e.target.value.toUpperCase())}
              placeholder="PA-DSM-26-…"
            />
          </Field>
        </div>
        <Field label="Payee's receipt" required>
          <Button
            icon={file ? <CheckCircle2 /> : <Paperclip />}
            onClick={() => setFile(!file)}
          >
            {file ? "receipt-scan.pdf attached" : "Attach scanned receipt"}
          </Button>
        </Field>
        <Field label="Re-bill as">
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { id: "AT_COST", label: "At cost" },
              { id: "COST_PLUS_FEE", label: "Cost plus handling fee" },
            ]}
          />
        </Field>
        {mode === "COST_PLUS_FEE" && (
          <Field
            label={`Handling fee (${cur})`}
            hint="Separate line on the invoice, VAT 18%"
          >
            <Input
              type="number"
              min={0}
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              style={{ maxWidth: 160 }}
            />
          </Field>
        )}
        <p className="xs muted">
          It goes on the customer's next invoice for this consignment. It can be
          billed only once.
        </p>
      </div>
    </Drawer>
  );
}
