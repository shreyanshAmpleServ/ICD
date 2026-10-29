import { Search } from 'lucide-react';
import { Input, SearchInput, Select } from '@/ds/components';
import { AUDIT_ACTIONS, AUDIT_SOURCES } from '@/mock/insight';
import type { Tone } from '@/ds/status';

export const ACTION: Record<string, [string, Tone]> = {
  CREATE: ['Create', 'info'],
  UPDATE: ['Update', 'info'],
  DELETE: ['Delete', 'stop'],
  APPROVE: ['Approve', 'go'],
  REJECT: ['Reject', 'stop'],
  OVERRIDE: ['Override', 'wait'],
  PRINT: ['Print', 'idle'],
  EXPORT: ['Export', 'idle'],
  SYNC: ['Sync', 'idle'],
  VIEW_SENSITIVE: ['Viewed sensitive', 'wait'],
  LOGIN: ['Sign in', 'idle'],
  LOGOUT: ['Sign out', 'idle'],
};

export const ENTITY = (e: string) => e.replace(/_/g, ' ');

export function AuditToolbar({
  q,
  setQ,
  action,
  setAction,
  source,
  setSource,
  entity,
  setEntity,
  entities,
  from,
  setFrom,
  to,
  setTo,
  matchCount,
  totalCount,
}: {
  q: string;
  setQ: (v: string) => void;
  action: string;
  setAction: (v: string) => void;
  source: string;
  setSource: (v: string) => void;
  entity: string;
  setEntity: (v: string) => void;
  entities: string[];
  from: string;
  setFrom: (v: string) => void;
  to: string;
  setTo: (v: string) => void;
  matchCount: number;
  totalCount: number;
}) {
  return (
    <div className="toolbar">
      <div style={{ width: 260, maxWidth: '100%' }}>
        <SearchInput
          icon={<Search />}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Person, record number, IP"
          aria-label="Search the audit trail"
        />
      </div>
      <Select
        aria-label="Action"
        value={action}
        onChange={(e) => setAction(e.target.value)}
        options={[['ALL', 'All actions'], ...AUDIT_ACTIONS.map((a) => [a, ACTION[a][0]] as [string, string])]}
      />
      <Select
        aria-label="Source"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        options={[['ALL', 'All sources'], ...AUDIT_SOURCES.map(([k, l]) => [k, l] as [string, string])]}
      />
      <Select
        aria-label="Record type"
        value={entity}
        onChange={(e) => setEntity(e.target.value)}
        options={[['ALL', 'All record types'], ...entities.map((x) => [x, ENTITY(x)] as [string, string])]}
      />
      <span className="row" style={{ gap: 6 }}>
        <Input type="date" aria-label="From date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="small muted">to</span>
        <Input type="date" aria-label="To date" value={to} onChange={(e) => setTo(e.target.value)} />
      </span>
      <span className="spacer" />
      <span className="small muted">
        {matchCount} of {totalCount}
      </span>
    </div>
  );
}
