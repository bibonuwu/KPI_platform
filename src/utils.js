import { t } from "./i18n.js";

export const fmtPoints = (n) => (Number(n) || 0).toLocaleString("ru-RU");
export const safeText = (v) => (v ?? "").toString().trim();

export function ymd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function tsKey(x) {
  const t = x?.createdAt;
  const sec = t?.seconds ?? 0;
  const ns = t?.nanoseconds ?? 0;
  return sec * 1_000_000_000 + ns;
}

export function sum(arr, fn) { return arr.reduce((a, x) => a + (Number(fn(x)) || 0), 0); }

export function lastDays(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push({ ymd: ymd(d), label: `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` });
  }
  return out;
}

export function lastMonths(n) {
  const out = [];
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(start);
    d.setMonth(start.getMonth() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    out.push({ key: `${y}-${m}`, label: `${m}-${String(y).slice(2)}` });
  }
  return out;
}

export function startYMDFromDays(days) {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  return ymd(d);
}

export const RANK_TABLE = [
  { key: "lvlNewbie",     min: 0,    max: 49,   icon: "🌱", color: "#9ca3af" },
  { key: "lvlConfident",  min: 50,   max: 149,  icon: "⚡", color: "#60a5fa" },
  { key: "lvlPro",        min: 150,  max: 299,  icon: "🔥", color: "#f59e0b" },
  { key: "lvlLeader",     min: 300,  max: 499,  icon: "👑", color: "#a855f7" },
  { key: "lvlMaster",     min: 500,  max: 699,  icon: "💎", color: "#3b82f6" },
  { key: "lvlGrandmaster",min: 700,  max: 899,  icon: "🏆", color: "#ec4899" },
  { key: "lvlLegend",     min: 900,  max: 1000, icon: "🐉", color: "#ef4444" },
];

export function levelFromPoints(p) {
  const x = Number(p) || 0;
  for (let i = RANK_TABLE.length - 1; i >= 0; i--) {
    const r = RANK_TABLE[i];
    if (x >= r.min) {
      const next = i < RANK_TABLE.length - 1 ? RANK_TABLE[i + 1].min : null;
      const range = (r.max + 1) - r.min;
      const pct = next ? Math.min(100, Math.round(((x - r.min) / range) * 100)) : 100;
      return { name: t(r.key), next, pct, idx: i, icon: r.icon, color: r.color };
    }
  }
  return { name: t("lvlNewbie"), next: 50, pct: Math.round((x / 50) * 100), idx: 0, icon: "🌱", color: "#9ca3af" };
}

export function getAcademicYear(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  return m >= 8 ? { start: y, end: y + 1 } : { start: y - 1, end: y };
}

export const QUARTER_RANGES = [
  { key: "q1", startMonth: 9, startDay: 1, endMonth: 10, endDay: 25 },
  { key: "q2", startMonth: 11, startDay: 5, endMonth: 12, endDay: 27 },
  { key: "q3", startMonth: 1, startDay: 10, endMonth: 3, endDay: 21 },
  { key: "q4", startMonth: 4, startDay: 1, endMonth: 5, endDay: 25 },
];

export function getQuarterDates(quarterKey, refDate = new Date()) {
  const ay = getAcademicYear(refDate);
  const q = QUARTER_RANGES.find(x => x.key === quarterKey);
  if (!q) return null;
  const startYear = q.startMonth >= 9 ? ay.start : ay.end;
  const endYear = q.endMonth >= 9 ? ay.start : ay.end;
  return {
    start: `${startYear}-${String(q.startMonth).padStart(2, "0")}-${String(q.startDay).padStart(2, "0")}`,
    end: `${endYear}-${String(q.endMonth).padStart(2, "0")}-${String(q.endDay).padStart(2, "0")}`
  };
}

export function getCurrentQuarter(date = new Date()) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if ((m === 9) || (m === 10 && d <= 25)) return "q1";
  if ((m === 11 && d >= 5) || m === 12) return "q2";
  if ((m === 1 && d >= 10) || m === 2 || (m === 3 && d <= 21)) return "q3";
  if (m === 4 || (m === 5 && d <= 25)) return "q4";
  return null;
}

export function filterByQuarter(items, quarterKey, dateField = "eventDate") {
  if (!quarterKey || quarterKey === "all") return items;
  const range = getQuarterDates(quarterKey);
  if (!range) return items;
  return items.filter(item => {
    const d = item[dateField];
    if (!d) return false;
    return d >= range.start && d <= range.end;
  });
}

export function getAcademicYearLabel(refDate = new Date()) {
  const ay = getAcademicYear(refDate);
  return `${ay.start}–${ay.end}`;
}

export function exportToCsv(filename, headers, rows) {
  const BOM = "\uFEFF";
  const escape = (v) => {
    const s = String(v ?? "").replace(/"/g, '""');
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
  };
  const csv = BOM + [headers.map(escape).join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportRatingCsv(users, types) {
  const teachers = users.filter(x => (x.role || "teacher") !== "admin");
  const sorted = [...teachers].sort((a, b) => (Number(b.totalPoints) || 0) - (Number(a.totalPoints) || 0));
  const headers = [t("rank"), t("teacher"), "Email", t("subject"), t("totalPoints")];
  const rows = sorted.map((u, i) => [
    i + 1,
    u.displayName || u.email || "—",
    u.email || "",
    u.subject || "—",
    Number(u.totalPoints) || 0
  ]);
  exportToCsv(`rating_${ymd()}.csv`, headers, rows);
}

export function exportSubmissionsCsv(submissions, typesMap, quarter = "all") {
  const filtered = filterByQuarter(submissions, quarter);
  const headers = [t("date"), t("type"), t("title"), t("points"), t("status"), t("quarter")];
  const rows = filtered.map(s => {
    const tp = typesMap?.get(s.typeId);
    const qKey = getQuarterForDate(s.eventDate);
    return [
      s.eventDate || "—",
      tp?.name || s.typeName || "—",
      s.title || "—",
      Number(s.points) || 0,
      s.status || "—",
      qKey ? t(qKey) : "—"
    ];
  });
  exportToCsv(`kpi_${quarter}_${ymd()}.csv`, headers, rows);
}

export function getQuarterForDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  return getCurrentQuarter(d);
}

export function dateRangeDays(fromYmd, toYmd) {
  const a = safeText(fromYmd);
  const b = safeText(toYmd) || a;
  const da = new Date(`${a}T00:00:00`);
  const dbDate = new Date(`${b}T00:00:00`);
  if (Number.isNaN(da.getTime()) || Number.isNaN(dbDate.getTime())) return 1;
  const ms = dbDate.getTime() - da.getTime();
  const diff = Math.floor(ms / 86400000);
  return Math.max(1, diff + 1);
}

export function requestKindLabel(key) {
  const REQUEST_KINDS = [
    { key: "leave", tKey: "rkLeave", compMode: "none" },
    { key: "weekday_off", tKey: "rkWeekdayOff", compMode: "use" },
    { key: "weekend_work", tKey: "rkWeekendWork", compMode: "earn" }
  ];
  const k = REQUEST_KINDS.find(x => x.key === key);
  return k ? t(k.tKey) : String(key || "");
}

export const REQUEST_KINDS = [
  { key: "leave", tKey: "rkLeave", compMode: "none" },
  { key: "weekday_off", tKey: "rkWeekdayOff", compMode: "use" },
  { key: "weekend_work", tKey: "rkWeekendWork", compMode: "earn" }
];
