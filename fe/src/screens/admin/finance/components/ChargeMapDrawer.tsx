import { Banner, Field, Input, Select } from '@/ds/components';
import { glSettings, type chargeCodes as seedCharges, type taxCodes as seedTaxCodes } from '@/mock/admin';
import { EditDrawer } from '../../shared/AdminKit';

type Charge = (typeof seedCharges)[number];
type TaxCode = (typeof seedTaxCodes)[number];

interface ChargeMapDrawerProps {
  map: Charge | null;
  taxCodes: TaxCode[];
  onClose: () => void;
  onSave: () => void;
  setMap: React.Dispatch<React.SetStateAction<Charge | null>>;
}

const gl = (k: string) => glSettings.find((g) => g.settingKey === k)?.glAccount;

export function ChargeMapDrawer({ map, taxCodes, onClose, onSave, setMap }: ChargeMapDrawerProps) {
  if (!map) return null;

  return (
    <EditDrawer
      open={!!map}
      onClose={onClose}
      title={`Accounts for ${map.chargeName}`}
      saveLabel="Save mapping"
      perm="finance.period.close"
      disabled={map.isDisbursement}
      onSave={onSave}
    >
      {map.isDisbursement ? (
        <Banner tone="info">
          Disbursements are passed through at cost: they debit receivables and credit disbursement clearing ({gl('DISBURSEMENT_CLEARING')}). No revenue account.
        </Banner>
      ) : (
        <>
          <Field label="Revenue account" required hint="Account code as it is in the ERP chart of accounts">
            <Input value={map.revenueGlAccount ?? ''} onChange={(e) => setMap({ ...map, revenueGlAccount: e.target.value })} placeholder="e.g. 4700-72" />
          </Field>
          <Field label="Default tax code">
            <Select
              value={map.defaultTaxCode ?? ''}
              onChange={(e) => setMap({ ...map, defaultTaxCode: e.target.value })}
              options={taxCodes.filter((t) => t.isActive).map((t) => [t.taxCode, `${t.taxName} (${Number(t.ratePct)}%)`])}
            />
          </Field>
        </>
      )}
    </EditDrawer>
  );
}
