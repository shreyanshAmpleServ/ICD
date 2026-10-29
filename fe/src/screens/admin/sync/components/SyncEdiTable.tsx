import { ArrowDownLeft, ArrowUpRight, RotateCcw } from 'lucide-react';
import { Button, DataTable, Panel, StatusPill, ago, useToast } from '@/ds/components';
import { parties } from '@/mock/core';
import { integrationMessages } from '@/mock/admin';
import { label } from '../../shared/AdminKit';

export function SyncEdiTable() {
  const toast = useToast();

  return (
    <Panel
      flush
      title="Integration messages"
      sub="CODECO / COPARN with lines, bank statements, mobile money notices. Duplicates are rejected."
    >
      <DataTable
        rows={integrationMessages}
        rowKey={(m) => m.integrationMessageId}
        cols={[
          {
            key: 'd',
            header: '',
            render: (m) =>
              m.direction === 'IN' ? (
                <ArrowDownLeft size={16} aria-label="Incoming" />
              ) : (
                <ArrowUpRight size={16} aria-label="Outgoing" />
              ),
          },
          {
            key: 'p',
            header: 'Partner',
            render: (m) => (
              <>
                <strong className="small">
                  {m.partnerPartyId
                    ? parties.find((p) => p.partyId === m.partnerPartyId)?.partyName
                    : label(m.partnerSystem)}
                </strong>
                <div className="xs faint">{label(m.partnerSystem)}</div>
              </>
            ),
          },
          {
            key: 't',
            header: 'Message',
            render: (m) => (
              <span className="small">
                {label(m.messageType)} · {m.format}
              </span>
            ),
          },
          { key: 'c', header: 'Reference', render: (m) => <span className="adm-code">{m.correlationRef}</span> },
          { key: 'w', header: 'When', render: (m) => <span className="small">{ago(m.createdAt)}</span> },
          { key: 's', header: 'Status', render: (m) => <StatusPill value={m.status} /> },
          {
            key: 'e',
            header: 'Detail',
            render: (m) =>
              m.lastError ? (
                <span className="small" style={{ color: 'var(--stop)' }}>
                  {m.lastError}
                </span>
              ) : null,
          },
          {
            key: 'a',
            header: '',
            render: (m) =>
              m.status === 'FAILED' ? (
                <Button size="sm" icon={<RotateCcw />} perm="integration.monitor" onClick={() => toast('Message resent')}>
                  Resend
                </Button>
              ) : null,
          },
        ]}
      />
    </Panel>
  );
}
