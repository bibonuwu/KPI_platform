import { useState, useEffect } from "react";
import { db, doc, updateDoc } from "./firebase-config.js";

function parseRoute() {
  const raw = (window.location.hash || "#/login").replace(/^#\/?/, "");
  const [pRaw, qs] = raw.split("?");
  let path = (pRaw || "login").replace(/\/+$/, "");
  if (!path || path === '/') path = 'login';
  const params = {};
  if (qs) {
    const sp = new URLSearchParams(qs);
    for (const [k, v] of sp.entries()) params[k] = v;
  }
  return { path, params };
}

export const store = {
  state: {
    route: parseRoute(),
    booting: true,
    loading: false,
    toasts: [],
    modal: null,
    authUser: null,
    userDoc: null,
    types: [],
    users: [],
    mySubmissions: [],
    pendingSubmissions: [],
    adminRecentSubs: [],
    myRequests: [],
    pendingRequests: [],
    adminRecentRequests: [],
    myDocuments: [],
    allDocuments: [],
    myTeacherDocs: [],
    news: [],
    announcements: [],
    myGoals: [],
    quarterFilter: "all",
    statsRangeMode: "365d",
    statsView: "mine",
    theme: (function () { try { return localStorage.getItem("kpi_theme") || "dark"; } catch (e) { return "dark"; } })(),
    font: (function () { try { return localStorage.getItem("kpi_font") || "default"; } catch (e) { return "default"; } })(),
    accessibility: { reduceMotion: false, largeText: false, highContrast: false },
    showAccessibilityModal: false,
    siteSettings: { showClock: true, showWeather: true, showAi: true, showOnline: true },
    myTickets: [],
    allTickets: [],
    events: []
  },
  subs: new Set()
};

export function setState(patch) {
  store.state = { ...store.state, ...patch };
  for (const fn of store.subs) fn(store.state);
}

export function useStore() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const fn = () => rerender(x => x + 1);
    store.subs.add(fn);
    return () => store.subs.delete(fn);
  }, []);
  return store.state;
}

export function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem("kpi_theme", t); } catch (e) { }
  setState({ theme: t });
}

export function toggleTheme() {
  const next = store.state.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  const u = store.state.userDoc;
  if (u) {
    updateDoc(doc(db, "users", u.uid), { preferredTheme: next }).catch(() => { });
  }
}

export const FONT_MAP = {
  default: "'Onest', system-ui, sans-serif",
  sans: "'Times New Roman', Times, serif",
  system: "'Roboto', sans-serif",
  dyslexic: "'Montserrat', sans-serif"
};

export function applyFont(f) {
  const val = FONT_MAP[f] || FONT_MAP.default;
  document.documentElement.style.setProperty('--font', val);
  try { localStorage.setItem("kpi_font", f); } catch (e) {}
  setState({ font: f });
}

export function getDefaultAccessibility() {
  return { reduceMotion: false, largeText: false, highContrast: false };
}

export function applyAccessibility(acc) {
  const el = document.documentElement;
  el.setAttribute("data-reduce-motion", acc.reduceMotion ? "true" : "false");
  el.setAttribute("data-large-text", acc.largeText ? "true" : "false");
  el.setAttribute("data-high-contrast", acc.highContrast ? "true" : "false");
  setState({ accessibility: { ...acc } });
}

export async function saveAccessibilityToFirestore(uid, acc) {
  try {
    await updateDoc(doc(db, "users", uid), { accessibility: acc });
  } catch (e) { console.warn("Accessibility save failed:", e); }
}

export function getDefaultSiteSettings() {
  return { showClock: true, showWeather: true, showAi: true, showOnline: true };
}

export function applySiteSettings(s) {
  setState({ siteSettings: { ...getDefaultSiteSettings(), ...s } });
}

export async function saveSiteSettings(uid, s) {
  try {
    await updateDoc(doc(db, "users", uid), { siteSettings: s });
  } catch (e) { console.warn("SiteSettings save failed:", e); }
}

export const ROUTES = [
  "login", "onboarding", "dashboard", "profile", "rating", "stats", "add", "books",
  "requests", "documents", "news", "support", "settings", "classroomtools", "calendar", "about",
  "admin/approvals", "admin/requests", "admin/types", "admin/users", "admin/teacher", "admin/documents", "admin/support", "admin/announcements", "admin/events", "admin/director", "admin/skud"
];

export { parseRoute };

export function navigate(path, params = {}) {
  try { window.__closeDrawer?.(); } catch (e) { }
  const qs = new URLSearchParams(params).toString();
  window.location.hash = `#/${path}${qs ? `?${qs}` : ""}`;
}

export function resolvePath(path) { return ROUTES.includes(path) ? path : "login"; }

export function canAccess(path, userDoc) {
  const isAuth = !!userDoc;
  if (path === "about") return true;
  if (!isAuth) return path === "login";
  const role = userDoc.role || "teacher";
  if (path === "onboarding") return true;
  if (role === "teacher") {
    if (userDoc.onboarded !== true) return false;
    if (path.startsWith("admin/")) return false;
    return ["dashboard", "profile", "rating", "stats", "add", "books", "requests", "documents", "news", "support", "settings", "classroomtools", "about"].includes(path);
  }
  if (role === "admin") {
    if (path === "add") return false;
    if (path === "books") return false;
    return ["dashboard", "profile", "rating", "stats", "documents", "news", "settings", "classroomtools", "calendar", "about"].includes(path) || path.startsWith("admin/");
  }
  return false;
}

export function updateRouteVisibility(path) {
  document.querySelectorAll("[data-route]").forEach(sec => {
    sec.hidden = sec.getAttribute("data-route") !== path;
  });
}

let _toastAudioCtx = null;
function _getAudioCtx() {
  if (_toastAudioCtx) return _toastAudioCtx;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    _toastAudioCtx = new Ctx();
  } catch { _toastAudioCtx = null; }
  return _toastAudioCtx;
}

export function playToastSound(kind = "info") {
  try {
    if (localStorage.getItem("toastSound") === "off") return;
    const ctx = _getAudioCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    // tone presets per kind
    const presets = {
      ok:      [{ f: 880, t: 0.00 }, { f: 1320, t: 0.09 }],
      success: [{ f: 880, t: 0.00 }, { f: 1320, t: 0.09 }],
      info:    [{ f: 660, t: 0.00 }, { f: 880,  t: 0.10 }],
      warning: [{ f: 740, t: 0.00 }, { f: 740,  t: 0.12 }],
      error:   [{ f: 320, t: 0.00 }, { f: 220,  t: 0.10 }],
    };
    const seq = presets[kind] || presets.info;
    const now = ctx.currentTime;
    seq.forEach(({ f, t }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      const start = now + t;
      const dur = 0.13;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    });
  } catch {}
}

export function toast(msg, kind = "info", opts = {}) {
  const id = Math.random().toString(36).slice(2);
  const k = kind === "success" ? "ok" : kind;
  const item = {
    id, msg, kind: k,
    title: opts.title || null,
    action: opts.action || null,
    actionLabel: opts.actionLabel || null,
    duration: typeof opts.duration === "number" ? opts.duration : 3800,
  };
  setState({ toasts: [item, ...store.state.toasts].slice(0, 4) });
  playToastSound(k);
  setTimeout(() => setState({ toasts: store.state.toasts.filter(t => t.id !== id) }), item.duration);
}

export function dismissToast(id) {
  setState({ toasts: store.state.toasts.filter(t => t.id !== id) });
}
