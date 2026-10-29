export function Loader({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="row" style={{ gap: 8, padding: '16px 0', alignItems: 'center', color: 'var(--ink-2)' }}>
      <span className="dot" style={{ animation: 'spin 1s linear infinite' }} />
      <span>{label}</span>
    </div>
  );
}
