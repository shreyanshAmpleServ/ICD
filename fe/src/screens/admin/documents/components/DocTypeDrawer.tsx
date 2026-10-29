import { Check, Field, Input } from '@/ds/components';
import { documentTypes as seedDocs } from '@/mock/admin';
import { EditDrawer } from '../../shared/AdminKit';

type Doc = (typeof seedDocs)[number];

export function DocTypeDrawer({
  doc,
  onClose,
  onChange,
  onSave,
}: {
  doc: Doc;
  onClose: () => void;
  onChange: (d: Doc) => void;
  onSave: () => void;
}) {
  return (
    <EditDrawer
      open
      onClose={onClose}
      title={doc.docTypeName}
      saveLabel="Save document type"
      perm="admin.config.manage"
      onSave={onSave}
    >
      <div className="form-grid">
        <Field label="Name">
          <Input value={doc.docTypeName} onChange={(e) => onChange({ ...doc, docTypeName: e.target.value })} />
        </Field>
        <Field label="Max size (MB)">
          <Input
            type="number"
            value={doc.maxSizeMb}
            onChange={(e) => onChange({ ...doc, maxSizeMb: Number(e.target.value) })}
          />
        </Field>
        <Field label="File types" hint="Comma separated">
          <Input value={doc.allowedExt} onChange={(e) => onChange({ ...doc, allowedExt: e.target.value })} />
        </Field>
        <Field label="Keep for (years)" hint="TRA requires 5 years for tax records; check your own policy">
          <Input
            type="number"
            value={doc.retentionYears}
            onChange={(e) => onChange({ ...doc, retentionYears: Number(e.target.value) })}
          />
        </Field>
      </div>
      <Check
        label="A supervisor approves it before it counts (e.g. a scanned release)"
        checked={!!doc.requiresApproval}
        onChange={(e) => onChange({ ...doc, requiresApproval: e.target.checked })}
      />
      <Field label="Required for">
        <span className="row-wrap">
          {doc.requiredFor.length ? (
            doc.requiredFor.map((x) => (
              <span key={x} className="tag">
                {x}
              </span>
            ))
          ) : (
            <span className="faint small">Not required anywhere</span>
          )}
        </span>
      </Field>
    </EditDrawer>
  );
}
