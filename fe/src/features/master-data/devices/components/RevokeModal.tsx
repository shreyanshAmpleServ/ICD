import { Banner } from '@/ds/components';
import { devices as seedDevices } from '@/mock/admin';
import { EditDrawer } from '../../shared/AdminKit';

type Dev = (typeof seedDevices)[number];

export function RevokeModal({
  revoke,
  onClose,
  onSave,
}: {
  revoke: Dev;
  onClose: () => void;
  onSave: (why: string) => void;
}) {
  return (
    <EditDrawer
      open
      onClose={onClose}
      title={`Revoke ${revoke.deviceCode}`}
      saveLabel="Revoke device"
      danger
      perm="admin.device.manage"
      reason="e.g. Reported lost; police report number"
      onSave={onSave}
    >
      {revoke.queue > 0 ? (
        <Banner tone="stop" title={`${revoke.queue} events still on this device`}>
          Revoking rejects them when the device next connects. They will have to be entered again by hand.
        </Banner>
      ) : (
        <Banner tone="info">Nothing is waiting on this device.</Banner>
      )}
      <p className="small muted">
        The device is signed out at once and can no longer sync. To use it again it must be registered afresh.
      </p>
    </EditDrawer>
  );
}
