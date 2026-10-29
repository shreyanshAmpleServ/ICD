/* Deterministic helpers for sample data: same data on every load. */
let seed = 20261007;
export function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
export const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
export const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));

/** ISO 6346 check digit. */
export function iso6346(prefix10: string) {
  const val = (ch: string) => {
    if (/\d/.test(ch)) return Number(ch);
    let v = ch.charCodeAt(0) - 55; // A=10
    v += Math.floor((v - 1) / 10); // skip multiples of 11
    return v;
  };
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += val(prefix10[i]) * Math.pow(2, i);
  return String((sum % 11) % 10);
}
export function containerNo(owner: string) {
  const serial = String(int(100000, 999999));
  const p = owner + serial;
  return p + iso6346(p);
}

const VIN_CHARS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
export function vin(wmi: string) {
  let s = wmi;
  while (s.length < 17) s += VIN_CHARS[int(0, VIN_CHARS.length - 1)];
  return s;
}

/** ISO timestamp relative to the demo clock (07 Oct 2026 10:30 EAT). */
const BASE = new Date('2026-10-07T10:30:00+03:00').getTime();
export const at = (hoursAgo: number) => new Date(BASE - hoursAgo * 3600_000).toISOString();
export const day = (daysFromToday: number) => new Date(BASE + daysFromToday * 86400_000).toISOString().slice(0, 10);
export const money = (n: number) => n.toFixed(2);
