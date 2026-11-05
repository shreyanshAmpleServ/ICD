"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.money = exports.day = exports.at = exports.int = exports.pick = void 0;
exports.rnd = rnd;
exports.iso6346 = iso6346;
exports.containerNo = containerNo;
exports.vin = vin;
/* Deterministic helpers for sample data: same data on every load. */
let seed = 20261007;
function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
const pick = (a) => a[Math.floor(rnd() * a.length)];
exports.pick = pick;
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
exports.int = int;
/** ISO 6346 check digit. */
function iso6346(prefix10) {
    const val = (ch) => {
        if (/\d/.test(ch))
            return Number(ch);
        let v = ch.charCodeAt(0) - 55; // A=10
        v += Math.floor((v - 1) / 10); // skip multiples of 11
        return v;
    };
    let sum = 0;
    for (let i = 0; i < 10; i++)
        sum += val(prefix10[i]) * Math.pow(2, i);
    return String((sum % 11) % 10);
}
function containerNo(owner) {
    const serial = String((0, exports.int)(100000, 999999));
    const p = owner + serial;
    return p + iso6346(p);
}
const VIN_CHARS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
function vin(wmi) {
    let s = wmi;
    while (s.length < 17)
        s += VIN_CHARS[(0, exports.int)(0, VIN_CHARS.length - 1)];
    return s;
}
/** ISO timestamp relative to the demo clock (07 Oct 2026 10:30 EAT). */
const BASE = new Date('2026-10-07T10:30:00+03:00').getTime();
const at = (hoursAgo) => new Date(BASE - hoursAgo * 3600_000).toISOString();
exports.at = at;
const day = (daysFromToday) => new Date(BASE + daysFromToday * 86400_000).toISOString().slice(0, 10);
exports.day = day;
const money = (n) => n.toFixed(2);
exports.money = money;
