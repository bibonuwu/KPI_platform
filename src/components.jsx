import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { t, getLang, setLang } from "./i18n.js";
import {
  auth, db, storage, doc, updateDoc, signOut, OAuthProvider, signInWithPopup,
  signInWithRedirect, updatePassword, reauthenticateWithCredential, EmailAuthProvider,
  sendPasswordResetEmail, MICROSOFT_TENANT, getDownloadURL, ref, uploadBytes
} from "./firebase-config.js";
import {
  store, setState, useStore, navigate, toast, applyTheme, toggleTheme, FONT_MAP,
  applyFont, getDefaultAccessibility, applyAccessibility, saveAccessibilityToFirestore,
  getDefaultSiteSettings, applySiteSettings, saveSiteSettings, ROUTES, canAccess
} from "./store.js";
import {
  fmtPoints, safeText, ymd, sum, lastDays, lastMonths, levelFromPoints,
  getCurrentQuarter, filterByQuarter, getAcademicYearLabel, getQuarterDates,
  QUARTER_RANGES, REQUEST_KINDS, requestKindLabel, dateRangeDays
} from "./utils.js";
import { DEFAULT_TYPES, NEWS_CAT_ICONS, NEWS_CATEGORIES } from "./constants.js";
import {
  fetchGoals, createGoal, updateGoal, deleteGoalDoc, uploadAvatar,
  updateProfile, setUserOnline, fetchNewsAll, renderRichDesc, newsCatLabel,
  ensureUserDoc
} from "./data.js";

export function Icon({ name }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none" };
  const s = { stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "user": return <svg {...common}><path {...s} d="M20 21a8 8 0 10-16 0" /><path {...s} d="M12 13a4 4 0 100-8 4 4 0 000 8z" /></svg>;
    case "rank": return <svg {...common}><path {...s} d="M4 20V10" /><path {...s} d="M10 20V4" /><path {...s} d="M16 20v-6" /><path {...s} d="M22 20v-9" /></svg>;
    case "chart": return <svg {...common}><path {...s} d="M4 19V5" /><path {...s} d="M4 19h16" /><path {...s} d="M7 15l3-3 3 2 5-6" /></svg>;
    case "plus": return <svg {...common}><path {...s} d="M12 5v14" /><path {...s} d="M5 12h14" /></svg>;
    case "logout": return <svg {...common}><path {...s} d="M10 17l5-5-5-5" /><path {...s} d="M15 12H3" /></svg>;
    case "check": return <svg {...common}><path {...s} d="M20 6L9 17l-5-5" /></svg>;
    case "x": return <svg {...common}><path {...s} d="M6 6l12 12M18 6L6 18" /></svg>;
    case "file": return <svg {...common}><path {...s} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path {...s} d="M14 2v6h6" /></svg>;
    case "shield": return <svg {...common}><path {...s} d="M12 22s8-4 8-10V6l-8-3-8 3v6c0 6 8 10 8 10z" /></svg>;
    case "sun": return <svg {...common}><circle {...s} cx="12" cy="12" r="4" /><path {...s} d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>;
    case "moon": return <svg {...common}><path {...s} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>;
    case "news": return <svg {...common}><path {...s} d="M4 22h14a2 2 0 002-2V7.5L14.5 2H6a2 2 0 00-2 2v4" /><path {...s} d="M14 2v6h6" /><path {...s} d="M2 15h10M2 19h6" /></svg>;
    case "bug": return <svg {...common}><path {...s} d="M8 2l1.88 1.88M16 2l-1.88 1.88M9 7.13v-1a3.003 3.003 0 116 0v1" /><path {...s} d="M12 20c-3.3 0-6-2.7-6-6v-3a6 6 0 0112 0v3c0 3.3-2.7 6-6 6z" /><path {...s} d="M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M6 17l-4 1M17.47 9c1.93-.2 3.53-1.9 3.53-4M18 13h4M18 17l4 1" /></svg>;
    case "home": return <svg {...common}><path {...s} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline {...s} points="9 22 9 12 15 12 15 22" /></svg>;
    case "chevron": return <svg {...common} style={{ transition: "transform .3s cubic-bezier(.4,0,.2,1)" }}><path {...s} d="M6 9l6 6 6-6" /></svg>;
    case "folder": return <svg {...common}><path {...s} d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>;
    case "clipboard": return <svg {...common}><path {...s} d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><rect {...s} x="8" y="2" width="8" height="4" rx="1" /></svg>;
    case "info": return <svg {...common}><circle {...s} cx="12" cy="12" r="10" /><path {...s} d="M12 16v-4M12 8h.01" /></svg>;
    case "eye": return <svg {...common}><path {...s} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle {...s} cx="12" cy="12" r="3" /></svg>;
    case "briefcase": return <svg {...common}><rect {...s} x="2" y="7" width="20" height="14" rx="2" /><path {...s} d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></svg>;
    case "settings": return <svg {...common}><circle {...s} cx="12" cy="12" r="3" /><path {...s} d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z" /></svg>;
    case "refresh": return <svg {...common}><path {...s} d="M23 4v6h-6" /><path {...s} d="M1 20v-6h6" /><path {...s} d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>;
    case "bell": return <svg {...common}><path {...s} d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path {...s} d="M13.73 21a2 2 0 01-3.46 0" /></svg>;
    case "calendar": return <svg {...common}><rect {...s} x="3" y="4" width="18" height="18" rx="2" /><path {...s} d="M16 2v4M8 2v4M3 10h18" /></svg>;
    case "clock": return <svg {...common}><circle {...s} cx="12" cy="12" r="10" /><path {...s} d="M12 6v6l4 2" /></svg>;
    case "trending-up": return <svg {...common}><path {...s} d="M23 6l-9.5 9.5-5-5L1 18" /><path {...s} d="M17 6h6v6" /></svg>;
    case "hash": return <svg {...common}><path {...s} d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" /></svg>;
    case "tools": return <svg {...common}><path {...s} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" /></svg>;
    default: return null;
  }
}
export const Btn = ({ kind = "", children, ...props }) => <button className={["btn", kind].join(" ").trim()} {...props}>{children}</button>;
export const Input = (p) => <input className="input" {...p} />;
export const Select = (p) => <select className="select" {...p} />;
export const Textarea = (p) => <textarea className="textarea" {...p} />;

