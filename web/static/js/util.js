// Tiny helpers: safe HTML templating, time formatting, icons.
export class Safe { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = (s) => new Safe(s);
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
function part(v) {
  if (v instanceof Safe) return v.s;
  if (Array.isArray(v)) return v.map(part).join("");
  if (v == null || v === false) return "";
  return esc(v);
}
/** Tagged template: every interpolation is escaped unless it is itself html`` output. */
export function html(strings, ...vals) {
  let out = strings[0];
  vals.forEach((v, i) => { out += part(v) + strings[i + 1]; });
  return new Safe(out);
}
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export function mount(el, safe) { el.innerHTML = safe.s; return el; }

export function mmss(sec) {
  sec = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
export function parseTs(v) {
  if (typeof v === "number") return v;
  return String(v).replace(/[\[\]]/g, "").split(":").reduce((t, p) => t * 60 + parseFloat(p), 0);
}
export function mins(sec) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
export function ago(ts) {
  const d = (Date.now() / 1000 - ts);
  if (d < 90) return "just now";
  if (d < 3600) return `${Math.round(d / 60)} min ago`;
  if (d < 86400) return `${Math.round(d / 3600)} h ago`;
  if (d < 86400 * 30) return `${Math.round(d / 86400)} d ago`;
  return new Date(ts * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
export const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;

export function store(key, value) {
  try {
    if (value === undefined) return JSON.parse(localStorage.getItem(key));
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage may be blocked */ }
  return null;
}

export function toast(msg) {
  document.querySelector(".toast")?.remove();
  const t = Object.assign(document.createElement("div"), { className: "toast", textContent: msg });
  t.setAttribute("role", "status");
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}

const svg = (d, extra = "") => raw(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`);
export const icon = {
  play: raw(`<svg viewBox="0 0 10 10" fill="currentColor" aria-hidden="true"><path d="M2 1l7 4-7 4z"/></svg>`),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7"/>'),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  chev: svg('<path d="M6 9l6 6 6-6"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: svg('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
  lock: svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  warn: svg('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>'),
  send: svg('<path d="M4 12l16-8-6 16-2-6z"/>'),
  trash: svg('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  film: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M16 4v16M3 9h5M3 15h5M16 9h5M16 15h5"/>'),
  print: svg('<path d="M7 9V3h10v6M7 17H4v-6h16v6h-3M7 14h10v7H7z"/>'),
  bulb: svg('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.3 1 2.5h6c0-1.2.4-1.9 1-2.5A6 6 0 0 0 12 3z"/>'),
  logo: raw(`<svg viewBox="0 0 28 28" aria-hidden="true"><rect width="28" height="28" rx="8" fill="var(--blue)"/><path d="M6 8.5h16M8.5 13h11M11 17.5h6M13 22h2" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>`),
};
