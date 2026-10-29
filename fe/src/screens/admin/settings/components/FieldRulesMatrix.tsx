import { Trash2 } from 'lucide-react';
import { Button, Pill } from '@/ds/components';
import { ROLES } from '@/app/roles';
import { FIELD_CATALOGUE, type FieldRule } from '@/mock/admin';

type Access = 'HIDDEN' | 'READONLY' | 'MANDATORY';
const ACC: Record<Access, string> = { HIDDEN: 'Hidden', READONLY: 'Read-only', MANDATORY: 'Mandatory' };
const roleName = (c: string) => ROLES.find((r) => r.code === c)?.name ?? c;
const accessOf = (r: FieldRule): Access => (r.mandatory ? 'MANDATORY' : r.accessLevel);

export function FieldRulesMatrix({
  rules,
  usedRoles,
  onRemoveRule,
}: {
  rules: FieldRule[];
  usedRoles: string[];
  onRemoveRule: (r: FieldRule) => void;
}) {
  return (
    <div className="adm-scroll">
      <table className="adm-matrix" aria-label="Field rules">
        <thead>
          <tr>
            <th className="rh">Field</th>
            {usedRoles.map((r) => (
              <th key={r} style={{ whiteSpace: 'normal', minWidth: 110, maxWidth: 140 }} className="xs">
                {roleName(r)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FIELD_CATALOGUE.filter((f) =>
            rules.some((r) => r.entityName === f.entity && r.fieldName === f.field)
          ).map((f) => (
            <tr key={f.entity + f.field}>
              <th className="rh" scope="row" style={{ fontWeight: 400 }}>
                <strong className="small">{f.label}</strong>
                <div className="adm-code xs">
                  {f.entity}.{f.field}
                </div>
                <div className="xs faint">{f.screen}</div>
              </th>
              {usedRoles.map((role) => {
                const r = rules.find(
                  (x) => x.roleCode === role && x.entityName === f.entity && x.fieldName === f.field
                );
                return (
                  <td key={role}>
                    {r ? (
                      <span className="row" style={{ justifyContent: 'center', gap: 4 }}>
                        <Pill tone={accessOf(r) === 'HIDDEN' ? 'idle' : 'info'}>{ACC[accessOf(r)]}</Pill>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Trash2 />}
                          perm="admin.config.manage"
                          aria-label={`Remove rule for ${roleName(role)} on ${f.label}`}
                          onClick={() => onRemoveRule(r)}
                        />
                      </span>
                    ) : (
                      <span className="faint">·</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
