// Pure Date Formatting Helpers for DCC NG ICD

export function formatDate(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toISOString().replace('T', ' ').slice(0, 16);
}

export function formatDateOnly(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toISOString().slice(0, 10);
}

export function formatRelativeTime(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const diffSecs = Math.round((Date.now() - d.getTime()) / 1000);
  if (diffSecs < 60) return `${diffSecs}s ago`;
  const diffMins = Math.round(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}
