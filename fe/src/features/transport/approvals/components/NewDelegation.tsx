import { useState } from "react";
import { CalendarRange } from "lucide-react";
import {
  Banner,
  Button,
  Drawer,
  Field,
  Input,
  Select,
  Textarea,
  useToast,
} from "@/ds/components";
import { day } from "@/mock/gen";
import { APPROVAL_LIMITS, type DelegationRow } from "@/mock/cargo";
import { useQ } from "@/api/query";
import { usersApi } from "@/features/master-data/users/api";
import { approvalsApi } from "../api";

const permLabel = (p: string) => APPROVAL_LIMITS[p]?.label ?? p;

export function NewDelegation({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (d: DelegationRow) => void;
}) {
  const toast = useToast();
  const { data: usersList = [] } = useQ(["users-for-delegation"], () =>
    usersApi.getUsers(),
  );
  const [to, setTo] = useState("2");
  const [perm, setPerm] = useState("");
  const [from, setFrom] = useState(day(1));
  const [until, setUntil] = useState(day(8));
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const days = (Date.parse(until) - Date.parse(from)) / 86400000;
  const err =
    days <= 0
      ? "End must be after start"
      : days > 30
        ? "At most 30 days; renew if leave is longer"
        : null;

  const defaultUserOptions: [string, string][] = [
    ["2", "Daniel K. (Ops)"],
    ["3", "Rehema K. (Doc & clearance)"],
    ["4", "Joseph N. (Finance)"],
    ["5", "Grace P. (Customer service)"],
  ];

  const userOptions: [string, string][] =
    usersList.length > 0
      ? usersList.map((u: any) => [
          String(u.userId),
          `${u.fullName || u.userName}${u.title ? ` (${u.title})` : ""}`,
        ])
      : defaultUserOptions;

  const activeTo = to || (userOptions[0] ? userOptions[0][0] : "2");

  const handleSave = async () => {
    try {
      setSubmitting(true);
      const selectedUser: any = usersList.find(
        (u) => String(u.userId) === activeTo,
      );
      const matchedOpt = userOptions.find(([val]) => val === activeTo);
      const toName =
        selectedUser?.fullName ||
        selectedUser?.userName ||
        (matchedOpt ? matchedOpt[1] : "Delegate User");

      const payload = {
        fromUserId: 1,
        toUserId: Number(activeTo) || 2,
        toName,
        permissionCode: perm || null,
        validFrom: from ? `${from}T00:00:00.000Z` : new Date().toISOString(),
        validTo: until
          ? `${until}T23:59:59.000Z`
          : new Date(Date.now() + 7 * 86400000).toISOString(),
        reason: reason.trim(),
      };

      const result = await approvalsApi.createDelegation(payload);
      onSave(
        result || {
          approvalDelegationId: Date.now(),
          fromUserId: 1,
          toUserId: Number(activeTo) || 2,
          fromName: "You",
          toName,
          permissionCode: perm || null,
          permName: perm ? permLabel(perm) : "All approvals",
          siteId: 1,
          validFrom: payload.validFrom,
          validTo: payload.validTo,
          reason: reason.trim(),
        },
      );
      toast("Delegation saved");
      onClose();
      setReason("");
    } catch (err: any) {
      console.error("Failed to create delegation:", err);
      toast("Failed to save delegation: " + (err.message || "Server error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Delegate my approvals"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<CalendarRange />}
            disabled={!!err || !reason.trim() || submitting}
            loading={submitting}
            onClick={handleSave}
          >
            Save delegation
          </Button>
        </>
      }
    >
      <div className="stack-lg">
        <Field
          label="Delegate to"
          required
          hint="Must already hold the permission at approve level"
        >
          <Select
            value={activeTo}
            onChange={(e) => setTo(e.target.value)}
            options={userOptions}
          />
        </Field>
        <Field label="Which approvals">
          <Select
            value={perm}
            onChange={(e) => setPerm(e.target.value)}
            options={[
              ["", "All my approvals"],
              ...Object.entries(APPROVAL_LIMITS).map(
                ([k, v]) => [k, v.label] as [string, string],
              ),
            ]}
          />
        </Field>
        <div className="form-grid">
          <Field label="From" required>
            <Input
              type="date"
              value={from}
              min={day(0)}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field label="Until" required error={err}>
            <Input
              type="date"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Reason" required>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Annual leave, training, sick leave"
          />
        </Field>
        <Banner>
          The delegate cannot approve requests they raised themselves, and every
          decision records that it was made on your behalf.
        </Banner>
      </div>
    </Drawer>
  );
}
