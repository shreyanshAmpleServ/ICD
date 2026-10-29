import { SAMPLE_VALUES } from '@/mock/admin';

/** Highlight {{placeholders}}; unknown ones in red. */
export function Filled({ text, sample }: { text: string; sample: boolean }) {
  const parts = text.split(/(\{\{[a-z_]+\}\})/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = /^\{\{([a-z_]+)\}\}$/.exec(p);
        if (!m) return <span key={i}>{p}</span>;
        const v = SAMPLE_VALUES[m[1]];
        if (v === undefined) return <span key={i} className="adm-ph-missing" title="Unknown placeholder">{p}</span>;
        return <span key={i} className="adm-ph" title={p}>{sample ? v : p}</span>;
      })}
    </>
  );
}

export const renderTemplateText = (t: string) =>
  t.replace(/\{\{([a-z_]+)\}\}/g, (_, k: string) => SAMPLE_VALUES[k] ?? `{{${k}}}`);
