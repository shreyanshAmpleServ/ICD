import { Field, Input, Select } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';
import type { Company } from '../api';

interface CompanyDrawerProps {
  open: boolean;
  onClose: () => void;
  company: Company;
  setCompany: React.Dispatch<React.SetStateAction<Company>>;
  onSave: (reason?: string) => void;
}

export function CompanyDrawer({ open, onClose, company, setCompany, onSave }: CompanyDrawerProps) {
  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      title="Edit company"
      saveLabel="Save company"
      perm="admin.site.manage"
      onSave={onSave}
      reason="The legal name, TIN and VRN print on tax invoices."
    >
      <div className="form-grid">
        <Field label="Legal name" required span={2}>
          <Input defaultValue={company.legalName} onChange={(e) => setCompany((c: Company) => ({ ...c, legalName: e.target.value }))} />
        </Field>
        <Field label="Trading name">
          <Input defaultValue={company.tradingName ?? ''} onChange={(e) => setCompany((c: Company) => ({ ...c, tradingName: e.target.value }))} />
        </Field>
        <Field label="TIN" required hint="9 digits, as on the TRA certificate">
          <Input defaultValue={company.taxId ?? ''} onChange={(e) => setCompany((c: Company) => ({ ...c, taxId: e.target.value }))} />
        </Field>
        <Field label="VRN" required hint="VAT registration number">
          <Input defaultValue={company.vatNo ?? ''} onChange={(e) => setCompany((c: Company) => ({ ...c, vatNo: e.target.value }))} />
        </Field>
        <Field label="Base currency" hint="Cannot change after the first invoice">
          <Select disabled value={company.baseCurrency} options={['USD', 'TZS']} />
        </Field>
      </div>
    </EditDrawer>
  );
}
