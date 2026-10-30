import { useEffect, useState, type ReactNode } from 'react';
import { Languages } from 'lucide-react';
import { Banner, Button, Field, Input, Panel, Pill, Segmented, Textarea } from '@/ds/components';
import { SAMPLE_VALUES, notificationTemplates as seedTpl } from '@/mock/admin';
import { SaveBar } from '../../shared/AdminKit';
import { Filled, renderTemplateText } from './Filled';

type Tpl = (typeof seedTpl)[number];
const CH: Record<string, string> = { SMS: 'SMS', EMAIL: 'Email', IN_APP: 'In-app', WHATSAPP: 'WhatsApp', PUSH: 'Push' };

export function TemplateEditor({
  t,
  hasSw,
  onSave,
  onAddSw,
}: {
  t: Tpl;
  hasSw: boolean;
  onSave: (t: Tpl) => void;
  onAddSw: () => void;
}) {
  const [x, setX] = useState(t);
  useEffect(() => {
    setX(t);
  }, [t]);

  const [sample, setSample] = useState(true);
  const dirty = JSON.stringify(x) !== JSON.stringify(t);

  const bodyText = x?.body ?? (x as any)?.bodyTemplate ?? '';
  const subjectText = x?.subject ?? (x as any)?.subjectTemplate ?? '';

  const unknown = [...(bodyText + subjectText).matchAll(/\{\{([a-z_]+)\}\}/g)]
    .map((m) => m[1])
    .filter((k) => SAMPLE_VALUES[k] === undefined);
  const smsLen = renderTemplateText(bodyText).length;
  const seg = Math.ceil(smsLen / 160);
  const preview: ReactNode =
    x.channel === 'SMS' || x.channel === 'WHATSAPP' ? (
      <div className="adm-sms">
        <Filled text={bodyText} sample={sample} />
      </div>
    ) : (
      <div className="adm-email">
        <div className="h">
          <strong>
            <Filled text={subjectText} sample={sample} />
          </strong>
          {x.channel === 'EMAIL' && (
            <div className="xs faint">From Mlimani ICD &lt;noreply@mlimani-icd.example&gt;</div>
          )}
        </div>
        <div className="b">
          <Filled text={bodyText} sample={sample} />
        </div>
      </div>
    );

  return (
    <>
      {x.languageCode === 'sw' && (
        <Banner tone="wait" title="Draft: needs native speaker review">
          This Swahili text was drafted as a placeholder. It is not sent until a native speaker has reviewed it and it is switched on; English goes out meanwhile.
        </Banner>
      )}
      <Panel
        title={
          <h2 className="row">
            {x.templateCode} <Pill tone="info">{CH[x.channel]}</Pill>
            <Pill tone="info">{x.languageCode === 'sw' ? 'Kiswahili' : 'English'}</Pill>
          </h2>
        }
        sub={<>Sent on <span className="adm-code">{x.eventType}</span></>}
        actions={
          x.languageCode === 'en' && !hasSw ? (
            <Button size="sm" icon={<Languages />} perm="admin.config.manage" onClick={onAddSw}>
              Add Swahili version
            </Button>
          ) : undefined
        }
      >
        <div className="grid-2">
          <div className="stack">
            {x.channel !== 'SMS' && (
              <Field label="Subject">
                <Input value={x.subject ?? ''} onChange={(e) => setX({ ...x, subject: e.target.value })} />
              </Field>
            )}
            <Field
              label="Message"
              hint={
                x.channel === 'SMS'
                  ? `${smsLen} characters with sample values · ${seg} SMS${seg > 1 ? ' (costs more)' : ''}`
                  : 'Plain text; links are made clickable'
              }
              error={unknown.length ? `Unknown placeholder: ${unknown.map((u) => `{{${u}}}`).join(', ')}` : undefined}
            >
              <Textarea rows={6} value={bodyText} onChange={(e) => setX({ ...x, body: e.target.value })} />
            </Field>
            <div className="field">
              <label>Placeholders you can use</label>
              <div className="row-wrap">
                {Object.keys(SAMPLE_VALUES).slice(0, 18).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className="tag"
                    style={{ cursor: 'pointer', background: 'var(--paper)' }}
                    onClick={() => setX({ ...x, body: `${bodyText} {{${k}}}` })}
                  >
                    {`{{${k}}}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="stack">
            <div className="row">
              <strong className="small">Preview</strong>
              <span className="spacer" />
              <Segmented
                value={sample ? 's' : 'r'}
                onChange={(v) => setSample(v === 's')}
                options={[
                  { id: 's', label: 'Sample values' },
                  { id: 'r', label: 'Placeholders' },
                ]}
              />
            </div>
            {preview}
            <p className="xs faint" style={{ margin: 0 }}>
              Sample: unit MSKU 402117 8 for BL BMLU2409881 at Dar es Salaam main yard.
            </p>
          </div>
        </div>
      </Panel>
      <SaveBar>
        <Button variant="ghost" disabled={!dirty} onClick={() => setX(t)}>
          Undo changes
        </Button>
        <Button
          variant="primary"
          perm="admin.config.manage"
          disabled={!dirty || unknown.length > 0}
          onClick={() => onSave(x)}
        >
          Save template
        </Button>
      </SaveBar>
    </>
  );
}
