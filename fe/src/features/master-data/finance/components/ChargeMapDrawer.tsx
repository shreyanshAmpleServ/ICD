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
      title={`Charge: ${map.chargeName}`}
      saveLabel="Save charge mapping"
      perm="admin.config.manage"
      onSave={onSave}
    >
      <div className="form-grid">
        <Field label="Charge code">
          <Input value={map.chargeCode} readOnly className="adm-code" />
        </Field>
        <Field label="Print order">
          <Input
            type="number"
            value={map.printOrder ?? 10}
            onChange={(e) => setMap({ ...map, printOrder: Number(e.target.value) })}
          />
        </Field>
      </div>

      <Field label="Name on invoice" required>
        <Input
          value={map.chargeName}
          onChange={(e) => setMap({ ...map, chargeName: e.target.value })}
        />
      </Field>

      {map.isDisbursement ? (
        <Banner tone="info">
          Disbursements are passed through at cost: they debit receivables and credit disbursement clearing ({gl('DISBURSEMENT_CLEARING')}). No revenue account needed.
        </Banner>
      ) : (
        <>
          <Field label="Revenue account" required hint="ERP chart of accounts code, e.g. 4100-10">
            <Input
              value={map.revenueGlAccount ?? ''}
              onChange={(e) => setMap({ ...map, revenueGlAccount: e.target.value })}
              placeholder="e.g. 4100-10"
              className="adm-code"
            />
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
