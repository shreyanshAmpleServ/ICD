import { Link } from 'react-router-dom';
import { Banner, Button, DataTable, Money, Panel, useToast } from '@/ds/components';
import { ROLES, type Role } from '@/app/roles';
import { permissions, roleLimits } from '@/mock/admin';
import { AuditNote, GrantChip } from '../../shared/AdminKit';

interface LimitsProps {
  roles?: Role[];
  onSelectRoleFilter?: (roleCode: string) => void;
}

export function Limits({ roles = ROLES, onSelectRoleFilter }: LimitsProps) {
  const toast = useToast();
  const rows = roles.flatMap((r) =>
    Object.entries(r.grants)
      .filter(([p, g]) => permissions.find((x) => x.code === p)?.supportsLimit && (g === 'APPR' || g === 'REQ'))
      .map(([p, g]) => ({
        key: `${r.code}-${p}`,
        role: r.name,
        code: r.code,
        perm: p,
        grant: g,
        limit: roleLimits[r.code]?.[p],
      }))
  );

  return (
    <>
      <Panel
        flush
        title="Approval limits per role"
        sub="Only permissions that carry an amount: credit notes, waivers, refunds, cash-up differences"
      >
        <DataTable
          rows={rows}
          rowKey={(r) => r.key}
          cols={[
            {
              key: 'r',
              header: 'Role',
              render: (r) => (
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: onSelectRoleFilter ? 'pointer' : 'default',
                    color: onSelectRoleFilter ? 'var(--primary, #0284c7)' : 'inherit',
                    fontWeight: 600,
                    textAlign: 'left',
                  }}
                  onClick={() => onSelectRoleFilter && onSelectRoleFilter(r.code)}
                  title={onSelectRoleFilter ? `Filter user list by ${r.role}` : undefined}
                >
                  {r.role}
                </button>
              ),
            },
            { key: 'p', header: 'Permission', render: (r) => <span className="adm-code">{r.perm}</span> },
            { key: 'g', header: 'Grant', render: (r) => <GrantChip g={r.grant as any} /> },
            {
              key: 'l',
              header: 'Limit',
              num: true,
              render: (r) =>
                r.grant === 'REQ' ? (
                  <span className="faint">Requests only</span>
                ) : r.limit !== undefined ? (
                  <Money amount={r.limit} currency="USD" />
                ) : (
                  <span className="faint">No limit</span>
                ),
            },
            {
              key: 'e',
              header: '',
              render: (r) =>
                r.grant === 'APPR' ? (
                  <Button size="sm" variant="ghost" perm="admin.roles.manage" onClick={() => toast('Approval threshold policy applies')}>
                    View policy
                  </Button>
                ) : null,
            },
          ]}
        />
      </Panel>
      <Banner tone="info" title="Limits and levels work together">
        A request needs one approver whose limit covers the amount. Above the policy threshold it needs two levels; see{' '}
        <Link to="/admin/rules">Holds, release & approvals</Link>.
      </Banner>
      <AuditNote />
    </>
  );
}