export const FileDrop = React.forwardRef(function FileDrop(
  { accept, onChange, value, required, multiple, disabled, hint, className = "", children, ...rest },
  ref
) {
  const inputRef = useRef(null);
  React.useImperativeHandle(ref, () => inputRef.current, []);
  const [drag, setDrag] = useState(false);

  const openPicker = () => { if (!disabled) inputRef.current?.click(); };

  const fireChange = (files) => {
    if (!files || !files.length) return;
    try {
      const dt = new DataTransfer();
      for (const f of files) dt.items.add(f);
      if (inputRef.current) inputRef.current.files = dt.files;
    } catch { /* Safari/older browsers: fall through to synthetic event */ }
    if (onChange) onChange({ target: { files, value: "" } });
  };

  const mime = (accept || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  const matchesAccept = (f) => {
    if (!mime.length) return true;
    const name = (f.name || "").toLowerCase();
    const type = (f.type || "").toLowerCase();
    return mime.some(a => {
      if (a.startsWith(".")) return name.endsWith(a);
      if (a.endsWith("/*")) return type.startsWith(a.slice(0, -1));
      return type === a;
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    if (disabled) return;
    const list = Array.from(e.dataTransfer?.files || []).filter(matchesAccept);
    if (!list.length) return;
    fireChange(multiple ? list : [list[0]]);
  };

  const clear = (e) => {
    e.stopPropagation();
    if (inputRef.current) inputRef.current.value = "";
    if (onChange) onChange({ target: { files: [], value: "" } });
  };

  const file = value && typeof value === "object" && "name" in value ? value : null;
  const label = hint || t("dropFileHint");

  return (
    <div
      className={`filedrop${drag ? " is-drag" : ""}${disabled ? " is-disabled" : ""}${file ? " has-file" : ""} ${className}`.trim()}
      onClick={openPicker}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPicker(); } }}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDrag(true); }}
      onDragEnter={(e) => { e.preventDefault(); if (!disabled) setDrag(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDrag(false); }}
      onDrop={handleDrop}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        required={required && !file}
        multiple={multiple}
        disabled={disabled}
        onChange={onChange}
        className="filedrop__native"
        tabIndex={-1}
        {...rest}
      />
      <div className="filedrop__icon"><Icon name="file" /></div>
      {file ? (
        <div className="filedrop__body">
          <div className="filedrop__name" title={file.name}>{file.name}</div>
          <div className="filedrop__meta">{(file.size / 1024 / 1024).toFixed(2)} MB · {t("clickToReplace")}</div>
        </div>
      ) : (
        <div className="filedrop__body">
          <div className="filedrop__title">{label}</div>
          <div className="filedrop__meta">{t("orClickToSelect")}</div>
        </div>
      )}
      {file && !disabled && (
        <button type="button" className="filedrop__clear" onClick={clear} aria-label={t("clearFile")}>
          <Icon name="x" />
        </button>
      )}
      {children}
    </div>
  );
});
export const Pill = ({ kind, children, style }) => <span className={`pill ${kind}`} style={style}>{children}</span>;
// Mobile-friendly data display: cards on mobile, table on desktop
export function DataCards({ columns, rows, emptyText }) {
  if (!emptyText) emptyText = t("noData");
  if (!rows.length) return <p className="p muted" style={{ padding: "12px 0" }}>{emptyText}</p>;
  return (
    <div className="datacards-wrap">
      {/* Desktop: table */}
      <div className="heatwrap desktop-table">
        <table className="table">
          <thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.__key ?? i}>
                {columns.map(c => (
                  <td key={c.key} className="tiny">{c.render ? c.render(row) : row[c.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile: cards */}
      <div className="mobile-cards">
        {rows.map((row, i) => (
          <div key={row.__key ?? i} className="mobile-card glass">
            {columns.map(c => (
              <div key={c.key} className="mobile-card__row">
                <span className="mobile-card__label">{c.label}</span>
                <span className="mobile-card__val">{c.render ? c.render(row) : row[c.key]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}


/** ---------- Quarter filter selector ---------- */
export function QuarterFilter({ value, onChange, showLabel = true }) {
  const curQ = getCurrentQuarter();
  const quarters = [
    { key: "all", label: t("allQuarters") },
    { key: "q1", label: t("q1"), dates: t("q1Dates") },
    { key: "q2", label: t("q2"), dates: t("q2Dates") },
    { key: "q3", label: t("q3"), dates: t("q3Dates") },
    { key: "q4", label: t("q4"), dates: t("q4Dates") },
  ];
  return (
    <div className="quarter-filter">
      {showLabel && <span className="quarter-filter__label">{t("quarter")}:</span>}
      <div className="quarter-filter__btns">
        {quarters.map(q => (
          <button
            key={q.key}
            className={`quarter-filter__btn${value === q.key ? " quarter-filter__btn--active" : ""}${q.key === curQ ? " quarter-filter__btn--current" : ""}`}
            onClick={() => onChange(q.key)}
            title={q.dates || ""}
          >
            {q.label}
            {q.key === curQ && <span className="quarter-filter__dot" />}
          </button>
        ))}
      </div>
      {showLabel && <span className="quarter-filter__year">{t("academicYear")}: {getAcademicYearLabel()}</span>}
    </div>
  );
}

/** ---------- Goals widget ---------- */
export function GoalsWidget({ compact = false }) {
  const st = useStore();
  const u = st.userDoc;
  const goals = st.myGoals || [];
  const subs = st.mySubmissions || [];
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState("");
  const [scope, setScope] = useState("quarter");
  const [section, setSection] = useState("");
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState("goals"); // "goals" | "deadlines"
  const [pendingProgress, setPendingProgress] = useState({});
  const [compactTab, setCompactTab] = useState("goals"); // "goals" | "history"
  const [goalsPage, setGoalsPage] = useState(1);
  const [histPage, setHistPage] = useState(1);
  const PER_PAGE = 4;

  if (!u || u.role === "admin") return null;

  const types = st.types || [];

  const approvedSubs = subs.filter(s => s.status === "approved");

  const computeProgress = (goal) => {
    // If manual progress is set, use it
    if (goal.manualProgress != null && goal.manualProgress > 0) {
      const targetPts = Number(goal.targetPoints) || 1;
      const earned = Math.round(targetPts * goal.manualProgress / 100);
      return { earned, pct: Math.min(100, goal.manualProgress) };
    }
    let relevantSubs = approvedSubs;
    // Only count submissions created after the goal was created
    if (goal.createdAt) {
      const goalCreated = goal.createdAt?.seconds ? goal.createdAt.seconds * 1000
        : goal.createdAt?.toDate ? goal.createdAt.toDate().getTime()
        : new Date(goal.createdAt).getTime();
      relevantSubs = relevantSubs.filter(s => {
        const subTime = s.createdAt?.seconds ? s.createdAt.seconds * 1000
          : s.createdAt?.toDate ? s.createdAt.toDate().getTime()
          : new Date(s.createdAt || 0).getTime();
        return subTime >= goalCreated;
      });
    }
    if (goal.section) {
      relevantSubs = relevantSubs.filter(s => s.typeSection === goal.section);
    }
    if (goal.scope === "quarter") {
      const curQ = getCurrentQuarter();
      if (curQ) relevantSubs = filterByQuarter(relevantSubs, curQ);
    }
    const earned = sum(relevantSubs, s => s.points);
    const targetPts = Number(goal.targetPoints) || 1;
    return { earned, pct: Math.min(100, Math.round((earned / targetPts) * 100)) };
  };

  const isOverdue = (goal) => {
    if (!goal.deadline) return false;
    return goal.deadline < ymd() && !goal.completed;
  };

  const resetForm = () => {
    setTarget(""); setDeadline(""); setNote(""); setScope("quarter"); setSection(""); setEditId(null); setShowForm(false);
  };

  const startEdit = (g) => {
    if (editId === g.id && showForm) { resetForm(); return; }
    setEditId(g.id);
    setTarget(String(g.targetPoints || ""));
    setDeadline(g.deadline || "");
    setNote(g.note || "");
    setScope(g.scope || "quarter");
    setSection(g.section || "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!target || Number(target) <= 0) { toast(t("goalTarget"), "error"); return; }
    setSaving(true);
    try {
      if (editId) {
        await updateGoal(editId, { targetPoints: Number(target), deadline, note: safeText(note), scope, section: safeText(section) });
      } else {
        await createGoal({ uid: u.uid, targetPoints: Number(target), deadline, note, scope, section });
      }
      const fresh = await fetchGoals(u.uid);
      setState({ myGoals: fresh });
      toast(t("goalSaved"), "ok");
      resetForm();
    } catch (e) {
      toast(e?.message || t("error"), "error");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteGoalDoc(id);
      const fresh = await fetchGoals(u.uid);
      setState({ myGoals: fresh });
      toast(t("goalDeleted"), "ok");
    } catch (e) {
      toast(e?.message || t("error"), "error");
    }
  };

  const handleToggleComplete = async (g) => {
    if (!g.completed) {
      // Ask confirmation and submit for review
      if (!window.confirm(t("confirmSubmitGoal"))) return;
      try {
        // Create a submission from this goal for admin review
        const goalType = (st.types || []).find(tp => tp.section === g.section) || { id: "goal", name: g.note || t("goals"), section: g.section || "", subsection: "", defaultPoints: g.targetPoints };
        await createSubmission({
          uid: u.uid,
          type: { ...goalType, defaultPoints: g.targetPoints },
          title: g.note || t("goals"),
          description: `${t("goalTarget")}: ${g.targetPoints} · ${t("goalDeadline")}: ${g.deadline || "—"}`,
          eventDate: ymd(),
          evidenceLink: "",
          evidenceFileUrl: ""
        });
        await updateGoal(g.id, { completed: true });
        const fresh = await fetchGoals(u.uid);
        const mySubs = await fetchMySubmissions(u.uid);
        setState({ myGoals: fresh, mySubmissions: mySubs });
        toast(t("goalSubmitted"), "ok");
      } catch (e) {
        toast(e?.message || t("error"), "error");
      }
    } else {
      try {
        await updateGoal(g.id, { completed: false });
        const fresh = await fetchGoals(u.uid);
        setState({ myGoals: fresh });
      } catch (e) {
        toast(e?.message || t("error"), "error");
      }
    }
  };

  const handleBarInteraction = (g, e) => {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const raw = Math.round((x / rect.width) * 100);
    const pct = Math.min(100, Math.max(0, Math.round(raw / 5) * 5));
    setPendingProgress(prev => ({ ...prev, [g.id]: pct }));
  };

  const saveProgress = async (g) => {
    const pct = pendingProgress[g.id];
    if (pct == null) return;
    try {
      await updateGoal(g.id, { manualProgress: pct });
      const fresh = await fetchGoals(u.uid);
      setState({ myGoals: fresh });
      setPendingProgress(prev => { const n = { ...prev }; delete n[g.id]; return n; });
    } catch (e) {
      toast(e?.message || t("error"), "error");
    }
  };

  const sections = Array.from(new Set((st.types || []).map(tp => tp.section).filter(Boolean))).sort();
  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr + "T00:00:00") - new Date()) / 86400000);
    return diff;
  };

  if (compact) {
    const historySubs = [...subs].sort((a, b) => {
      const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const db2 = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return db2 - da;
    });

    return (
      <div className="glass card dash-card goals-compact-v2" style={{ "--di": 7 }}>
        {/* Tab switcher */}
        <div className="gc-tabs">
          <button className={`gc-tabs__btn${compactTab === "goals" ? " gc-tabs__btn--active" : ""}`} onClick={() => setCompactTab("goals")}>
            <Icon name="check" />
            <span>{t("myGoals")}</span>
          </button>
          <button className={`gc-tabs__btn${compactTab === "history" ? " gc-tabs__btn--active" : ""}`} onClick={() => setCompactTab("history")}>
            <Icon name="chart" />
            <span>{t("kpiHistory")}</span>
          </button>
          <div className="gc-tabs__indicator" style={{ transform: `translateX(${compactTab === "history" ? "100%" : "0"})` }} />
        </div>

        {/* Tab content with slide animation */}
        <div className="gc-tab-viewport">
          <div className="gc-tab-slider" style={{ transform: `translateX(${compactTab === "history" ? "-50%" : "0"})` }}>
            {/* Tab 1: Goals */}
            <div className="gc-tab-panel">
              {(() => {
                const goalPages = Math.ceil(goals.length / PER_PAGE) || 1;
                const gPage = Math.min(goalsPage, goalPages);
                const pagedGoals = goals.slice((gPage - 1) * PER_PAGE, gPage * PER_PAGE);
                return <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span className="tiny muted">{goals.filter(g => !g.completed).length} {t("goalActive").toLowerCase()}</span>
                  </div>
                  {pagedGoals.length ? pagedGoals.map(g => {
                    const prog = computeProgress(g);
                    const overdue = isOverdue(g);
                    const dl = daysUntil(g.deadline);
                    const barColor = g.completed || prog.pct >= 100 ? "var(--green)" : overdue ? "var(--red)" : "var(--accent)";
                    return (
                      <div key={g.id} className={`gc-item${g.completed ? " gc-item--done" : ""}${overdue ? " gc-item--overdue" : ""}`}>
                        <div className="gc-item__head">
                          <div className="gc-item__left">
                            <button className={`gc-item__check${g.completed ? " gc-item__check--done" : ""}`} onClick={!g.completed ? () => handleToggleComplete(g) : undefined} disabled={g.completed}>
                              {g.completed ? "✓" : ""}
                            </button>
                            <div>
                              <div className="gc-item__title">{g.note || t("goals")}</div>
                              <div className="gc-item__meta">
                                <span className="gc-item__pts">{fmtPoints(prog.earned)}/{fmtPoints(g.targetPoints)}</span>
                                {g.section && <span className="gc-item__section">{g.section}</span>}
                                {g.deadline && <span className="gc-item__dl">{g.deadline}</span>}
                                {dl !== null && dl >= 0 && !g.completed && <span className={`gc-item__days${dl <= 3 ? " gc-item__days--warn" : ""}`}>{dl}д</span>}
                                {overdue && <span className="gc-item__overdue">{t("goalOverdue")}</span>}
                              </div>
                            </div>
                          </div>
                          {!g.completed && (
                            <div className="gc-item__actions">
                              <button className="iconbtn gc-item__edit" onClick={() => startEdit(g)} title={t("editGoal")}><Icon name="settings" /></button>
                              <button className="iconbtn gc-item__del" onClick={() => handleDelete(g.id)} title={t("deleteGoal")}><Icon name="x" /></button>
                            </div>
                          )}
                        </div>
                        {editId === g.id && showForm ? (
                          <div className="gc-item__edit-row">
                            <div style={{ flex: 1 }}>
                              <label className="tiny muted">{t("goalDeadline")}</label>
                              <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={{ height: 32, fontSize: 13 }} />
                            </div>
                            <div style={{ display: "flex", gap: 4, alignItems: "flex-end", paddingBottom: 1 }}>
                              <Btn kind="primary" onClick={handleSave} disabled={saving} style={{ height: 32, fontSize: 12, padding: "0 10px" }}>{saving ? "..." : t("save")}</Btn>
                              <Btn onClick={resetForm} style={{ height: 32, fontSize: 12, padding: "0 8px" }}>✕</Btn>
                            </div>
                          </div>
                        ) : null}
                        <div className="gc-item__bar-wrap">
                          <div
                            className={`gc-item__bar${!g.completed ? " gc-item__bar--interactive" : ""}`}
                            onClick={!g.completed ? (e) => handleBarInteraction(g, e) : undefined}
                            onTouchMove={!g.completed ? (e) => { e.preventDefault(); handleBarInteraction(g, e); } : undefined}
                          >
                            <div className="gc-item__fill" style={{ width: `${pendingProgress[g.id] != null ? pendingProgress[g.id] : prog.pct}%`, background: barColor }} />
                          </div>
                          <span className="gc-item__pct">{pendingProgress[g.id] != null ? pendingProgress[g.id] : prog.pct}%</span>
                          {pendingProgress[g.id] != null && (
                            <Btn kind="primary" onClick={() => saveProgress(g)} style={{ height: 26, fontSize: 11, padding: "0 10px", marginLeft: 4 }}>{t("save")}</Btn>
                          )}
                        </div>
                      </div>
                    );
                  }) : (
                    <div style={{ textAlign: "center", padding: "16px 0" }}>
                      <p className="p muted" style={{ margin: "0 0 8px" }}>{t("noGoals")}</p>
                    </div>
                  )}
                  {goalPages > 1 && (
                    <div className="gc-pager">
                      <button className="gc-pager__arrow" disabled={gPage <= 1} onClick={() => setGoalsPage(p => p - 1)}>&lsaquo;</button>
                      {Array.from({ length: goalPages }, (_, i) => i + 1).map(p => (
                        <button key={p} className={`gc-pager__num${p === gPage ? " gc-pager__num--active" : ""}`} onClick={() => setGoalsPage(p)}>{p}</button>
                      ))}
                      <button className="gc-pager__arrow" disabled={gPage >= goalPages} onClick={() => setGoalsPage(p => p + 1)}>&rsaquo;</button>
                    </div>
                  )}
                </>;
              })()}
            </div>

            {/* Tab 2: KPI History */}
            <div className="gc-tab-panel">
              {(() => {
                const histPages = Math.ceil(historySubs.length / PER_PAGE) || 1;
                const hPage = Math.min(histPage, histPages);
                const pagedHist = historySubs.slice((hPage - 1) * PER_PAGE, hPage * PER_PAGE);
                return historySubs.length ? <>
                  <div className="gc-history">
                    {pagedHist.map((s, idx) => {
                      const tp = types.find(x => x.id === s.typeId);
                      const d = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt || 0);
                      const statusCls = s.status === "approved" ? "gc-hist--ok" : s.status === "rejected" ? "gc-hist--err" : "gc-hist--warn";
                      const statusLabel = s.status === "approved" ? t("dashApproved") : s.status === "rejected" ? "—" : t("dashPending");
                      return (
                        <div key={s.id || idx} className={`gc-hist ${statusCls}`} style={{ animationDelay: `${idx * 0.05}s` }}>
                          <div className="gc-hist__dot" />
                          <div className="gc-hist__body">
                            <div className="gc-hist__title">{tp?.name || s.typeName || s.typeId || "—"}</div>
                            <div className="gc-hist__meta">
                              <span>{d.toLocaleDateString("ru-RU")}</span>
                              {s.typeSection && <span className="gc-hist__section">{s.typeSection}</span>}
                              <span className={`pill ${s.status === "approved" ? "ok" : s.status === "rejected" ? "error" : "warn"}`} style={{ fontSize: 10, padding: "1px 6px" }}>{statusLabel}</span>
                            </div>
                          </div>
                          <div className={`gc-hist__pts${s.status === "approved" ? " gc-hist__pts--ok" : ""}`}>
                            {s.status === "approved" ? "+" : ""}{s.points || 0}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {histPages > 1 && (
                    <div className="gc-pager">
                      <button className="gc-pager__arrow" disabled={hPage <= 1} onClick={() => setHistPage(p => p - 1)}>&lsaquo;</button>
                      {Array.from({ length: histPages }, (_, i) => i + 1).map(p => (
                        <button key={p} className={`gc-pager__num${p === hPage ? " gc-pager__num--active" : ""}`} onClick={() => setHistPage(p)}>{p}</button>
                      ))}
                      <button className="gc-pager__arrow" disabled={hPage >= histPages} onClick={() => setHistPage(p => p + 1)}>&rsaquo;</button>
                    </div>
                  )}
                </> : (
                  <div style={{ textAlign: "center", padding: "24px 0" }}>
                    <p className="p muted">{t("kpiHistoryEmpty")}</p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass card goals-widget">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <div className="h2">{t("goalsAndDeadlines")}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div className="goal-mode-switch">
            <button className={`goal-mode-btn${mode === "goals" ? " goal-mode-btn--active" : ""}`} onClick={() => setMode("goals")}>{t("goals")}</button>
            <button className={`goal-mode-btn${mode === "deadlines" ? " goal-mode-btn--active" : ""}`} onClick={() => setMode("deadlines")}>{t("deadlines")}</button>
          </div>
          <Btn kind={showForm ? "" : "primary"} onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}>
            {showForm ? t("cancel") : <><Icon name="plus" /> {t("setGoal")}</>}
          </Btn>
        </div>
      </div>

      {showForm && (
        <div className="goal-form glass" style={{ padding: 16, borderRadius: 12, marginBottom: 16, border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 120px" }}>
              <label className="label">{t("goalTarget")}</label>
              <Input type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="100" min="1" />
            </div>
            <div style={{ flex: "1 1 140px" }}>
              <label className="label">{t("goalDeadline")}</label>
              <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
            <div style={{ flex: "1 1 120px" }}>
              <label className="label">{t("goalScope")}</label>
              <select className="input" value={scope} onChange={e => setScope(e.target.value)}>
                <option value="quarter">{t("goalQuarter")}</option>
                <option value="year">{t("goalYear")}</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
            <div style={{ flex: "1 1 200px" }}>
              <label className="label">{t("goalSection")}</label>
              <select className="input" value={section} onChange={e => setSection(e.target.value)}>
                <option value="">{t("anySection")}</option>
                {sections.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ flex: "2 1 200px" }}>
              <label className="label">{t("goalNote")}</label>
              <Input value={note} onChange={e => setNote(e.target.value)} placeholder={t("goalNote")} />
            </div>
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <Btn kind="primary" onClick={handleSave} disabled={saving}>{saving ? "..." : t("save")}</Btn>
            <Btn onClick={resetForm}>{t("cancel")}</Btn>
          </div>
        </div>
      )}

      {(() => {
        const filtered = mode === "deadlines"
          ? goals.filter(g => g.deadline).sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""))
          : goals;
        return <>
      {!filtered.length && !showForm && (
        <p className="p muted" style={{ textAlign: "center", padding: "20px 0" }}>{t("noGoals")}</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(g => {
          const prog = computeProgress(g);
          const overdue = isOverdue(g);
          const dl = daysUntil(g.deadline);
          return (
            <div key={g.id} className={`goal-card${g.completed ? " goal-card--done" : ""}${overdue ? " goal-card--overdue" : ""}`}>
              <div className="goal-card__top">
                <button className={`goal-card__check${g.completed ? " goal-card__check--done" : ""}`} onClick={() => handleToggleComplete(g)} title={g.completed ? t("goalActive") : t("goalCompleted")}>
                  {g.completed ? "✓" : ""}
                </button>
                <div className="goal-card__info">
                  <div className="goal-card__title">
                    {fmtPoints(prog.earned)} / {fmtPoints(g.targetPoints)} {t("points")}
                    {g.section && <span className="goal-card__section">{g.section}</span>}
                  </div>
                  {g.note && <div className="goal-card__note">{g.note}</div>}
                  <div className="goal-card__meta">
                    <Pill kind={g.completed ? "approved" : overdue ? "rejected" : "pending"}>
                      {g.completed ? t("goalCompleted") : overdue ? t("goalOverdue") : t("goalActive")}
                    </Pill>
                    <span className="tiny muted">{g.scope === "year" ? t("goalYear") : t("goalQuarter")}</span>
                    {g.deadline && <span className="tiny muted">{t("goalDeadline")}: {g.deadline}</span>}
                    {dl !== null && dl >= 0 && !g.completed && <span className="tiny" style={{ color: dl <= 7 ? "var(--red)" : "var(--muted)" }}>{dl} {t("daysLeft")}</span>}
                  </div>
                </div>
                <div className="goal-card__actions">
                  <button className="iconbtn" onClick={() => startEdit(g)} title={t("editGoal")}><Icon name="settings" /></button>
                  <button className="iconbtn" onClick={() => handleDelete(g.id)} title={t("deleteGoal")}><Icon name="x" /></button>
                </div>
              </div>
              <div className="goal-card__bar">
                <div className="goal-card__fill" style={{
                  width: `${prog.pct}%`,
                  background: g.completed || prog.pct >= 100 ? "var(--green)" : overdue ? "var(--red)" : "var(--accent)"
                }} />
              </div>
              <div className="goal-card__pct">{prog.pct}%</div>
            </div>
          );
        })}
      </div>
      </>;
      })()}
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: 16 }}>
      <div style={{
        width: 42, height: 42, borderRadius: 14,
        background: "#fff",
        display: "grid", placeItems: "center",
        overflow: "hidden",
        animation: "kpiPulse 1.4s ease-in-out infinite",
        boxShadow: "0 3px 12px rgba(135,188,46,.3)"
      }}><img src="/logo-nis.png" alt="NIS" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
      <style>{`@keyframes kpiPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.94)}}`}</style>
      <p className="p" style={{ margin: 0 }}>{t("loading")}</p>
    </div>
  );
}

export function Guard() {
  return (
    <div className="glass card" style={{ maxWidth: 360 }}>
      <div className="h2">{t("needAuth")}</div>
      <p className="p">{t("loginToContinue")}</p>
      <div className="sep"></div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Btn kind="primary" onClick={() => navigate("login")}>{t("signIn")}</Btn>
      </div>
    </div>
  );
}


export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err };
  }
  componentDidCatch(err, info) {
    console.error("[ErrorBoundary]", this.props?.name || "", err, info);
  }
  render() {
    if (this.state.err) {
      const e = this.state.err;
      return (
        <div className="glass card">
          <div className="h2">{t("renderError")}</div>
          <p className="p">{t("section")}: <b>{this.props?.name || "page"}</b></p>
          <div className="sep"></div>
          <div className="tiny"><b>{String(e?.name || "Error")}</b>: {String(e?.message || e)}</div>
          <div className="help">{t("openDevtools")}</div>
          <div className="sep"></div>
          <Btn onClick={() => { this.setState({ err: null }); }}>{t("tryAgain")}</Btn>
        </div>
      );
    }
    return this.props.children;
  }
}


export function NavFlyout({ icon, label, children, badge, open, onToggle }) {
  const bodyRef = useRef(null);
  const [height, setHeight] = useState(open ? "auto" : 0);

  useEffect(() => {
    if (!bodyRef.current) return;
    if (open) {
      const h = bodyRef.current.scrollHeight;
      setHeight(h + "px");
      const t = setTimeout(() => setHeight("auto"), 320);
      return () => clearTimeout(t);
    } else {
      setHeight(bodyRef.current.scrollHeight + "px");
      requestAnimationFrame(() => requestAnimationFrame(() => setHeight("0px")));
    }
  }, [open]);

  return (
    <div className={`nav-flyout${open ? " nav-flyout--open" : ""}`}>
      <div className="nav-flyout__head" role="button" tabIndex={0} onClick={onToggle}>
        <Icon name={icon} />
        <span className="nav-flyout__label">{label}</span>
        {badge > 0 && <span className="nav-badge nav-badge--flyout">{badge > 99 ? "99+" : badge}</span>}
        <span className="nav-flyout__chevron"><Icon name="chevron" /></span>
      </div>
      <div className="nav-flyout__body" ref={bodyRef} style={{ height, overflow: "hidden" }}>
        <div className="nav-flyout__items">{children}</div>
      </div>
    </div>
  );
}

export function SidebarNav() {
  const st = useStore();
  const u = st.userDoc;
  const path = st.route.path;

  const badgeFor = (p) => {
    if (p === "admin/approvals") return (st.pendingSubmissions || []).length || 0;
    if (p === "admin/requests") return (st.pendingRequests || []).length || 0;
    if (p === "documents") return (st.myDocuments || []).filter(d => d.status === "sent").length || 0;
    if (p === "admin/support") return (st.allTickets || []).filter(tk => tk.status === "new").length || 0;
    return 0;
  };

  const NavLink = ({ it }) => {
    const badge = badgeFor(it.p);
    return (
      <div className={`navlink ${path === it.p ? "active" : ""}`} role="button" tabIndex={0} onClick={() => navigate(it.p)}>
        <Icon name={it.i} /> {t(it.tKey)}
        {badge > 0 && <span className="nav-badge">{badge > 99 ? "99+" : badge}</span>}
      </div>
    );
  };

  // Accordion: only one flyout open at a time; sync with current route
  const groupFor = (p) => {
    if (["rating", "stats"].includes(p)) return "analytics";
    if (["requests", "documents", "add"].includes(p)) return "work";
    if (["support", "onboarding"].includes(p)) return "info";
    if (["admin/approvals", "admin/requests"].includes(p)) return "adminModeration";
    if (["admin/documents", "admin/types", "admin/announcements", "admin/events"].includes(p)) return "adminContent";
    if (["admin/users", "admin/support"].includes(p)) return "adminPeople";
    return null;
  };
  const [openGroup, setOpenGroup] = useState(() => groupFor(path));
  useEffect(() => { setOpenGroup(groupFor(path)); }, [path]);
  const toggle = (key) => setOpenGroup(prev => prev === key ? null : key);

  // Admin panel items grouped
  const adminModerationItems = [
    { p: "admin/approvals", tKey: "navApprovals", i: "check" },
    { p: "admin/requests", tKey: "navRequests", i: "file" },
  ];
  const adminContentItems = [
    { p: "admin/documents", tKey: "navDocuments", i: "shield" },
    { p: "admin/types", tKey: "navKpiTypes", i: "file" },
    { p: "admin/announcements", tKey: "navAnnouncements", i: "bell" },
    { p: "admin/events", tKey: "navAdminEvents", i: "calendar" },
  ];
  const adminPeopleItems = [
    { p: "admin/users", tKey: "navUsers", i: "user" },
    { p: "admin/support", tKey: "navSupport", i: "bug" },
  ];

  // Flyout group badges (sum of children)
  const workBadge = badgeFor("documents");
  const adminModerationBadge = badgeFor("admin/approvals") + badgeFor("admin/requests");
  const adminPeopleBadge = badgeFor("admin/support");

  if (!u) {
    return (
      <div className="sidenav">
        <div className="navsec">{t("navTitle")}</div>
        <NavLink it={{ p: "login", tKey: "navLogin", i: "user" }} />
      </div>
    );
  }

  const isTeacher = u.role !== "admin";

  return (
    <div className="sidenav">
      <div className="navsec">{t("navTitle")}</div>

      {/* Dashboard — home page */}
      <NavLink it={{ p: "dashboard", tKey: "navDashboard", i: "home" }} />

      {/* Profile */}
      <NavLink it={{ p: "profile", tKey: "navProfile", i: "user" }} />

      {/* News — standalone */}
      <NavLink it={{ p: "news", tKey: "navNews", i: "news" }} />

      {/* Classroom Tools — standalone */}
      <NavLink it={{ p: "classroomtools", tKey: "navClassroomTools", i: "tools" }} />

      {/* Group 1: Рейтинг + Статистика */}
      <NavFlyout icon="rank" label={t("navGroupAnalytics")} open={openGroup === "analytics"} onToggle={() => toggle("analytics")}>
        <NavLink it={{ p: "rating", tKey: "navRating", i: "rank" }} />
        <NavLink it={{ p: "stats", tKey: "navStats", i: "chart" }} />
      </NavFlyout>

      {isTeacher && (
        <>
          {/* Group 2: Заявления + Документы + Добавить KPI */}
          <NavFlyout icon="clipboard" label={t("navGroupWork")} badge={workBadge} open={openGroup === "work"} onToggle={() => toggle("work")}>
            <NavLink it={{ p: "requests", tKey: "navRequests", i: "file" }} />
            <NavLink it={{ p: "documents", tKey: "navDocuments", i: "shield" }} />
            <NavLink it={{ p: "add", tKey: "navAddKpi", i: "plus" }} />
          </NavFlyout>

          {/* Group 3: Поддержка + Ознакомление */}
          <NavFlyout icon="info" label={t("navGroupInfo")} open={openGroup === "info"} onToggle={() => toggle("info")}>
            <NavLink it={{ p: "support", tKey: "navSupport", i: "bug" }} />
            <NavLink it={{ p: "onboarding", tKey: "navOnboarding", i: "check" }} />
          </NavFlyout>
        </>
      )}

      {/* Settings — standalone */}
      <NavLink it={{ p: "settings", tKey: "navSettings", i: "settings" }} />

      {u.role === "admin" && (
        <>
          <div className="navsec">{t("navAdmin")}</div>

          {/* Director dashboard — standalone */}
          <NavLink it={{ p: "admin/director", tKey: "navDirector", i: "chart" }} />

          {/* Group: Moderation */}
          <NavFlyout
            icon="check"
            label={t("navGroupModeration")}
            badge={adminModerationBadge}
            open={openGroup === "adminModeration"}
            onToggle={() => toggle("adminModeration")}
          >
            {adminModerationItems.map(it => <NavLink key={it.p} it={it} />)}
          </NavFlyout>

          {/* Group: Content */}
          <NavFlyout
            icon="file"
            label={t("navGroupContent")}
            open={openGroup === "adminContent"}
            onToggle={() => toggle("adminContent")}
          >
            {adminContentItems.map(it => <NavLink key={it.p} it={it} />)}
          </NavFlyout>

          {/* Group: People & Support */}
          <NavFlyout
            icon="user"
            label={t("navGroupPeople")}
            badge={adminPeopleBadge}
            open={openGroup === "adminPeople"}
            onToggle={() => toggle("adminPeople")}
          >
            {adminPeopleItems.map(it => <NavLink key={it.p} it={it} />)}
          </NavFlyout>
        </>
      )}

    </div>
  );
}

export function LiveClock() {
  const st = useStore();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  if (st.siteSettings && !st.siteSettings.showClock) return null;
  const days = [t("daySun"), t("dayMon"), t("dayTue"), t("dayWed"), t("dayThu"), t("dayFri"), t("daySat")];
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const day = days[now.getDay()];
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return (
    <div className="live-clock">
      <span className="live-clock__date">{dd}.{mm}.{yyyy} <span className="live-clock__day">{day}</span></span>
      <span className="live-clock__time">{hh}:{min}</span>
    </div>
  );
}

export function WeatherWidget() {
  const st = useStore();
  const [weather, setWeather] = useState(null);
  useEffect(() => {
    const fetchWeather = () => {
      fetch("https://api.open-meteo.com/v1/forecast?latitude=44.85&longitude=65.51&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=Asia/Almaty")
        .then(r => r.json())
        .then(data => {
          if (data.current) setWeather(data.current);
        })
        .catch(() => {});
    };
    fetchWeather();
    const id = setInterval(fetchWeather, 600000);
    return () => clearInterval(id);
  }, []);

  if (!weather || (st.siteSettings && !st.siteSettings.showWeather)) return null;

  const code = weather.weather_code;
  const temp = Math.round(weather.temperature_2m);
  const wind = Math.round(weather.wind_speed_10m);
  const humidity = weather.relative_humidity_2m;

  const getWeatherIcon = (c) => {
    if (c === 0) return "\u2600\uFE0F";
    if (c <= 3) return "\u26C5";
    if (c <= 48) return "\u2601\uFE0F";
    if (c <= 57) return "\uD83C\uDF27\uFE0F";
    if (c <= 67) return "\uD83C\uDF26\uFE0F";
    if (c <= 77) return "\u2744\uFE0F";
    if (c <= 82) return "\uD83C\uDF27\uFE0F";
    if (c <= 86) return "\uD83C\uDF28\uFE0F";
    if (c >= 95) return "\u26C8\uFE0F";
    return "\u2601\uFE0F";
  };

  return (
    <div className="weather-widget" title={`${t("weatherHumidity") || "Humidity"}: ${humidity}% · ${t("weatherWind") || "Wind"}: ${wind} km/h`}>
      <span className="weather-widget__icon">{getWeatherIcon(code)}</span>
      <span className="weather-widget__temp">{temp > 0 ? "+" : ""}{temp}°</span>
      <span className="weather-widget__city">Kyzylorda</span>
    </div>
  );
}


export function AccessibilityModal() {
  const st = useStore();
  if (!st.showAccessibilityModal) return null;
  const acc = st.accessibility || getDefaultAccessibility();
  const u = st.userDoc;
  const toggle = (key) => {
    const next = { ...acc, [key]: !acc[key] };
    applyAccessibility(next);
    if (u) saveAccessibilityToFirestore(u.uid, next);
  };
  const close = () => setState({ showAccessibilityModal: false });
  const rows = [
    { key: "reduceMotion", label: t("accReduceMotion"), desc: t("accReduceMotionDesc") },
    { key: "largeText", label: t("accLargeText"), desc: t("accLargeTextDesc") },
    { key: "highContrast", label: t("accHighContrast"), desc: t("accHighContrastDesc") },
  ];
  return (
    <div className="modalback" onClick={close}>
      <div className="modal glass" style={{ maxWidth: 440, width: "92vw" }} onClick={e => e.stopPropagation()}>
        <div className="modal__head">
          <div>
            <div className="h2" style={{ marginBottom: 2 }}>{t("accessibilityTitle")}</div>
            <div className="tiny muted">{t("accessibilityDesc")}</div>
          </div>
          <Btn onClick={close}>✕</Btn>
        </div>
        <div className="acc-panel">
          {rows.map(r => (
            <div className="acc-row" key={r.key}>
              <div className="acc-row__info">
                <div className="acc-row__label">{r.label}</div>
                <div className="acc-row__desc">{r.desc}</div>
              </div>
              <button
                className={`acc-toggle${acc[r.key] ? " acc-toggle--on" : ""}`}
                onClick={() => toggle(r.key)}
                aria-label={r.label}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const ROUTE_META = {
  dashboard:           { icon: "home",      tKey: "navDashboard",      desc: "dashboardDesc" },
  profile:             { icon: "user",      tKey: "navProfile",        desc: "profileDesc" },
  rating:              { icon: "rank",      tKey: "navRating",         desc: "ratingDesc" },
  stats:               { icon: "chart",     tKey: "navStats",          desc: "statsDesc" },
  add:                 { icon: "plus",      tKey: "navAddKpi",         desc: "addDesc" },
  requests:            { icon: "file",      tKey: "navRequests",       desc: "requestsDesc" },
  documents:           { icon: "shield",    tKey: "navDocuments",      desc: "documentsDesc" },
  news:                { icon: "news",      tKey: "navNews",           desc: "newsDesc" },
  support:             { icon: "bug",       tKey: "navSupport",        desc: "supportDesc" },
  settings:            { icon: "settings",  tKey: "navSettings",       desc: "settingsDesc2" },
  onboarding:          { icon: "check",     tKey: "navOnboarding",     desc: "onboardingDesc" },
  "admin/approvals":   { icon: "check",     tKey: "navApprovals",      desc: "approvalsDesc" },
  "admin/requests":    { icon: "file",      tKey: "navRequests",       desc: "adminReqDesc" },
  "admin/documents":   { icon: "shield",    tKey: "navDocuments",      desc: "adminDocDesc" },
  "admin/types":       { icon: "file",      tKey: "navKpiTypes",       desc: "typesDesc" },
  "admin/users":       { icon: "user",      tKey: "navUsers",          desc: "usersDesc" },
  "admin/teacher":     { icon: "user",      tKey: "navProfile",        desc: "teacherPageDesc" },
  "admin/support":     { icon: "bug",       tKey: "navSupport",        desc: "adminSupportDesc" },
  "admin/announcements": { icon: "bell",    tKey: "navAnnouncements",  desc: "annPageDesc" },
  "admin/events":      { icon: "calendar",  tKey: "navAdminEvents",    desc: "adminEventsDesc" },
  "admin/director":    { icon: "chart",     tKey: "navDirector",       desc: "dirSubtitle" },
};

export function TopbarTitle() {
  const st = useStore();
  const path = st.route?.path || "login";
  const meta = ROUTE_META[path];
  const [animKey, setAnimKey] = useState(path);

  useEffect(() => { setAnimKey(path); }, [path]);

  if (!meta) {
    return (
      <>
        <div className="topbar__titleBig">NIS KPI Platform</div>
        <div className="topbar__titleSmall muted">{t("appTagline")}</div>
      </>
    );
  }

  return (
    <div className="topbar-title-anim" key={animKey}>
      <div className="topbar-title__icon-wrap">
        <Icon name={meta.icon} />
      </div>
      <div>
        <div className="topbar__titleBig">{t(meta.tKey)}</div>
        <div className="topbar__titleSmall muted">{t(meta.desc)}</div>
      </div>
    </div>
  );
}

export function TopbarRight() {
  const st = useStore();
  const u = st.userDoc;
  const isDark = st.theme !== "light";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
      <LiveClock />
      <WeatherWidget />
      <button
        className="iconbtn"
        onClick={() => navigate("settings")}
        aria-label={t("navSettings")}
        title={t("navSettings")}
      >
        <Icon name="settings" />
      </button>
      {u ? (
        <>
          <Pill kind={u.role === "admin" ? "pending" : "approved"}>{u.role}</Pill>
          <div className="tiny" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <b>{u.displayName || t("unnamed")}</b>
          </div>
          <Btn kind="ghost" onClick={async () => { const cu = auth.currentUser; if (cu) await setUserOnline(cu.uid, false); await signOut(auth); toast(t("loggedOut")); navigate("login"); }}>
            <Icon name="logout" /> {t("navLogout")}
          </Btn>
        </>
      ) : (
        <div className="tiny muted">{t("guest")}</div>
      )}
    </div>
  );
}

export function OnlineWidget() {
  const st = useStore();
  const u = st.userDoc;
  const [showOnline, setShowOnline] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  if (!u) return null;
  const allUsers = st.users || [];
  const onlineUsers = allUsers.filter(x => x.online === true);
  const onlineCount = onlineUsers.length + 1;
  const totalCount = allUsers.length;
  return (
    <>
      {showOnline && (
        <div className="modalback" onClick={() => setShowOnline(false)}>
          <div className="modal glass" style={{ maxWidth: 400, width: "90vw" }} onClick={e => e.stopPropagation()}>
            <div className="modal__head">
              <div className="h2">{t("onlineNow")}</div>
              <Btn onClick={() => setShowOnline(false)}>✕</Btn>
            </div>
            {onlineUsers.length === 0 ? (
              <p className="p muted">{t("noActiveUsers")}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
                {onlineUsers.map(x => (
                  <div key={x.uid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--hover-bg)", borderRadius: 8 }}>
                    <span className="online-dot" />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{x.displayName || x.email || "—"}</div>
                      <div className="tiny muted">{x.role} · {x.school || x.subject || x.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="help" style={{ marginTop: 12 }}>{t("totalUsers")}: {totalCount} {t("employee")}</p>
          </div>
        </div>
      )}
      <div className={`online-widget${collapsed ? " online-widget--collapsed" : ""}`}>
        <button
          className="online-widget__btn"
          onClick={() => setShowOnline(true)}
          title={t("onlineNow")}
        >
          <span className="online-dot" />
          {!collapsed && (
            <div className="online-widget__info">
              <span className="online-widget__count">{onlineCount}</span>
              <span className="online-widget__label">онлайн</span>
              <span className="online-widget__total">/ {totalCount}</span>
            </div>
          )}
        </button>
      </div>
    </>
  );
}

export function BottomNav() {
  const st = useStore();
  const u = st.userDoc;
  const path = st.route.path;
  const items = !u ? [
    { p: "login", tKey: "bottomLogin", i: "user" },
    { p: "rating", tKey: "navRating", i: "rank" },
  ] : [
    { p: "dashboard", tKey: "navDashboard", i: "home" },
    { p: "rating", tKey: "navRating", i: "rank" },
    { p: "news", tKey: "bottomNews", i: "news" },
    { p: "profile", tKey: "navProfile", i: "user" },
  ];
  return (
    <div className="bottomnav__row">
      {items.map(it => (
        <div key={it.p} className={`navitem ${path === it.p ? "active" : ""}`} role="button" tabIndex={0} onClick={() => navigate(it.p)}>
          <Icon name={it.i} /> {t(it.tKey)}
        </div>
      ))}
    </div>
  );
}

/** ---------- Force Password Change overlay ---------- */
export function ForcePasswordChange() {
  const st = useStore();
  const u = st.userDoc;
  const [newPwd, setNewPwd] = useState("");
  const [newPwd2, setNewPwd2] = useState("");
  const [saving, setSaving] = useState(false);

  // Show ONLY for teachers who just completed onboarding (needsPasswordChange flag set during onboarding)
  // Existing teachers who onboarded before this feature won't have this flag → no overlay
  if (!u || u.role === "admin") return null;
  if (u.needsPasswordChange !== true) return null;

  const handleChange = async () => {
    if (newPwd.length < 6) { toast(t("pwdMinLength"), "error"); return; }
    if (newPwd !== newPwd2) { toast(t("pwdMismatch"), "error"); return; }
    const user = auth.currentUser;
    if (!user) { toast(t("noSession"), "error"); return; }
    setSaving(true);
    try {
      await updatePassword(user, newPwd);
      await updateProfile(u.uid, { needsPasswordChange: false, passwordChanged: true });
      // Force state update so overlay disappears immediately
      setState({ userDoc: { ...u, needsPasswordChange: false, passwordChanged: true } });
      toast(t("pwdChangedRedirect"), "ok");
    } catch (e) {
      console.error(e);
      const code = e?.code || "";
      if (code === "auth/requires-recent-login") toast(t("reloginNeeded"), "error");
      else if (code === "auth/too-many-requests") toast(t("tooManyAttempts"), "error");
      else toast(e?.message || t("pwdChangeError"), "error");
    } finally { setSaving(false); }
  };

  return (
    <div className="force-pwd-overlay">
      <div className="force-pwd-card">
        <div className="force-pwd-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
        <h2>{t("forceChangePwdTitle")}</h2>
        <p className="force-pwd-desc">{t("forceChangePwdDesc")}</p>
        <div className="force-pwd-form">
          <label className="label">{t("newPwd")}</label>
          <input className="input" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="••••••••" />
          <label className="label">{t("repeatNewPwd")}</label>
          <input className="input" type="password" value={newPwd2} onChange={e => setNewPwd2(e.target.value)} placeholder="••••••••"
            onKeyDown={e => { if (e.key === "Enter" && !saving) handleChange(); }} />
          <Btn kind="primary" disabled={saving} onClick={handleChange} style={{ marginTop: 8, width: "100%", justifyContent: "center" }}>
            {saving ? t("loading") : t("changePwd")}
          </Btn>
        </div>
      </div>
    </div>
  );
}

export function TeacherProfileModal() {
  const st = useStore();
  const m = st.modal;
  const tc = m?.kind === "teacherProfile" ? m.teacher : null;

  const [teacherGoals, setTeacherGoals] = useState([]);
  const [loadingGoals, setLoadingGoals] = useState(true);

  useEffect(() => {
    if (!tc?.uid) { setTeacherGoals([]); setLoadingGoals(false); return; }
    setLoadingGoals(true);
    fetchGoals(tc.uid).then(g => { setTeacherGoals(g); setLoadingGoals(false); }).catch(() => setLoadingGoals(false));
  }, [tc?.uid]);

  if (!tc) return null;

  const allTeachers = (st.users || []).filter(x => (x.role || "teacher") !== "admin");
  const sorted = [...allTeachers].sort((a, b) => (Number(b.totalPoints) || 0) - (Number(a.totalPoints) || 0));
  const rankIdx = sorted.findIndex(x => x.uid === tc.uid);
  const rank = rankIdx >= 0 ? rankIdx + 1 : "—";
  const lvl = levelFromPoints(tc.totalPoints || 0);
  const subs = (st.submissions || []).filter(s => s.uid === tc.uid);
  const approved = subs.filter(s => s.status === "approved");
  const igHandle = (tc.instagram || "").replace(/^@/, "").trim();

  const activeGoals = teacherGoals.filter(g => !g.completed);
  const completedGoals = teacherGoals.filter(g => g.completed);

  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr + "T00:00:00") - new Date()) / 86400000);
  };

  const goalPct = (g) => {
    if (g.manualProgress != null && g.manualProgress > 0) return Math.min(100, g.manualProgress);
    const sec = g.section;
    let rel = approved;
    if (sec) rel = rel.filter(s => s.typeSection === sec);
    const earned = sum(rel, s => s.points);
    const target = Number(g.targetPoints) || 1;
    return Math.min(100, Math.round((earned / target) * 100));
  };

  const close = () => setState({ modal: null });

  return (
    <div className="tp-overlay" onClick={close}>
      <div className="tp-card tp-card--v2" onClick={e => e.stopPropagation()}>
        <button className="tp-close" onClick={close}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>

        {/* Hero banner */}
        <div className="tp-banner">
          <div className="tp-banner__glow" />
        </div>

        <div className="tp-header">
          <div className="tp-avatar-wrap">
            <div className="tp-avatar tp-avatar--lg">
              {tc.avatarUrl
                ? <img src={tc.avatarUrl} alt="" />
                : <span>{(tc.displayName || tc.email || "?").slice(0, 1).toUpperCase()}</span>}
            </div>
            <div className="tp-rank-badge">#{rank}</div>
          </div>
          <div className="tp-name">{tc.displayName || t("unnamed")}</div>
          <div className="tp-role-tags">
            <span className="tp-tag tp-tag--role">{tc.role === "admin" ? "Admin" : "Teacher"}</span>
            <span className="tp-tag tp-tag--level">{lvl.name}</span>
            {tc.position && <span className="tp-tag">{tc.position}</span>}
          </div>
          {tc.school && <div className="tp-school">{tc.school}</div>}
        </div>

        <div className="tp-stats-grid">
          <div className="tp-stat">
            <div className="tp-stat-value">{fmtPoints(tc.totalPoints)}</div>
            <div className="tp-stat-label">{t("totalPoints")}</div>
          </div>
          <div className="tp-stat">
            <div className="tp-stat-value">{lvl.name}</div>
            <div className="tp-stat-label">{t("levelLabel")}</div>
          </div>
          <div className="tp-stat">
            <div className="tp-stat-value">#{rank}</div>
            <div className="tp-stat-label">{t("rankLabel")}</div>
          </div>
          <div className="tp-stat">
            <div className="tp-stat-value">{approved.length}</div>
            <div className="tp-stat-label">{t("submissions")}</div>
          </div>
        </div>

        <div className="tp-info-list">
          {tc.subject && <div className="tp-info-row"><span className="tp-info-icon"><Icon name="file" /></span><span>{tc.subject}</span></div>}
          {tc.city && <div className="tp-info-row"><span className="tp-info-icon"><Icon name="home" /></span><span>{tc.city}</span></div>}
          {tc.email && <div className="tp-info-row"><span className="tp-info-icon"><Icon name="briefcase" /></span><span>{tc.email}</span><a href={`https://teams.microsoft.com/l/chat/0/0?users=${tc.email}`} target="_blank" rel="noopener noreferrer" className="tp-teams-btn" title="Teams Chat"><Icon name="info" /></a></div>}
          {tc.phone && <div className="tp-info-row"><span className="tp-info-icon"><Icon name="shield" /></span><span>{tc.phone}</span></div>}
          {tc.experienceYears > 0 && <div className="tp-info-row"><span className="tp-info-icon"><Icon name="chart" /></span><span>{tc.experienceYears} {t("yearsShort")}</span></div>}
        </div>

        <div className="tp-progress">
          <div className="tp-progress-label">
            <span>{lvl.name}</span>
            {lvl.next && <span className="muted">{tc.totalPoints || 0} / {lvl.next}</span>}
          </div>
          <div className="tp-progress-bar">
            <div className="tp-progress-fill" style={{ width: `${lvl.pct}%` }} />
          </div>
        </div>

        {/* Goals section */}
        {!loadingGoals && teacherGoals.length > 0 && (
          <div className="tp-goals">
            <div className="tp-goals__title">{t("teacherGoals")}</div>
            {activeGoals.slice(0, 1).map(g => {
              const pct = goalPct(g);
              const dl = daysUntil(g.deadline);
              const barColor = pct >= 100 ? "var(--green)" : (dl !== null && dl < 0) ? "var(--red)" : "var(--accent)";
              return (
                <div key={g.id} className="tp-goal">
                  <div className="tp-goal__head">
                    <div className="tp-goal__name">{g.note || t("goals")}</div>
                    {g.section && <span className="tp-goal__section">{g.section}</span>}
                  </div>
                  <div className="tp-goal__info">
                    <span className="tp-goal__pts">{fmtPoints(g.targetPoints)} {t("pts")}</span>
                    {g.deadline && <span className="tp-goal__dl">{g.deadline}</span>}
                    {dl !== null && dl >= 0 && <span className={`tp-goal__days${dl <= 3 ? " tp-goal__days--warn" : ""}`}>{dl}д</span>}
                  </div>
                  <div className="tp-goal__bar">
                    <div className="tp-goal__fill" style={{ width: `${pct}%`, background: barColor }} />
                  </div>
                  <div className="tp-goal__pct">{pct}%</div>
                </div>
              );
            })}
            {activeGoals.length > 1 && <div className="tiny muted" style={{ textAlign: "center" }}>+{activeGoals.length - 1} {t("goals").toLowerCase()}</div>}
            {completedGoals.length > 0 && (
              <div className="tp-goals__completed">
                <div className="tiny muted" style={{ marginBottom: 4 }}>{t("goalCompleted")} ({completedGoals.length})</div>
                {completedGoals.slice(0, 2).map(g => (
                  <div key={g.id} className="tp-goal tp-goal--done">
                    <div className="tp-goal__head">
                      <span style={{ color: "var(--green)", marginRight: 4 }}>✓</span>
                      <div className="tp-goal__name">{g.note || t("goals")}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="tp-footer">
          {igHandle && (
            <a href={`https://instagram.com/${igHandle}`} target="_blank" rel="noopener noreferrer" className="btn btn--instagram">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" /></svg>
              Instagram
            </a>
          )}
          {tc.youtube && (
            <a href={tc.youtube} target="_blank" rel="noopener noreferrer" className="btn btn--youtube">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.43z" stroke="currentColor" strokeWidth="2" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" stroke="currentColor" strokeWidth="2" /></svg>
              YouTube
            </a>
          )}
          <Btn kind="primary" onClick={() => { close(); navigate("profile", { uid: tc.uid }); }}><Icon name="user" /> {t("goToProfile")}</Btn>
          <button className="btn" onClick={close}>{t("closeProfile")}</button>
        </div>
      </div>
    </div>
  );
}

export function Overlays() {
  const st = useStore();
  return (
    <>
      <div className="toastwrap" aria-live="polite" aria-atomic="true">
        {st.toasts.map(ti => (
          <div key={ti.id} className="toast">
            <div style={{ fontWeight: 900, marginBottom: 4 }}>{ti.kind === "error" ? t("toastError") : ti.kind === "ok" ? t("toastOk") : t("toastMsg")}</div>
            <div className="tiny muted">{ti.msg}</div>
          </div>
        ))}
      </div>
      {st.modal?.kind === "crop" && <CropModal file={st.modal.file} onClose={() => setState({ modal: null })} />}
      <TeacherProfileModal />
      <ForcePasswordChange />
      <OnlineWidget />
      <AccessibilityModal />
    </>
  );
}

/** ---------- avatar crop modal (simple square) ---------- */
export function CropModal({ file, onClose }) {
  const st = useStore();
  const u = st.userDoc;
  const [url, setUrl] = useState("");
  const [zoom, setZoom] = useState(1.2);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => { imgRef.current = img; draw(); };
    img.src = url;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => { draw(); /* eslint-disable-next-line */ }, [zoom, off]);

  function draw() {
    const c = canvasRef.current;
    const img = imgRef.current;
    if (!c || !img) return;
    const ctx = c.getContext("2d");
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(0, 0, W, H);

    const scale = zoom * Math.min(W / img.width, H / img.height);
    const dw = img.width * scale, dh = img.height * scale;
    const x = W / 2 + off.x - dw / 2;
    const y = H / 2 + off.y - dh / 2;
    ctx.drawImage(img, x, y, dw, dh);

    const size = Math.min(W, H) * 0.62;
    const sx = (W - size) / 2, sy = (H - size) / 2;
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(sx, sy, size, size); ctx.fill("evenodd");
    ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 2; ctx.strokeRect(sx, sy, size, size);
  }

  function down(e) { e.preventDefault(); setDrag({ x: e.clientX, y: e.clientY, ox: off.x, oy: off.y }); }
  function move(e) { if (!drag) return; setOff({ x: drag.ox + (e.clientX - drag.x), y: drag.oy + (e.clientY - drag.y) }); }
  function up() { setDrag(null); }

  async function save() {
    try {
      if (!u) return;
      setState({ loading: true });

      const preview = canvasRef.current, img = imgRef.current;
      const W = preview.width, H = preview.height;
      const size = Math.min(W, H) * 0.62;
      const sx = (W - size) / 2, sy = (H - size) / 2;

      // render full canvas into temp then crop into 512x512
      const tmp = document.createElement("canvas");
      tmp.width = W; tmp.height = H;
      const tctx = tmp.getContext("2d");

      const scale = zoom * Math.min(W / img.width, H / img.height);
      const dw = img.width * scale, dh = img.height * scale;
      const x = W / 2 + off.x - dw / 2;
      const y = H / 2 + off.y - dh / 2;
      tctx.drawImage(img, x, y, dw, dh);

      const out = document.createElement("canvas");
      out.width = 512; out.height = 512;
      const octx = out.getContext("2d");
      octx.drawImage(tmp, sx, sy, size, size, 0, 0, 512, 512);

      const blob = await new Promise(res => out.toBlob(res, "image/png", 0.92));
      if (!blob) throw new Error(t("saveError"));

      const avatarUrl = await uploadAvatar(u.uid, blob);
      await updateProfile(u.uid, { avatarUrl });
      const fresh = await ensureUserDoc(u.uid, u.email);
      setState({ userDoc: fresh });
      toast(t("avatarUpdated"), "ok");
      onClose();
    } catch (e) {
      console.error(e);
      toast(e?.message || t("saveError"), "error");
    } finally {
      setState({ loading: false });
    }
  }

  return (
    <div className="modalback" onMouseMove={move} onMouseUp={up}>
      <div className="modal glass">
        <div className="modal__head">
          <div className="modal__title">{t("cropAvatar")}</div>
          <button className="iconbtn" onClick={onClose} aria-label={t("close")}><Icon name="x" /></button>
        </div>
        <div className="sep"></div>
        <div className="grid2">
          <div className="glass card">
            <div className="h2">{t("preview")}</div>
            <canvas
              ref={canvasRef}
              width={820}
              height={520}
              style={{ width: "100%", borderRadius: 18, border: "1px solid rgba(255,255,255,.12)", background: "rgba(0,0,0,.12)" }}
              onMouseDown={down}
            />
            <div className="label">{t("scale")}</div>
            <input type="range" min="0.8" max="2.6" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ width: "100%" }} />
            <div className="help">{t("dragImage")}</div>
          </div>
          <div className="glass card">
            <div className="h2">{t("actions")}</div>
            <div className="sep"></div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Btn kind="primary" onClick={save} disabled={st.loading}><Icon name="check" /> {t("save")}</Btn>
              <Btn onClick={onClose}>{t("cancel")}</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ---------- charts ---------- */
export function BarChart({ values, labels }) {
  const max = Math.max(1, ...values.map(v => Number(v) || 0));
  return (
    <div>
      <div className="barchart">
        {values.map((v, i) => (
          <div key={i} className="bar" style={{ height: `${Math.max(4, Math.round(((Number(v) || 0) / max) * 100))}%` }} title={`${labels[i]}: ${v}`} />
        ))}
      </div>
      <div className="barlabel">
        <span>{labels[0]}</span>
        <span>{labels[Math.floor(labels.length / 2)]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}

export function LineChart({ values, labels }) {
  const n = (values || []).length;
  const nums = (values || []).map(v => Number(v) || 0);
  const max = Math.max(1, ...nums);
  const min = Math.min(0, ...nums);
  const W = 520, H = 190, pad = 26;
  const span = Math.max(1e-9, max - min);
  const xStep = (W - pad * 2) / Math.max(1, n - 1);

  const pts = nums.map((v, i) => {
    const x = pad + i * xStep;
    const y = H - pad - ((v - min) / span) * (H - pad * 2);
    return [x, y];
  });

  const points = pts.map(p => p.join(",")).join(" ");
  const gid = useMemo(() => `lg_${Math.random().toString(16).slice(2)}`, []);

  const first = labels?.[0] ?? "";
  const mid = labels?.[Math.floor((labels?.length || 1) / 2)] ?? "";
  const last = labels?.[Math.max(0, (labels?.length || 1) - 1)] ?? "";

  return (
    <div className="chartBox">
      <svg className="chartSvg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Line chart">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(135,188,46,.95)" />
            <stop offset="100%" stopColor="rgba(90,140,26,.95)" />
          </linearGradient>
        </defs>

        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="rgba(255,255,255,.18)" strokeWidth="1" />

        {n > 1 ? (
          <>
            <polyline fill="none" stroke={`url(#${gid})`} strokeWidth="3" points={points} strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r="3.2" fill="rgba(255,255,255,.92)" opacity="0.75" />
            ))}
          </>
        ) : (
          <text x={pad} y={H / 2} fill="rgba(255,255,255,.72)" fontSize="12">{t("noChartData")}</text>
        )}

        <text x={pad} y={H - 8} fill="rgba(255,255,255,.62)" fontSize="12">{first}</text>
        <text x={W / 2} y={H - 8} textAnchor="middle" fill="rgba(255,255,255,.62)" fontSize="12">{mid}</text>
        <text x={W - pad} y={H - 8} textAnchor="end" fill="rgba(255,255,255,.62)" fontSize="12">{last}</text>
      </svg>
    </div>
  );
}

export function AreaLineChart({ values, labels }) {
  const n = (values || []).length;
  const nums = (values || []).map(v => Number(v) || 0);
  const max = Math.max(1, ...nums);
  const min = Math.min(0, ...nums);
  const W = 520, H = 190, pad = 26;
  const span = Math.max(1e-9, max - min);
  const xStep = (W - pad * 2) / Math.max(1, n - 1);

  const pts = nums.map((v, i) => {
    const x = pad + i * xStep;
    const y = H - pad - ((v - min) / span) * (H - pad * 2);
    return [x, y];
  });

  const linePoints = pts.map(p => p.join(",")).join(" ");
  const areaPath = pts.length
    ? `M ${pts[0][0]} ${H - pad} L ${pts.map(p => p.join(" ")).join(" L ")} L ${pts[pts.length - 1][0]} ${H - pad} Z`
    : "";

  const gid = useMemo(() => `ag_${Math.random().toString(16).slice(2)}`, []);
  const aid = useMemo(() => `af_${Math.random().toString(16).slice(2)}`, []);

  const first = labels?.[0] ?? "";
  const mid = labels?.[Math.floor((labels?.length || 1) / 2)] ?? "";
  const last = labels?.[Math.max(0, (labels?.length || 1) - 1)] ?? "";

  return (
    <div className="chartBox">
      <svg className="chartSvg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Area line chart">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(135,188,46,.95)" />
            <stop offset="100%" stopColor="rgba(90,140,26,.95)" />
          </linearGradient>
          <linearGradient id={aid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(90,140,26,.26)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
        </defs>

        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="rgba(255,255,255,.18)" strokeWidth="1" />

        {pts.length > 1 ? (
          <>
            <path d={areaPath} fill={`url(#${aid})`} />
            <polyline fill="none" stroke={`url(#${gid})`} strokeWidth="3" points={linePoints} strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : (
          <text x={pad} y={H / 2} fill="rgba(255,255,255,.72)" fontSize="12">{t("noChartData")}</text>
        )}

        <text x={pad} y={H - 8} fill="rgba(255,255,255,.62)" fontSize="12">{first}</text>
        <text x={W / 2} y={H - 8} textAnchor="middle" fill="rgba(255,255,255,.62)" fontSize="12">{mid}</text>
        <text x={W - pad} y={H - 8} textAnchor="end" fill="rgba(255,255,255,.62)" fontSize="12">{last}</text>
      </svg>
    </div>
  );
}

export function HistogramChart({ data, binCount = 7 }) {
  const nums = (data || []).map(v => Number(v)).filter(v => Number.isFinite(v));
  if (!nums.length) return <p className="p">{t("noHistogram")}</p>;

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const bins = Math.max(3, Math.min(12, Number(binCount) || 7));
  const span = Math.max(1e-9, max - min);
  const w = span / bins;

  const counts = Array.from({ length: bins }, () => 0);
  for (const v of nums) {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor((v - min) / w)));
    counts[idx] += 1;
  }

  const labels = counts.map((_, i) => {
    const a = min + i * w;
    const b = min + (i + 1) * w;
    const ra = Math.round(a);
    const rb = Math.round(b);
    return `${ra}–${rb}`;
  });

  const maxC = Math.max(1, ...counts);

  return (
    <div>
      <div className="histchart">
        {counts.map((c, i) => (
          <div
            key={i}
            className="histbar"
            style={{ height: `${Math.max(6, Math.round((c / maxC) * 100))}%` }}
            title={`${labels[i]}: ${c}`}
          />
        ))}
      </div>
      <div className="barlabel">
        <span>{labels[0]}</span>
        <span>{labels[Math.floor(labels.length / 2)]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
      <div className="help">{t("histogramHelp")}</div>
    </div>
  );
}

export function DonutChart({ segments, centerLabel }) {
  const segs = (segments || []).map(s => ({ label: String(s.label || ""), value: Number(s.value) || 0 })).filter(s => s.value > 0);
  const total = Math.max(1, segs.reduce((a, s) => a + s.value, 0));

  const size = 170;
  const thickness = 18;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;

  let offset = 0;
  const palette = [
    "rgba(135,188,46,.95)",
    "rgba(90,140,26,.95)",
    "rgba(53,208,127,.95)",
    "rgba(255,200,87,.95)",
    "rgba(255,90,122,.95)"
  ];

  return (
    <div className="donutWrap">
      <div className="donutBox">
        <svg className="donutSvg" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Donut chart">
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle
              cx={size / 2} cy={size / 2} r={r}
              fill="none"
              stroke="rgba(255,255,255,.12)"
              strokeWidth={thickness}
            />
            {segs.map((s, i) => {
              const len = (s.value / total) * c;
              const dash = `${len} ${Math.max(0, c - len)}`;
              const dashOffset = -offset;
              offset += len;
              return (
                <circle
                  key={i}
                  cx={size / 2} cy={size / 2} r={r}
                  fill="none"
                  stroke={palette[i % palette.length]}
                  strokeWidth={thickness}
                  strokeDasharray={dash}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                />
              );
            })}
          </g>

          <text x="50%" y="47%" textAnchor="middle" fill="rgba(255,255,255,.92)" fontSize="18" fontWeight="900">
            {centerLabel || total}
          </text>
          <text x="50%" y="60%" textAnchor="middle" fill="rgba(255,255,255,.62)" fontSize="12">
            всего
          </text>
        </svg>
      </div>

      <div className="donutLegend">
        {segs.map((s, i) => {
          const pct = Math.round((s.value / total) * 100);
          return (
            <div key={i} className="legendItem">
              <span className="legendDot" style={{ background: palette[i % palette.length] }} />
              <div className="tiny">
                <b>{s.label}</b> — {s.value} <span className="muted">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RadarChart({ labels, values }) {
  const labs = (labels || []).map(x => String(x || ""));
  const nums = (values || []).map(v => Math.max(0, Number(v) || 0));
  const n = Math.min(labs.length, nums.length);
  if (!n) return <p className="p">{t("noRadarData")}</p>;

  const W = 280, H = 280;
  const cx = W / 2, cy = H / 2;
  const R = 92;
  const max = Math.max(1, ...nums.slice(0, n));

  const ringCount = 4;
  const points = Array.from({ length: n }, (_, i) => {
    const ang = (-90 + (360 / n) * i) * (Math.PI / 180);
    const rr = (nums[i] / max) * R;
    const x = cx + Math.cos(ang) * rr;
    const y = cy + Math.sin(ang) * rr;
    return [x, y];
  });

  const poly = points.map(p => p.join(",")).join(" ");
  const paletteFill = "rgba(135,188,46,.18)";
  const paletteStroke = "rgba(90,140,26,.95)";

  return (
    <div className="chartBox">
      <svg className="radarSvg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Radar chart">
        {Array.from({ length: ringCount }, (_, k) => {
          const rr = (R / ringCount) * (k + 1);
          return (
            <circle key={k} cx={cx} cy={cy} r={rr} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="1" />
          );
        })}

        {Array.from({ length: n }, (_, i) => {
          const ang = (-90 + (360 / n) * i) * (Math.PI / 180);
          const x = cx + Math.cos(ang) * R;
          const y = cy + Math.sin(ang) * R;
          return (
            <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,.14)" strokeWidth="1" />
          );
        })}

        <polygon points={poly} fill={paletteFill} stroke={paletteStroke} strokeWidth="2" />

        {Array.from({ length: n }, (_, i) => {
          const ang = (-90 + (360 / n) * i) * (Math.PI / 180);
          const x = cx + Math.cos(ang) * (R + 18);
          const y = cy + Math.sin(ang) * (R + 18);
          const anchor = Math.cos(ang) > 0.25 ? "start" : Math.cos(ang) < -0.25 ? "end" : "middle";
          return (
            <text key={i} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" fill="rgba(255,255,255,.70)" fontSize="11">
              {labs[i].slice(0, 16)}{labs[i].length > 16 ? "…" : ""}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/** ---------- GaugeChart ---------- */
export function GaugeChart({ value = 0, max = 100, label = "", sublabel = "" }) {
  const pct = Math.min(1, Math.max(0, (Number(value) || 0) / (Number(max) || 1)));
  const W = 180, H = 110;
  const cx = W / 2, cy = 100;
  const R = 75;
  const start = Math.PI;
  const end = 0;
  const ang = start + (end - start) * pct;
  const x1 = cx + Math.cos(start) * R, y1 = cy + Math.sin(start) * R;
  const x2 = cx + Math.cos(ang) * R, y2 = cy + Math.sin(ang) * R;
  const large = pct > 0.5 ? 1 : 0;
  return (
    <div className="gauge-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
        <path d={`M ${x1} ${y1} A ${R} ${R} 0 1 1 ${cx + R} ${cy}`} fill="none" stroke="var(--border)" strokeWidth="10" strokeLinecap="round" />
        {pct > 0.001 && <path d={`M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`} fill="none" stroke="url(#gaugeGrad)" strokeWidth="10" strokeLinecap="round" />}
        <defs><linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="var(--accent)" /><stop offset="100%" stopColor="var(--accent2)" /></linearGradient></defs>
      </svg>
      <div className="gauge-value">{value}</div>
      {label && <div className="gauge-label">{label}</div>}
      {sublabel && <div className="gauge-sublabel">{sublabel}</div>}
    </div>
  );
}

/** ---------- StackedBarChart ---------- */
export function StackedBarChart({ data, labels }) {
  // data: array of { label, segments: [{value, color}] }
  if (!data || !data.length) return <p className="p">{t("noBarData")}</p>;
  const maxVal = Math.max(1, ...data.map(d => d.segments.reduce((a, s) => a + (Number(s.value) || 0), 0)));
  const colors = ["var(--accent)", "var(--accent2)", "var(--green)", "var(--yellow)", "var(--red)", "#f472b6", "#38bdf8"];
  return (
    <div>
      <div className="barchart" style={{ height: 160 }}>
        {data.map((d, i) => {
          const total = d.segments.reduce((a, s) => a + (Number(s.value) || 0), 0);
          const h = (total / maxVal) * 100;
          return (
            <div key={i} style={{ flex: 1, height: `${h}%`, display: "flex", flexDirection: "column-reverse", borderRadius: 6, overflow: "hidden", minWidth: 4 }} title={`${d.label}: ${total}`}>
              {d.segments.map((s, j) => {
                const sh = total ? (s.value / total) * 100 : 0;
                return <div key={j} style={{ height: `${sh}%`, background: s.color || colors[j % colors.length], minHeight: s.value ? 2 : 0 }} />;
              })}
            </div>
          );
        })}
      </div>
      {labels && <div className="barlabel">{labels.map((l, i) => <span key={i}>{l}</span>)}</div>}
    </div>
  );
}

/** ---------- Document Download Helpers ---------- */
export function generateDocHTML(request, user, signatureUrl, adminSignatureUrl) {
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;
  const docNum = (request.id || "").slice(-6).toUpperCase();
  const days = request.days || dateRangeDays(request.dateFrom, request.dateTo);
  const kindLabel = request.kindLabel || requestKindLabel(request.kind);
  const statusText = request.status === "approved" ? t("dpApproved") : request.status === "rejected" ? t("dpRejected") : t("dpPending");
  const period = `${request.dateFrom}${request.dateTo && request.dateTo !== request.dateFrom ? " — " + request.dateTo : ""}`;

  const sigBlock = (url, label, name) => url
    ? `<div style="text-align:center"><img src="${url}" style="max-width:160px;height:50px;object-fit:contain"/><div style="font-size:11px;color:#888">${label}</div>${name ? `<div style="font-size:12px">${name}</div>` : ""}</div>`
    : `<div style="text-align:center"><div style="width:160px;border-bottom:1px solid #333;margin:0 auto 4px"></div><div style="font-size:11px;color:#888">${label}</div>${name ? `<div style="font-size:12px">${name}</div>` : ""}</div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t("statement")} - ${docNum}</title>
<style>
  @page { margin: 20mm; }
  body { font-family: 'Times New Roman', serif; font-size: 14px; color: #1a1d2e; line-height: 1.6; max-width: 700px; margin: 0 auto; padding: 40px 20px; }
  .header { text-align: center; margin-bottom: 24px; }
  .logo { width: 60px; height: 60px; margin: 0 auto 8px; }
  .org { font-size: 15px; font-weight: bold; }
  .sub { font-size: 12px; color: #666; margin-top: 4px; }
  .regnum { text-align: right; font-size: 12px; color: #888; margin-bottom: 8px; }
  .title { text-align: center; font-size: 20px; font-weight: bold; margin: 20px 0; text-transform: uppercase; }
  .field { margin-bottom: 8px; }
  .field-label { font-weight: bold; }
  .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
  .sig-block { width: 45%; }
  .date-line { margin-top: 24px; font-size: 13px; color: #666; }
  .stamp { position: absolute; right: 60px; bottom: 120px; border: 3px solid rgba(135,188,46,.4); border-radius: 50%; width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; transform: rotate(-15deg); color: rgba(135,188,46,.6); font-weight: bold; font-size: 13px; text-align: center; }
</style></head><body>
  <div class="regnum">No. ${docNum}</div>
  <div class="header">
    <div class="org">${t("nisOrg")}</div>
    <div class="sub">${t("toSchoolPrincipal")}</div>
  </div>
  <div class="title">${t("statement")}</div>
  <div class="field"><span class="field-label">${t("fullName")}:</span> ${user.displayName || user.email || "—"}</div>
  <div class="field"><span class="field-label">${t("positionLabel")}:</span> ${user.position || user.subject || "—"}</div>
  ${user.school ? `<div class="field"><span class="field-label">${t("schoolLabel")}:</span> ${user.school}</div>` : ""}
  <div class="field"><span class="field-label">${t("requestTypeLabel")}:</span> <b>${kindLabel}</b></div>
  <div class="field"><span class="field-label">${t("periodLabel")}:</span> ${period}</div>
  ${request.note ? `<div class="field"><span class="field-label">${t("reasonLabel")}:</span> ${request.note}</div>` : ""}
  <div class="field"><span class="field-label">${t("daysCount")}:</span> ${days}</div>
  <div class="field"><span class="field-label">${t("statusLabel")}:</span> ${statusText}</div>
  <div class="signatures">
    ${sigBlock(signatureUrl, t("employeeSign"), user.displayName || "")}
    ${sigBlock(adminSignatureUrl, t("directorSign"), request.decidedByName || "")}
  </div>
  <div class="date-line">${t("date")}: ${dateStr}</div>
</body></html>`;
}

export function downloadDocAsWord(request, user, signatureUrl, adminSignatureUrl) {
  const html = generateDocHTML(request, user, signatureUrl, adminSignatureUrl);
  const wordHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">${html.slice(html.indexOf("<head>"))}`;
  const blob = new Blob(["\ufeff", wordHtml], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${t("statement")}_${(request.id || "doc").slice(-6).toUpperCase()}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadDocAsPdf(request, user, signatureUrl, adminSignatureUrl) {
  const html = generateDocHTML(request, user, signatureUrl, adminSignatureUrl);
  const win = window.open("", "_blank");
  if (!win) { toast(t("error"), "error"); return; }
  win.document.write(html);
  win.document.close();
  win.onafterprint = () => win.close();
  setTimeout(() => win.print(), 300);
}

/** ---------- DocumentPreview ---------- */
export function DocumentPreview({ request, user, signatureUrl, adminSignatureUrl, onPrint, showDownload }) {
  if (!request || !user) return null;
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;
  const docNum = (request.id || "").slice(-6).toUpperCase();
  return (
    <div className="doc-preview">
      <div className="doc-preview__regnum">No. {docNum || "——"}</div>

      <div className="doc-preview__header">
        <img src="/logo-nis.png" alt="NIS" className="doc-preview__logo" />
        <div className="doc-preview__org">{t("nisOrg")}</div>
        <div className="doc-preview__org-full">{t("nisOrg")}</div>
        <div className="doc-preview__sub">{t("toSchoolPrincipal")}</div>
      </div>

      <div className="doc-preview__title">{t("statement")}</div>

      <div className="doc-preview__body">
        <div className="doc-preview__field">
          <span className="doc-preview__field-label">{t("fullName")}:</span>
          <span className="doc-preview__field-value">{user.displayName || user.email || "—"}</span>
        </div>
        <div className="doc-preview__field">
          <span className="doc-preview__field-label">{t("positionLabel")}:</span>
          <span className="doc-preview__field-value">{user.position || user.subject || "—"}</span>
        </div>
        {user.school && (
          <div className="doc-preview__field">
            <span className="doc-preview__field-label">{t("schoolLabel")}:</span>
            <span className="doc-preview__field-value">{user.school}</span>
          </div>
        )}
        <div className="doc-preview__field">
          <span className="doc-preview__field-label">{t("requestTypeLabel")}:</span>
          <span className="doc-preview__field-value"><b>{request.kindLabel || requestKindLabel(request.kind)}</b></span>
        </div>
        <div className="doc-preview__field">
          <span className="doc-preview__field-label">{t("periodLabel")}:</span>
          <span className="doc-preview__field-value">{request.dateFrom}{request.dateTo && request.dateTo !== request.dateFrom ? ` — ${request.dateTo}` : ""}</span>
        </div>
        {request.note && (
          <div className="doc-preview__field doc-preview__field--reason">
            <span className="doc-preview__field-label">{t("reasonLabel")}:</span>
            <span className="doc-preview__field-value">{request.note}</span>
          </div>
        )}
        <div className="doc-preview__field">
          <span className="doc-preview__field-label">{request.timeFrom && request.timeTo ? t("leaveTimeLabel") : t("daysCount")}:</span>
          <span className="doc-preview__field-value">
            {request.timeFrom && request.timeTo
              ? (() => { const [h1,m1]=request.timeFrom.split(":").map(Number), [h2,m2]=request.timeTo.split(":").map(Number); return `${Math.max(0,Math.round(((h2*60+m2)-(h1*60+m1))/30)/2)} ${t("hours")}  (${request.timeFrom} — ${request.timeTo})`; })()
              : (request.days || dateRangeDays(request.dateFrom, request.dateTo))}
          </span>
        </div>
        <div className="doc-preview__field">
          <span className="doc-preview__field-label">{t("statusLabel")}:</span>
          <span className="doc-preview__field-value"><Pill kind={request.status}>{request.status === "approved" ? t("dpApproved") : request.status === "rejected" ? t("dpRejected") : t("dpPending")}</Pill></span>
        </div>
        {request.evidenceFileUrl && (
          <div className="doc-preview__field">
            <span className="doc-preview__field-label">{t("attachmentLabel")}:</span>
            <span className="doc-preview__field-value"><a href={request.evidenceFileUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>{t("openFile")}</a></span>
          </div>
        )}
      </div>

      <div className="doc-preview__signature">
        <div className="doc-preview__sig-block">
          {signatureUrl ? <img src={signatureUrl} alt="Подпись" className="doc-preview__sig-img" /> : <div className="doc-preview__sig-line" />}
          <div className="doc-preview__sig-label">{t("employeeSign")}</div>
          <div className="doc-preview__sig-name">{user.displayName || ""}</div>
        </div>
        <div className="doc-preview__sig-block">
          {adminSignatureUrl ? <img src={adminSignatureUrl} alt="Admin" className="doc-preview__sig-img" /> : <div className="doc-preview__sig-line" />}
          <div className="doc-preview__sig-label">{t("directorSign")}</div>
          <div className="doc-preview__sig-name">{request.decidedByName || ""}</div>
        </div>
      </div>

      <div className="doc-preview__date">{t("date")}: {dateStr}</div>

      {request.status === "approved" && (
        <div className="doc-preview__stamp">
          <img src="/logo-nis.png" alt="" style={{ width: 30, height: 30, objectFit: "contain", opacity: .4, marginBottom: 4 }} />
          <div>{t("dpApproved")}</div>
        </div>
      )}

      {(onPrint || showDownload) && (
        <div style={{ marginTop: 20, textAlign: "center", display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }} className="doc-preview__actions">
          {onPrint && <Btn kind="primary" onClick={onPrint}><Icon name="file" /> {t("preview")}</Btn>}
          {showDownload && (
            <>
              <Btn kind="ghost" onClick={() => downloadDocAsWord(request, user, signatureUrl, adminSignatureUrl)}>
                <Icon name="file" /> {t("downloadWord")}
              </Btn>
              <Btn kind="ghost" onClick={() => downloadDocAsPdf(request, user, signatureUrl, adminSignatureUrl)}>
                <Icon name="file" /> {t("downloadPdf")}
              </Btn>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** ---------- announcement banner (shown to all users) ---------- */
export function AnnouncementBanner() {
  const st = useStore();
  const announcements = st.announcements || [];
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kpi_ann_dismissed") || "[]"); } catch { return []; }
  });

  const now = new Date().toISOString().slice(0, 10);
  const active = announcements.filter(a => a.startDate <= now && a.endDate >= now && !dismissed.includes(a.id));

  const dismiss = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try { localStorage.setItem("kpi_ann_dismissed", JSON.stringify(next)); } catch { }
  };

  if (!active.length || !st.userDoc) return null;

  return (
    <div className="ann-banners-wrap">
      {active.map((a, i) => {
        const parsedLink = (a.link || "").includes("||") ? a.link.split("||") : [a.link, a.link];
        return (
          <div key={a.id} className="ann-banner" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="ann-banner__shimmer" />
            <div className="ann-banner__content">
              <span className="ann-banner__emoji">{a.emoji}</span>
              <span className="ann-banner__text">{a.text}</span>
              {a.link && <a className="ann-banner__link" href={parsedLink[1]} target="_blank" rel="noopener noreferrer">{parsedLink[0]}</a>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
