import { useState } from 'react';
import { Button, Drawer, Field, Input, Select, Textarea, useToast } from '@/ds/components';
import { ROLES, type Role } from '@/app/roles';
import { usersApi } from '../api';

interface AddRoleModalProps {
  open: boolean;
  onClose: () => void;
  existingRoles: Role[];
  onRoleCreated: (newRole: Role) => void;
}

export function AddRoleModal({ open, onClose, existingRoles, onRoleCreated }: AddRoleModalProps) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [template, setTemplate] = useState('EMPTY');
  const [cloneRoleCode, setCloneRoleCode] = useState(existingRoles[0]?.code || 'GATE_OFFICER');
  const [loading, setLoading] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!code || code === name.toUpperCase().replace(/[^A-Z0-9]/g, '_')) {
      setCode(val.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 30));
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      toast('Please enter both role name and code');
      return;
    }

    setLoading(true);
    try {
      let initialGrants: Record<string, string> = {};

      if (template === 'ALL_DO') {
        const adminRole = existingRoles.find((r) => r.code === 'ICD_ADMIN' || r.code === 'ALL_PERMISSIONS') || ROLES[0];
        initialGrants = { ...(adminRole?.grants || {}) };
      } else if (template === 'ALL_VIEW') {
        const adminRole = existingRoles.find((r) => r.code === 'ICD_ADMIN' || r.code === 'ALL_PERMISSIONS') || ROLES[0];
        Object.keys(adminRole?.grants || {}).forEach((k) => {
          initialGrants[k] = 'VIEW';
        });
      } else if (template === 'CLONE') {
        const sourceRole = existingRoles.find((r) => r.code === cloneRoleCode);
        initialGrants = { ...(sourceRole?.grants || {}) };
      }

      const created = await usersApi.createRole({
        roleCode: code.trim(),
        roleName: name.trim(),
        description: description.trim(),
        grants: initialGrants,
      });

      onRoleCreated({
        code: created.code || code.trim(),
        name: created.name || name.trim(),
        external: false,
        grants: (created.grants as any) || initialGrants,
      });

      toast(`Role "${name}" created successfully`);
      onClose();
    } catch (err: any) {
      toast(err.message || 'Failed to create role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add new role"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={loading || !name.trim() || !code.trim()} onClick={handleSubmit}>
            {loading ? 'Creating...' : 'Create role'}
          </Button>
        </>
      }
    >
      <div className="stack" style={{ gap: 14 }}>
        <Field label="Role Name" required hint="e.g. Operations Lead, Yard Supervisor">
          <Input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Operations Lead"
            autoFocus
          />
        </Field>

        <Field label="Role Code" required hint="Unique uppercase identifier for system mapping">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
            placeholder="e.g. OPS_LEAD"
          />
        </Field>

        <Field label="Description">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of duties and authorization scope"
            rows={2}
          />
        </Field>

        <Field label="Initial Permissions Template">
          <Select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            options={[
              ['EMPTY', 'Custom (Start with no permissions)'],
              ['CLONE', 'Copy permissions from existing role...'],
              ['ALL_DO', 'Full Administrator (Grant all DO)'],
              ['ALL_VIEW', 'Auditor / Viewer (Grant all VIEW)'],
            ]}
          />
        </Field>

        {template === 'CLONE' && (
          <Field label="Select Role to Copy From">
            <Select
              value={cloneRoleCode}
              onChange={(e) => setCloneRoleCode(e.target.value)}
              options={existingRoles.map((r) => [r.code, `${r.name} (${r.code})`])}
            />
          </Field>
        )}
      </div>
    </Drawer>
  );
}

