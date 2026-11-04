import { useState } from 'react';
import { Button, Check, Drawer, Field, Input, Select, Textarea, useToast } from '@/ds/components';
import { MODULE_NAME } from '@/mock/admin';
import { usersApi } from '../api';

interface AddPermissionModalProps {
  open: boolean;
  onClose: () => void;
  modules: string[];
  onPermissionCreated: (newPerm: any) => void;
}

export function AddPermissionModal({ open, onClose, modules, onPermissionCreated }: AddPermissionModalProps) {
  const toast = useToast();
  const [module, setModule] = useState(modules[0] || 'gate');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [isApproval, setIsApproval] = useState(false);
  const [supportsLimit, setSupportsLimit] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!code.trim() || !description.trim()) {
      toast('Please enter permission code and description');
      return;
    }

    setLoading(true);
    try {
      const formattedCode = code.trim().toLowerCase().startsWith(`${module}.`)
        ? code.trim().toLowerCase()
        : `${module}.${code.trim().toLowerCase().replace(/[^a-z0-9.]/g, '_')}`;

      const created = await usersApi.createPermission({
        code: formattedCode,
        module,
        description: description.trim(),
        isApproval,
        supportsLimit,
      });

      onPermissionCreated(created);
      toast(`Permission "${formattedCode}" added successfully`);
      onClose();
    } catch (err: any) {
      toast(err.message || 'Failed to add permission');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add new permission"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={loading || !code.trim() || !description.trim()} onClick={handleSubmit}>
            {loading ? 'Adding...' : 'Add permission'}
          </Button>
        </>
      }
    >
      <div className="stack" style={{ gap: 14 }}>
        <Field label="Module" required hint="Functional domain of the permission">
          <Select
            value={module}
            onChange={(e) => setModule(e.target.value)}
            options={modules.map((m) => [m, MODULE_NAME[m] || m])}
          />
        </Field>

        <Field label="Permission Code" required hint={`Will be prefixed with "${module}." if not already`}>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. override_seal or yard.slot.emergency"
            autoFocus
          />
        </Field>

        <Field label="Description" required hint="Short description shown in matrix and audit trail">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Authorize emergency seal replacement on import containers"
            rows={2}
          />
        </Field>

        <div className="row" style={{ gap: 12, alignItems: 'center' }}>
          <Check
            label="Is approval permission (supports REQ and APPR grants)"
            checked={isApproval}
            onChange={(e) => setIsApproval(e.target.checked)}
          />
        </div>

        {isApproval && (
          <div className="row" style={{ gap: 12, alignItems: 'center' }}>
            <Check
              label="Supports financial / limit threshold in USD"
              checked={supportsLimit}
              onChange={(e) => setSupportsLimit(e.target.checked)}
            />
          </div>
        )}
      </div>
    </Drawer>
  );
}

