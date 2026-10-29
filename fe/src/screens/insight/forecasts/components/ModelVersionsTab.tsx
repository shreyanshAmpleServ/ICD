import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { DataTable, Panel, Pill, fmtD } from '@/ds/components';
import { MODEL_VERSIONS } from '@/mock/insight';

export function ModelVersionsTab() {
  return (
    <Panel
      flush
      title="Model versions"
      sub="Each prediction stores the version that made it"
      actions={
        <Link to="/admin/models" className="small">
          Manage models
        </Link>
      }
    >
      <DataTable
        rows={MODEL_VERSIONS}
        rowKey={(m) => m.mlModelVersionId}
        cols={[
          {
            key: 'n',
            header: 'Model',
            render: (m) => (
              <span className="row">
                <Sparkles size={14} aria-hidden />
                <strong>{m.name}</strong>
              </span>
            ),
          },
          { key: 'v', header: 'Version', render: (m) => <span className="cond">{m.versionLabel}</span> },
          { key: 't', header: 'Trained', render: (m) => <span className="small">{fmtD(m.trainedAt)}</span> },
          { key: 'q', header: 'How good it is', render: (m) => <span className="small">{m.metricText}</span> },
          {
            key: 's',
            header: 'Status',
            render: (m) => (
              <Pill tone={m.isActive ? 'go' : 'idle'}>{m.isActive ? 'In use' : 'Retired'}</Pill>
            ),
          },
        ]}
      />
    </Panel>
  );
}
