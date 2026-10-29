import { EditDrawer } from '../../shared/AdminKit';
import type { User } from '@/mock/admin';

interface DeactivateModalProps {
  open: boolean;
  onClose: () => void;
  user: User;
  onDeactivate: (why: string) => void;
}

export function DeactivateModal({ open, onClose, user, onDeactivate }: DeactivateModalProps) {
  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      title={`Deactivate ${user.userName}`}
      saveLabel="Deactivate user"
      danger
      perm="admin.users.manage"
      reason="e.g. Left the company on 30 Sep"
      onSave={onDeactivate}
    >
      <p className="small muted">
        They are signed out everywhere within a minute. Open approvals they requested stay open; approvals waiting on them go to the next approver.
      </p>
    </EditDrawer>
  );
}
