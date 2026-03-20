// ── Constants ─────────────────────────────────────────────────────────────────
export const DAYS      = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
export const FULL_DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export const TECH_COLORS = [
  "#0ea5e9","#22c55e","#f59e0b","#ef4444","#a855f7",
  "#06b6d4","#f97316","#84cc16","#ec4899","#14b8a6","#8b5cf6","#fb923c"
];

export const SAMPLE_RATES = [
  { label: "30s",   value: 30_000  },
  { label: "1 min", value: 60_000  },
  { label: "5 min", value: 300_000 },
  { label: "10 min",value: 600_000 },
];

// ── Date helpers ──────────────────────────────────────────────────────────────
export function getWeekKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

export function todayIndex() { return new Date().getDay(); }
export function todayName()  { return FULL_DAYS[todayIndex()]; }

// ── Format helpers ────────────────────────────────────────────────────────────
export function formatTime(ms) {
  if (!ms || ms < 0) return "0:00:00";
  const s  = Math.floor(ms / 1000);
  const h  = Math.floor(s / 3600);
  const m  = Math.floor((s % 3600) / 60);
  const sc = s % 60;
  return `${h}:${pad(m)}:${pad(sc)}`;
}

export function formatHours(ms) {
  return (!ms || ms < 0) ? "0.00" : (ms / 3_600_000).toFixed(2);
}

export function formatHM(ms) {
  if (!ms || ms < 0) return "0h 0m";
  const t = Math.floor(ms / 60_000);
  return `${Math.floor(t / 60)}h ${t % 60}m`;
}

export function formatTS(iso) {
  if (!iso) return "--";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(iso) {
  if (!iso) return "--";
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function formatDateTime(iso) {
  if (!iso) return "--";
  return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const pad = (n) => String(n).padStart(2, "0");

// ── Color helpers ─────────────────────────────────────────────────────────────
export function hexAlpha(hex, alpha) {
  return hex + Math.round(alpha * 255).toString(16).padStart(2, "0");
}
