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
    siteSettings: { showClock: true, showWeather: true },
    myTickets: [],
    allTickets: []
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
  sans: "'Inter', sans-serif",
  system: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  dyslexic: "'Open Dyslexic', 'OpenDyslexic', sans-serif"
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
  return { showClock: true, showWeather: true };
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
  "login", "onboarding", "dashboard", "profile", "rating", "stats", "add",
  "requests", "documents", "news", "support", "settings",
  "admin/approvals", "admin/requests", "admin/types", "admin/users", "admin/teacher", "admin/documents", "admin/support", "admin/announcements"
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
  if (!isAuth) return path === "login";
  const role = userDoc.role || "teacher";
  if (path === "onboarding") return true;
  if (role === "teacher") {
    if (userDoc.onboarded !== true) return false;
    if (path.startsWith("admin/")) return false;
    return ["dashboard", "profile", "rating", "stats", "add", "requests", "documents", "news", "support", "settings"].includes(path);
  }
  if (role === "admin") {
    if (path === "add") return false;
    return ["dashboard", "profile", "rating", "stats", "documents", "news", "settings"].includes(path) || path.startsWith("admin/");
  }
  return false;
}

export function updateRouteVisibility(path) {
  document.querySelectorAll("[data-route]").forEach(sec => {
    sec.hidden = sec.getAttribute("data-route") !== path;
  });
}

export function toast(msg, kind = "info") {
  const id = Math.random().toString(36).slice(2);
  const item = { id, msg, kind };
  setState({ toasts: [item, ...store.state.toasts].slice(0, 3) });
  setTimeout(() => setState({ toasts: store.state.toasts.filter(t => t.id !== id) }), 3200);
}
