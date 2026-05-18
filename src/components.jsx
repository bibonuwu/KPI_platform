import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { t, getLang, setLang } from "./i18n.js";
import {
  auth, db, storage, doc, updateDoc, signOut, OAuthProvider, signInWithPopup,
  signInWithRedirect, updatePassword, reauthenticateWithCredential, EmailAuthProvider,
  sendPasswordResetEmail, MICROSOFT_TENANT, getDownloadURL, ref, uploadBytes
} from "./firebase-config.js";
import {
  store, setState, useStore, navigate, toast, dismissToast, applyTheme, toggleTheme, FONT_MAP,
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
  ensureUserDoc, createSubmission, fetchMySubmissions, uploadEvidence
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

/** ---------- Teammates picker (shared KPI / team goals) ---------- */
export function TeammatesPicker({ value = [], onChange, excludeUid, label }) {
  const st = useStore();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(0);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (open) { setSearch(""); setFocusIdx(0); }
  }, [open]);

  const selected = new Set(value || []);
  const pool = useMemo(() => (st.users || [])
    .filter(x => x && x.uid && x.uid !== excludeUid && x.role !== "admin")
    .sort((a, b) => (a.displayName || a.email || "").localeCompare(b.displayName || b.email || "", "ru")),
    [st.users, excludeUid]);

  const q = search.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!q) return [];
    return pool.filter(x =>
      (x.displayName || "").toLowerCase().includes(q) ||
      (x.email || "").toLowerCase().includes(q) ||
      (x.subject || "").toLowerCase().includes(q) ||
      (x.position || "").toLowerCase().includes(q)
    ).slice(0, 40);
  }, [pool, q]);

  const byUid = new Map(pool.map(x => [x.uid, x]));
  const chosen = (value || []).map(uid => byUid.get(uid)).filter(Boolean);

  const toggle = (uid) => {
    const next = new Set(selected);
    next.has(uid) ? next.delete(uid) : next.add(uid);
    onChange && onChange([...next]);
  };
  const removeOne = (uid) => {
    const next = new Set(selected); next.delete(uid);
    onChange && onChange([...next]);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); return; }
    if (!visible.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusIdx(i => Math.min(visible.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setFocusIdx(i => Math.max(0, i - 1)); }
    else if (e.key === "Enter" && visible[focusIdx]) { e.preventDefault(); toggle(visible[focusIdx].uid); }
  };

  useEffect(() => {
    if (!open || !listRef.current) return;
    const node = listRef.current.querySelector(`[data-idx="${focusIdx}"]`);
    if (node) node.scrollIntoView({ block: "nearest" });
  }, [focusIdx, open]);

  return (
    <div className="teammates-picker">
      {label && <div className="label">{label}</div>}
      <div
        className="input teammates-picker__control"
        onClick={() => setOpen(true)}
        style={{ cursor: "pointer", display: "flex", flexWrap: "wrap", gap: 6, minHeight: 42, alignItems: "center", padding: "6px 12px" }}
      >
        {chosen.length === 0 ? (
          <span className="muted tiny">{t("teammatesPlaceholder")}</span>
        ) : (
          <>
            {chosen.slice(0, 4).map(u => (
              <span
                key={u.uid}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", fontSize: 12, borderRadius: 999, background: "rgba(135,188,46,.15)", border: "1px solid rgba(135,188,46,.35)" }}
                onClick={e => e.stopPropagation()}
              >
                {u.displayName || u.email}
                <button
                  type="button"
                  onClick={() => removeOne(u.uid)}
                  style={{ background: "transparent", border: 0, cursor: "pointer", color: "inherit", padding: 0, marginLeft: 2, fontSize: 14, lineHeight: 1, opacity: .6 }}
                  aria-label={t("remove")}
                >×</button>
              </span>
            ))}
            {chosen.length > 4 && (
              <span style={{ fontSize: 12, padding: "3px 8px", borderRadius: 999, background: "rgba(255,255,255,.06)", border: "1px solid var(--border)" }}>
                +{chosen.length - 4}
              </span>
            )}
          </>
        )}
      </div>

      {open && createPortal(
        <div
          className="tm-backdrop"
          onClick={() => setOpen(false)}
          onKeyDown={onKeyDown}
          tabIndex={-1}
        >
          <div className="tm-modal" onClick={e => e.stopPropagation()}>
            {/* Title + close */}
            <div className="tm-modal__head">
              <div className="tm-modal__title">{label || t("sharedWithTeammates")}</div>
              <button type="button" className="tm-modal__close" onClick={() => setOpen(false)}>×</button>
            </div>

            {/* Search */}
            <div className="tm-modal__search">
              <input
                className="tm-modal__search-input"
                placeholder={t("searchTeacher")}
                value={search}
                onChange={e => { setSearch(e.target.value); setFocusIdx(0); }}
                autoFocus
              />
              {search && (
                <button type="button" className="tm-modal__search-clear" onClick={() => setSearch("")}>×</button>
              )}
            </div>

            {/* Selected chips */}
            {chosen.length > 0 && (
              <div className="tm-modal__chips-wrap">
                <div className="tm-modal__chips-count">{chosen.length}</div>
                <div className="tm-modal__chips">
                  {chosen.map(u => (
                    <span key={u.uid} className="tm-modal__chip">
                      {u.displayName || u.email}
                      <button type="button" className="tm-modal__chip-x" onClick={() => removeOne(u.uid)}>×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="tm-modal__divider" />

            {/* Results — only after typing */}
            {q ? (
              <div ref={listRef} className="tm-modal__list">
                {visible.length === 0 ? (
                  <div className="tm-modal__empty">
                    <div className="tm-modal__empty-glyph">🔎</div>
                    <p className="muted">{t("noData")}</p>
                  </div>
                ) : visible.map((u, idx) => {
                  const on = selected.has(u.uid);
                  const focused = idx === focusIdx;
                  const initials = (u.displayName || u.email || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <div
                      key={u.uid}
                      data-idx={idx}
                      onClick={() => { toggle(u.uid); }}
                      onMouseEnter={() => setFocusIdx(idx)}
                      className={`tm-modal__row${on ? " is-on" : ""}${focused ? " is-focused" : ""}`}
                    >
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" className="tm-modal__avatar" />
                      ) : (
                        <div className={`tm-modal__avatar tm-modal__avatar--initials${on ? " is-on" : ""}`}>{initials}</div>
                      )}
                      <div className="tm-modal__row-body">
                        <div className="tm-modal__row-name">{u.displayName || u.email}</div>
                        {(u.position || u.subject) && (
                          <div className="tm-modal__row-meta muted">{[u.position, u.subject].filter(Boolean).join(" · ")}</div>
                        )}
                      </div>
                      <div className={`tm-modal__radio${on ? " is-on" : ""}`}>
                        {on && <span>✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="tm-modal__empty">
                <div className="tm-modal__empty-glyph">✎</div>
                <p className="muted">{t("startTypingHint")}</p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

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
export function GoalsWidget({ compact = false, dense = false }) {
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
  const [teammates, setTeammates] = useState([]);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState("goals"); // "goals" | "deadlines"
  const [submitGoal, setSubmitGoal] = useState(null);
  const [subFile, setSubFile] = useState(null);
  const [subLink, setSubLink] = useState("");
  const [subNote, setSubNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [compactTab, setCompactTab] = useState("goals"); // "goals" | "history"
  const [goalsPage, setGoalsPage] = useState(1);
  const [histPage, setHistPage] = useState(1);
  const PER_PAGE = 4;

  if (!u || u.role === "admin") return null;

  const types = st.types || [];

  const approvedSubs = subs.filter(s => s.status === "approved");

  const computeProgress = (goal) => {
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
    setTarget(""); setDeadline(""); setNote(""); setScope("quarter"); setSection(""); setTeammates([]); setEditId(null); setShowForm(false);
  };

  const startEdit = (g) => {
    if (editId === g.id && showForm) { resetForm(); return; }
    setEditId(g.id);
    setTarget(String(g.targetPoints || ""));
    setDeadline(g.deadline || "");
    setNote(g.note || "");
    setScope(g.scope || "quarter");
    setSection(g.section || "");
    setTeammates(Array.isArray(g.teammates) ? g.teammates : []);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!target || Number(target) <= 0) { toast(t("goalTarget"), "error"); return; }
    setSaving(true);
    try {
      const cleanMates = (teammates || []).filter(x => x && x !== u.uid);
      if (editId) {
        await updateGoal(editId, { targetPoints: Number(target), deadline, note: safeText(note), scope, section: safeText(section), teammates: cleanMates });
      } else {
        await createGoal({ uid: u.uid, targetPoints: Number(target), deadline, note, scope, section, teammates: cleanMates });
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

  const openSubmit = (g) => {
    if (g.completed) return;
    setSubmitGoal(g);
    setSubFile(null);
    setSubLink("");
    setSubNote("");
  };

  const closeSubmit = () => {
    if (submitting) return;
    setSubmitGoal(null);
    setSubFile(null);
    setSubLink("");
    setSubNote("");
  };

  const handleSubmitGoal = async () => {
    const g = submitGoal;
    if (!g) return;
    if (!subFile && !subLink.trim()) {
      toast(t("evidenceRequired"), "error");
      return;
    }
    setSubmitting(true);
    try {
      let evidenceFileUrl = "";
      if (subFile) {
        evidenceFileUrl = await uploadEvidence(u.uid, subFile);
      }
      const goalType = (st.types || []).find(tp => tp.section === g.section) || {
        id: "goal", name: g.note || t("goals"), section: g.section || "", subsection: "", defaultPoints: g.targetPoints
      };
      const baseDesc = `${t("goalTarget")}: ${g.targetPoints} · ${t("goalDeadline")}: ${g.deadline || "—"}`;
      const description = subNote.trim() ? `${baseDesc}\n${subNote.trim()}` : baseDesc;
      await createSubmission({
        uid: u.uid,
        type: { ...goalType, defaultPoints: g.targetPoints },
        title: g.note || t("goals"),
        description,
        eventDate: ymd(),
        evidenceLink: subLink.trim(),
        evidenceFileUrl,
        teammates: Array.isArray(g.teammates) ? g.teammates : []
      });
      await updateGoal(g.id, { completed: true });
      const fresh = await fetchGoals(u.uid);
      const mySubs = await fetchMySubmissions(u.uid);
      setState({ myGoals: fresh, mySubmissions: mySubs });
      toast(t("goalSubmitted"), "ok");
      setSubmitGoal(null);
      setSubFile(null);
      setSubLink("");
      setSubNote("");
    } catch (e) {
      toast(e?.message || t("error"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopen = async (g) => {
    try {
      await updateGoal(g.id, { completed: false });
      const fresh = await fetchGoals(u.uid);
      setState({ myGoals: fresh });
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

  const submitModalNode = submitGoal ? createPortal(
    <div className="modalback" onClick={closeSubmit}>
      <div className="modal glass goal-submit-modal" style={{ maxWidth: 520, width: "92vw" }} onClick={e => e.stopPropagation()}>
        <div className="modal__head">
          <div>
            <div className="h2" style={{ marginBottom: 2 }}>{t("submitGoalTitle")}</div>
            <div className="tiny muted">{t("submitGoalHint")}</div>
          </div>
          <Btn onClick={closeSubmit} disabled={submitting}>✕</Btn>
        </div>
        <div className="goal-submit-modal__body">
          <div className="goal-submit-modal__summary">
            <div className="goal-submit-modal__summary-title">{submitGoal.note || t("goals")}</div>
            <div className="goal-submit-modal__summary-meta">
              <span>{fmtPoints(submitGoal.targetPoints)} {t("pts")}</span>
              {submitGoal.section && <span>• {submitGoal.section}</span>}
              {submitGoal.deadline && <span>• {t("goalDeadline")}: {submitGoal.deadline}</span>}
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <label className="label">{t("evidenceFile")}</label>
            <FileDrop
              value={subFile}
              onChange={(e) => setSubFile(e.target.files?.[0] || null)}
              disabled={submitting}
            />
          </div>
          <div style={{ marginTop: 12 }}>
            <label className="label">{t("evidenceLinkLabel")}</label>
            <Input
              type="url"
              placeholder="https://"
              value={subLink}
              onChange={e => setSubLink(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div style={{ marginTop: 12 }}>
            <label className="label">{t("evidenceComment")}</label>
            <Textarea
              rows={3}
              value={subNote}
              onChange={e => setSubNote(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="help" style={{ marginTop: 8 }}>{t("evidenceRequired")}</div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <Btn onClick={closeSubmit} disabled={submitting}>{t("cancel")}</Btn>
          <Btn kind="primary" onClick={handleSubmitGoal} disabled={submitting || (!subFile && !subLink.trim())}>
            {submitting ? t("uploadingFile") : t("submitForReview")}
          </Btn>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  if (compact) {
    const historySubs = [...subs].sort((a, b) => {
      const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const db2 = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return db2 - da;
    });

    return (
      <>
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
                            <button className={`gc-item__check${g.completed ? " gc-item__check--done" : ""}`} onClick={!g.completed ? () => openSubmit(g) : undefined} disabled={g.completed} title={g.completed ? t("goalCompleted") : t("submitForReview")}>
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
                          <div className="gc-item__bar">
                            <div className="gc-item__fill" style={{ width: `${prog.pct}%`, background: barColor }} />
                          </div>
                          <span className="gc-item__pct">{prog.pct}%</span>
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
      {submitModalNode}
      </>
    );
  }

  return (
    <>
    <div className={`glass card goals-widget${dense ? " goals-widget--dense" : ""}`}>
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
          <div style={{ marginTop: 10 }}>
            <TeammatesPicker
              value={teammates}
              onChange={setTeammates}
              excludeUid={u.uid}
              label={t("teamGoalMembers")}
            />
            <div className="help">{t("teamGoalHint")}</div>
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

      <div className="goals-widget__list" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(g => {
          const prog = computeProgress(g);
          const overdue = isOverdue(g);
          const dl = daysUntil(g.deadline);
          return (
            <div key={g.id} className={`goal-card${g.completed ? " goal-card--done" : ""}${overdue ? " goal-card--overdue" : ""}`}>
              <div className="goal-card__top">
                <button className={`goal-card__check${g.completed ? " goal-card__check--done" : ""}`} onClick={() => g.completed ? handleReopen(g) : openSubmit(g)} title={g.completed ? t("goalActive") : t("submitForReview")}>
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
    {submitModalNode}
    </>
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
    if (["requests", "documents", "add", "books"].includes(p)) return "work";
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
  const adminSkudItem = { p: "admin/skud", tKey: "navSkud", i: "shield" };

  // Flyout group badges (sum of children)
  const workBadge = badgeFor("documents");
  const adminModerationBadge = badgeFor("admin/approvals") + badgeFor("admin/requests");
  const adminPeopleBadge = badgeFor("admin/support");

  if (!u) {
    return (
      <div className="sidenav">
        <NavLink it={{ p: "login", tKey: "navLogin", i: "user" }} />
      </div>
    );
  }

  const isTeacher = u.role !== "admin";

  return (
    <div className="sidenav">

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

          {/* SKUD — standalone */}
          <NavLink it={adminSkudItem} />
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
  books:               { icon: "file",      tKey: "navBooks",          desc: "booksDesc" },
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
  "admin/skud":        { icon: "shield",    tKey: "navSkud",           desc: "skudDesc" },
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

function OnlineRow({ user, isMe }) {
  const name = user.displayName || user.email || "—";
  const initials = (user.displayName || user.email || "?")
    .split(/\s+/).slice(0, 2).map(s => s[0] || "").join("").toUpperCase() || "?";
  const meta = user.school || user.subject || user.email || "";
  return (
    <div className={`online-row${isMe ? " online-row--me" : ""}`}>
      <div className="online-row__avatar">
        {user.avatarUrl
          ? <img src={user.avatarUrl} alt="" loading="lazy" />
          : <span className="online-row__initials">{initials}</span>}
        <span className="online-row__dot" aria-hidden="true" />
      </div>
      <div className="online-row__info">
        <div className="online-row__name">
          <span className="online-row__name-text">{name}</span>
          {isMe && <span className="online-row__me-badge">{t("onlineYou")}</span>}
        </div>
        {meta && <div className="online-row__meta">{meta}</div>}
      </div>
    </div>
  );
}

function OnlineGroup({ label, users, currentUid }) {
  if (!users.length) return null;
  return (
    <div className="online-group">
      <div className="online-group__head">
        <span className="online-group__label">{label}</span>
        <span className="online-group__count">{users.length}</span>
      </div>
      <div className="online-group__list">
        {users.map(x => <OnlineRow key={x.uid} user={x} isMe={x.uid === currentUid} />)}
      </div>
    </div>
  );
}

export function OnlineWidget() {
  const st = useStore();
  const u = st.userDoc;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const allUsers = st.users;

  const { onlineList, totalCount } = useMemo(() => {
    const list = allUsers || [];
    const map = new Map();
    for (const x of list) {
      if (x && x.uid && x.online === true) map.set(x.uid, x);
    }
    if (u?.uid) {
      const prev = map.get(u.uid);
      map.set(u.uid, { ...(prev || u), ...u, online: true });
    }
    return { onlineList: Array.from(map.values()), totalCount: list.length || map.size };
  }, [allUsers, u]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return onlineList;
    return onlineList.filter(x =>
      (x.displayName || "").toLowerCase().includes(q) ||
      (x.email || "").toLowerCase().includes(q) ||
      (x.school || "").toLowerCase().includes(q) ||
      (x.subject || "").toLowerCase().includes(q)
    );
  }, [onlineList, query]);

  const { admins, teachers } = useMemo(() => {
    const meUid = u?.uid;
    const cmp = (a, b) => {
      if (a.uid === meUid) return -1;
      if (b.uid === meUid) return 1;
      return (a.displayName || a.email || "").localeCompare(b.displayName || b.email || "", undefined, { sensitivity: "base" });
    };
    const ad = [], te = [];
    for (const x of filtered) (x.role === "admin" ? ad : te).push(x);
    ad.sort(cmp); te.sort(cmp);
    return { admins: ad, teachers: te };
  }, [filtered, u?.uid]);

  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => { if (!open) setQuery(""); }, [open]);

  if (!u) return null;

  const onlineCount = onlineList.length;
  const showSearch = onlineList.length >= 8;

  return (
    <>
      {open && (
        <div className="modalback" onClick={() => setOpen(false)} role="presentation">
          <div
            className="modal glass online-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="online-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal__head online-modal__head">
              <div className="online-modal__heading">
                <div id="online-modal-title" className="h2 online-modal__title">
                  <span className="online-dot online-dot--lg" aria-hidden="true" />
                  {t("onlineNow")}
                </div>
                <div className="online-modal__sub">
                  <b>{onlineCount}</b> / {totalCount} {t("employee")}
                </div>
              </div>
              <Btn onClick={() => setOpen(false)} aria-label="Close">✕</Btn>
            </div>

            {showSearch && (
              <div className="online-modal__search">
                <input
                  className="input"
                  type="search"
                  placeholder={t("onlineSearchPh")}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            <div className="online-modal__body">
              {filtered.length === 0 ? (
                <p className="p muted online-modal__empty">{t("noActiveUsers")}</p>
              ) : (
                <>
                  <OnlineGroup label={t("administrators")} users={admins} currentUid={u.uid} />
                  <OnlineGroup label={t("teachers")} users={teachers} currentUid={u.uid} />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="online-widget">
        <button
          type="button"
          className="online-widget__btn"
          onClick={() => setOpen(true)}
          title={t("onlineNow")}
          aria-label={`${t("onlineNow")}: ${onlineCount} / ${totalCount}`}
        >
          <span className="online-widget__pulse" aria-hidden="true">
            <span className="online-dot" />
          </span>
          <span className="online-widget__info">
            <span className="online-widget__count" aria-live="polite">{onlineCount}</span>
            <span className="online-widget__meta">
              <span className="online-widget__label">{t("online")}</span>
              <span className="online-widget__total">/ {totalCount}</span>
            </span>
          </span>
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

function ToastIcon({ kind }) {
  if (kind === "ok" || kind === "success") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="4 12 10 18 20 6" />
      </svg>
    );
  }
  if (kind === "warning") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="14" />
        <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (kind === "error") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="6" y1="6" x2="18" y2="18" />
        <line x1="18" y1="6" x2="6" y2="18" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="11" x2="12" y2="17" />
      <circle cx="12" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ToastItem({ t: ti }) {
  const kind = ti.kind === "success" ? "ok" : ti.kind;
  const titleKey = kind === "error" ? "toastError" : kind === "ok" ? "toastOk" : kind === "warning" ? "toastWarn" : "toastMsg";
  const title = ti.title || t(titleKey);
  return (
    <div className={`toast toast--${kind}`} role="status">
      <div className="toast__icon" aria-hidden="true">
        <ToastIcon kind={kind} />
      </div>
      <div className="toast__body">
        <div className="toast__title">{title}</div>
        <div className="toast__msg">{ti.msg}</div>
      </div>
      {ti.action && ti.actionLabel && (
        <button
          type="button"
          className="toast__action"
          onClick={() => { try { ti.action(); } finally { dismissToast(ti.id); } }}
        >
          {ti.actionLabel}
        </button>
      )}
      <button
        type="button"
        className="toast__close"
        aria-label="close"
        onClick={() => dismissToast(ti.id)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export function Overlays() {
  const st = useStore();
  const site = st.siteSettings || {};
  const showOnline = site.showOnline !== false;
  const showAi = site.showAi !== false;
  return (
    <>
      <div className="toastwrap" aria-live="polite" aria-atomic="true">
        {st.toasts.map(ti => <ToastItem key={ti.id} t={ti} />)}
      </div>
      {st.modal?.kind === "crop" && <CropModal file={st.modal.file} onClose={() => setState({ modal: null })} />}
      <TeacherProfileModal />
      <ForcePasswordChange />
      {showOnline && <OnlineWidget />}
      <AccessibilityModal />
      {showAi && <AIChatWidget />}
    </>
  );
}

/* ---------- NIS AI by Bibon — расширенный мини-виджет чата ---------- */
const AI_ENDPOINT = "https://chat-qlebq6gwma-uc.a.run.app";
const AI_STORAGE = "nis-ai-bibon:kpi-history";
const AI_PREFS = "nis-ai-bibon:prefs";
const AI_VERSION_STORAGE = "nis-ai-bibon:version";
const AI_MAX_HISTORY = 50;
/** Версия клиента виджета (не сервера). Поднимать при значимых правках UI. */
const AI_CLIENT_VERSION = "2.2.0";

/** Локализация UI виджета — три языка. */
const AI_T = {
  brand:      { ru: "NIS AI",            kz: "NIS AI",                en: "NIS AI" },
  by:         { ru: "by Bibon",          kz: "by Bibon",              en: "by Bibon" },
  subtitleOn: { ru: "Готов отвечать",    kz: "Жауап беруге дайын",    en: "Ready to help" },
  subtitleBz: { ru: "Думаю…",            kz: "Ойланып жатырмын…",     en: "Thinking…" },
  ariaOpen:   { ru: "Открыть чат",       kz: "Чатты ашу",             en: "Open chat" },
  ariaClose:  { ru: "Закрыть",           kz: "Жабу",                  en: "Close" },
  ariaClear:  { ru: "Очистить",          kz: "Тазалау",               en: "Clear" },
  ariaMax:    { ru: "На весь размер",    kz: "Үлкейту",               en: "Maximize" },
  ariaMin:    { ru: "Свернуть",          kz: "Қайтару",               en: "Restore" },
  ariaVoice:  { ru: "Голосовой ввод",    kz: "Дауыспен енгізу",       en: "Voice input" },
  ariaSend:   { ru: "Отправить",         kz: "Жіберу",                en: "Send" },
  ariaCopy:   { ru: "Копировать",        kz: "Көшіру",                en: "Copy" },
  ariaLike:   { ru: "Полезно",           kz: "Пайдалы",               en: "Helpful" },
  ariaDis:    { ru: "Не помогло",        kz: "Көмектескен жоқ",       en: "Not helpful" },
  scrollDown: { ru: "Вниз",              kz: "Төменге",               en: "To bottom" },
  placeholder:{ ru: "Спросите про сайт… (Shift+Enter — перенос)", kz: "Сайт туралы сұраңыз… (Shift+Enter — жаңа жол)", en: "Ask about the site… (Shift+Enter for newline)" },
  pickTopic:  { ru: "Или выберите тему",  kz: "Немесе тақырып таңдаңыз", en: "Or pick a topic" },
  hello:      {
    ru: "Привет! Я **NIS AI by Bibon** — помогу разобраться с KPI-платформой. Спросите про достижения, баллы, рейтинг, заявки или админку.\n\nКоманды: `/help`, `/topics`, `/export`, `/clear`, `/lang ru|kz|en`.",
    kz: "Сәлем! Мен **NIS AI by Bibon** — KPI-платформадан көмектесемін. Жетістіктер, ұпайлар, рейтинг, өтінімдер, әкімші панелі туралы сұраңыз.\n\nКомандалар: `/help`, `/topics`, `/export`, `/clear`, `/lang ru|kz|en`.",
    en: "Hi! I'm **NIS AI by Bibon** — your guide to the KPI platform. Ask about achievements, points, rating, requests or the admin panel.\n\nCommands: `/help`, `/topics`, `/export`, `/clear`, `/lang ru|kz|en`.",
  },
  cmdHelp:    {
    ru: "**Команды виджета:**\n- `/help` — этот список\n- `/topics` — категории тем\n- `/clear` — очистить чат\n- `/export` — скачать переписку (.txt)\n- `/lang ru|kz|en` — сменить язык интерфейса\n- `/about` или `/version` — версия клиента и сервера\n\n**Подсказки по запросам:**\n- «сколько баллов за PhD?»\n- «как взять отгул?»\n- «что такое уровень Мастер?»\n- «как сменить пароль?»",
    kz: "**Виджет командалары:**\n- `/help` — осы тізім\n- `/topics` — тақырыптар\n- `/clear` — чатты тазалау\n- `/export` — хат-хабарды жүктеу (.txt)\n- `/lang ru|kz|en` — интерфейс тілін ауыстыру\n- `/about` немесе `/version` — клиент пен сервердің нұсқасы",
    en: "**Widget commands:**\n- `/help` — this list\n- `/topics` — topic categories\n- `/clear` — clear chat\n- `/export` — download transcript (.txt)\n- `/lang ru|kz|en` — switch UI language\n- `/about` or `/version` — client & server version",
  },
  cmdAbout:   {
    ru: "Я локальный rule-based бот: **никаких внешних AI-сервисов**. Все ответы — про KPI-платформу NIS, по правилам. Быстро, бесплатно, приватно.\n\nАвтор: **Bibon**. Если ответ не подошёл — нажмите 👎 и переформулируйте.\n\n%VERSIONS%",
    kz: "Мен жергілікті rule-based ботпын: **сыртқы AI қызметтері жоқ**. Барлық жауаптар — NIS KPI-платформасы туралы, ережелер бойынша. Жылдам, тегін, жеке.\n\nАвторы: **Bibon**.\n\n%VERSIONS%",
    en: "I'm a local rule-based bot — **no external AI services**. All answers are about the NIS KPI platform, by rules. Fast, free, private.\n\nAuthor: **Bibon**.\n\n%VERSIONS%",
  },
  cmdCleared: { ru: "История очищена.", kz: "Тарих тазартылды.", en: "History cleared." },
  cmdExportOk:{ ru: "Переписка сохранена в файл.", kz: "Хат-хабар файлға сақталды.", en: "Transcript saved to file." },
  cmdExportEmpty: { ru: "Пока нечего экспортировать.", kz: "Әзірше экспортқа ештеңе жоқ.", en: "Nothing to export yet." },
  cmdLangOk:  { ru: "Язык виджета изменён.", kz: "Виджет тілі ауыстырылды.", en: "Widget language switched." },
  cmdLangErr: { ru: "Использование: `/lang ru` | `/lang kz` | `/lang en`.", kz: "Қолдану: `/lang ru` | `/lang kz` | `/lang en`.", en: "Usage: `/lang ru` | `/lang kz` | `/lang en`." },
  cmdUnknown: { ru: "Неизвестная команда. Напишите `/help`.", kz: "Белгісіз команда. `/help` жазыңыз.", en: "Unknown command. Type `/help`." },
  emptyReply: { ru: "Пустой ответ — попробуйте переформулировать.", kz: "Бос жауап — басқаша жазып көріңіз.", en: "Empty reply — please rephrase." },
  netErr:     { ru: "Нет связи с сервером", kz: "Серверге қосылу жоқ", en: "Network error" },
  thanks:     { ru: "Спасибо за отзыв!", kz: "Пікіріңіз үшін рахмет!", en: "Thanks for the feedback!" },
  copied:     { ru: "Скопировано", kz: "Көшірілді", en: "Copied" },
  voiceFail:  { ru: "Голосовой ввод не поддерживается в этом браузере.", kz: "Браузерде дауыс енгізу қолданылмайды.", en: "Voice input not supported here." },
  topicsTitle:{ ru: "Темы", kz: "Тақырыптар", en: "Topics" },
  verLabel:   { ru: "версия",  kz: "нұсқа",   en: "version" },
  verClient:  { ru: "клиент",  kz: "клиент",  en: "client" },
  verServer:  { ru: "сервер",  kz: "сервер",  en: "server" },
  verSyncing: { ru: "ожидаю ответ сервера…", kz: "сервер жауабын күтемін…", en: "waiting for server…" },
};

const aiT = (key, lang) => (AI_T[key] && AI_T[key][lang]) || (AI_T[key] && AI_T[key].ru) || key;

/** Категории тем на стартовом экране (по 3 быстрых вопроса в каждой). */
const AI_TOPICS = [
  {
    id: "achievements", icon: "🏆",
    title: { ru: "Достижения", kz: "Жетістіктер", en: "Achievements" },
    qs: {
      ru: ["Как добавить достижение?", "Какой документ прикреплять?", "Почему отклонили заявку?"],
      kz: ["Жетістікті қалай қосуға болады?", "Қандай құжат тіркеу керек?", "Неге өтінім қабылданбады?"],
      en: ["How do I submit an achievement?", "What evidence to attach?", "Why was my submission rejected?"],
    },
  },
  {
    id: "points", icon: "💯",
    title: { ru: "Баллы", kz: "Ұпайлар", en: "Points" },
    qs: {
      ru: ["Сколько баллов за PhD?", "Сколько за олимпиаду?", "Баллы за IELTS"],
      kz: ["PhD үшін қанша ұпай?", "Олимпиадаға қанша?", "IELTS ұпайлары"],
      en: ["Points for a PhD?", "Points for an olympiad?", "IELTS points"],
    },
  },
  {
    id: "rating", icon: "📈",
    title: { ru: "Рейтинг", kz: "Рейтинг", en: "Rating" },
    qs: {
      ru: ["Где мой рейтинг?", "Какие есть уровни?", "Что такое Мастер?"],
      kz: ["Менің рейтингім қайда?", "Қандай деңгейлер бар?", "Шебер дегеніміз не?"],
      en: ["Where is my rating?", "What levels exist?", "What is Master level?"],
    },
  },
  {
    id: "requests", icon: "📝",
    title: { ru: "Заявки", kz: "Өтінімдер", en: "Requests" },
    qs: {
      ru: ["Как взять отгул?", "Что такое weekend work?", "Сколько у меня компенсаций?"],
      kz: ["Қалай еркін күн алу?", "Weekend work дегеніміз не?", "Менде қанша өтемақы?"],
      en: ["How do I take leave?", "What is weekend work?", "My comp balance?"],
    },
  },
  {
    id: "profile", icon: "👤",
    title: { ru: "Профиль", kz: "Профиль", en: "Profile" },
    qs: {
      ru: ["Как сменить пароль?", "Как поменять аватар?", "Как выйти?"],
      kz: ["Құпиясөзді қалай ауыстыру?", "Аватарды қалай ауыстыру?", "Қалай шығу?"],
      en: ["How to change password?", "How to change avatar?", "How to log out?"],
    },
  },
  {
    id: "settings", icon: "⚙️",
    title: { ru: "Настройки", kz: "Баптаулар", en: "Settings" },
    qs: {
      ru: ["Как сменить язык?", "Как переключить тему?", "Шрифт побольше"],
      kz: ["Тілді қалай ауыстыру?", "Тақырыпты қалай ауыстыру?", "Шрифт үлкенірек"],
      en: ["Switch language?", "Switch theme?", "Larger font"],
    },
  },
  {
    id: "admin", icon: "🛠",
    title: { ru: "Админка", kz: "Әкімші панелі", en: "Admin" },
    qs: {
      ru: ["Что в админ-кабинете?", "Что такое Approvals?", "Что такое СКУД?"],
      kz: ["Әкімші кабинетінде не бар?", "Approvals дегеніміз не?", "СКУД дегеніміз не?"],
      en: ["What is in the admin panel?", "What are Approvals?", "What is SKUD?"],
    },
  },
  {
    id: "help", icon: "❓",
    title: { ru: "Помощь", kz: "Көмек", en: "Help" },
    qs: {
      ru: ["Сайт тормозит", "Не могу войти", "Сообщить о баге"],
      kz: ["Сайт баяу жұмыс істейді", "Кіре алмаймын", "Қате туралы хабарлау"],
      en: ["Site is slow", "Cannot log in", "Report a bug"],
    },
  },
];

/** Локальные followup-цепочки: если сервер не вернул suggestions — выбираем по теме. */
const AI_FOLLOWUPS = {
  ru: {
    achievement: ["Какие лимиты у типов?", "Какой документ прикреплять?", "Где статус заявки?"],
    points:      ["Сколько за статью Scopus?", "Баллы за открытый урок", "Баллы за IELTS"],
    rating:      ["Какие есть уровни?", "Что такое Гроссмейстер?", "Как считаются четверти?"],
    request:     ["Что такое weekend work?", "Как ранний уход?", "Сколько у меня дней?"],
    profile:     ["Как поменять аватар?", "Как сменить пароль?", "Как выйти?"],
    settings:    ["Как сменить язык?", "Как переключить тему?", "Доступность"],
    admin:       ["Что в Approvals?", "Что такое СКУД?", "Где Director?"],
    default:     ["Что умеет сайт?", "Где рейтинг?", "Как добавить достижение?"],
  },
  kz: {
    achievement: ["Түрлердің лимиттері қандай?", "Қандай құжат тіркеу?", "Өтінім статусы қайда?"],
    points:      ["Scopus мақала үшін?", "Ашық сабақ ұпайлары", "IELTS ұпайлары"],
    rating:      ["Деңгейлер қандай?", "Гроссмейстер дегеніміз не?", "Тоқсандар қалай саналады?"],
    request:     ["Weekend work дегеніміз не?", "Ертерек кету?", "Қанша күн қалды?"],
    profile:     ["Аватарды ауыстыру?", "Құпиясөз ауыстыру?", "Қалай шығу?"],
    settings:    ["Тілді ауыстыру?", "Тақырып ауыстыру?", "Қолжетімділік"],
    admin:       ["Approvals дегеніміз не?", "СКУД дегеніміз не?", "Director қайда?"],
    default:     ["Сайт не істей алады?", "Рейтинг қайда?", "Жетістікті қалай қосу?"],
  },
  en: {
    achievement: ["Type limits?", "Which evidence file?", "Where is request status?"],
    points:      ["Points for Scopus paper?", "Open lesson points", "IELTS points"],
    rating:      ["What levels are there?", "What is Grandmaster?", "How are quarters counted?"],
    request:     ["What is weekend work?", "Early leave?", "How many days do I have?"],
    profile:     ["Change avatar?", "Change password?", "Log out?"],
    settings:    ["Switch language?", "Switch theme?", "Accessibility"],
    admin:       ["What's in Approvals?", "What is SKUD?", "Where is Director?"],
    default:     ["What can the site do?", "Where is rating?", "How to add an achievement?"],
  },
};

/** Эвристика: определяет тему ответа бота по ключевым словам, чтобы подобрать followup-чипы. */
function guessTopic(text) {
  const t = String(text || "").toLowerCase();
  if (/(достижен|жетіст|achiev|submit|заявк подал)/i.test(t)) return "achievement";
  if (/(балл|ұпай|point|score|олимпиад|ielts|scopus)/i.test(t)) return "points";
  if (/(рейтинг|rank|deңгей|level|уровень|четверт|тоқсан|quarter)/i.test(t)) return "rating";
  if (/(отгул|leave|weekend|выходн|early|компенсац|өтем)/i.test(t)) return "request";
  if (/(профил|profile|аватар|пароль|password|выход|logout)/i.test(t)) return "profile";
  if (/(тема|theme|язык|тіл|lang|шрифт|font|доступн)/i.test(t)) return "settings";
  if (/(админ|admin|approval|скуд|skud|director)/i.test(t)) return "admin";
  return "default";
}

/** Мини-markdown: **жирный**, `код`, ссылки http(s)://…, маркированные/нумерованные списки. */
function renderMarkdown(text) {
  const lines = String(text || "").split(/\r?\n/);
  const out = [];
  let bullets = null; let ordered = null;

  const flushBullets = () => { if (bullets) { out.push(<ul key={`ul-${out.length}`}>{bullets}</ul>); bullets = null; } };
  const flushOrdered = () => { if (ordered) { out.push(<ol key={`ol-${out.length}`}>{ordered}</ol>); ordered = null; } };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.replace(/\s+$/, "");
    const mBullet = line.match(/^\s*[-•*]\s+(.*)$/);
    const mOrdered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);

    if (mBullet) {
      flushOrdered();
      if (!bullets) bullets = [];
      bullets.push(<li key={`li-${idx}`}>{renderInline(mBullet[1])}</li>);
      return;
    }
    if (mOrdered) {
      flushBullets();
      if (!ordered) ordered = [];
      ordered.push(<li key={`li-${idx}`}>{renderInline(mOrdered[2])}</li>);
      return;
    }
    flushBullets(); flushOrdered();
    if (!line) { out.push(<br key={`br-${idx}`} />); return; }
    out.push(<div key={`p-${idx}`} className="ai-md-line">{renderInline(line)}</div>);
  });
  flushBullets(); flushOrdered();
  return out;
}

function renderInline(text) {
  const nodes = [];
  let i = 0; let key = 0;
  const re = /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(https?:\/\/[^\s)]+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > i) nodes.push(text.slice(i, m.index));
    if (m[2]) nodes.push(<strong key={`b-${key++}`}>{m[2]}</strong>);
    else if (m[4]) nodes.push(<code key={`c-${key++}`}>{m[4]}</code>);
    else if (m[5]) nodes.push(<a key={`a-${key++}`} href={m[5]} target="_blank" rel="noopener noreferrer">{m[5]}</a>);
    i = re.lastIndex;
  }
  if (i < text.length) nodes.push(text.slice(i));
  return nodes;
}

export function AIChatWidget() {
  // язык интерфейса виджета — берём из глобального стора, но даём возможность переопределить /lang
  const globalLang = (typeof getLang === "function" ? getLang() : "ru");
  const [lang, setLangLocal] = useState(() => {
    try { const p = JSON.parse(localStorage.getItem(AI_PREFS) || "{}"); return p.lang || globalLang; } catch { return globalLang; }
  });

  const [open, setOpen] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [msgs, setMsgs] = useState(() => {
    try {
      const raw = localStorage.getItem(AI_STORAGE);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.slice(-AI_MAX_HISTORY) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [feedback, setFeedback] = useState(() => { // {idx: "up"|"down"}
    try { return JSON.parse(localStorage.getItem(AI_PREFS + ":fb") || "{}"); } catch { return {}; }
  });
  const [unread, setUnread] = useState(0);
  const [showJump, setShowJump] = useState(false);
  const [listening, setListening] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(-1);
  const [serverVer, setServerVer] = useState(() => {
    try { return JSON.parse(localStorage.getItem(AI_VERSION_STORAGE) || "null"); }
    catch { return null; }
  });

  const logRef = useRef(null);
  const inputRef = useRef(null);
  const recogRef = useRef(null);

  // persist
  useEffect(() => {
    try { localStorage.setItem(AI_STORAGE, JSON.stringify(msgs.slice(-AI_MAX_HISTORY))); } catch { /* quota */ }
  }, [msgs]);
  useEffect(() => {
    try { localStorage.setItem(AI_PREFS, JSON.stringify({ lang })); } catch { /* ignore */ }
  }, [lang]);
  useEffect(() => {
    try { localStorage.setItem(AI_PREFS + ":fb", JSON.stringify(feedback)); } catch { /* ignore */ }
  }, [feedback]);

  // autoscroll + focus
  useEffect(() => {
    if (!open) return;
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setUnread(0);
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const el = logRef.current;
    if (!el) return;
    // если пользователь близко к низу — скроллим, иначе показываем кнопку «вниз»
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom) el.scrollTop = el.scrollHeight;
    else setShowJump(true);
  }, [msgs.length, busy, open]);

  // Escape — закрыть
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (maximized) setMaximized(false);
        else setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, maximized]);

  // непрочитанные: считаем bot-ответы, пришедшие пока окно закрыто
  const lastBotCountRef = useRef(msgs.filter(m => m.role === "assistant").length);
  useEffect(() => {
    const botCount = msgs.filter(m => m.role === "assistant").length;
    if (!open && botCount > lastBotCountRef.current) {
      setUnread(u => u + (botCount - lastBotCountRef.current));
    }
    lastBotCountRef.current = botCount;
  }, [msgs, open]);

  /* ---------------- Слэш-команды ---------------- */
  function handleSlash(raw) {
    const [cmd, ...rest] = raw.trim().split(/\s+/);
    const arg = rest.join(" ").trim().toLowerCase();
    const push = (content) => setMsgs(m => [...m, { role: "user", content: raw }, { role: "assistant", content, meta: { local: true } }]);

    const renderAbout = () => {
      const lines = [
        `- **${aiT("verClient", lang)}**: v${AI_CLIENT_VERSION}`,
        `- **${aiT("verServer", lang)}**: ${serverVer ? `v${serverVer.version}${serverVer.name ? ` «${serverVer.name}»` : ""}${serverVer.date ? ` · ${serverVer.date}` : ""}` : aiT("verSyncing", lang)}`,
      ];
      return aiT("cmdAbout", lang).replace("%VERSIONS%", lines.join("\n"));
    };

    switch (cmd) {
      case "/help":    push(aiT("cmdHelp", lang)); return true;
      case "/about":   push(renderAbout()); return true;
      case "/version": push(renderAbout()); return true;
      case "/clear":   setMsgs([]); setErr(""); setFeedback({}); try { localStorage.removeItem(AI_STORAGE); } catch { /* ignore */ } toast(aiT("cmdCleared", lang), "info"); return true;
      case "/topics":  push(aiT("pickTopic", lang) + ":\n\n" + AI_TOPICS.map(t => `- ${t.icon} ${t.title[lang] || t.title.ru}`).join("\n")); return true;
      case "/export":  exportTranscript(); return true;
      case "/lang": {
        if (["ru", "kz", "en"].includes(arg)) { setLangLocal(arg); push(aiT("cmdLangOk", arg)); }
        else push(aiT("cmdLangErr", lang));
        return true;
      }
      default: push(aiT("cmdUnknown", lang)); return true;
    }
  }

  function exportTranscript() {
    if (!msgs.length) { toast(aiT("cmdExportEmpty", lang), "info"); return; }
    const lines = msgs.map(m => `[${m.role === "user" ? "You" : "AI"}] ${m.content}`).join("\n\n");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `nis-ai-chat-${stamp}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(aiT("cmdExportOk", lang), "success");
  }

  /* ---------------- Сетевой запрос ---------------- */
  async function ask(rawText) {
    const text = String(rawText || "").trim();
    if (!text || busy) return;
    if (text.startsWith("/")) { handleSlash(text); setInput(""); return; }

    setErr("");
    const next = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-10), lang }),
      });
      const raw = await res.text();
      if (!res.ok) {
        let parsed = {};
        try { parsed = JSON.parse(raw); } catch { /* not json */ }
        const detail = parsed?.error || parsed?.detail || raw.slice(0, 160) || res.statusText;
        setErr(`${res.status}: ${detail}`);
        return;
      }
      let data = {};
      try { data = JSON.parse(raw); } catch { /* not json */ }
      const reply = (data?.reply || "").trim();
      if (!reply) { setErr(aiT("emptyReply", lang)); return; }
      const suggestions = Array.isArray(data?.suggestions) ? data.suggestions.filter(s => typeof s === "string").slice(0, 4) : null;
      const topic = typeof data?.topic === "string" ? data.topic : null;
      // Запоминаем версию сервера и кэшируем — чтобы шапка показывала её даже офлайн.
      if (typeof data?.version === "string" && data.version) {
        const sv = { version: data.version, date: data.versionDate || "", name: data.versionName || "" };
        setServerVer(sv);
        try { localStorage.setItem(AI_VERSION_STORAGE, JSON.stringify(sv)); } catch { /* quota */ }
      }
      setMsgs(m => [...m, { role: "assistant", content: reply, meta: { suggestions, topic } }]);
    } catch (e) {
      console.error("[ai-chat] failed", e);
      setErr(`${aiT("netErr", lang)}: ${String(e?.message || e).slice(0, 120)}`);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    ask(input);
  }
  function onKeyDownInput(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask(input);
    }
  }

  function clearChat() {
    setMsgs([]); setErr(""); setFeedback({});
    try { localStorage.removeItem(AI_STORAGE); } catch { /* ignore */ }
  }

  function copyMessage(idx, text) {
    try {
      navigator.clipboard?.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(c => (c === idx ? -1 : c)), 1200);
    } catch { /* ignore */ }
  }

  function rate(idx, kind) {
    setFeedback(f => ({ ...f, [idx]: f[idx] === kind ? undefined : kind }));
    if (kind === "up") toast(aiT("thanks", lang), "success");
  }

  /* ---------------- Голосовой ввод ---------------- */
  function toggleVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast(aiT("voiceFail", lang), "error"); return; }
    if (listening && recogRef.current) {
      try { recogRef.current.stop(); } catch { /* ignore */ }
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = lang === "kz" ? "kk-KZ" : lang === "en" ? "en-US" : "ru-RU";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      let s = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) s += ev.results[i][0].transcript;
      setInput(prev => (prev ? prev + " " : "") + s.trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    try { rec.start(); recogRef.current = rec; setListening(true); }
    catch { setListening(false); }
  }

  /* ---------------- Render ---------------- */
  const onScrollLog = () => {
    const el = logRef.current; if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setShowJump(!nearBottom && msgs.length > 0);
  };
  const jumpToBottom = () => {
    const el = logRef.current; if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setShowJump(false);
  };

  const lastBotIdx = (() => {
    for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].role === "assistant") return i;
    return -1;
  })();
  const lastBot = lastBotIdx >= 0 ? msgs[lastBotIdx] : null;
  const tail = lastBot?.meta?.suggestions
    || (lastBot ? (AI_FOLLOWUPS[lang] || AI_FOLLOWUPS.ru)[lastBot?.meta?.topic || guessTopic(lastBot.content)] : null);

  return (
    <>
      <button
        type="button"
        className={`ai-fab${open ? " is-open" : ""}`}
        aria-label={aiT(open ? "ariaClose" : "ariaOpen", lang)}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
        ) : (
          <svg className="ai-fab__plant" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="aiFabLeaf" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#86efac" />
                <stop offset="55%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#15803d" />
              </linearGradient>
              <linearGradient id="aiFabStem" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#14532d" />
              </linearGradient>
            </defs>
            <path d="M12 21c0-4 .2-7 .9-9.4" stroke="url(#aiFabStem)" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" fill="url(#aiFabLeaf)" stroke="#14532d" strokeWidth=".7" strokeLinejoin="round" />
            <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" fill="url(#aiFabLeaf)" stroke="#14532d" strokeWidth=".7" strokeLinejoin="round" />
            <circle cx="18.2" cy="4.6" r=".9" fill="#fde68a" opacity=".95" />
          </svg>
        )}
        {!open && <span className="ai-fab__pulse" aria-hidden="true" />}
        {!open && unread > 0 && <span className="ai-fab__badge" aria-label={`${unread}`}>{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className={`ai-panel${maximized ? " is-max" : ""}`} role="dialog" aria-label={aiT("brand", lang)}>
          <header className="ai-panel__head">
            <div className="ai-panel__brand">
              <div className="ai-panel__logo">AI</div>
              <div className="ai-panel__title">
                <div className="ai-panel__name">
                  {aiT("brand", lang)} <span className="muted">{aiT("by", lang)}</span>
                  <span
                    className="ai-panel__ver"
                    title={`${aiT("verClient", lang)}: v${AI_CLIENT_VERSION}\n${aiT("verServer", lang)}: ${serverVer ? `v${serverVer.version}${serverVer.name ? ` «${serverVer.name}»` : ""}${serverVer.date ? ` (${serverVer.date})` : ""}` : aiT("verSyncing", lang)}`}
                  >
                    v{serverVer?.version || AI_CLIENT_VERSION}
                    {serverVer && serverVer.version !== AI_CLIENT_VERSION && <span className="ai-panel__ver-warn" aria-hidden="true">·</span>}
                  </span>
                </div>
                <div className="ai-panel__sub"><span className={`ai-dot${busy ? " is-busy" : ""}`} /> {busy ? aiT("subtitleBz", lang) : aiT("subtitleOn", lang)}</div>
              </div>
            </div>
            <div className="ai-panel__actions">
              <button className="ai-iconbtn" type="button" onClick={() => setMaximized(v => !v)} aria-label={aiT(maximized ? "ariaMin" : "ariaMax", lang)} title={aiT(maximized ? "ariaMin" : "ariaMax", lang)}>
                {maximized
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 3v6H3M15 21v-6h6M3 21l6-6M21 3l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </button>
              {msgs.length > 0 && (
                <button className="ai-iconbtn" type="button" onClick={clearChat} aria-label={aiT("ariaClear", lang)} title={aiT("ariaClear", lang)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              )}
              <button className="ai-iconbtn" type="button" onClick={() => setOpen(false)} aria-label={aiT("ariaClose", lang)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            </div>
          </header>

          <div className="ai-panel__log" ref={logRef} onScroll={onScrollLog}>
            {msgs.length === 0 && (
              <>
                <div className="ai-msg ai-msg--bot">
                  <div className="ai-ava">AI</div>
                  <div className="ai-bubble">{renderMarkdown(aiT("hello", lang))}</div>
                </div>
                <div className="ai-topics">
                  <div className="ai-topics__title">{aiT("topicsTitle", lang)}</div>
                  <div className="ai-topics__grid">
                    {AI_TOPICS.map(tp => (
                      <button key={tp.id} className="ai-topic" type="button" onClick={() => ask((tp.qs[lang] || tp.qs.ru)[0])}>
                        <span className="ai-topic__icon">{tp.icon}</span>
                        <span className="ai-topic__label">{tp.title[lang] || tp.title.ru}</span>
                      </button>
                    ))}
                  </div>
                  <div className="ai-quick">
                    {(AI_TOPICS[0].qs[lang] || AI_TOPICS[0].qs.ru).slice(0, 3).map(q => (
                      <button key={q} className="ai-quick__btn" type="button" onClick={() => ask(q)}>{q}</button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {msgs.map((m, i) => {
              const isBot = m.role !== "user";
              const isLastBot = isBot && i === lastBotIdx;
              return (
                <div key={i} className={`ai-msg ai-msg--${isBot ? "bot" : "user"}`}>
                  <div className="ai-ava">{isBot ? "AI" : (lang === "kz" ? "Мен" : lang === "en" ? "Me" : "Я")}</div>
                  <div className="ai-bubble">
                    {renderMarkdown(m.content)}
                    {isBot && !m.meta?.local && (
                      <div className="ai-bubble__tools">
                        <button className="ai-btool" type="button" onClick={() => copyMessage(i, m.content)} title={aiT("ariaCopy", lang)} aria-label={aiT("ariaCopy", lang)}>
                          {copiedIdx === i
                            ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            : <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M5 15V5a2 2 0 012-2h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>}
                        </button>
                        <button className={`ai-btool${feedback[i] === "up" ? " is-active" : ""}`} type="button" onClick={() => rate(i, "up")} title={aiT("ariaLike", lang)} aria-label={aiT("ariaLike", lang)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M7 11v9H4a1 1 0 01-1-1v-7a1 1 0 011-1h3zm0 0l5-8a2 2 0 013 1l-1 5h5a2 2 0 012 2.4l-1.5 7A2 2 0 0117 19H7" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
                        </button>
                        <button className={`ai-btool${feedback[i] === "down" ? " is-active is-down" : ""}`} type="button" onClick={() => rate(i, "down")} title={aiT("ariaDis", lang)} aria-label={aiT("ariaDis", lang)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ transform: "scaleY(-1)" }}><path d="M7 11v9H4a1 1 0 01-1-1v-7a1 1 0 011-1h3zm0 0l5-8a2 2 0 013 1l-1 5h5a2 2 0 012 2.4l-1.5 7A2 2 0 0117 19H7" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
                        </button>
                      </div>
                    )}
                    {isLastBot && !busy && tail && tail.length > 0 && (
                      <div className="ai-quick">
                        {tail.slice(0, 4).map(q => (
                          <button key={q} className="ai-quick__btn" type="button" onClick={() => ask(q)}>{q}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {busy && (
              <div className="ai-msg ai-msg--bot">
                <div className="ai-ava">AI</div>
                <div className="ai-bubble"><span className="ai-typing"><span /><span /><span /></span></div>
              </div>
            )}
            {err && (
              <div className="ai-msg ai-msg--bot">
                <div className="ai-ava">!</div>
                <div className="ai-bubble ai-bubble--err">
                  {err}
                  <div className="ai-quick">
                    <button className="ai-quick__btn" type="button" onClick={() => { setErr(""); const last = [...msgs].reverse().find(m => m.role === "user"); if (last) ask(last.content); }}>↻</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {showJump && (
            <button className="ai-jump" type="button" onClick={jumpToBottom} aria-label={aiT("scrollDown", lang)} title={aiT("scrollDown", lang)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}

          <form className="ai-panel__form" onSubmit={onSubmit}>
            <button className={`ai-iconbtn ai-mic${listening ? " is-listening" : ""}`} type="button" onClick={toggleVoice} aria-label={aiT("ariaVoice", lang)} title={aiT("ariaVoice", lang)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="2" /><path d="M5 11a7 7 0 0014 0M12 18v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
            <textarea
              ref={inputRef}
              className="ai-input ai-input--ta"
              placeholder={aiT("placeholder", lang)}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDownInput}
              disabled={busy}
              maxLength={2000}
              rows={1}
            />
            <button className="ai-send" type="submit" disabled={busy || !input.trim()} aria-label={aiT("ariaSend", lang)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </form>
        </div>
      )}
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
  const nums = (values || []).map(v => Number(v) || 0);
  const max = Math.max(1, ...nums);
  const [hover, setHover] = useState(null);
  return (
    <div className="barchart-v2">
      <div className="barchart barchart--v2">
        {nums.map((v, i) => {
          const h = Math.max(4, Math.round((v / max) * 100));
          const active = hover === i;
          return (
            <div
              key={i}
              className={`bar bar--v2 ${active ? "is-active" : ""}`}
              style={{ height: `${h}%` }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              title={`${labels[i]}: ${v}`}
            >
              <span className="bar__value">{fmtPoints(v)}</span>
            </div>
          );
        })}
      </div>
      <div className="barlabel barlabel--v2">
        {labels.map((l, i) => (
          <span key={i} className={`barlabel__tick ${hover === i ? "is-active" : ""}`}>{l}</span>
        ))}
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

function niceCeilValue(v) {
  if (!Number.isFinite(v) || v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / exp;
  const nice = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
  return nice * exp;
}

function AnimatedNumber({ value, duration = 720 }) {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    const to = target;
    if (from === to) return;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = from + (to - from) * eased;
      setDisplay(v);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return <>{fmtPoints(Math.round(display))}</>;
}

export function PointsDynamicsChart({ values, labels, showTrend = true, defaultMode = "period" }) {
  const nums = (values || []).map(v => Number(v) || 0);
  const lbls = labels || [];
  const n = nums.length;

  const [mode, setMode] = useState(defaultMode);
  const [hover, setHover] = useState(null);
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => { setAnimKey(k => k + 1); }, [mode, n]);

  const wrapRef = useRef(null);
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const w = Math.max(280, Math.round(el.clientWidth));
      setW(w);
    };
    update();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const cumulative = useMemo(() => {
    let acc = 0;
    return nums.map(v => (acc += v));
  }, [values]);

  const data = mode === "cumulative" ? cumulative : nums;
  const total = nums.reduce((a, b) => a + b, 0);
  const peak = nums.length ? Math.max(...nums) : 0;
  const peakIdx = nums.indexOf(peak);
  const activeMonths = nums.filter(v => v > 0).length;
  const avg = activeMonths ? total / activeMonths : 0;

  const maxV = Math.max(1, ...data);
  const niceMax = niceCeilValue(maxV);

  const H = Math.max(240, Math.min(340, Math.round(W * 0.36)));
  const padL = 48, padR = 18, padT = 22, padB = 44;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const xStep = innerW / Math.max(1, n - 1);

  const pts = data.map((v, i) => {
    const x = padL + (n <= 1 ? innerW / 2 : i * xStep);
    const y = padT + innerH - (v / niceMax) * innerH;
    return [x, y];
  });

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => {
    const v = (niceMax / ticks) * (ticks - i);
    return { y: padT + (i / ticks) * innerH, value: v };
  });

  const linePoints = pts.map(p => `${p[0]},${p[1]}`).join(" ");
  const areaPath = pts.length
    ? `M ${pts[0][0]} ${padT + innerH} L ${pts.map(p => `${p[0]} ${p[1]}`).join(" L ")} L ${pts[pts.length - 1][0]} ${padT + innerH} Z`
    : "";

  const avgY = padT + innerH - (avg / niceMax) * innerH;

  const xLabelEvery = n > 12 ? Math.ceil(n / 8) : 1;

  function handleMove(e) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const xRel = ((e.clientX - rect.left) / rect.width) * W;
    if (xRel < padL - xStep / 2 || xRel > padL + innerW + xStep / 2) {
      setHover(null);
      return;
    }
    const idx = Math.max(0, Math.min(n - 1, Math.round((xRel - padL) / xStep)));
    setHover(idx);
  }

  function fmtTickLabel(v) {
    if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
    return String(Math.round(v));
  }

  const empty = n === 0 || total === 0 && mode === "period";

  const hoverData = hover != null && hover >= 0 && hover < n ? {
    label: lbls[hover] || "",
    value: nums[hover] || 0,
    cum: cumulative[hover] || 0,
    delta: hover > 0 ? (nums[hover] - nums[hover - 1]) : null,
    x: pts[hover]?.[0] ?? 0,
    y: pts[hover]?.[1] ?? 0,
  } : null;

  return (
    <div className="pdyn" ref={wrapRef}>
      <div className="pdyn__head">
        <div className="pdyn__stats" key={`stats-${animKey}`}>
          <div className="pdyn__stat" style={{ animationDelay: "0ms" }}>
            <span className="pdyn__stat-label">{t("total")}</span>
            <span className="pdyn__stat-value">
              <AnimatedNumber value={Math.round(total)} />
            </span>
          </div>
          <div className="pdyn__stat" style={{ animationDelay: "60ms" }}>
            <span className="pdyn__stat-label">{t("avgMonth")}</span>
            <span className="pdyn__stat-value">
              <AnimatedNumber value={Math.round(avg)} />
            </span>
          </div>
          <div className="pdyn__stat" style={{ animationDelay: "120ms" }}>
            <span className="pdyn__stat-label">{t("bestMonth")}</span>
            <span className="pdyn__stat-value">
              {peak > 0 ? <AnimatedNumber value={Math.round(peak)} /> : "—"}
              {peak > 0 && lbls[peakIdx] ? <span className="pdyn__stat-sub"> · {lbls[peakIdx]}</span> : null}
            </span>
          </div>
        </div>
        <div className="pdyn__modes" role="tablist" aria-label={t("pointsDynamic")}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "period"}
            className={`pdyn__mode ${mode === "period" ? "is-active" : ""}`}
            onClick={() => setMode("period")}
          >
            {t("pdynPerPeriod")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "cumulative"}
            className={`pdyn__mode ${mode === "cumulative" ? "is-active" : ""}`}
            onClick={() => setMode("cumulative")}
          >
            {t("pdynCumulative")}
          </button>
        </div>
      </div>

      <div className="pdyn__chart" style={{ height: H }}>
        <svg
          className="pdyn__svg"
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={t("pointsDynamic")}
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            if (!touch) return;
            handleMove({ currentTarget: e.currentTarget, clientX: touch.clientX });
          }}
          onTouchEnd={() => setHover(null)}
        >
          {yTicks.map((tk, i) => (
            <g key={i}>
              <line x1={padL} y1={tk.y} x2={padL + innerW} y2={tk.y} className="pdyn__grid" />
              <text x={padL - 10} y={tk.y + 4} textAnchor="end" className="pdyn__axis">{fmtTickLabel(tk.value)}</text>
            </g>
          ))}

          {showTrend && mode === "period" && avg > 0 && pts.length > 1 ? (
            <g>
              <line
                x1={padL} y1={avgY}
                x2={padL + innerW} y2={avgY}
                className="pdyn__avg-line"
              />
              <text x={padL + innerW - 4} y={avgY - 6} textAnchor="end" className="pdyn__avg-label">
                {t("avg")} {fmtPoints(Math.round(avg))}
              </text>
            </g>
          ) : null}

          {pts.length > 1 ? (
            <g key={`series-${animKey}`}>
              <path d={areaPath} className="pdyn__area pdyn__area--anim" />
              <polyline
                className="pdyn__line pdyn__line--anim"
                fill="none"
                strokeWidth="1.8"
                points={linePoints}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {pts.map((p, i) => (
                <circle
                  key={i}
                  cx={p[0]} cy={p[1]}
                  r={hover === i ? 5 : 0}
                  className={`pdyn__dot ${hover === i ? "is-active" : ""}`}
                />
              ))}
            </g>
          ) : pts.length === 1 ? (
            <circle cx={pts[0][0]} cy={pts[0][1]} r="4" className="pdyn__dot is-active" />
          ) : null}

          {empty ? (
            <text x={W / 2} y={H / 2} textAnchor="middle" className="pdyn__empty">{t("noChartData")}</text>
          ) : null}

          {hoverData ? (
            <g>
              <line
                x1={hoverData.x} y1={padT}
                x2={hoverData.x} y2={padT + innerH}
                className="pdyn__crosshair"
              />
            </g>
          ) : null}

          {lbls.map((lab, i) => {
            if (i % xLabelEvery !== 0 && i !== n - 1) return null;
            const x = padL + (n <= 1 ? innerW / 2 : i * xStep);
            return (
              <text
                key={i}
                x={x}
                y={padT + innerH + 22}
                textAnchor="middle"
                className={`pdyn__xlabel ${hover === i ? "is-active" : ""}`}
              >
                {lab}
              </text>
            );
          })}
        </svg>

        {hoverData ? (
          <div
            className="pdyn__tip"
            style={{
              left: `${(hoverData.x / W) * 100}%`,
              top: `${(hoverData.y / H) * 100}%`,
            }}
          >
            <div className="pdyn__tip-label">{hoverData.label}</div>
            <div className="pdyn__tip-row">
              <span className="pdyn__tip-dot" />
              <span className="pdyn__tip-key">{t("pdynPeriod")}</span>
              <span className="pdyn__tip-val">{fmtPoints(Math.round(hoverData.value))} {t("pts")}</span>
            </div>
            <div className="pdyn__tip-row">
              <span className="pdyn__tip-dot pdyn__tip-dot--ghost" />
              <span className="pdyn__tip-key">{t("pdynCum")}</span>
              <span className="pdyn__tip-val">{fmtPoints(Math.round(hoverData.cum))} {t("pts")}</span>
            </div>
            {hoverData.delta != null ? (
              <div className="pdyn__tip-row">
                <span className="pdyn__tip-key">{t("pdynVsPrev")}</span>
                <span className={`pdyn__tip-delta ${hoverData.delta >= 0 ? "is-up" : "is-down"}`}>
                  {fmtPoints(Math.abs(Math.round(hoverData.delta)))}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
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

const STATUS_PALETTE = {
  approved: "var(--chart-c-green, #22c55e)",
  pending: "var(--chart-c-amber, #f59e0b)",
  rejected: "var(--chart-c-red, #ef4444)"
};

const DEFAULT_DONUT_PALETTE = [
  "var(--chart-c-1, #38bdf8)",
  "var(--chart-c-2, #8b5cf6)",
  "var(--chart-c-3, #22c55e)",
  "var(--chart-c-4, #f59e0b)",
  "var(--chart-c-5, #ef4444)",
  "var(--chart-c-6, #ec4899)",
  "var(--chart-c-7, #14b8a6)"
];

function donutLabel(label) {
  const key = String(label || "").toLowerCase();
  if (key === "approved" || key === "pending" || key === "rejected") return t(key);
  return label;
}

export function DonutChart({ segments, centerLabel }) {
  const segs = (segments || []).map(s => ({
    raw: s.label,
    label: donutLabel(s.label),
    value: Number(s.value) || 0
  })).filter(s => s.value > 0);
  const total = Math.max(1, segs.reduce((a, s) => a + s.value, 0));
  const [hover, setHover] = useState(null);

  const colorFor = (s, i) => {
    const key = String(s.raw || "").toLowerCase();
    return STATUS_PALETTE[key] || DEFAULT_DONUT_PALETTE[i % DEFAULT_DONUT_PALETTE.length];
  };

  const size = 200;
  const thickness = 22;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;

  let offset = 0;

  const hovered = hover != null && segs[hover] ? segs[hover] : null;
  const centerMain = hovered ? hovered.value : (centerLabel ?? total);
  const centerSub = hovered ? `${Math.round((hovered.value / total) * 100)}%` : t("total");

  return (
    <div className="donutWrap donut-v2">
      <div className="donutBox donutBox--v2">
        <svg className="donutSvg" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Donut chart">
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle
              cx={size / 2} cy={size / 2} r={r}
              fill="none"
              className="donut-v2__track"
              strokeWidth={thickness}
            />
            {segs.map((s, i) => {
              const len = (s.value / total) * c;
              const dash = `${len} ${Math.max(0, c - len)}`;
              const dashOffset = -offset;
              offset += len;
              const active = hover === i;
              return (
                <circle
                  key={i}
                  cx={size / 2} cy={size / 2} r={r}
                  fill="none"
                  stroke={colorFor(s, i)}
                  strokeWidth={active ? thickness + 4 : thickness}
                  strokeDasharray={dash}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  className={`donut-v2__seg ${hover != null && !active ? "is-dim" : ""}`}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
              );
            })}
          </g>

          <text x="50%" y="47%" textAnchor="middle" className="donut-v2__main">
            {centerMain}
          </text>
          <text x="50%" y="62%" textAnchor="middle" className="donut-v2__sub">
            {centerSub}
          </text>
        </svg>
      </div>

      <div className="donutLegend">
        {segs.map((s, i) => {
          const pct = Math.round((s.value / total) * 100);
          const active = hover === i;
          return (
            <div
              key={i}
              className={`legendItem donut-v2__legend ${active ? "is-active" : ""} ${hover != null && !active ? "is-dim" : ""}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="legendDot" style={{ background: colorFor(s, i) }} />
              <div className="tiny donut-v2__legend-body">
                <b>{s.label}</b>
                <span className="donut-v2__legend-meta">
                  <span className="donut-v2__legend-val">{s.value}</span>
                  <span className="muted">({pct}%)</span>
                </span>
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
  const [hover, setHover] = useState(null);
  if (!n) return <p className="p">{t("noRadarData")}</p>;

  const W = 300, H = 300;
  const cx = W / 2, cy = H / 2;
  const R = 100;
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

  return (
    <div className="chartBox radar-v2">
      <svg className="radarSvg radar-v2__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Radar chart">
        {Array.from({ length: ringCount }, (_, k) => {
          const rr = (R / ringCount) * (k + 1);
          return (
            <circle key={k} cx={cx} cy={cy} r={rr} fill="none" className="radar-v2__ring" />
          );
        })}

        {Array.from({ length: n }, (_, i) => {
          const ang = (-90 + (360 / n) * i) * (Math.PI / 180);
          const x = cx + Math.cos(ang) * R;
          const y = cy + Math.sin(ang) * R;
          return (
            <line key={i} x1={cx} y1={cy} x2={x} y2={y} className="radar-v2__spoke" />
          );
        })}

        <polygon points={poly} className="radar-v2__poly" />

        {points.map((p, i) => (
          <circle
            key={`pt-${i}`}
            cx={p[0]} cy={p[1]}
            r={hover === i ? 6 : 3.5}
            className={`radar-v2__dot ${hover === i ? "is-active" : ""}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}

        {Array.from({ length: n }, (_, i) => {
          const ang = (-90 + (360 / n) * i) * (Math.PI / 180);
          const x = cx + Math.cos(ang) * (R + 22);
          const y = cy + Math.sin(ang) * (R + 22);
          const anchor = Math.cos(ang) > 0.25 ? "start" : Math.cos(ang) < -0.25 ? "end" : "middle";
          return (
            <text key={i} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" className={`radar-v2__label ${hover === i ? "is-active" : ""}`}>
              {labs[i].slice(0, 16)}{labs[i].length > 16 ? "…" : ""}
            </text>
          );
        })}
      </svg>
      {hover != null && labs[hover] ? (
        <div className="radar-v2__tip">
          <span className="radar-v2__tip-label">{labs[hover]}</span>
          <span className="radar-v2__tip-val">{fmtPoints(Math.round(nums[hover]))} {t("pts")}</span>
        </div>
      ) : null}
    </div>
  );
}

/** ---------- GaugeChart ---------- */
export function GaugeChart({ value = 0, max = 100, label = "", sublabel = "" }) {
  const numVal = Number(value) || 0;
  const numMax = Number(max) || 1;
  const pct = Math.min(1, Math.max(0, numVal / numMax));
  const pctRound = Math.round(pct * 100);
  const W = 240, H = 150;
  const cx = W / 2, cy = 132;
  const R = 96;
  const stroke = 16;
  const start = Math.PI;
  const end = 0;
  const ang = start + (end - start) * pct;
  const x1 = cx + Math.cos(start) * R, y1 = cy + Math.sin(start) * R;
  const x2 = cx + Math.cos(ang) * R, y2 = cy + Math.sin(ang) * R;
  const xEnd = cx + Math.cos(end) * R, yEnd = cy + Math.sin(end) * R;
  const large = pct > 0.5 ? 1 : 0;
  const gid = useMemo(() => `gg_${Math.random().toString(16).slice(2)}`, []);

  const tickCount = 5;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const a = start + (end - start) * (i / (tickCount - 1));
    const inner = R - stroke / 2 - 4;
    const outer = R + stroke / 2 + 4;
    return {
      x1: cx + Math.cos(a) * inner,
      y1: cy + Math.sin(a) * inner,
      x2: cx + Math.cos(a) * outer,
      y2: cy + Math.sin(a) * outer
    };
  });

  return (
    <div className="gauge-wrap gauge-wrap--v2">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="gauge-svg">
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--chart-c-1, var(--accent))" />
            <stop offset="50%" stopColor="var(--chart-c-3, var(--accent2))" />
            <stop offset="100%" stopColor="var(--chart-c-green, var(--green))" />
          </linearGradient>
        </defs>
        <path
          d={`M ${x1} ${y1} A ${R} ${R} 0 1 1 ${xEnd} ${yEnd}`}
          fill="none"
          className="gauge-svg__track"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {ticks.map((tk, i) => (
          <line key={i} x1={tk.x1} y1={tk.y1} x2={tk.x2} y2={tk.y2} className="gauge-svg__tick" />
        ))}
        {pct > 0.001 && (
          <path
            d={`M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`}
            fill="none"
            stroke={`url(#${gid})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            className="gauge-svg__fill"
          />
        )}
        <circle cx={x2} cy={y2} r={pct > 0.001 ? 7 : 0} className="gauge-svg__knob" />
        <text x={cx} y={cy - 28} textAnchor="middle" className="gauge-svg__pct">{pctRound}%</text>
      </svg>
      <div className="gauge-value">{value}</div>
      {label && <div className="gauge-label">{label}</div>}
      {sublabel && <div className="gauge-sublabel">{sublabel}</div>}
    </div>
  );
}

/** ---------- StackedBarChart ---------- */
export function StackedBarChart({ data, labels }) {
  if (!data || !data.length) return <p className="p">{t("noBarData")}</p>;
  const [hover, setHover] = useState(null);
  const maxVal = Math.max(1, ...data.map(d => d.segments.reduce((a, s) => a + (Number(s.value) || 0), 0)));
  const colors = ["var(--accent)", "var(--accent2)", "var(--green)", "var(--yellow)", "var(--red)", "#f472b6", "#38bdf8"];
  return (
    <div className="stacked-v2">
      <div className="barchart barchart--stacked" style={{ height: 180 }}>
        {data.map((d, i) => {
          const total = d.segments.reduce((a, s) => a + (Number(s.value) || 0), 0);
          const h = (total / maxVal) * 100;
          const active = hover === i;
          return (
            <div
              key={i}
              className={`stacked-v2__col ${active ? "is-active" : ""}`}
              style={{ height: `${h}%` }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              title={`${d.label}: ${Math.round(total)}`}
            >
              {d.segments.map((s, j) => {
                const sh = total ? (s.value / total) * 100 : 0;
                return (
                  <div
                    key={j}
                    className="stacked-v2__seg"
                    style={{ height: `${sh}%`, background: s.color || colors[j % colors.length], minHeight: s.value ? 2 : 0 }}
                  />
                );
              })}
              {active && total > 0 ? (
                <span className="stacked-v2__chip">{Math.round(total)}</span>
              ) : null}
            </div>
          );
        })}
      </div>
      {labels && (
        <div className="barlabel barlabel--v2">
          {labels.map((l, i) => (
            <span key={i} className={`barlabel__tick ${hover === i ? "is-active" : ""}`}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/** ---------- LevelChart (milestone progress) ---------- */
export function LevelChart({ value = 0, milestones = [], current = "", next = "" }) {
  const max = Math.max(1, ...(milestones.map(m => Number(m.value) || 0)));
  const pct = Math.min(100, Math.max(0, (Number(value) / max) * 100));
  return (
    <div className="lvlchart">
      <div className="lvlchart__head">
        <div className="lvlchart__cur">{current}</div>
        <div className="lvlchart__next tiny muted">{next}</div>
      </div>
      <div className="lvlchart__track">
        <div className="lvlchart__fill" style={{ width: `${pct}%` }} />
        <div className="lvlchart__cursor" style={{ left: `${pct}%` }}>
          <span className="lvlchart__cursor-val">{fmtPoints(value)}</span>
        </div>
        {milestones.map((m, i) => {
          const p = Math.min(100, (Number(m.value) / max) * 100);
          const reached = Number(value) >= Number(m.value);
          return (
            <div key={i} className={`lvlchart__mile ${reached ? "is-reached" : ""}`} style={{ left: `${p}%` }} title={`${m.label}: ${m.value}`}>
              <span className="lvlchart__mile-dot" />
              <span className="lvlchart__mile-label tiny">{m.label}</span>
              <span className="lvlchart__mile-val tiny">{fmtPoints(m.value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** ---------- VerticalBarChart (clean vertical bars w/ axis) ---------- */
export function VerticalBarChart({ values = [], labels = [], color = "#a5b4fc" }) {
  const nums = values.map(v => Number(v) || 0);
  const max = Math.max(1, ...nums);
  const niceMax = niceCeilValue(max);
  const [hover, setHover] = useState(null);
  if (!nums.length) return <p className="p muted">{t("noChartData")}</p>;
  const barBg = `linear-gradient(180deg, ${color} 0%, ${color}66 70%, ${color}22 100%)`;
  return (
    <div className="vbarchart">
      <div className="vbarchart__yaxis tiny">
        <span>{fmtPoints(niceMax)}</span>
        <span>{fmtPoints(Math.round(niceMax / 2))}</span>
        <span>0</span>
      </div>
      <div className="vbarchart__plot">
        <div className="vbarchart__grid">
          <span /><span /><span />
        </div>
        <div className="vbarchart__bars">
          {nums.map((v, i) => {
            const h = Math.max(2, Math.round((v / niceMax) * 100));
            const active = hover === i;
            return (
              <div key={i} className={`vbarchart__col ${active ? "is-active" : ""}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                title={`${labels[i] || ""}: ${v}`}>
                <span className="vbarchart__val tiny">{active ? fmtPoints(v) : ""}</span>
                <span className="vbarchart__bar" style={{ height: `${h}%`, background: barBg }} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="vbarchart__xlabels tiny">
        {labels.map((l, i) => (
          <span key={i} className={hover === i ? "is-active" : ""}>{l}</span>
        ))}
      </div>
    </div>
  );
}

/** ---------- IntensityChart (gradient bars by intensity) ---------- */
export function IntensityChart({ values = [], labels = [] }) {
  const nums = values.map(v => Number(v) || 0);
  const max = Math.max(1, ...nums);
  if (!nums.length) return <p className="p muted">{t("noChartData")}</p>;
  const cellColor = (v) => {
    const t = Math.min(1, v / max);
    if (t === 0) return "rgba(255,255,255,.08)";
    if (t < 0.25) return "rgba(165,180,252,.35)";
    if (t < 0.5)  return "rgba(129,140,248,.55)";
    if (t < 0.75) return "rgba(99,102,241,.75)";
    return "rgba(76,29,149,.95)";
  };
  return (
    <div className="intchart">
      <div className="intchart__strip">
        {nums.map((v, i) => (
          <div key={i} className="intchart__cell" style={{ background: cellColor(v) }} title={`${labels[i] || ""}: ${v}`}>
            <span className="intchart__cell-v tiny">{v > 0 ? fmtPoints(v) : ""}</span>
          </div>
        ))}
      </div>
      <div className="intchart__xlabels tiny">
        {labels.map((l, i) => <span key={i}>{l}</span>)}
      </div>
      <div className="intchart__legend tiny muted">
        <span>{t("intensityLow")}</span>
        <span className="intchart__legend-bar" />
        <span>{t("intensityHigh")}</span>
      </div>
    </div>
  );
}

/** ---------- StackedColumnChart (rounded stacked cols w/ legend) ---------- */
export function StackedColumnChart({ data = [], labels = [], series = [] }) {
  if (!data.length) return <p className="p muted">{t("noBarData")}</p>;
  const totals = data.map(d => d.segments.reduce((a, s) => a + (Number(s.value) || 0), 0));
  const max = Math.max(1, ...totals);
  const niceMax = niceCeilValue(max);
  const [hover, setHover] = useState(null);
  const colors = ["#a5b4fc", "#c4b5fd", "#f9a8d4", "#fcd34d", "#86efac"];
  return (
    <div className="stcol">
      <div className="stcol__yaxis tiny">
        <span>{fmtPoints(niceMax)}</span>
        <span>{fmtPoints(Math.round(niceMax / 2))}</span>
        <span>0</span>
      </div>
      <div className="stcol__plot">
        <div className="stcol__grid"><span /><span /><span /></div>
        <div className="stcol__bars">
          {data.map((d, i) => {
            const total = totals[i];
            const h = Math.max(2, Math.round((total / niceMax) * 100));
            const active = hover === i;
            return (
              <div key={i} className={`stcol__col ${active ? "is-active" : ""}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}>
                {active && total > 0 ? <span className="stcol__chip tiny">{fmtPoints(Math.round(total))}</span> : null}
                <div className="stcol__bar" style={{ height: `${h}%` }}>
                  {d.segments.map((s, j) => {
                    const sh = total ? (s.value / total) * 100 : 0;
                    return (
                      <div key={j} className="stcol__seg"
                        style={{ height: `${sh}%`, background: s.color || colors[j % colors.length], minHeight: s.value ? 2 : 0 }}
                        title={`${(series[j]?.label) || ""}: ${s.value}`} />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="stcol__xlabels tiny">
        {labels.map((l, i) => <span key={i} className={hover === i ? "is-active" : ""}>{l}</span>)}
      </div>
      {series.length ? (
        <div className="stcol__legend tiny">
          {series.map((s, i) => (
            <span key={i} className="stcol__leg">
              <span className="stcol__leg-dot" style={{ background: s.color || colors[i % colors.length] }} />
              {s.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** ---------- UserDataChart (table of bars w/ user-supplied rows) ---------- */
export function UserDataChart({ rows = [] }) {
  const max = Math.max(1, ...rows.map(r => Number(r.value) || 0));
  if (!rows.length) return <p className="p muted">{t("noData")}</p>;
  return (
    <div className="udatachart">
      {rows.map((r, i) => {
        const v = Number(r.value) || 0;
        const pct = Math.round((v / max) * 100);
        return (
          <div key={i} className="udatachart__row" style={{ "--delay": `${i * 60}ms` }}>
            <div className="udatachart__head">
              <span className="udatachart__name">{r.label}</span>
              <span className="udatachart__val">{r.display || fmtPoints(v)}</span>
            </div>
            <div className="udatachart__bar">
              <div className="udatachart__fill" style={{ width: `${pct}%`, background: r.color || "linear-gradient(90deg,#a5b4fc,#c4b5fd)" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** ---------- MonthlyAverageChart (area + line + avg ref line) ---------- */
function smoothPath(points) {
  if (!points || points.length < 2) return "";
  if (points.length === 2) return `M ${points[0][0]} ${points[0][1]} L ${points[1][0]} ${points[1][1]}`;
  const d = [`M ${points[0][0]} ${points[0][1]}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(`C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2[0]} ${p2[1]}`);
  }
  return d.join(" ");
}

export function MonthlyAverageChart({ values = [], labels = [] }) {
  const nums = values.map(v => Number(v) || 0);
  const n = nums.length;
  const lineId = useMemo(() => `mav_l_${Math.random().toString(16).slice(2)}`, []);
  const areaId = useMemo(() => `mav_a_${Math.random().toString(16).slice(2)}`, []);
  const glowId = useMemo(() => `mav_g_${Math.random().toString(16).slice(2)}`, []);
  const [hover, setHover] = useState(null);

  const wrapRef = useRef(null);
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setW(Math.max(320, Math.round(el.clientWidth)));
    update();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!n) return <div ref={wrapRef}><p className="p muted">{t("noChartData")}</p></div>;

  const avg = nums.reduce((a, b) => a + b, 0) / n;
  const maxVal = Math.max(...nums);
  const minVal = Math.min(...nums);
  const total = nums.reduce((a, b) => a + b, 0);
  const niceMax = niceCeilValue(Math.max(maxVal, avg, 1));
  const maxIdx = nums.indexOf(maxVal);
  const minIdx = nums.indexOf(minVal);
  const half = Math.ceil(n / 2);
  const recent = nums.slice(-half).reduce((a, b) => a + b, 0);
  const older = nums.slice(0, half).reduce((a, b) => a + b, 0);
  const trendPct = older ? Math.round(((recent - older) / older) * 100) : (recent > 0 ? 100 : 0);
  const trendUp = trendPct >= 0;

  const H = 260;
  const padL = 50, padR = 80, padT = 20, padB = 36;
  const innerW = Math.max(40, W - padL - padR);
  const innerH = H - padT - padB;
  const xStep = innerW / Math.max(1, n - 1);
  const yFor = (v) => padT + innerH - (v / niceMax) * innerH;
  const pts = nums.map((v, i) => [padL + i * xStep, yFor(v)]);
  const linePath = smoothPath(pts);
  const areaPath = pts.length
    ? `${linePath} L ${pts[n - 1][0]} ${padT + innerH} L ${pts[0][0]} ${padT + innerH} Z`
    : "";
  const avgY = yFor(avg);
  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => (niceMax * i) / ticks);

  return (
    <div className="mavchart mavchart--pro">
      <div className="mavchart__chips">
        <span className="mavchart__chip mavchart__chip--avg">
          <span className="mavchart__chip-label">{t("avg")}</span>
          <span className="mavchart__chip-val">{fmtPoints(Math.round(avg))}</span>
        </span>
        <span className="mavchart__chip">
          <span className="mavchart__chip-label">{t("max")}</span>
          <span className="mavchart__chip-val">{fmtPoints(maxVal)}</span>
        </span>
        <span className="mavchart__chip">
          <span className="mavchart__chip-label">{t("min")}</span>
          <span className="mavchart__chip-val">{fmtPoints(minVal)}</span>
        </span>
        <span className="mavchart__chip">
          <span className="mavchart__chip-label">{t("total")}</span>
          <span className="mavchart__chip-val">{fmtPoints(total)}</span>
        </span>
        <span className={`mavchart__chip mavchart__chip--trend ${trendUp ? "is-up" : "is-down"}`}>
          <span aria-hidden="true">{trendUp ? "↗" : "↘"}</span>
          {Math.abs(trendPct)}%
          <span className="mavchart__chip-meta">{t("vsPrev")}</span>
        </span>
      </div>

      <div ref={wrapRef} className="mavchart__plot">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="mavchart__svg" role="img" aria-label="Monthly average chart">
          <defs>
            <linearGradient id={lineId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#c4b5fd" />
              <stop offset="50%" stopColor="#a5b4fc" />
              <stop offset="100%" stopColor="#f9a8d4" />
            </linearGradient>
            <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(196,181,253,.55)" />
              <stop offset="60%" stopColor="rgba(165,180,252,.18)" />
              <stop offset="100%" stopColor="rgba(196,181,253,0)" />
            </linearGradient>
            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {tickVals.map((v, i) => {
            const y = yFor(v);
            return (
              <g key={i}>
                <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="currentColor" strokeOpacity={i === 0 ? ".22" : ".08"} strokeDasharray={i === 0 ? "" : "3 3"} />
                <text x={padL - 8} y={y + 4} textAnchor="end" fill="currentColor" fillOpacity=".55" fontSize="11" fontWeight="600">{fmtPoints(Math.round(v))}</text>
              </g>
            );
          })}

          <path d={areaPath} fill={`url(#${areaId})`} />
          <path d={linePath} fill="none" stroke={`url(#${lineId})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${glowId})`} />

          <line x1={padL} y1={avgY} x2={W - padR} y2={avgY} stroke="#a5b4fc" strokeOpacity=".85" strokeWidth="1.5" strokeDasharray="5 5" />
          <g transform={`translate(${W - padR + 6}, ${avgY})`}>
            <rect x="0" y="-9" width="68" height="18" rx="9" fill="#a5b4fc" />
            <text x="34" y="4" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700">
              {t("avg")} {fmtPoints(Math.round(avg))}
            </text>
          </g>

          {maxVal > 0 ? (
            <g>
              <circle cx={pts[maxIdx][0]} cy={pts[maxIdx][1]} r="6" fill="#22c55e" stroke="var(--surface, #fff)" strokeWidth="2" />
              <text x={pts[maxIdx][0]} y={pts[maxIdx][1] - 12} textAnchor="middle" fill="#16a34a" fontSize="11" fontWeight="800">↑</text>
            </g>
          ) : null}
          {minIdx !== maxIdx && nums[minIdx] !== nums[maxIdx] ? (
            <g>
              <circle cx={pts[minIdx][0]} cy={pts[minIdx][1]} r="5" fill="#ef4444" stroke="var(--surface, #fff)" strokeWidth="2" />
              <text x={pts[minIdx][0]} y={pts[minIdx][1] + 18} textAnchor="middle" fill="#dc2626" fontSize="11" fontWeight="800">↓</text>
            </g>
          ) : null}

          {pts.map((p, i) => {
            const active = hover === i;
            const tipW = 80, tipH = 32;
            const tipX = Math.max(padL, Math.min(W - padR - tipW, p[0] - tipW / 2));
            const tipAbove = p[1] > padT + tipH + 10;
            const tipY = tipAbove ? p[1] - tipH - 10 : p[1] + 10;
            return (
              <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={p[0] - xStep / 2} y={padT} width={xStep || 8} height={innerH} fill="transparent" />
                {active && (
                  <line x1={p[0]} y1={padT} x2={p[0]} y2={padT + innerH} stroke="#a5b4fc" strokeOpacity=".5" strokeDasharray="2 3" />
                )}
                <circle cx={p[0]} cy={p[1]} r={active ? 6 : 3.5} fill="var(--surface, #fff)" stroke="#a5b4fc" strokeWidth={active ? 3 : 2} />
                {active ? (
                  <g>
                    <rect x={tipX} y={tipY} width={tipW} height={tipH} rx="8" fill="currentColor" fillOpacity=".92" />
                    <text x={tipX + tipW / 2} y={tipY + 14} textAnchor="middle" fill="var(--surface, #fff)" fontSize="12" fontWeight="800">{fmtPoints(nums[i])}</text>
                    <text x={tipX + tipW / 2} y={tipY + 26} textAnchor="middle" fill="var(--surface, #fff)" fontSize="10" fontWeight="600" opacity=".78">
                      {nums[i] >= avg ? "+" : "−"}{fmtPoints(Math.abs(Math.round(nums[i] - avg)))} {t("avg")}
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mavchart__xlabels tiny" style={{ paddingLeft: padL, paddingRight: padR }}>
        {labels.map((l, i) => <span key={i} className={hover === i ? "is-active" : ""}>{l}</span>)}
      </div>
    </div>
  );
}

/** ---------- WorldwidePopulationChart (estimated-style growth tile) ---------- */
export function WorldwidePopulationChart({ value = 0, label = "", sublabel = "", trendPct = 0, series = [] }) {
  const up = Number(trendPct) >= 0;
  const nums = series.map(v => Number(v) || 0);
  const hasSeries = nums.length > 0;
  const maxVal = hasSeries ? Math.max(...nums) : 0;
  const minVal = hasSeries ? Math.min(...nums) : 0;
  const avgVal = hasSeries ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  const total = hasSeries ? nums.reduce((a, b) => a + b, 0) : 0;
  const lineId = useMemo(() => `wwp_l_${Math.random().toString(16).slice(2)}`, []);
  const areaId = useMemo(() => `wwp_a_${Math.random().toString(16).slice(2)}`, []);

  const wrapRef = useRef(null);
  const [W, setW] = useState(560);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setW(Math.max(280, Math.round(el.clientWidth)));
    update();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const H = 140, padL = 10, padR = 14, padT = 14, padB = 18;
  const innerW = Math.max(20, W - padL - padR);
  const innerH = H - padT - padB;
  const xStep = nums.length > 1 ? innerW / (nums.length - 1) : 0;
  const max = Math.max(1, maxVal);
  const yFor = (v) => padT + innerH - (v / max) * innerH;
  const pts = nums.map((v, i) => [padL + i * xStep, yFor(v)]);
  const linePath = smoothPath(pts);
  const areaPath = pts.length
    ? `${linePath} L ${pts[pts.length - 1][0]} ${padT + innerH} L ${pts[0][0]} ${padT + innerH} Z`
    : "";

  const maxIdx = nums.indexOf(maxVal);
  const minIdx = nums.indexOf(minVal);
  const lastIdx = nums.length - 1;
  const avgY = yFor(avgVal);

  return (
    <div className="wwpop wwpop--pro">
      <div className="wwpop__head">
        <div className="wwpop__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <ellipse cx="12" cy="12" rx="9" ry="4" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="12" y1="3" x2="12" y2="21" />
          </svg>
        </div>
        <div className="wwpop__caption">
          <div className="wwpop__title">{label}</div>
          {sublabel ? <div className="wwpop__sub">{sublabel}</div> : null}
        </div>
        <div className={`wwpop__trend ${up ? "is-up" : "is-down"}`} aria-label={`${trendPct}%`}>
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            {up
              ? <path d="M3 11l5-6 5 6 M8 5v9" />
              : <path d="M3 5l5 6 5-6 M8 11V2" />}
          </svg>
          <span>{Math.abs(Number(trendPct) || 0)}%</span>
        </div>
      </div>

      <div className="wwpop__value-row">
        <div className="wwpop__value">
          <AnimatedNumber value={value} />
        </div>
        <span className="wwpop__value-meta">{t("vsPrev")}</span>
      </div>

      {hasSeries ? (
        <div ref={wrapRef} className="wwpop__chart">
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="wwpop__spark" role="img" aria-label="Spark trend">
            <defs>
              <linearGradient id={lineId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#a5b4fc" />
                <stop offset="100%" stopColor="#f9a8d4" />
              </linearGradient>
              <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(196,181,253,.55)" />
                <stop offset="100%" stopColor="rgba(196,181,253,0)" />
              </linearGradient>
            </defs>

            {/* baseline */}
            <line x1={padL} y1={padT + innerH} x2={W - padR} y2={padT + innerH} stroke="currentColor" strokeOpacity=".15" />
            {/* avg line */}
            {avgVal > 0 ? (
              <line x1={padL} y1={avgY} x2={W - padR} y2={avgY} stroke="currentColor" strokeOpacity=".3" strokeDasharray="4 4" />
            ) : null}
            {/* area + line */}
            <path d={areaPath} fill={`url(#${areaId})`} />
            <path d={linePath} fill="none" stroke={`url(#${lineId})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* min / max markers */}
            {maxVal > 0 && maxIdx >= 0 ? (
              <g>
                <circle cx={pts[maxIdx][0]} cy={pts[maxIdx][1]} r="3.5" fill="#22c55e" stroke="var(--surface, #fff)" strokeWidth="1.5" />
              </g>
            ) : null}
            {minIdx >= 0 && minIdx !== maxIdx ? (
              <g>
                <circle cx={pts[minIdx][0]} cy={pts[minIdx][1]} r="3" fill="#ef4444" stroke="var(--surface, #fff)" strokeWidth="1.5" />
              </g>
            ) : null}
            {/* latest pulse */}
            {lastIdx >= 0 ? (
              <g>
                <circle cx={pts[lastIdx][0]} cy={pts[lastIdx][1]} r="8" fill="#a5b4fc" fillOpacity=".18">
                  <animate attributeName="r" values="5;12;5" dur="2.2s" repeatCount="indefinite" />
                  <animate attributeName="fill-opacity" values=".3;0;.3" dur="2.2s" repeatCount="indefinite" />
                </circle>
                <circle cx={pts[lastIdx][0]} cy={pts[lastIdx][1]} r="4" fill="var(--surface, #fff)" stroke="#a5b4fc" strokeWidth="2.2" />
              </g>
            ) : null}
          </svg>
        </div>
      ) : null}

      <div className="wwpop__stats">
        <div className="wwpop__stat">
          <span className="wwpop__stat-label">{t("avg")}</span>
          <span className="wwpop__stat-val">{fmtPoints(Math.round(avgVal))}</span>
        </div>
        <div className="wwpop__stat">
          <span className="wwpop__stat-label">{t("max") || "Max"}</span>
          <span className="wwpop__stat-val wwpop__stat-val--up">{fmtPoints(maxVal)}</span>
        </div>
        <div className="wwpop__stat">
          <span className="wwpop__stat-label">{t("min") || "Min"}</span>
          <span className="wwpop__stat-val wwpop__stat-val--down">{fmtPoints(minVal)}</span>
        </div>
        <div className="wwpop__stat">
          <span className="wwpop__stat-label">{t("total")}</span>
          <span className="wwpop__stat-val">{fmtPoints(total)}</span>
        </div>
      </div>
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
