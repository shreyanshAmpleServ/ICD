import { Banner } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';
import type { CountryPack } from '@/mock/admin';

interface PackDrawerProps {
  packOpen: CountryPack | null;
  onClose: () => void;
  onActivate: () => void;
}

export function PackDrawer({ packOpen, onClose, onActivate }: PackDrawerProps) {
  if (!packOpen) return null;
  return (
    <EditDrawer
      open={!!packOpen}
      onClose={onClose}
      title={`Activate ${packOpen.packName}`}
      saveLabel="Activate pack"
      perm="admin.site.manage"
      danger
      reason="Say who verified the customs reference names and VAT rates, and when."
      onSave={onActivate}
    >
      <Banner tone="wait" title="Starter pack: not verified">
        The {packOpen.packName} pack was seeded from general knowledge. Its customs reference names, VAT rate and effective dates must be confirmed with a local clearing agent and tax adviser before any site uses it.
      </Banner>
      <p className="small muted">Activating makes the pack available to sites in {packOpen.countryCode}. No existing site changes.</p>
    </EditDrawer>
  );
}
