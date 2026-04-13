import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { t, getLang, setLang } from "../i18n.js";
import {
  auth, db, storage, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc,
  getDocs, query, where, orderBy, limit, serverTimestamp, ref, uploadBytes, getDownloadURL
} from "../firebase-config.js";
import {
  store, setState, useStore, navigate, toast, toggleTheme, applyFont, FONT_MAP,
  applyTheme, canAccess
} from "../store.js";
import {
  fmtPoints, safeText, ymd, tsKey, sum, lastDays, lastMonths, startYMDFromDays,
  levelFromPoints, RANK_TABLE, getAcademicYear, QUARTER_RANGES, getQuarterDates, getCurrentQuarter,
  filterByQuarter, getAcademicYearLabel, exportToCsv, exportRatingCsv,
  exportSubmissionsCsv, getQuarterForDate, dateRangeDays, requestKindLabel, REQUEST_KINDS
} from "../utils.js";
import { DEFAULT_TYPES } from "../constants.js";
import {
  fetchTypesAll, fetchTypesActive, fetchUsersAll, fetchMySubmissions,
  fetchPendingSubmissions, fetchAdminRecentSubs, createSubmission,
  approveSubmission, rejectSubmission, fetchMyRequests, fetchPendingRequests,
  createTeacherRequest, uploadEvidence, updateProfile, uploadAvatar,
  fetchDocumentsForTeacher, signDocument, markDocumentViewed,
  fetchMyTeacherDocs, createMyTeacherDoc, uploadTeacherDocFile,
  fetchGoals, createGoal, updateGoal, deleteGoalDoc,
  fetchMyBookQuizAttempts, createBookQuizAttempt, createBookQuizRewardSubmission,
  renderRichDesc, ensureUserDoc
} from "../data.js";
import {
  Icon, Btn, Input, Select, Textarea, Pill, DataCards, QuarterFilter,
  GoalsWidget, LoadingScreen, BarChart, LineChart, AreaLineChart,
  DonutChart, RadarChart, GaugeChart, StackedBarChart, HistogramChart,
  DocumentPreview, generateDocHTML, downloadDocAsWord, downloadDocAsPdf,
  ErrorBoundary, Guard
} from "../components.jsx";

export function PageDashboard() {
  const st = useStore();
  const u = st.userDoc;
  const [showLevelModal, setShowLevelModal] = useState(false);
  const subs0 = st.mySubmissions || [];
  const strengths = useMemo(() => {
    const approved = subs0.filter(s => s.status === "approved" && s.typeSection);
    const map = {};
    approved.forEach(s => {
      const sec = s.typeSection;
      if (!map[sec]) map[sec] = { section: sec, pts: 0, count: 0 };
      map[sec].pts += Number(s.points) || 0;
      map[sec].count++;
    });
    return Object.values(map).sort((a, b) => b.pts - a.pts);
  }, [subs0]);
  if (!u) return <Guard />;
  if (!canAccess("dashboard", u)) return <Guard />;

  const users = st.users || [];
  const subs = st.mySubmissions || [];
  const allSubs = st.adminRecentSubs || [];
  const news = st.news || [];
  const types = st.types || [];
  const isAdmin = u.role === "admin";

  // Greeting based on time
  const hour = new Date().getHours();
  const greet = hour < 12 ? t("dashGreetMorning") : hour < 18 ? t("dashGreetDay") : t("dashGreetEvening");
  const displayName = (u.displayName || u.email || "").split(" ")[0];

  // Stats
  const totalPts = Number(u.totalPoints) || 0;
  const teachers = users.filter(x => x.role !== "admin");
  const sorted = [...teachers].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
  const myRank = sorted.findIndex(x => x.uid === u.uid) + 1;

  const pending = isAdmin
    ? (st.pendingSubmissions || []).length
    : subs.filter(s => s.status === "pending").length;
  const approved = isAdmin
    ? allSubs.filter(s => s.status === "approved").length
    : subs.filter(s => s.status === "approved").length;
  const totalSubs = isAdmin ? allSubs.length : subs.length;
  const docsCount = isAdmin ? (st.allDocuments || []).length : (st.myDocuments || []).length;

  // Average points
  const avgPts = teachers.length ? Math.round(teachers.reduce((s, x) => s + (x.totalPoints || 0), 0) / teachers.length) : 0;

  // Active users (online in last 5 min is hard to track, so count users with points > 0)
  const activeUsers = teachers.filter(x => (x.totalPoints || 0) > 0).length;

  // Top 5 teachers
  const top5 = sorted.slice(0, 5);

  // Recent submissions (last 5)
  const recent = [...(isAdmin ? allSubs : subs)]
    .sort((a, b) => {
      const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const db = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return db - da;
    })
    .slice(0, 5);

  // Mini sparkline data: points per day for last 7 days
  const now = Date.now();
  const spark = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now - i * 86400000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const pts = (isAdmin ? allSubs : subs)
      .filter(s => {
        const d = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt || 0);
        return d >= dayStart && d < dayEnd && s.status === "approved";
      })
      .reduce((sum, s) => sum + (Number(s.points) || 0), 0);
    spark.push(pts);
  }
  const sparkMax = Math.max(...spark, 1);

  // Status pills helper
  const statusPill = (status) => {
    const map = { pending: "warn", approved: "ok", rejected: "error" };
    const labelMap = { pending: t("dashPending"), approved: t("dashApproved"), rejected: "—" };
    return <span className={`pill ${map[status] || ""}`}>{labelMap[status] || status}</span>;
  };

  const AnimNum = ({ value, suffix = "" }) => {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
      const target = Number(value) || 0;
      if (target === 0) { setDisplay(0); return; }
      let frame;
      const start = performance.now();
      const dur = 900;
      const step = (t) => {
        const p = Math.min((t - start) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setDisplay(Math.round(ease * target));
        if (p < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
      return () => cancelAnimationFrame(frame);
    }, [value]);
    return <>{fmtPoints(display)}{suffix}</>;
  };

  const lvl = levelFromPoints(u.totalPoints || 0);
  const nextPts = lvl.next ? lvl.next - (Number(u.totalPoints) || 0) : 0;
  const igHandle = (u.instagram || "").replace(/^@/, "").trim();

  return (
    <div className="dash">
      {/* Welcome hero — profile style + animations */}
      <div className="glass card rop-hero dash-hero-anim" style={{ "--di": 0 }}>
        <div className="dash-hero-anim__bg">
          <div className="dash-hero-anim__orb dash-hero-anim__orb--1" />
          <div className="dash-hero-anim__orb dash-hero-anim__orb--2" />
          <div className="dash-hero-anim__orb dash-hero-anim__orb--3" />
          <div className="dash-hero-anim__shimmer" />
        </div>
        <div className="rop-hero__content">
          <div className="rop-hero__avatar-col dash-hero-anim__avatar" onClick={() => navigate("profile")} style={{ cursor: "pointer" }}>
            <div className="rop-hero__avatar-ring">
              <div className="rop-hero__avatar">
                {u.avatarUrl ? <img src={u.avatarUrl} alt="" /> : <span>{(u.displayName || u.email || "?").split(/\s+/).filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2)}</span>}
              </div>
            </div>
          </div>
          <div className="rop-hero__info dash-hero-anim__info">
            <div className="rop-hero__name">{greet}, <strong>{displayName}</strong>!</div>
            <div className="rop-hero__tags">
              <span className="prof-tag prof-tag--role">{u.role === "admin" ? "Admin" : "Teacher"}</span>
              <span className="prof-tag prof-tag--level">{lvl.name}</span>
              {u.position && <span className="prof-tag">{u.position}</span>}
            </div>
            <div className="rop-hero__meta">
              <span className="rop-hero__meta-item"><Icon name="shield" /> {u.email}</span>
              {u.school && <span className="rop-hero__meta-item"><Icon name="home" /> {u.school}</span>}
              {u.subject && <span className="rop-hero__meta-item"><Icon name="file" /> {u.subject}</span>}
            </div>
            <div className="rop-hero__social">
              {igHandle && (
                <a href={`https://instagram.com/${igHandle}`} target="_blank" rel="noopener noreferrer" className="prof-social-btn prof-social-btn--ig">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" /></svg>
                  @{igHandle}
                </a>
              )}
              {u.youtube && (
                <a href={u.youtube} target="_blank" rel="noopener noreferrer" className="prof-social-btn prof-social-btn--yt">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.43z" stroke="currentColor" strokeWidth="2" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" stroke="currentColor" strokeWidth="2" /></svg>
                  YouTube
                </a>
              )}
              {!isAdmin && (
                <Btn kind="primary" onClick={() => navigate("add")}><Icon name="plus" /> {t("addKpi")}</Btn>
              )}
              <Btn onClick={() => navigate("profile")}><Icon name="user" /> {t("navProfile")}</Btn>
            </div>
          </div>
          <div className="rop-hero__right dash-hero-anim__right" onClick={() => setShowLevelModal(true)} style={{ cursor: "pointer" }} title={t("lvlModalTitle")}>
            <div className="rop-hero__level-wrap">
              <div className="rop-hero__level-inner">
                <div className="rop-hero__level-pts"><AnimNum value={totalPts} /></div>
                <div className="rop-hero__level-label">{t("points")}</div>
              </div>
              <div className="rop-hero__progress-track">
                <div className="rop-hero__progress-fill" style={{ width: `${lvl.pct}%` }} />
              </div>
            </div>
            {lvl.next && <div className="rop-hero__level-hint">{nextPts} {t("profileNextLevel").toLowerCase()}</div>}
          </div>
        </div>
      </div>

      {/* Level Modal */}
      {showLevelModal && createPortal(
        <div className="lvl-modal-overlay" onClick={() => setShowLevelModal(false)}>
          <div className="lvl-modal" onClick={e => e.stopPropagation()}>
            <button className="lvl-modal__close" onClick={() => setShowLevelModal(false)}>&times;</button>

            {/* Header — current rank */}
            <div className="lvl-modal__header">
              <div className="lvl-modal__rank-icon" style={{ "--rank-color": lvl.color }}>{lvl.icon}</div>
              <div className="lvl-modal__rank-info">
                <div className="lvl-modal__rank-name" style={{ color: lvl.color }}>{lvl.name}</div>
                <div className="lvl-modal__rank-pts">{fmtPoints(totalPts)} {t("lvlModalPtsRange")}</div>
                <div className="lvl-modal__rank-desc">{t(`lvlDesc${RANK_TABLE[lvl.idx].key.replace("lvl", "")}`)}</div>
              </div>
            </div>

            {/* XP bar */}
            <div className="lvl-modal__xp">
              <div className="lvl-modal__xp-track">
                <div className="lvl-modal__xp-fill" style={{ width: `${lvl.pct}%`, background: `linear-gradient(90deg, ${lvl.color}, ${lvl.color}dd)` }} />
              </div>
              <div className="lvl-modal__xp-label">
                {lvl.next ? <>{fmtPoints(totalPts)} / {fmtPoints(lvl.next)} — {nextPts} {t("toNextLevel")}</> : <>{t("lvlModalCurrent")}: MAX</>}
              </div>
            </div>

            {/* All ranks */}
            <div className="lvl-modal__section-title">{t("lvlModalAllRanks")}</div>
            <div className="lvl-modal__ranks">
              {RANK_TABLE.map((r, i) => {
                const isCurrent = i === lvl.idx;
                const isLocked = i > lvl.idx;
                return (
                  <div key={r.key} className={`lvl-modal__rank-card${isCurrent ? " lvl-modal__rank-card--active" : ""}${isLocked ? " lvl-modal__rank-card--locked" : ""}`} style={{ "--rc": r.color, "--di": i }}>
                    <div className="lvl-modal__rank-card-icon">{r.icon}</div>
                    <div className="lvl-modal__rank-card-body">
                      <div className="lvl-modal__rank-card-name">{t(r.key)}</div>
                      <div className="lvl-modal__rank-card-range">{r.min}–{r.max} {t("lvlModalPtsRange")}</div>
                    </div>
                    {isCurrent && <span className="lvl-modal__rank-badge">{t("lvlModalCurrent")}</span>}
                    {isLocked && <span className="lvl-modal__rank-lock"><Icon name="shield" /></span>}
                  </div>
                );
              })}
            </div>

            {/* Strengths */}
            <div className="lvl-modal__section-title">{t("lvlModalStrengths")}</div>
            {strengths.length === 0 ? (
              <div className="lvl-modal__empty">{t("lvlModalNoSubs")}</div>
            ) : (
              <div className="lvl-modal__strengths">
                {strengths.slice(0, 5).map((s, i) => {
                  const maxPts = strengths[0].pts;
                  const pct = maxPts ? Math.round((s.pts / maxPts) * 100) : 0;
                  const colors = ["#87bc2e", "#3b82f6", "#f59e0b", "#a855f7", "#ec4899"];
                  return (
                    <div key={s.section} className="lvl-modal__str-row" style={{ "--di": i }}>
                      <div className="lvl-modal__str-label">
                        <span className="lvl-modal__str-name">{s.section}</span>
                        <span className="lvl-modal__str-stat">{s.pts} {t("lvlModalPtsRange")} · {s.count}x</span>
                      </div>
                      <div className="lvl-modal__str-bar-track">
                        <div className="lvl-modal__str-bar-fill" style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Stat cards row */}
      <div className="dash-stats">
        {!isAdmin && (
          <div className="dash-stat glass card" style={{ "--di": 1 }}>
            <div className="dash-stat__icon" style={{ background: "rgba(135,188,46,.12)", color: "var(--accent)" }}><Icon name="rank" /></div>
            <div className="dash-stat__num"><AnimNum value={myRank} /></div>
            <div className="dash-stat__label">{t("dashMyRank")} {t("dashOf")} {teachers.length}</div>
          </div>
        )}
        <div className="dash-stat glass card" style={{ "--di": 2 }}>
          <div className="dash-stat__icon" style={{ background: "rgba(59,130,246,.12)", color: "#3b82f6" }}><Icon name="user" /></div>
          <div className="dash-stat__num"><AnimNum value={teachers.length} /></div>
          <div className="dash-stat__label">{t("dashTeachers")}</div>
        </div>
        <div className="dash-stat glass card" style={{ "--di": 3 }}>
          <div className="dash-stat__icon" style={{ background: "rgba(245,158,11,.12)", color: "#f59e0b" }}><Icon name="file" /></div>
          <div className="dash-stat__num"><AnimNum value={totalSubs} /></div>
          <div className="dash-stat__label">{t("dashSubmissions")}</div>
        </div>
        <div className="dash-stat glass card" style={{ "--di": 4 }}>
          <div className="dash-stat__icon" style={{ background: "rgba(168,85,247,.12)", color: "#a855f7" }}><Icon name="shield" /></div>
          <div className="dash-stat__num"><AnimNum value={docsCount} /></div>
          <div className="dash-stat__label">{t("dashDocuments")}</div>
        </div>
        <div className="dash-stat glass card" style={{ "--di": 5 }}>
          <div className="dash-stat__icon" style={{ background: "rgba(236,72,153,.12)", color: "#ec4899" }}><Icon name="news" /></div>
          <div className="dash-stat__num"><AnimNum value={news.length} /></div>
          <div className="dash-stat__label">{t("dashNews")}</div>
        </div>
      </div>

      {/* Main grid: left + right */}
      <div className="dash-grid">
        {/* Left column */}
        <div className="dash-col">
          {/* Sparkline / points trend */}
          <div className="glass card dash-card" style={{ "--di": 6 }}>
            <div className="dash-card__head">
              <div className="h2">{t("dashPointsTrend")}</div>
              <div className="dash-spark-stats">
                <span className="pill ok">{t("dashApproved")}: {approved}</span>
                <span className="pill warn">{t("dashPending")}: {pending}</span>
              </div>
            </div>
            <div className="dash-spark">
              {spark.map((v, i) => (
                <div key={i} className="dash-spark__bar-wrap">
                  <div className="dash-spark__bar" style={{ "--h": `${(v / sparkMax) * 100}%`, "--delay": `${i * 0.07}s` }} />
                  <div className="dash-spark__day">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][(new Date(now - (6 - i) * 86400000)).getDay() === 0 ? 6 : (new Date(now - (6 - i) * 86400000)).getDay() - 1]}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="glass card dash-card" style={{ "--di": 7 }}>
            <div className="h2">{t("dashQuickActions")}</div>
            <div className="dash-actions">
              {!isAdmin && (
                <button className="dash-action" onClick={() => navigate("add")}>
                  <span className="dash-action__icon" style={{ background: "rgba(135,188,46,.15)" }}><Icon name="plus" /></span>
                  {t("dashAddKpi")}
                </button>
              )}
              <button className="dash-action" onClick={() => navigate("rating")}>
                <span className="dash-action__icon" style={{ background: "rgba(59,130,246,.15)" }}><Icon name="rank" /></span>
                {t("dashViewRating")}
              </button>
              <button className="dash-action" onClick={() => navigate("stats")}>
                <span className="dash-action__icon" style={{ background: "rgba(168,85,247,.15)" }}><Icon name="chart" /></span>
                {t("dashViewStats")}
              </button>
              <button className="dash-action" onClick={() => navigate("news")}>
                <span className="dash-action__icon" style={{ background: "rgba(236,72,153,.15)" }}><Icon name="news" /></span>
                {t("dashViewNews")}
              </button>
            </div>
          </div>

          {/* Platform overview (for everyone) */}
          <div className="glass card dash-card" style={{ "--di": 8 }}>
            <div className="h2">{t("dashPlatformStats")}</div>
            <div className="dash-platform-row">
              <div className="dash-platform-item">
                <div className="dash-platform-item__num"><AnimNum value={avgPts} /></div>
                <div className="dash-platform-item__label">{t("dashAvgPoints")}</div>
              </div>
              <div className="dash-platform-item">
                <div className="dash-platform-item__num"><AnimNum value={activeUsers} /></div>
                <div className="dash-platform-item__label">{t("dashActiveUsers")}</div>
              </div>
              <div className="dash-platform-item">
                <div className="dash-platform-item__num"><AnimNum value={types.length} /></div>
                <div className="dash-platform-item__label">{t("navKpiTypes")}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="dash-col">
          {/* Top teachers */}
          <div className="glass card dash-card" style={{ "--di": 6 }}>
            <div className="h2">{t("dashTopTeachers")}</div>
            <div className="dash-top">
              {top5.map((tc, idx) => (
                <div key={tc.uid} className="dash-top__row" style={{ "--delay": `${idx * 0.08}s` }} onClick={() => setState({ modal: { kind: "teacherProfile", teacher: tc } })}>
                  <div className={`dash-top__rank${idx < 3 ? " dash-top__rank--medal" : ""}`} data-rank={idx + 1}>{idx + 1}</div>
                  <div className="dash-top__info">
                    <div className="dash-top__name">{tc.displayName || tc.email}</div>
                  </div>
                  <div className="dash-top__pts">{fmtPoints(tc.totalPoints || 0)}</div>
                </div>
              ))}
              {top5.length === 0 && <p className="p muted">{t("dashNoActivity")}</p>}
            </div>
          </div>

          {/* Recent activity */}
          <div className="glass card dash-card" style={{ "--di": 7 }}>
            <div className="h2">{t("dashRecentActivity")}</div>
            <div className="dash-recent">
              {recent.map((s, idx) => {
                const tp = types.find(x => x.id === s.typeId);
                const d = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt || 0);
                return (
                  <div key={s.id || idx} className="dash-recent__row" style={{ "--delay": `${idx * 0.08}s` }}>
                    <div className="dash-recent__dot" />
                    <div className="dash-recent__body">
                      <div className="dash-recent__title">{tp?.name || s.typeId || "—"}</div>
                      <div className="dash-recent__meta">
                        {isAdmin && <span>{s.userName || s.uid?.slice(0, 6)}</span>}
                        <span>{d.toLocaleDateString("ru-RU")}</span>
                        {statusPill(s.status)}
                      </div>
                    </div>
                    <div className="dash-recent__pts">+{s.points || 0}</div>
                  </div>
                );
              })}
              {recent.length === 0 && <p className="p muted">{t("dashNoActivity")}</p>}
            </div>
          </div>

          {/* Goals widget (teachers only) */}
          {!isAdmin && <GoalsWidget compact />}

          {/* Current quarter info */}
          {(() => {
            const curQ = getCurrentQuarter();
            return curQ ? (
              <div className="glass card dash-card" style={{ "--di": 8 }}>
                <div className="h2">{t("currentQuarter")}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                  <Pill kind="approved">{t(curQ)}</Pill>
                  <span className="tiny muted">{t(curQ + "Dates")}</span>
                  <span className="tiny muted">{t("academicYear")}: {getAcademicYearLabel()}</span>
                </div>
              </div>
            ) : null;
          })()}
        </div>
      </div>
    </div>
  );
}


/** ---------- Read-only teacher profile (viewed by others) ---------- */
export function ReadOnlyProfile({ teacher: tc, subs, goals }) {
  const st = useStore();
  const allTeachers = (st.users || []).filter(x => (x.role || "teacher") !== "admin");
  const sorted = [...allTeachers].sort((a, b) => (Number(b.totalPoints) || 0) - (Number(a.totalPoints) || 0));
  const rankIdx = sorted.findIndex(x => x.uid === tc.uid);
  const rank = rankIdx >= 0 ? rankIdx + 1 : "—";
  const lvl = levelFromPoints(tc.totalPoints || 0);
  const approved = subs.filter(s => s.status === "approved");
  const approvedPts = sum(approved, s => s.points);
  const nextPts = lvl.next ? lvl.next - (Number(tc.totalPoints) || 0) : 0;
  const igHandle = (tc.instagram || "").replace(/^@/, "").trim();

  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);
  const daysUntil = (d) => d ? Math.ceil((new Date(d + "T00:00:00") - new Date()) / 86400000) : null;
  const goalPct = (g) => {
    if (g.manualProgress != null && g.manualProgress > 0) return Math.min(100, g.manualProgress);
    let rel = g.section ? approved.filter(s => s.typeSection === g.section) : approved;
    // Only count submissions created after the goal was created
    if (g.createdAt) {
      const goalCreated = g.createdAt?.seconds ? g.createdAt.seconds * 1000
        : g.createdAt?.toDate ? g.createdAt.toDate().getTime()
        : new Date(g.createdAt).getTime();
      rel = rel.filter(s => {
        const subTime = s.createdAt?.seconds ? s.createdAt.seconds * 1000
          : s.createdAt?.toDate ? s.createdAt.toDate().getTime()
          : new Date(s.createdAt || 0).getTime();
        return subTime >= goalCreated;
      });
    }
    const earned = sum(rel, s => s.points);
    return Math.min(100, Math.round((earned / (Number(g.targetPoints) || 1)) * 100));
  };

  const LevelRing = ({ pct, size = 80, stroke = 5 }) => {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (circ * Math.min(pct, 100)) / 100;
    return (
      <svg width={size} height={size} className="prof-level-ring">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ropGrad)" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <defs><linearGradient id="ropGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--accent)" /><stop offset="100%" stopColor="var(--accent2)" /></linearGradient></defs>
      </svg>
    );
  };

  return (
    <div className="prof rop">
      {/* Back button */}
      <div style={{ marginBottom: 12 }}>
        <Btn onClick={() => navigate("rating")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ transform: "rotate(90deg)" }}><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {t("backToRating")}
        </Btn>
      </div>

      {/* Hero card */}
      <div className="glass card rop-hero" style={{ "--di": 0 }}>
        <div className="rop-hero__banner" />
        <div className="rop-hero__content">
          <div className="rop-hero__avatar-col">
            <div className="rop-hero__avatar-ring">
              <div className="rop-hero__avatar">
                {tc.avatarUrl ? <img src={tc.avatarUrl} alt="" /> : <span>{(tc.displayName || "?").split(/\s+/).filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2)}</span>}
              </div>
            </div>
            <div className="rop-hero__rank">#{rank}</div>
          </div>
          <div className="rop-hero__info">
            <div className="rop-hero__name">{tc.displayName || t("unnamed")}</div>
            <div className="rop-hero__tags">
              <span className="prof-tag prof-tag--role">Teacher</span>
              <span className="prof-tag prof-tag--level">{lvl.name}</span>
              {tc.position && <span className="prof-tag">{tc.position}</span>}
            </div>
            <div className="rop-hero__meta">
              {tc.school && <span className="rop-hero__meta-item"><Icon name="home" /> {tc.school}</span>}
              {tc.subject && <span className="rop-hero__meta-item"><Icon name="file" /> {tc.subject}</span>}
              {tc.city && <span className="rop-hero__meta-item"><Icon name="briefcase" /> {tc.city}</span>}
              {tc.email && <span className="rop-hero__meta-item"><Icon name="shield" /> {tc.email}</span>}
            </div>
            <div className="rop-hero__social">
              {igHandle && (
                <a href={`https://instagram.com/${igHandle}`} target="_blank" rel="noopener noreferrer" className="prof-social-btn prof-social-btn--ig">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" /></svg>
                  @{igHandle}
                </a>
              )}
              {tc.youtube && (
                <a href={tc.youtube} target="_blank" rel="noopener noreferrer" className="prof-social-btn prof-social-btn--yt">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.43z" stroke="currentColor" strokeWidth="2" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" stroke="currentColor" strokeWidth="2" /></svg>
                  YouTube
                </a>
              )}
              {tc.email && (
                <a href={`https://teams.microsoft.com/l/chat/0/0?users=${tc.email}`} target="_blank" rel="noopener noreferrer" className="prof-social-btn">
                  <Icon name="info" /> Teams
                </a>
              )}
            </div>
          </div>
          <div className="rop-hero__right">
            <div className="rop-hero__level-wrap">
              <div className="rop-hero__level-inner">
                <div className="rop-hero__level-pts">{fmtPoints(tc.totalPoints)}</div>
                <div className="rop-hero__level-label">{t("points")}</div>
              </div>
              <div className="rop-hero__progress-track">
                <div className="rop-hero__progress-fill" style={{ width: `${lvl.pct}%` }} />
              </div>
            </div>
            {lvl.next && <div className="rop-hero__level-hint">{nextPts} {t("profileNextLevel").toLowerCase()}</div>}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="prof-stats">
        <div className="prof-stat glass card" style={{ "--di": 1 }}>
          <div className="prof-stat__icon prof-stat__icon--green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="prof-stat__num">{fmtPoints(tc.totalPoints)}</div>
          <div className="prof-stat__label">{t("totalPoints")}</div>
          <div className="prof-stat__bar"><div className="prof-stat__fill" style={{ width: `${lvl.pct}%` }} /></div>
        </div>
        <div className="prof-stat glass card" style={{ "--di": 2 }}>
          <div className="prof-stat__icon prof-stat__icon--blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" /><path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" /></svg>
          </div>
          <div className="prof-stat__num">{subs.length}</div>
          <div className="prof-stat__label">{t("submissions")}</div>
          <div className="prof-stat__badges">
            <span className="pill ok">{approved.length}</span>
            <span className="pill warn">{subs.filter(s => s.status === "pending").length}</span>
          </div>
        </div>
        <div className="prof-stat glass card" style={{ "--di": 3 }}>
          <div className="prof-stat__icon prof-stat__icon--amber">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="prof-stat__num">{fmtPoints(approvedPts)}</div>
          <div className="prof-stat__label">{t("approvedPts")}</div>
        </div>
        <div className="prof-stat glass card" style={{ "--di": 4 }}>
          <div className="prof-stat__icon prof-stat__icon--purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V6l-8-3-8 3v6c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" /></svg>
          </div>
          <div className="prof-stat__num">#{rank}</div>
          <div className="prof-stat__label">{t("rankLabel")}</div>
        </div>
      </div>

      {/* Goals section */}
      {goals.length > 0 && (
        <div className="glass card rop-goals" style={{ "--di": 5 }}>
          <div className="h2">{t("teacherGoals")}</div>
          <div className="sep" />
          <div className="rop-goals__grid">
            {activeGoals.map(g => {
              const pct = goalPct(g);
              const dl = daysUntil(g.deadline);
              const barColor = pct >= 100 ? "var(--green)" : (dl !== null && dl < 0) ? "var(--red)" : "var(--accent)";
              return (
                <div key={g.id} className="rop-goal-card">
                  <div className="rop-goal-card__head">
                    <div className="rop-goal-card__name">{g.note || t("goals")}</div>
                    {g.section && <span className="rop-goal-card__section">{g.section}</span>}
                  </div>
                  <div className="rop-goal-card__meta">
                    <span className="rop-goal-card__target">{fmtPoints(g.targetPoints)} {t("pts")}</span>
                    {g.deadline && <span>{t("goalDeadline")}: {g.deadline}</span>}
                    {dl !== null && dl >= 0 && <span className={dl <= 3 ? "rop-goal-card__warn" : ""}>{dl} {t("daysLeft")}</span>}
                  </div>
                  <div className="rop-goal-card__bar-wrap">
                    <div className="rop-goal-card__bar">
                      <div className="rop-goal-card__fill" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                    <span className="rop-goal-card__pct">{pct}%</span>
                  </div>
                </div>
              );
            })}
            {completedGoals.map(g => (
              <div key={g.id} className="rop-goal-card rop-goal-card--done">
                <div className="rop-goal-card__head">
                  <span style={{ color: "var(--green)", fontWeight: 700, marginRight: 4 }}>✓</span>
                  <div className="rop-goal-card__name">{g.note || t("goals")}</div>
                </div>
                <div className="rop-goal-card__meta"><span>{t("goalCompleted")}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent submissions */}
      <div className="glass card" style={{ "--di": 6 }}>
        <div className="h2">{t("recentSubs")}</div>
        <div className="sep" />
        <DataCards
          emptyText={t("noSubsYet")}
          columns={[
            { key: "eventDate", label: t("date") },
            { key: "typeName", label: t("type") },
            { key: "title", label: t("title") },
            { key: "points", label: t("points"), render: s => <b>{fmtPoints(s.points)}</b> },
            { key: "status", label: t("status"), render: s => <Pill kind={s.status}>{s.status}</Pill> }
          ]}
          rows={approved.slice(0, 10).map(s => ({ ...s, __key: s.id }))}
        />
      </div>
    </div>
  );
}

export function PageProfile() {
  const st = useStore();
  const u = st.userDoc; // read early, guard comes AFTER all hooks
  const viewUid = st.route?.params?.uid || "";
  const isOther = !!(viewUid && u && viewUid !== u.uid);

  // ALL hooks before any early return
  const [tab, setTab] = useState("overview"); // overview | settings | security
  const [form, setForm] = useState({ displayName: "", school: "", subject: "", experienceYears: 0, phone: "", city: "", position: "", instagram: "", youtube: "" });
  const [pw, setPw] = useState({ current: "", next: "", next2: "" });
  const [otherUser, setOtherUser] = useState(null);
  const [otherSubs, setOtherSubs] = useState([]);
  const [otherGoals, setOtherGoals] = useState([]);
  const [otherLoading, setOtherLoading] = useState(false);
  useEffect(() => {
    if (!u) return;
    setForm({ displayName: u.displayName || "", school: u.school || "", subject: u.subject || "", experienceYears: u.experienceYears || 0, phone: u.phone || "", city: u.city || "", position: u.position || "", instagram: u.instagram || "", youtube: u.youtube || "" });
  }, [u?.uid]);
  useEffect(() => setPw({ current: "", next: "", next2: "" }), [u?.uid]);
  useEffect(() => {
    if (!isOther) { setOtherUser(null); setOtherSubs([]); setOtherGoals([]); return; }
    setTab("overview");
    let alive = true;
    (async () => {
      setOtherLoading(true);
      try {
        // Try from store first
        let teacher = (st.users || []).find(x => x.uid === viewUid) || null;
        if (!teacher) {
          const snap = await getDoc(doc(db, "users", viewUid));
          if (snap.exists()) teacher = { id: snap.id, uid: snap.id, ...snap.data() };
        }
        if (alive) setOtherUser(teacher);
        // Fetch submissions
        const sq = query(collection(db, "submissions"), where("uid", "==", viewUid));
        const sr = await getDocs(sq);
        if (alive) setOtherSubs(sr.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => tsKey(b) - tsKey(a)));
        // Fetch goals
        const goals = await fetchGoals(viewUid);
        if (alive) setOtherGoals(goals);
      } catch (e) { console.error(e); }
      if (alive) setOtherLoading(false);
    })();
    return () => { alive = false; };
  }, [viewUid]);

  if (!u) return <Guard />;
  if (!canAccess("profile", u)) return <Guard />;

  // If viewing another teacher's profile
  if (isOther) {
    if (otherLoading || !otherUser) {
      return <div className="glass card" style={{ textAlign: "center", padding: 40 }}><div className="h2">{otherLoading ? t("loading") : t("noData")}</div></div>;
    }
    return <ReadOnlyProfile teacher={otherUser} subs={otherSubs} goals={otherGoals} />;
  }

  const subs = st.mySubmissions || [];
  const lvl = levelFromPoints(u.totalPoints || 0);
  const approved = subs.filter(s => s.status === "approved");
  const pending = subs.filter(s => s.status === "pending");
  const rejected = subs.filter(s => s.status === "rejected");

  // --- Security / password change ---
  const authUser = st.authUser;
  const isPasswordProvider = !!(authUser?.providerData || []).some(p => p?.providerId === "password");

  async function changePassword() {
    const user = auth.currentUser;
    if (!user) { toast(t("noSession"), "error"); return; }

    const next = String(pw.next || "");
    const next2 = String(pw.next2 || "");
    const current = String(pw.current || "");

    if (next.length < 6) { toast(t("pwdMinLength"), "error"); return; }
    if (next !== next2) { toast(t("pwdMismatch"), "error"); return; }
    if (isPasswordProvider && !current) { toast(t("enterCurPwd"), "error"); return; }

    try {
      setState({ loading: true });

      // For email/password accounts we can re-auth with current password
      if (isPasswordProvider) {
        const email = user.email || "";
        const cred = EmailAuthProvider.credential(email, current);
        await reauthenticateWithCredential(user, cred);
      }

      await updatePassword(user, next);
      toast(t("pwdChanged"), "ok");
      setPw({ current: "", next: "", next2: "" });
    } catch (e) {
      console.error(e);
      const code = e?.code || "";
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") toast(t("wrongCurPwd"), "error");
      else if (code === "auth/requires-recent-login") toast(t("reloginNeeded"), "error");
      else if (code === "auth/too-many-requests") toast(t("tooManyAttempts"), "error");
      else toast(e?.message || t("pwdChangeError"), "error");
    } finally { setState({ loading: false }); }
  }

  async function resetPasswordEmail() {
    try {
      const email = (auth.currentUser?.email || u.email || "").trim();
      if (!email) { toast(t("noEmail"), "error"); return; }
      setState({ loading: true });
      await sendPasswordResetEmail(auth, email);
      toast(t("resetSent"), "ok");
    } catch (e) {
      console.error(e);
      toast(e?.message || t("emailSendError"), "error");
    } finally { setState({ loading: false }); }
  }

  async function save() {
    try {
      setState({ loading: true });
      await updateProfile(u.uid, {
        displayName: safeText(form.displayName),
        school: safeText(form.school),
        subject: safeText(form.subject),
        experienceYears: Number(form.experienceYears) || 0,
        phone: safeText(form.phone),
        city: safeText(form.city),
        position: safeText(form.position),
        instagram: safeText(form.instagram),
        youtube: safeText(form.youtube)
      });
      const fresh = await ensureUserDoc(u.uid, u.email);
      setState({ userDoc: fresh });
      toast(t("profileUpdated"), "ok");
    } catch (e) {
      console.error(e);
      toast(e?.message || t("saveError"), "error");
    } finally { setState({ loading: false }); }
  }

  async function pickAvatar(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast(t("needImage"), "error"); return; }
    setState({ modal: { kind: "crop", file } });
  }

  // Блок "Первый запуск / сделать меня админом" удалён по запросу.

  const approvedPts = sum(approved, s => s.points);
  const aprPct = subs.length ? Math.round((approved.length / subs.length) * 100) : 0;
  const nextPts = lvl.next ? lvl.next - (Number(u.totalPoints) || 0) : 0;

  const TabBtn = ({ id, icon, label }) => (
    <button className={`prof-tab${tab === id ? " prof-tab--active" : ""}`} onClick={() => setTab(id)}>
      <Icon name={icon} /> {label}
    </button>
  );

  const LevelRing = ({ pct, size = 60, stroke = 4 }) => {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (circ * Math.min(pct, 100)) / 100;
    return (
      <svg width={size} height={size} className="prof-level-ring">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#profGrad)" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <defs><linearGradient id="profGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--accent)" /><stop offset="100%" stopColor="var(--accent2)" /></linearGradient></defs>
      </svg>
    );
  };

  return (
    <div className="prof">
      {/* ══ Hero Card ══ */}
      <div className="glass card rop-hero" style={{ "--di": 0 }}>
        <div className="rop-hero__banner" />
        <div className="rop-hero__content">
          <div className="rop-hero__avatar-col" onClick={() => document.getElementById("prof-avatar-input")?.click()} style={{ cursor: "pointer" }}>
            <div className="rop-hero__avatar-ring">
              <div className="rop-hero__avatar">
                {u.avatarUrl ? <img src={u.avatarUrl} alt="" /> : <span>{(u.displayName || u.email || "?").split(/\s+/).filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2)}</span>}
              </div>
            </div>
            <input id="prof-avatar-input" hidden type="file" accept="image/*" onChange={(e) => pickAvatar(e.target.files?.[0])} />
          </div>
          <div className="rop-hero__info">
            <div className="rop-hero__name">{u.displayName || t("unnamed")}</div>
            <div className="rop-hero__tags">
              <span className="prof-tag prof-tag--role">{u.role === "admin" ? "Admin" : "Teacher"}</span>
              <span className="prof-tag prof-tag--level">{lvl.name}</span>
              {u.position && <span className="prof-tag">{u.position}</span>}
            </div>
            <div className="rop-hero__meta">
              <span className="rop-hero__meta-item"><Icon name="shield" /> {u.email}</span>
              {u.school && <span className="rop-hero__meta-item"><Icon name="home" /> {u.school}</span>}
              {u.subject && <span className="rop-hero__meta-item"><Icon name="file" /> {u.subject}</span>}
            </div>
            <div className="rop-hero__social">
              {u.instagram && (
                <a href={`https://instagram.com/${u.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="prof-social-btn prof-social-btn--ig">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" /></svg>
                  {u.instagram.startsWith("@") ? u.instagram : `@${u.instagram}`}
                </a>
              )}
              {u.youtube && (
                <a href={u.youtube} target="_blank" rel="noopener noreferrer" className="prof-social-btn prof-social-btn--yt">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.43z" stroke="currentColor" strokeWidth="2" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" stroke="currentColor" strokeWidth="2" /></svg>
                  YouTube
                </a>
              )}
              {u.email && (
                <a href={`https://teams.microsoft.com/l/chat/0/0?users=${u.email}`} target="_blank" rel="noopener noreferrer" className="prof-social-btn">
                  <Icon name="info" /> Teams
                </a>
              )}
              {u.role !== "admin" && (
                <Btn kind="primary" onClick={() => navigate("add")}><Icon name="plus" /> {t("addKpi")}</Btn>
              )}
              <Btn onClick={() => navigate("rating")}><Icon name="rank" /> {t("navRating")}</Btn>
            </div>
          </div>
          <div className="rop-hero__right">
            <div className="rop-hero__level-wrap">
              <div className="rop-hero__level-inner">
                <div className="rop-hero__level-pts">{fmtPoints(u.totalPoints)}</div>
                <div className="rop-hero__level-label">{t("points")}</div>
              </div>
              <div className="rop-hero__progress-track">
                <div className="rop-hero__progress-fill" style={{ width: `${lvl.pct}%` }} />
              </div>
            </div>
            {lvl.next && <div className="rop-hero__level-hint">{nextPts} {t("profileNextLevel").toLowerCase()}</div>}
          </div>
        </div>
      </div>

      {/* ══ Stats strip ══ */}
      <div className="prof-stats">
        <div className="prof-stat glass card" style={{ "--di": 1 }}>
          <div className="prof-stat__head">
            <div className="prof-stat__icon prof-stat__icon--green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div>
              <div className="prof-stat__num">{fmtPoints(u.totalPoints)}</div>
              <div className="prof-stat__label">{t("totalPoints")}</div>
            </div>
          </div>
          <div className="prof-stat__bar"><div className="prof-stat__fill" style={{ width: `${lvl.pct}%` }} /></div>
          {lvl.next && <div className="prof-stat__hint">{t("profileNextLevel")}: {nextPts}</div>}
        </div>
        <div className="prof-stat glass card" style={{ "--di": 2 }}>
          <div className="prof-stat__head">
            <div className="prof-stat__icon prof-stat__icon--blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" /><path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" /></svg>
            </div>
            <div>
              <div className="prof-stat__num">{subs.length}</div>
              <div className="prof-stat__label">{t("submissions")}</div>
            </div>
          </div>
          <div className="prof-stat__badges">
            <span className="pill ok">{approved.length}</span>
            <span className="pill warn">{pending.length}</span>
            <span className="pill error">{rejected.length}</span>
          </div>
        </div>
        <div className="prof-stat glass card" style={{ "--di": 3 }}>
          <div className="prof-stat__head">
            <div className="prof-stat__icon prof-stat__icon--amber">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div>
              <div className="prof-stat__num">{fmtPoints(approvedPts)}</div>
              <div className="prof-stat__label">{t("approvedPts")}</div>
            </div>
          </div>
          <div className="prof-stat__hint">{t("profApprovalRate")}: {aprPct}%</div>
        </div>
        <div className="prof-stat glass card" style={{ "--di": 4 }}>
          <div className="prof-stat__head">
            <div className="prof-stat__icon prof-stat__icon--purple">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </div>
            <div>
              <div className="prof-stat__num">{fmtPoints(u.compDays || 0)}</div>
              <div className="prof-stat__label">{t("compDays")}</div>
            </div>
          </div>
          <Btn kind="ghost" style={{ marginTop: 4, fontSize: 11 }} onClick={() => navigate("requests")}>{t("requests")}</Btn>
        </div>
      </div>

      {/* ══ Tabs ══ */}
      <div className="prof-tabs">
        <TabBtn id="overview" icon="chart" label={t("profileOverview")} />
        <TabBtn id="settings" icon="user" label={t("profileEditInfo")} />
        <TabBtn id="security" icon="shield" label={t("security")} />
      </div>

      {/* Tab: overview */}
      {tab === "overview" && (
        <>
          {u.role !== "admin" && <GoalsWidget compact />}
          <div className="glass card prof-card" style={{ "--di": 5 }}>
            <div className="h2">{t("recentSubs")}</div>
            <div className="sep"></div>
            <DataCards
              emptyText={t("noSubsYet")}
              columns={[
                { key: "eventDate", label: t("date") },
                { key: "typeName", label: t("type") },
                { key: "title", label: t("title") },
                { key: "points", label: t("points"), render: s => <b>{fmtPoints(s.points)}</b> },
                { key: "status", label: t("status"), render: s => <Pill kind={s.status}>{s.status}</Pill> }
              ]}
              rows={subs.slice(0, 8).map(s => ({ ...s, __key: s.id }))}
            />
          </div>
        </>
      )}

      {/* Tab: settings */}
      {tab === "settings" && (
        <div className="glass card prof-card" style={{ "--di": 5 }}>
          <div className="h2">{t("profilePersonal")}</div>
          <div className="sep"></div>
          <div className="prof-form-grid">
            <div><div className="label">{t("fullName")}</div><Input value={form.displayName} onChange={(e) => setForm(f => ({ ...f, displayName: e.target.value }))} /></div>
            <div><div className="label">{t("position")}</div><Input value={form.position} onChange={(e) => setForm(f => ({ ...f, position: e.target.value }))} /></div>
            <div><div className="label">{t("school")}</div><Input value={form.school} onChange={(e) => setForm(f => ({ ...f, school: e.target.value }))} /></div>
            <div><div className="label">{t("subject")}</div><Input value={form.subject} onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))} /></div>
            <div><div className="label">{t("experience")}</div><Input type="number" min="0" max="60" value={form.experienceYears} onChange={(e) => setForm(f => ({ ...f, experienceYears: e.target.value }))} /></div>
            <div><div className="label">{t("phone")}</div><Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><div className="label">{t("city")}</div><Input value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} /></div>
            <div><div className="label">{t("instagram")}</div><Input value={form.instagram} onChange={(e) => setForm(f => ({ ...f, instagram: e.target.value }))} placeholder={t("instagramPh")} /></div>
            <div className="prof-form-grid__full"><div className="label">{t("youtube")}</div><Input value={form.youtube} onChange={(e) => setForm(f => ({ ...f, youtube: e.target.value }))} placeholder={t("youtubePh")} /></div>
          </div>
          <div className="prof-form-actions">
            <Btn kind="primary" onClick={save} disabled={st.loading}><Icon name="check" /> {t("save")}</Btn>
            <Btn onClick={() => setTab("overview")}>{t("cancel")}</Btn>
          </div>
        </div>
      )}

      {/* Tab: security */}
      {tab === "security" && (
        <div className="glass card prof-card" style={{ "--di": 5 }}>
          <div className="h2">{t("security")}</div>
          <div className="help" style={{ marginBottom: 10 }}>
            {isPasswordProvider ? t("securityHelp") : t("securityNote")}
          </div>
          <div className="prof-form-grid">
            {isPasswordProvider && (
              <div>
                <div className="label">{t("currentPwd")}</div>
                <Input type="password" autoComplete="current-password" value={pw.current}
                  onChange={(e) => setPw(p => ({ ...p, current: e.target.value }))} />
              </div>
            )}
            <div>
              <div className="label">{t("newPwd")}</div>
              <Input type="password" autoComplete="new-password" value={pw.next}
                onChange={(e) => setPw(p => ({ ...p, next: e.target.value }))} />
            </div>
            <div>
              <div className="label">{t("repeatNewPwd")}</div>
              <Input type="password" autoComplete="new-password" value={pw.next2}
                onChange={(e) => setPw(p => ({ ...p, next2: e.target.value }))} />
            </div>
          </div>
          <div className="prof-form-actions">
            <Btn kind="primary" onClick={changePassword} disabled={st.loading}><Icon name="shield" /> {t("changePwd")}</Btn>
            <Btn kind="ghost" onClick={resetPasswordEmail} disabled={st.loading}>{t("resetByEmail")}</Btn>
          </div>
        </div>
      )}
    </div>
  );
}


const BOOK_QUIZ_LIBRARY = [
  {
    id: "auyl-shetindegi-ui",
    month: "Ақпан",
    title: "Әкім Тарази — «Ауыл шетіндегі үй»",
    shortTitle: "Ауыл шетіндегі үй",
    author: "Әкім Тарази",
    points: 20,
    thresholdPercent: 70,
    note: "NIS-пен бірге оқиық жобасы · ақпан айы",
    answerKeyNeedsReview: true,
    questions: [
      {
        id: "q1",
        text: "Шығарманың басты кейіпкері кім?",
        options: [
          { key: "A", text: "Сұлтан" },
          { key: "B", text: "Еркебұлан" },
          { key: "C", text: "Танабай" },
          { key: "D", text: "Ақбар" }
        ],
        correct: "A"
      },
      {
        id: "q2",
        text: "Басты кейіпкердің «Жаман Сұлтан» аталуына басты себеп не болды?",
        options: [
          { key: "A", text: "Елге қарсы шыққаны" },
          { key: "B", text: "Жұмысты дұрыс істемегені" },
          { key: "C", text: "Өмірдегі сәтсіздіктері мен мінез-құлқы" },
          { key: "D", text: "Бай адамдарға жақпағаны" }
        ],
        correct: "C"
      },
      {
        id: "q3",
        text: "Сұлтан колхозда қандай қызмет атқарады?",
        options: [
          { key: "A", text: "Колхоз бастығы" },
          { key: "B", text: "Қойшы" },
          { key: "C", text: "Қызылша суғаратын сушы" },
          { key: "D", text: "Саудамен айналысты" }
        ],
        correct: "C"
      },
      {
        id: "q4",
        text: "Сұлтан түн ортасында Өгізөлген ойпаңында не үшін жалғыз қалды?",
        options: [
          { key: "A", text: "Батырхан қашып кеткендіктен" },
          { key: "B", text: "Су бұратын қақпа ашылмай қалғандықтан" },
          { key: "C", text: "Жаңбыр жауып кеткендіктен" },
          { key: "D", text: "Ішімдік іздеп кеткендіктен" }
        ],
        correct: "B"
      },
      {
        id: "q5",
        text: "Жігіттердің көмекке келуіне не себеп болды?",
        options: [
          { key: "A", text: "Өз еріктерімен" },
          { key: "B", text: "Батырханның өтінішімен" },
          { key: "C", text: "Колхоз бастығынан қорыққандықтан" },
          { key: "D", text: "Ақша алу үшін" }
        ],
        correct: "B"
      },
      {
        id: "q6",
        text: "Танабайдың Сұлтанға деген көзқарасы қандай болды?",
        options: [
          { key: "A", text: "Менсінбейтін" },
          { key: "B", text: "Аяйтын" },
          { key: "C", text: "Шынайы құрметтейтін" },
          { key: "D", text: "Пайда үшін жақындасқан" }
        ],
        correct: "C"
      },
      {
        id: "q7",
        text: "Сұлтанның ісі оңға басуына өзі қандай екі себепті атады?",
        options: [
          { key: "A", text: "Ақша мен таныстық" },
          { key: "B", text: "Танабай және өз еңбегі" },
          { key: "C", text: "Ішімдік пен бастық" },
          { key: "D", text: "Аруақ пен бақыт" }
        ],
        correct: "B"
      },
      {
        id: "q8",
        text: "Сұлтан көрген түсін қалай жорыды?",
        options: [
          { key: "A", text: "Жамандыққа" },
          { key: "B", text: "Ауруға" },
          { key: "C", text: "Береке мен жақсы хабарға" },
          { key: "D", text: "Қайғылы оқиғаға" }
        ],
        correct: "C"
      },
      {
        id: "q9",
        text: "Гүлгауһардың тойында күйеу жігіттің кешігуінің нақты себебі қандай болды?",
        options: [
          { key: "A", text: "Ауырып қалған" },
          { key: "B", text: "Жолда қалған" },
          { key: "C", text: "Милицияға түсіп қалған" },
          { key: "D", text: "Басқа қыз тапқан" }
        ],
        correct: "C"
      },
      {
        id: "q10",
        text: "Құдалардан Сарбалақ бүркітті не үшін сұрады?",
        options: [
          { key: "A", text: "Өзіне керек болғандықтан" },
          { key: "B", text: "Байлығын көрсету үшін" },
          { key: "C", text: "Танабайды қуантқысы келгендіктен" },
          { key: "D", text: "Саудалау үшін" }
        ],
        correct: "C"
      }
    ]
  },
  {
    id: "akboz-at",
    month: "Наурыз",
    title: "Тәкен Әлімқұлов — «Ақбоз ат»",
    shortTitle: "Ақбоз ат",
    author: "Тәкен Әлімқұлов",
    points: 20,
    thresholdPercent: 70,
    note: "Викторина · 10 сұрақ",
    answerKeyNeedsReview: false,
    questions: [
      {
        id: "q1",
        text: "Шынар қайда оқыған?",
        options: [
          { key: "A", text: "Алматыда" },
          { key: "B", text: "Мәскеуде" },
          { key: "C", text: "Қаратауда" }
        ],
        correct: "B"
      },
      {
        id: "q2",
        text: "Шынар кімнің қызы?",
        options: [
          { key: "A", text: "Механиктің қызы" },
          { key: "B", text: "Директордың қызы" },
          { key: "C", text: "Жылқышының қызы" }
        ],
        correct: "A"
      },
      {
        id: "q3",
        text: "Қараш Бековтің негізгі қызығушылығы не?",
        options: [
          { key: "A", text: "Жылқыны қарау және ауыл шаруашылығына көмектесу" },
          { key: "B", text: "Газет жазу" },
          { key: "C", text: "Шопандармен сөйлесу" }
        ],
        correct: "A"
      },
      {
        id: "q4",
        text: "Біркембай кім?",
        options: [
          { key: "A", text: "Елеусіздің досы" },
          { key: "B", text: "«Бозтөбе» совхозының ақсақалы" },
          { key: "C", text: "Жергілікті мектептің директоры" }
        ],
        correct: "B"
      },
      {
        id: "q5",
        text: "Елеусіз қандай кәсібімен айналысады?",
        options: [
          { key: "A", text: "Кинооператор" },
          { key: "B", text: "Газеттің қызметкері" },
          { key: "C", text: "Мектеп мұғалімі" }
        ],
        correct: "B"
      },
      {
        id: "q6",
        text: "Қараш Бековтің туған жері қайда?",
        options: [
          { key: "A", text: "Алматы" },
          { key: "B", text: "Бұхар облысы" },
          { key: "C", text: "Қаратау" }
        ],
        correct: "B"
      },
      {
        id: "q7",
        text: "Елеусіз Қарашқа қанша досы бар деп айтты?",
        options: [
          { key: "A", text: "10-ға жуық" },
          { key: "B", text: "200 миллионнан асады" },
          { key: "C", text: "Белгісіз" }
        ],
        correct: "B"
      },
      {
        id: "q8",
        text: "Шынар қай қалада оқыған?",
        options: [
          { key: "A", text: "Алматыда" },
          { key: "B", text: "Мәскеуде" },
          { key: "C", text: "Ташкентте" }
        ],
        correct: "B"
      },
      {
        id: "q9",
        text: "Қараш Бековтың мамандығы қандай?",
        options: [
          { key: "A", text: "Жазушы" },
          { key: "B", text: "Кинооператор" },
          { key: "C", text: "Дәрігер" }
        ],
        correct: "B"
      },
      {
        id: "q10",
        text: "Елеусіз балалар үйінде неше жасында тұрады?",
        options: [
          { key: "A", text: "5 жас" },
          { key: "B", text: "13 жас" },
          { key: "C", text: "9 жас" }
        ],
        correct: "B"
      }
    ]
  },
  {
    id: "kentavr",
    month: "Сәуір",
    title: "Алтай Асқар — «Кентавр»",
    shortTitle: "Кентавр",
    author: "Алтай Асқар",
    points: 20,
    thresholdPercent: 70,
    note: "Тест сұрақтары кейін қосылады",
    questions: []
  },
  {
    id: "komentogai",
    month: "Мамыр",
    title: "Сайын Мұратбеков — «Коментогай»",
    shortTitle: "Коментогай",
    author: "Сайын Мұратбеков",
    points: 20,
    thresholdPercent: 70,
    note: "Тест сұрақтары кейін қосылады",
    questions: []
  }
];

export function calcQuizResult(book, answers) {
  const questions = book?.questions || [];
  let correct = 0;
  for (const q of questions) {
    if (!q?.correct) continue;
    if ((answers?.[q.id] || "") === q.correct) correct += 1;
  }
  const total = questions.length;
  const percent = total ? Math.round((correct / total) * 100) : 0;
  return { correct, total, percent };
}

export function getBookQuizStatus(book, attempts, submissions) {
  const items = (attempts || []).filter(a => a.bookKey === book.id);
  const latest = items[0] || null;
  const now = Date.now();
  const cooldownUntilMs = latest?.cooldownUntil ? new Date(latest.cooldownUntil).getTime() : 0;
  const isCooldown = !!cooldownUntilMs && cooldownUntilMs > now && !latest?.passed;
  const hasRewardSubmission = (submissions || []).some(s => {
    if ((s?.quizBookKey || "") === book.id && s.status !== "rejected") return true;
    if ((s?.title || "").includes(book.title) && (s?.typeId || "").startsWith("book_quiz:") && s.status !== "rejected") return true;
    return false;
  });
  const hasQuestions = !!(book.questions && book.questions.length);

  let state = "ready";
  if (!hasQuestions) state = "soon";
  else if (hasRewardSubmission) state = "sent";
  else if (isCooldown) state = "cooldown";
  else if (latest?.passed) state = "passed";

  return { state, latest, cooldownUntilMs, hasRewardSubmission, hasQuestions };
}

export function fmtDateTimeSafe(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function PageAdd() {
  const st = useStore();
  const u = st.userDoc; // read early, guard comes AFTER all hooks

  // ALL hooks before any early return
  const [section, setSection] = useState("");
  const [subsection, setSubsection] = useState("");
  const [typeId, setTypeId] = useState("");
  const [eventDate, setEventDate] = useState(ymd());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceLink, setEvidenceLink] = useState("");
  const [file, setFile] = useState(null);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState(BOOK_QUIZ_LIBRARY[0]?.id || "");
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [goalMode, setGoalMode] = useState(false);
  const [goalDateFrom, setGoalDateFrom] = useState("");
  const [goalDateTo, setGoalDateTo] = useState("");

  const types = (st.types || []).filter(t => t.active);
  const sections = Array.from(new Set(types.map(t => t.section))).sort();
  const subs = useMemo(() => Array.from(new Set(types.filter(t => t.section === section).map(t => t.subsection))).sort(), [types, section]);
  const opts = useMemo(() => types.filter(t => t.section === section && t.subsection === subsection), [types, section, subsection]);
  const selectedBook = BOOK_QUIZ_LIBRARY.find(b => b.id === selectedBookId) || BOOK_QUIZ_LIBRARY[0] || null;
  const selectedStatus = useMemo(
    () => selectedBook ? getBookQuizStatus(selectedBook, quizAttempts, st.mySubmissions || []) : null,
    [selectedBookId, quizAttempts, (st.mySubmissions || []).length]
  );

  useEffect(() => setSection(sections[0] || ""), [sections.join("|")]);
  useEffect(() => setSubsection(subs[0] || ""), [subs.join("|")]);
  useEffect(() => setTypeId(opts[0]?.id || ""), [opts.map(x => x.id).join("|")]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!u?.uid) return;
      try {
        setQuizLoading(true);
        const items = await fetchMyBookQuizAttempts(u.uid);
        if (!cancelled) setQuizAttempts(items);
      } catch (e) {
        console.error(e);
        toast("Не удалось загрузить историю тестов", "error");
      } finally {
        if (!cancelled) setQuizLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [u?.uid]);

  if (!u) return <Guard />;
  if (!canAccess("add", u)) return <Guard />;

  const type = opts.find(x => x.id === typeId) || null;

  async function refreshQuizAttempts() {
    if (!u?.uid) return;
    const items = await fetchMyBookQuizAttempts(u.uid);
    setQuizAttempts(items);
  }

  function openQuiz(book) {
    setSelectedBookId(book.id);
    setQuizOpen(true);
    setQuizAnswers({});
    setQuizResult(null);
  }

  function closeQuiz() {
    setQuizOpen(false);
    setQuizAnswers({});
    setQuizResult(null);
  }

  async function submitBookQuiz(e) {
    e?.preventDefault?.();
    if (!selectedBook) return;
    const status = getBookQuizStatus(selectedBook, quizAttempts, st.mySubmissions || []);
    if (!status.hasQuestions) { toast("Тест по этой книге пока не добавлен", "error"); return; }
    if (status.state === "cooldown") {
      toast(`Повторная попытка доступна после ${fmtDateTimeSafe(status.latest?.cooldownUntil)}`, "error");
      return;
    }
    if (status.hasRewardSubmission) {
      toast("Баллы по этой книге уже отправлены на проверку", "ok");
      return;
    }

    const unanswered = (selectedBook.questions || []).filter(q => !quizAnswers[q.id]);
    if (unanswered.length) {
      toast(`Ответьте на все вопросы (${unanswered.length} осталось)`, "error");
      return;
    }

    const result = calcQuizResult(selectedBook, quizAnswers);
    const passed = result.percent >= (selectedBook.thresholdPercent || 70);
    setQuizResult({ ...result, passed });

    try {
      setQuizSubmitting(true);
      const cooldownUntil = passed ? "" : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await createBookQuizAttempt({
        uid: u.uid,
        bookKey: selectedBook.id,
        bookTitle: selectedBook.title,
        month: selectedBook.month,
        correctCount: result.correct,
        totalCount: result.total,
        scorePercent: result.percent,
        passed,
        cooldownUntil,
        thresholdPercent: selectedBook.thresholdPercent || 70,
        pointsCandidate: passed ? (selectedBook.points || 20) : 0
      });

      if (passed) {
        await createBookQuizRewardSubmission({ uid: u.uid, book: selectedBook, result });
        const my = await fetchMySubmissions(u.uid);
        setState({ mySubmissions: my });
        toast(`Тест пройден (${result.percent}%). +${selectedBook.points || 20} баллов отправлены на проверку`, "ok");
      } else {
        toast(`Набрано ${result.percent}%. Повтор через 24 часа`, "error");
      }

      await refreshQuizAttempts();
    } catch (err) {
      console.error(err);
      toast(err?.message || "Ошибка при сохранении результата теста", "error");
    } finally {
      setQuizSubmitting(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (goalMode) return submitGoal();
    try {
      if (!type) { toast("Выберите тип KPI", "error"); return; }
      if (!safeText(title)) { toast("Введите название", "error"); return; }
      if (!safeText(evidenceLink) && !file) { toast("Добавьте ссылку и/или файл", "error"); return; }

      setState({ loading: true });
      let evidenceFileUrl = "";
      if (file) evidenceFileUrl = await uploadEvidence(u.uid, file);

      await createSubmission({ uid: u.uid, type, title, description, eventDate, evidenceLink, evidenceFileUrl });
      toast("Заявка отправлена на проверку", "ok");

      const my = await fetchMySubmissions(u.uid);
      setState({ mySubmissions: my });

      setTitle(""); setDescription(""); setEvidenceLink(""); setFile(null);
      navigate("dashboard");
    } catch (err) {
      console.error(err);
      toast(err?.message || "Ошибка отправки", "error");
    } finally { setState({ loading: false }); }
  }

  async function submitGoal() {
    try {
      const pts = type?.defaultPoints || 0;
      if (!pts) { toast("Выберите тип KPI", "error"); return; }
      setState({ loading: true });
      await createGoal({
        uid: u.uid,
        targetPoints: pts,
        deadline: goalDateTo || goalDateFrom || "",
        note: safeText(title) || (type?.name || ""),
        scope: goalDateFrom && goalDateTo ? `${goalDateFrom} — ${goalDateTo}` : "quarter",
        section: type?.section || ""
      });
      const fresh = await fetchGoals(u.uid);
      setState({ myGoals: fresh });
      toast(t("goalSaved"), "ok");
      setTitle(""); setDescription(""); setGoalDateFrom(""); setGoalDateTo("");
    } catch (err) {
      console.error(err);
      toast(err?.message || t("error"), "error");
    } finally { setState({ loading: false }); }
  }

  return (selectedBook && quizOpen) ? (
    <div className="quiz-fullpage route-section">
      <div className="quiz-fullpage__header">
        <button className="quiz-back-btn" type="button" onClick={closeQuiz}>
          ← Кітаптар · Назад
        </button>
        <div className="quiz-fullpage__book-info">
          <span className="quiz-fullpage__month">{selectedBook.month}</span>
          <span className="quiz-fullpage__title">{selectedBook.author} · «{selectedBook.shortTitle}»</span>
          <span className="tiny muted">Порог: {selectedBook.thresholdPercent || 70}% · +{selectedBook.points || 20} балл</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {selectedStatus?.state === "sent" ? <Pill kind="pending">Баллы отправлены</Pill> : null}
          {selectedStatus?.state === "cooldown" ? <Pill kind="rejected">Повтор позже</Pill> : null}
        </div>
      </div>

      {selectedBook.questions?.length ? (
        quizResult ? (
          <div className="quiz-result-screen">
            <div className="quiz-result-screen__icon">{quizResult.passed ? "🎉" : "😔"}</div>
            <div className="quiz-result-screen__score">
              {quizResult.correct}<span className="quiz-result-screen__score-total">/{quizResult.total}</span>
            </div>
            <div className="quiz-result-screen__percent">{quizResult.percent}%</div>
            {quizResult.passed ? (
              <>
                <div className="quiz-result-screen__title ok">Құттықтаймыз! · Поздравляем!</div>
                <div className="quiz-result-screen__desc">
                  Тест сәтті өтілді · Тест успешно пройден<br />
                  +{selectedBook.points || 20} балл тексеруге жіберілді · баллов отправлены на проверку
                </div>
              </>
            ) : (
              <>
                <div className="quiz-result-screen__title fail">Өкінішке орай · К сожалению</div>
                <div className="quiz-result-screen__desc">
                  Өту шегі {selectedBook.thresholdPercent || 70}% · Порог прохождения {selectedBook.thresholdPercent || 70}%<br />
                  24 сағаттан кейін қайталауға болады · Повтор доступен через 24 часа
                </div>
              </>
            )}
            <Btn type="button" onClick={closeQuiz} kind="primary" style={{ marginTop: 28 }}>← Кітаптарға оралу · Вернуться к книгам</Btn>
          </div>
        ) : (
          <form onSubmit={submitBookQuiz} className="quiz-fullpage__form">
            <div className="quiz-questions">
              {selectedBook.questions.map((q, idx) => {
                const picked = quizAnswers[q.id] || "";
                return (
                  <div key={q.id} className="quiz-question-card">
                    <div className="quiz-question-card__title">{idx + 1}. {q.text}</div>
                    <div className="quiz-options">
                      {q.options.map(opt => {
                        const checked = picked === opt.key;
                        return (
                          <label key={opt.key} className={`quiz-option ${checked ? "selected" : ""}`}>
                            <input
                              type="radio"
                              name={`quiz_${selectedBook.id}_${q.id}`}
                              value={opt.key}
                              checked={checked}
                              onChange={() => setQuizAnswers(prev => ({ ...prev, [q.id]: opt.key }))}
                              disabled={quizSubmitting || selectedStatus?.state === "cooldown" || selectedStatus?.hasRewardSubmission}
                            />
                            <span className="quiz-option__key">{opt.key}</span>
                            <span>{opt.text}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="quiz-fullpage__actions">
              <Btn kind="primary" type="submit" disabled={quizSubmitting || selectedStatus?.state === "cooldown" || selectedStatus?.hasRewardSubmission}>
                {quizSubmitting ? "Сохраняем..." : "Тестті аяқтау · Завершить тест"}
              </Btn>
              <Btn type="button" onClick={() => setQuizAnswers({})} disabled={quizSubmitting}>Сбросить ответы</Btn>
              <Btn type="button" onClick={closeQuiz}>← Назад</Btn>
            </div>
          </form>
        )
      ) : (
        <div className="glass card" style={{ maxWidth: 560, margin: "0 auto" }}>
          <p className="p">Для этой книги тест ещё не добавлен. Можете прислать вопросы — я встрою их по аналогии.</p>
          <Btn type="button" onClick={closeQuiz} style={{ marginTop: 12 }}>← Назад</Btn>
        </div>
      )}
    </div>
  ) : (
    <div className="grid2">
      <div className="glass card add-form-card">
        <form onSubmit={submit}>
          <div className="grid2">
            <div>
              <div className="label">Section</div>
              <Select value={section} onChange={(e) => setSection(e.target.value)}>
                {sections.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <div className="label">Subsection</div>
              <Select value={subsection} onChange={(e) => setSubsection(e.target.value)}>
                {subs.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <div className="label">Тип KPI</div>
              <Select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
                {opts.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
              <div className="help">Баллы подтянутся из типа автоматически.</div>
            </div>
          </div>

          <div className="grid2">
            {!goalMode && (
              <div>
                <div className="label">Дата</div>
                <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
              </div>
            )}
            <div>
              <div className="label">Баллы</div>
              <Input value={type?.defaultPoints ?? ""} readOnly />
            </div>
          </div>

          {/* Goals & Deadlines toggle */}
          <div className="add-goal-toggle" style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 6px" }}>
            <label className="type-toggle" style={{ flexShrink: 0 }}>
              <input type="checkbox" checked={goalMode} onChange={e => setGoalMode(e.target.checked)} />
              <span className="type-toggle-slider"></span>
            </label>
            <span className="label" style={{ margin: 0, cursor: "pointer" }} onClick={() => setGoalMode(!goalMode)}>{t("goalsAndDeadlines")}</span>
          </div>
          {goalMode && (
            <div className="grid2" style={{ marginBottom: 4 }}>
              <div>
                <div className="label">{t("dateFrom")}</div>
                <Input type="date" value={goalDateFrom} onChange={e => setGoalDateFrom(e.target.value)} />
              </div>
              <div>
                <div className="label">{t("dateTo")}</div>
                <Input type="date" value={goalDateTo} onChange={e => setGoalDateTo(e.target.value)} />
              </div>
            </div>
          )}

          <div className="label">Название</div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />

          <div className="label">Описание</div>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Коротко: что сделано, где, результат..." />

          <div className="label">Ссылка (optional)</div>
          <Input value={evidenceLink} onChange={(e) => setEvidenceLink(e.target.value)} placeholder="https://..." />

          <div className="label">Файл (optional)</div>
          <Input type="file" accept=".pdf,image/png,image/jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <Btn kind="primary" type="submit" disabled={st.loading}>{goalMode ? t("setGoal") : "Отправить"}</Btn>
            <Btn type="button" onClick={() => navigate("profile")}>Назад</Btn>
          </div>
        </form>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Goals widget */}
        <GoalsWidget compact />

        {/* Books compact */}
        <div className="glass card" style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div className="h2" style={{ fontSize: 15, margin: 0 }}>Книги месяца</div>
            {quizLoading ? <Pill kind="pending">...</Pill> : <Pill kind="approved">Тесты</Pill>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {BOOK_QUIZ_LIBRARY.map(book => {
              const qs = book.questions || [];
              const status = getBookQuizStatus(book, quizAttempts, st.mySubmissions || []);
              const stateLabel = status.state === "sent" ? "На проверке" : status.state === "cooldown" ? "Пауза" : status.state === "soon" ? "Скоро" : "Доступен";
              const stateKind = status.state === "sent" ? "pending" : status.state === "cooldown" ? "rejected" : status.state === "soon" ? "" : "approved";
              return (
                <div key={book.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card-bg)" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{book.month}</span>
                      <Pill kind={stateKind} style={{ fontSize: 10, padding: "1px 6px" }}>{stateLabel}</Pill>
                    </div>
                    <div className="tiny muted" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{book.author} · «{book.shortTitle}»</div>
                  </div>
                  <Btn kind="ghost" type="button" style={{ fontSize: 12, padding: "4px 10px", flexShrink: 0 }} onClick={() => { if (qs.length) openQuiz(book); }} disabled={!qs.length}>
                    {qs.length ? "Тест" : "Скоро"}
                  </Btn>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </div>
  );
}

export function PageRequests() {
  const st = useStore();
  const u = st.userDoc;

  const [tab, setTab] = useState("form");
  const [kind, setKind] = useState(REQUEST_KINDS[0]?.key || "leave");
  const [dateFrom, setDateFrom] = useState(ymd());
  const [dateTo, setDateTo] = useState(ymd());
  const [timeFrom, setTimeFrom] = useState("09:00");
  const [timeTo, setTimeTo] = useState("11:00");
  const [note, setNote] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [viewReq, setViewReq] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("all");
  const days = useMemo(() => dateRangeDays(dateFrom, dateTo), [dateFrom, dateTo]);
  const isEarlyLeave = kind === "early_leave";
  const hoursCalc = useMemo(() => {
    if (!isEarlyLeave) return 0;
    const [h1, m1] = timeFrom.split(":").map(Number);
    const [h2, m2] = timeTo.split(":").map(Number);
    const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    return Math.max(0, Math.round(diff / 30) / 2);
  }, [timeFrom, timeTo, isEarlyLeave]);

  if (!u) return <Guard />;
  if (!canAccess("requests", u)) return <Guard />;

  const reqs = st.myRequests || [];
  const k = REQUEST_KINDS.find(x => x.key === kind) || REQUEST_KINDS[0];
  const compPreview = k.compMode === "earn" ? days : k.compMode === "use" ? -days : 0;

  const pending = reqs.filter(r => r.status === "pending");
  const approved = reqs.filter(r => r.status === "approved");
  const rejected = reqs.filter(r => r.status === "rejected");

  const filteredReqs = historyFilter === "all" ? reqs : reqs.filter(r => r.status === historyFilter);

  const kindIcon = (kk) => {
    if (kk === "leave") return "briefcase";
    if (kk === "early_leave") return "clock";
    if (kk === "weekend_work") return "trending-up";
    return "clipboard";
  };

  async function refresh() {
    try {
      setState({ loading: true });
      const [myReq, fresh] = await Promise.all([
        fetchMyRequests(u.uid),
        ensureUserDoc(u.uid, u.email)
      ]);
      setState({ myRequests: myReq, userDoc: fresh });
      toast(t("dataUpdated"), "ok");
    } catch (e) {
      console.error(e);
      toast(e?.message || t("updateFailed"), "error");
    } finally { setState({ loading: false }); }
  }

  async function submit(e) {
    e.preventDefault();
    try {
      const f = safeText(dateFrom);
      const to = isEarlyLeave ? f : (safeText(dateTo) || f);
      const df = new Date(`${f}T00:00:00`);
      const dt = new Date(`${to}T00:00:00`);
      if (Number.isNaN(df.getTime()) || Number.isNaN(dt.getTime())) { toast(t("invalidDateRange"), "error"); return; }
      if (dt.getTime() < df.getTime()) { toast(t("invalidDateRange"), "error"); return; }

      setSending(true);
      setState({ loading: true });
      await createTeacherRequest({
        uid: u.uid, kind, dateFrom: f, dateTo: to, note, evidenceFileUrl: "",
        timeFrom: isEarlyLeave ? timeFrom : "",
        timeTo: isEarlyLeave ? timeTo : ""
      });
      setSent(true);
      setTimeout(() => setSent(false), 2500);
      toast(t("requestSent"), "ok");
      const myReq = await fetchMyRequests(u.uid);
      setState({ myRequests: myReq });
      setNote("");
    } catch (err) {
      console.error(err);
      toast(err?.message || t("sendError"), "error");
    } finally { setState({ loading: false }); setSending(false); }
  }

  const signNum = (n) => {
    const x = Number(n) || 0;
    return x > 0 ? `+${x}` : String(x);
  };

  const previewReq = {
    kind, kindLabel: t(k.tKey), dateFrom, dateTo: isEarlyLeave ? dateFrom : dateTo,
    days: isEarlyLeave ? 1 : days, note, status: "pending",
    id: Math.random().toString(36).slice(2, 8).toUpperCase(),
    evidenceFileUrl: "",
    ...(isEarlyLeave ? { timeFrom, timeTo } : {})
  };

  return (
    <div className="treq">
      {/* Modal: view document for a specific request */}
      {viewReq && createPortal(
        <div className="tp-overlay" onClick={() => setViewReq(null)}>
          <div className="tp-card" onClick={e => e.stopPropagation()} style={{ width: "700px", maxWidth: "95vw", maxHeight: "95vh", overflowY: "auto" }}>
            <button className="tp-close" onClick={() => setViewReq(null)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
            <DocumentPreview
              request={viewReq}
              user={u}
              signatureUrl={u.signatureUrl}
              onPrint={() => window.print()}
              showDownload
            />
          </div>
        </div>,
        document.body
      )}

      {/* ── Stat cards row ── */}
      <div className="treq-stats">
        <div className="treq-stat treq-stat--balance" style={{ "--di": 0 }}>
          <div className="treq-stat__icon"><Icon name="calendar" /></div>
          <div className="treq-stat__body">
            <div className="treq-stat__num">{fmtPoints(u.compDays || 0)}</div>
            <div className="treq-stat__label">{t("compBalance")}</div>
          </div>
          <div className="treq-stat__glow"></div>
        </div>
        <div className="treq-stat treq-stat--total" style={{ "--di": 1 }}>
          <div className="treq-stat__icon"><Icon name="clipboard" /></div>
          <div className="treq-stat__body">
            <div className="treq-stat__num">{reqs.length}</div>
            <div className="treq-stat__label">{t("totalRequests")}</div>
          </div>
        </div>
        <div className="treq-stat treq-stat--pending" style={{ "--di": 2 }}>
          <div className="treq-stat__icon"><Icon name="clock" /></div>
          <div className="treq-stat__body">
            <div className="treq-stat__num">{pending.length}</div>
            <div className="treq-stat__label">{t("reqPending")}</div>
          </div>
        </div>
        <div className="treq-stat treq-stat--approved" style={{ "--di": 3 }}>
          <div className="treq-stat__icon"><Icon name="check" /></div>
          <div className="treq-stat__body">
            <div className="treq-stat__num">{approved.length}</div>
            <div className="treq-stat__label">{t("reqApproved")}</div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="treq-tabs">
        <button className={`treq-tab${tab === "form" ? " treq-tab--active" : ""}`} onClick={() => setTab("form")}>
          <Icon name="plus" /> {t("newRequest")}
        </button>
        <button className={`treq-tab${tab === "history" ? " treq-tab--active" : ""}`} onClick={() => setTab("history")}>
          <Icon name="file" /> {t("history")}
          {reqs.length > 0 && <span className="treq-tab__badge">{reqs.length}</span>}
        </button>
        <div className="treq-tabs__actions">
          <Btn kind="ghost" onClick={refresh} disabled={st.loading}><Icon name="refresh" /></Btn>
        </div>
      </div>

      {/* ══ NEW REQUEST TAB ══ */}
      {tab === "form" && (
        <div className="treq-form-wrap" style={{ "--di": 0 }}>
          <div className="treq-form glass card">
            {/* Kind selector as visual cards */}
            <div className="treq-kind-grid treq-kind-grid--2">
              {/* Combined leave card with switch */}
              <button
                type="button"
                className={`treq-kind-btn treq-kind-btn--leave${kind === "leave" || kind === "early_leave" ? " treq-kind-btn--active" : ""}`}
                onClick={() => setKind(isEarlyLeave ? "leave" : kind === "leave" ? "leave" : "leave")}
              >
                <span className="treq-kind-btn__icon"><Icon name={isEarlyLeave ? "clock" : "briefcase"} /></span>
                <span className="treq-kind-btn__text">{t("rkLeave")}</span>
                {/* Hours toggle */}
                <label className="treq-switch" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isEarlyLeave}
                    onChange={(e) => setKind(e.target.checked ? "early_leave" : "leave")}
                  />
                  <span className="treq-switch__track">
                    <span className="treq-switch__thumb"></span>
                  </span>
                  <span className="treq-switch__label">{t("hours")}</span>
                </label>
              </button>

              {REQUEST_KINDS.filter(rk => rk.key !== "leave" && rk.key !== "early_leave").map((rk) => (
                <button
                  key={rk.key}
                  type="button"
                  className={`treq-kind-btn${kind === rk.key ? " treq-kind-btn--active" : ""} treq-kind-btn--${rk.key}`}
                  onClick={() => setKind(rk.key)}
                >
                  <span className="treq-kind-btn__icon"><Icon name={kindIcon(rk.key)} /></span>
                  <span className="treq-kind-btn__text">{t(rk.tKey)}</span>
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="treq-fields">
              {/* Date fields */}
              {!isEarlyLeave ? (
                <div className="treq-date-row">
                  <div className="treq-field">
                    <label className="treq-field__label"><Icon name="calendar" /> {t("dateFrom")}</label>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} required />
                  </div>
                  <div className="treq-date-arrow"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                  <div className="treq-field">
                    <label className="treq-field__label"><Icon name="calendar" /> {t("dateTo")}</label>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} required />
                  </div>
                </div>
              ) : (
                <div className="treq-date-row treq-date-row--early">
                  <div className="treq-field">
                    <label className="treq-field__label"><Icon name="calendar" /> {t("requestDate")}</label>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} required />
                  </div>
                  <div className="treq-field">
                    <label className="treq-field__label"><Icon name="clock" /> {t("timeFrom")}</label>
                    <Input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} required />
                  </div>
                  <div className="treq-date-arrow"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                  <div className="treq-field">
                    <label className="treq-field__label"><Icon name="clock" /> {t("timeTo")}</label>
                    <Input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} required />
                  </div>
                </div>
              )}

              {/* Info chip */}
              <div className="treq-info-chip">
                {isEarlyLeave ? (
                  <><Icon name="clock" /> {hoursCalc} {t("hours")}</>
                ) : (
                  <>
                    <Icon name="calendar" /> {days} {days === 1 ? "день" : "дней"}
                    {k.compMode === "earn" && <span className="treq-info-chip__comp treq-info-chip__comp--earn">+{days} {t("compDaysPill")}</span>}
                    {k.compMode === "use" && <span className="treq-info-chip__comp treq-info-chip__comp--use">-{days} {t("compDaysPill")}</span>}
                  </>
                )}
              </div>

              {/* Reason */}
              <div className="treq-field">
                <label className="treq-field__label"><Icon name="info" /> {t("reason")}</label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("reasonPlaceholder")} rows={3} />
              </div>

              {/* Actions */}
              <div className="treq-form-actions">
                <button type="submit" className={`treq-submit${sending ? " treq-submit--sending" : ""}${sent ? " treq-submit--sent" : ""}`} disabled={st.loading || sending}>
                  {sent ? (
                    <><Icon name="check" /> {t("requestSent")}</>
                  ) : sending ? (
                    <><span className="treq-spinner"></span></>
                  ) : (
                    <><Icon name="check" /> {t("submitRequest")}</>
                  )}
                </button>
                <Btn type="button" onClick={() => setShowPreview(!showPreview)}>
                  <Icon name="eye" /> {showPreview ? t("hide") : t("preview")}
                </Btn>
              </div>
            </form>

            {showPreview && (
              <div className="treq-preview-wrap">
                <div className="sep" />
                <DocumentPreview request={previewReq} user={u} signatureUrl={u.signatureUrl} showDownload />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ HISTORY TAB ══ */}
      {tab === "history" && (
        <div className="treq-history" style={{ "--di": 0 }}>
          {/* Filter pills */}
          <div className="treq-history-filters">
            {["all", "pending", "approved", "rejected"].map(f => (
              <button
                key={f}
                className={`treq-filter-pill${historyFilter === f ? " treq-filter-pill--active" : ""} treq-filter-pill--${f}`}
                onClick={() => setHistoryFilter(f)}
              >
                {f === "all" ? t("totalRequests") : f === "pending" ? t("reqPending") : f === "approved" ? t("reqApproved") : t("reqRejected")}
                <span className="treq-filter-pill__count">
                  {f === "all" ? reqs.length : f === "pending" ? pending.length : f === "approved" ? approved.length : rejected.length}
                </span>
              </button>
            ))}
          </div>

          {/* Request timeline cards */}
          <div className="treq-timeline">
            {!filteredReqs.length && (
              <div className="treq-empty glass card">
                <div className="treq-empty__icon"><Icon name="clipboard" /></div>
                <p>{t("noRequests")}</p>
              </div>
            )}
            {filteredReqs.slice(0, 30).map((r, idx) => {
              const statusClass = r.status === "approved" ? "treq-tcard--approved" : r.status === "rejected" ? "treq-tcard--rejected" : "treq-tcard--pending";
              const period = r.dateFrom + (r.dateTo && r.dateTo !== r.dateFrom ? ` → ${r.dateTo}` : "");
              const timeInfo = r.timeFrom && r.timeTo ? `${r.timeFrom} → ${r.timeTo}` : "";
              return (
                <div key={r.id} className={`treq-tcard glass ${statusClass}`} style={{ "--di": idx }}>
                  <div className="treq-tcard__status-bar"></div>
                  <div className="treq-tcard__content">
                    <div className="treq-tcard__top">
                      <div className={`treq-tcard__kind treq-tcard__kind--${r.kind}`}>
                        <Icon name={kindIcon(r.kind)} />
                        <span>{r.kindLabel || requestKindLabel(r.kind)}</span>
                      </div>
                      <Pill kind={r.status}>
                        {r.status === "approved" ? t("reqApproved") : r.status === "rejected" ? t("reqRejected") : t("reqPending")}
                      </Pill>
                    </div>
                    <div className="treq-tcard__details">
                      <div className="treq-tcard__detail">
                        <Icon name="calendar" />
                        <span>{period}</span>
                      </div>
                      {timeInfo && (
                        <div className="treq-tcard__detail">
                          <Icon name="clock" />
                          <span>{timeInfo}</span>
                        </div>
                      )}
                      {r.status === "approved" && (Number(r.pointsDelta) !== 0) && (
                        <div className="treq-tcard__detail">
                          <Icon name="hash" />
                          <span>{signNum(Number(r.pointsDelta) || 0)} {t("pointsDelta")}</span>
                        </div>
                      )}
                    </div>
                    {r.note && <div className="treq-tcard__note">{r.note}</div>}
                  </div>
                  <button className="treq-tcard__doc-btn" onClick={() => setViewReq(r)} title={t("document")}>
                    <Icon name="file" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function ratingTrend(usersSorted) {
  const prev = JSON.parse(localStorage.getItem("rating_snapshot") || "[]");
  const prevPos = new Map(prev.map((x, i) => [x.uid, i + 1]));
  const trend = new Map();
  usersSorted.forEach((u, i) => {
    const c = i + 1;
    const p = prevPos.get(u.uid);
    if (!p) trend.set(u.uid, "NEW");
    else {
      const diff = p - c;
      trend.set(u.uid, diff > 0 ? `▲ ${diff}` : diff < 0 ? `▼ ${Math.abs(diff)}` : "• 0");
    }
  });
  localStorage.setItem("rating_snapshot", JSON.stringify(usersSorted.map(u => ({ uid: u.uid, total: Number(u.totalPoints) || 0 }))));
  return trend;
}


export function PageRating() {
  const st = useStore();
  const u = st.userDoc;

  if (!u) return <Guard />;
  if (!canAccess("rating", u)) return <Guard />;

  const teachers = st.users.filter(x => (x.role || "teacher") !== "admin");
  const sorted = [...teachers].sort((a, b) => (Number(b.totalPoints) || 0) - (Number(a.totalPoints) || 0)).slice(0, 100);
  const trend = ratingTrend(sorted);

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  const Avatar = ({ user, size = "sm" }) => (
    <div className={`avatar ${size}`} aria-hidden="true">
      {user?.avatarUrl
        ? <img src={user.avatarUrl} alt="" />
        : <span style={{ fontWeight: 900 }}>{(user?.displayName || user?.email || "?").slice(0, 1).toUpperCase()}</span>}
    </div>
  );

  const openProfile = (teacher) => setState({ modal: { kind: "teacherProfile", teacher } });

  return (
    <div className="glass card">
      {/* Quarter filter + Export */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <div className="tiny muted">{t("academicYear")}: {getAcademicYearLabel()}</div>
        <Btn kind="ghost" onClick={() => { exportRatingCsv(st.users, st.types); toast(t("exportSuccess"), "ok"); }}>
          <Icon name="file" /> {t("exportCsv")}
        </Btn>
      </div>

      <div className="podium">
        {[1, 0, 2].map((idx, i) => {
          const tc = top3[idx];
          const isChamp = idx === 0;
          if (!tc) {
            return (
              <div key={i} className="podium__item glass">
                <div className="podium__inner">
                  <div className="podium__rank">—</div>
                  <div className="podium__name">{t("emptySlot")}</div>
                  <div className="podium__meta muted">{t("noData")}</div>
                </div>
              </div>
            );
          }
          if (isChamp) {
            return (
              <div key={tc.uid} className="podium__item podium__item--champ glass first" onClick={() => openProfile(tc)} style={{ cursor: "pointer" }}>
                {/* Decorative shimmer strips */}
                <div className="champ-shimmer" aria-hidden="true" />
                <div className="podium__inner">
                  <div className="champ-crown">👑</div>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div className="podiumAvatar podiumAvatar--champ">
                      {tc.avatarUrl
                        ? <img src={tc.avatarUrl} alt="" />
                        : <span style={{ fontWeight: 900, fontSize: 22 }}>{(tc.displayName || tc.email || "?").slice(0, 1).toUpperCase()}</span>}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="champ-rank-badge">#1 {t("champion")} · {trend.get(tc.uid)}</div>
                      <div className="champ-name">{tc.displayName || tc.email}</div>
                      <div className="podium__meta">{tc.school || "—"} · {tc.subject || "—"}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div className="champ-points">{fmtPoints(tc.totalPoints)}</div>
                      <div className="tiny" style={{ color: "#d4a800", fontWeight: 700 }}>{t("pts")}</div>
                    </div>
                  </div>
                  <div className="champ-stars" aria-hidden="true">★ ★ ★ ★ ★</div>
                </div>
              </div>
            );
          }
          const isSilver = idx === 1;
          const isBronze = idx === 2;
          const placeClass = isSilver ? "podium__item--silver" : "podium__item--bronze";
          const avatarClass = isSilver ? "podiumAvatar--silver" : "podiumAvatar--bronze";
          const badgeClass = isSilver ? "silver-rank-badge" : "bronze-rank-badge";
          const shimmerClass = isSilver ? "silver-shimmer" : "bronze-shimmer";
          const medal = isSilver ? "🥈" : "🥉";
          return (
            <div key={tc.uid} className={`podium__item ${placeClass} glass`} onClick={() => openProfile(tc)} style={{ cursor: "pointer" }}>
              <div className={shimmerClass} aria-hidden="true" />
              <div className="podium__inner" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div className={`podiumAvatar ${avatarClass}`}>
                  {tc.avatarUrl
                    ? <img src={tc.avatarUrl} alt="" />
                    : <span style={{ fontWeight: 900 }}>{(tc.displayName || tc.email || "?").slice(0, 1).toUpperCase()}</span>}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className={badgeClass}>#{idx + 1} {medal} · {trend.get(tc.uid)}</div>
                  <div className="podium__name">{tc.displayName || tc.email}</div>
                  <div className="podium__meta">{tc.school || "—"} · {tc.subject || "—"}</div>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div className="podium__points">{fmtPoints(tc.totalPoints)}</div>
                  <div className="tiny muted">{t("pts")}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sep"></div>

      <div className="h2">{t("top100")}</div>
      <div className="ratinglist" style={{ marginTop: 10 }}>
        {rest.map((tc, i) => (
          <div key={tc.uid} className="ratingrow ratingrow--clickable" onClick={() => openProfile(tc)}>
            <div className="ratingrank">{i + 4}</div>
            <Avatar user={tc} />
            <div className="ratingmeta">
              <div className="ratingname">{tc.displayName || t("unnamed")}</div>
              <div className="ratingsub">{tc.school || "—"} · {tc.subject || "—"} · {tc.email}</div>
            </div>
            <div className="ratingpts">{fmtPoints(tc.totalPoints)}</div>
            <div className="ratingtrend">{trend.get(tc.uid)}</div>
          </div>
        ))}
        {!sorted.length && (
          <div className="ratingrow"><div className="muted tiny">{t("noData")}</div></div>
        )}
      </div>
    </div>
  );
}




export function PageStats() {
  const st = useStore();
  const u = st.userDoc;
  if (!u) return <Guard />;
  if (!canAccess("stats", u)) return <Guard />;

  const mode = "365d";
  const days = 365;

  const startYMD = startYMDFromDays(days);
  const monthBins = lastMonths(12);
  const bins = monthBins;

  const rangeMonths = new Set(monthBins.map(x => x.key));

  const inRange = (s) => {
    if (!s?.eventDate) return false;
    const mk = (s.eventDate || "").slice(0, 7);
    return s.eventDate >= startYMD && rangeMonths.has(mk);
  };

  const seriesPoints = (approved, bin) => {
    return sum(approved.filter(s => (s.eventDate || "").slice(0, 7) === bin.key), s => s.points);
  };

  const view = u.role === "teacher" ? (st.statsView || "mine") : "platform";

  async function refresh() {
    try {
      setState({ loading: true });
      await hydrateForUser(u);
      toast(t("dataUpdated"), "ok");
    } catch (e) {
      console.error(e);
      toast(e?.message || t("updateFailed"), "error");
    } finally {
      setState({ loading: false });
    }
  }

  const qf = st.quarterFilter || "all";

  const Controls = () => (
    <div className="stats-controls">
      {u.role === "teacher" ? (
        <div className="stats-controls__group">
          <Btn kind={view === "mine" ? "primary" : ""} onClick={() => setState({ statsView: "mine" })}><Icon name="user" /> {t("mine")}</Btn>
          <Btn kind={view === "platform" ? "primary" : ""} onClick={() => setState({ statsView: "platform" })}><Icon name="chart" /> {t("platform")}</Btn>
        </div>
      ) : null}
      <QuarterFilter value={qf} onChange={v => setState({ quarterFilter: v })} showLabel={false} />
      <div className="stats-controls__group">
        {u.role === "teacher" && view === "mine" ? <Btn onClick={() => navigate("add")}><Icon name="plus" /> KPI</Btn> : null}
        {view === "platform" ? <Btn onClick={() => navigate("rating")}>{t("navRating")}</Btn> : null}
        {u.role === "admin" ? <Btn onClick={() => navigate("admin/approvals")}>{t("navApprovals")}</Btn> : null}
        <Btn onClick={refresh} disabled={st.loading}>{t("refresh")}</Btn>
        {u.role === "teacher" && view === "mine" ? (
          <Btn kind="ghost" onClick={() => {
            const typesMap = new Map((st.types || []).map(tp => [tp.id, tp]));
            exportSubmissionsCsv(st.mySubmissions || [], typesMap, qf);
            toast(t("exportSuccess"), "ok");
          }}><Icon name="file" /> {t("exportCsv")}</Btn>
        ) : null}
      </div>
    </div>
  );

  // Trend: compare current half of range vs previous half
  const halfBins = Math.ceil(bins.length / 2);
  const recentBins = new Set(bins.slice(-halfBins).map(b => b.key));
  const olderBins = new Set(bins.slice(0, halfBins).map(b => b.key));

  const trendPct = (curr, prev) => {
    if (!prev) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };
  const TrendBadge = ({ curr, prev }) => {
    const pct = trendPct(curr, prev);
    const up = pct >= 0;
    return (
      <span style={{ fontSize: 11, fontWeight: 700, color: up ? "var(--green, #22c55e)" : "var(--red, #ef4444)", marginLeft: 6 }}>
        {up ? "▲" : "▼"} {Math.abs(pct)}%
      </span>
    );
  };

  function renderMine() {
    const allMy = filterByQuarter(st.mySubmissions || [], qf);
    const subs = allMy.filter(inRange);
    const approved = subs.filter(s => s.status === "approved");
    const pending = subs.filter(s => s.status === "pending");
    const rejected = subs.filter(s => s.status === "rejected");

    const totalPts = sum(approved, s => s.points);
    const bySeries = bins.map(b => seriesPoints(approved, b));

    // Trend calculation
    const recentPts = sum(approved.filter(s => {
      const k = (s.eventDate || "").slice(0, 7);
      return recentBins.has(k);
    }), s => s.points);
    const olderPts = sum(approved.filter(s => {
      const k = (s.eventDate || "").slice(0, 7);
      return olderBins.has(k);
    }), s => s.points);

    const typeMap = new Map();
    approved.forEach(s => {
      const key = s.typeName || "—";
      typeMap.set(key, (typeMap.get(key) || 0) + (Number(s.points) || 0));
    });
    const topType = Array.from(typeMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12);
    const radar = topType.slice(0, 6);

    const sectionMap = new Map();
    approved.forEach(s => {
      const key = s.typeSection || t("other");
      sectionMap.set(key, (sectionMap.get(key) || 0) + (Number(s.points) || 0));
    });
    const topSections = Array.from(sectionMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const totalForPie = sum(topSections, x => x[1]) || 1;

    // For gauge: use user's active goal or default 200
    const allTimeTotal = Number(u.totalPoints) || 0;
    const activeGoal = (st.myGoals || []).find(g => !g.completed);
    const GOAL = activeGoal ? Number(activeGoal.targetPoints) || 200 : 200;

    return (
      <div className="glass card">
        <p className="p">
          {t("quarter")}: <b>{qf === "all" ? t("allQuarters") : t(qf)}</b> · {t("academicYear")}: <b>{getAcademicYearLabel()}</b>
        </p>
        <Controls />

        <div className="sep"></div>

        <div className="grid3">
          <div className="kpi">
            <div>
              <div className="muted tiny">{t("approved")}</div>
              <b>{fmtPoints(totalPts)}</b>
              <TrendBadge curr={recentPts} prev={olderPts} />
            </div>
            <Pill kind="approved">{t("approved")}</Pill>
          </div>
          <div className="kpi">
            <div><div className="muted tiny">{t("pending")}</div><b>{pending.length}</b></div>
            <Pill kind="pending">{t("pending")}</Pill>
          </div>
          <div className="kpi">
            <div><div className="muted tiny">{t("rejected")}</div><b>{rejected.length}</b></div>
            <Pill kind="rejected">{t("rejected")}</Pill>
          </div>
        </div>

        <div className="sep"></div>

        <div className="grid2">
          <div className="glass card">
            <div className="h2">{t("pointsDynamic")}</div>
            <div className="sep"></div>
            <AreaLineChart values={bySeries} labels={bins.map(x => x.label)} />
          </div>

          <div className="glass card" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div className="h2" style={{ alignSelf: "flex-start" }}>{t("goalProgress")} ({GOAL} {t("pts")})</div>
            <div className="sep" style={{ alignSelf: "stretch" }}></div>
            <GaugeChart value={Math.min(allTimeTotal, GOAL)} max={GOAL} label={`${fmtPoints(allTimeTotal)} / ${GOAL}`} sublabel={t("total")} />
            <p className="help" style={{ marginTop: 8, textAlign: "center" }}>
              {allTimeTotal >= GOAL ? `🎉 ${t("goalReached")}` : `${fmtPoints(GOAL - allTimeTotal)} ${t("ptsRemaining")}`}
            </p>
          </div>

          <div className="glass card">
            <div className="h2">{t("statusSubs")}</div>
            <div className="sep"></div>
            <DonutChart
              segments={[
                { label: "approved", value: approved.length },
                { label: "pending", value: pending.length },
                { label: "rejected", value: rejected.length }
              ]}
              centerLabel={subs.length}
            />
          </div>

          <div className="glass card">
            <div className="h2">{t("byCategories")}</div>
            <div className="sep"></div>
            {topSections.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {topSections.map(([sec, pts]) => {
                  const pct = Math.round((pts / totalForPie) * 100);
                  return (
                    <div key={sec}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                        <span style={{ color: "var(--text)", fontWeight: 600 }}>{sec}</span>
                        <span style={{ color: "var(--accent)", fontWeight: 700 }}>{fmtPoints(pts)} балл ({pct}%)</span>
                      </div>
                      <div style={{ height: 7, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: 4, transition: "width .5s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <p className="p">{t("noData")}</p>}
          </div>
        </div>

        <div className="sep"></div>

        <div className="grid2">
          <div className="glass card">
            <div className="h2">{t("histogram")}</div>
            <div className="sep"></div>
            <HistogramChart data={approved.map(s => Number(s.points) || 0)} />
          </div>

          <div className="glass card">
            <div className="h2">{t("radarTopCat")}</div>
            <div className="sep"></div>
            <RadarChart labels={radar.map(x => x[0])} values={radar.map(x => x[1])} />
            {!radar.length ? <p className="p">{t("noKpiInRange")}</p> : null}
          </div>
        </div>

        <div className="sep"></div>

        <div className="glass card">
          <div className="h2">{t("topTypes")}</div>
          <div className="sep"></div>
          {topType.length ? (
            <div className="stats-toplist">
              {topType.slice(0, 12).map(([name, pts], i) => {
                const max = topType[0][1];
                return (
                  <div key={name} className="stats-toplist__row">
                    <span className="stats-toplist__num muted tiny">{i + 1}</span>
                    <div className="stats-toplist__bar-wrap">
                      <div className="stats-toplist__label tiny">{name}</div>
                      <div className="stats-toplist__bar">
                        <div className="stats-toplist__fill" style={{ width: `${Math.round((pts / max) * 100)}%` }} />
                      </div>
                    </div>
                    <span className="stats-toplist__pts"><b>{fmtPoints(pts)}</b></span>
                  </div>
                );
              })}
            </div>
          ) : <p className="p">{t("noData")}</p>}
        </div>

        <div className="sep"></div>
        <GoalsWidget />
      </div>
    );
  }

  function renderPlatform() {
    const subs = filterByQuarter(st.adminRecentSubs || [], qf).filter(inRange);
    const approved = subs.filter(s => s.status === "approved");
    const pending = subs.filter(s => s.status === "pending");
    const rejected = subs.filter(s => s.status === "rejected");

    const teachers = (st.users || []).filter(x => (x.role || "teacher") !== "admin");

    const totalApprovedPts = sum(approved, s => s.points);
    const bySeries = bins.map(b => seriesPoints(approved, b));

    // Trend
    const recentPts = sum(approved.filter(s => {
      const k = (s.eventDate || "").slice(0, 7);
      return recentBins.has(k);
    }), s => s.points);
    const olderPts = sum(approved.filter(s => {
      const k = (s.eventDate || "").slice(0, 7);
      return olderBins.has(k);
    }), s => s.points);

    const pointsByTeacher = new Map();
    approved.forEach(s => {
      pointsByTeacher.set(s.uid, (pointsByTeacher.get(s.uid) || 0) + (Number(s.points) || 0));
    });
    const topTeachers = Array.from(pointsByTeacher.entries())
      .map(([uid, pts]) => ({ uid, pts, user: teachers.find(t => t.uid === uid) }))
      .sort((a, b) => b.pts - a.pts).slice(0, 10);

    const sectionMap = new Map();
    approved.forEach(s => {
      const key = s.typeSection || s.typeName || "—";
      sectionMap.set(key, (sectionMap.get(key) || 0) + (Number(s.points) || 0));
    });
    const topSections = Array.from(sectionMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 7);

    // Stacked bar: approved/pending/rejected by time bin
    const stackedData = bins.map(b => {
      const bKey = b.key;
      const inBin = subs.filter(s => (s.eventDate || "").slice(0, 7) === bKey);
      return {
        label: b.label,
        segments: [
          { value: sum(inBin.filter(s => s.status === "approved"), s => s.points), color: "rgba(135,188,46,.8)" },
          { value: inBin.filter(s => s.status === "pending").length * 5, color: "rgba(251,191,36,.7)" },
          { value: inBin.filter(s => s.status === "rejected").length * 3, color: "rgba(239,68,68,.6)" }
        ]
      };
    });

    // heatmap (top teachers x bins)
    const hmTeachers = topTeachers.map(x => x.user).filter(Boolean).slice(0, 10);
    const maxCell = Math.max(1, ...hmTeachers.map(t => Math.max(0, ...bins.map(b => {
      return sum(approved.filter(s => s.uid === t.uid && (s.eventDate || "").slice(0, 7) === b.key), s => s.points);
    }))));

    const cellStyle = (v) => {
      if (!v) return { background: "rgba(255,255,255,0.06)" };
      const t = Math.min(1, v / maxCell);
      if (t < 0.34) return { background: "rgba(255, 99, 132, 0.42)" };
      if (t < 0.67) return { background: "rgba(255, 200, 87, 0.48)" };
      return { background: "rgba(135, 188, 46, 0.45)" };
    };

    const hasAny = (st.users || []).length || (st.adminRecentSubs || []).length;

    return (
      <div className="glass card">
        <p className="p">
          {t("overallView")} <b>{t("rangeYear")}</b>.
        </p>
        <Controls />

        <div className="sep"></div>

        {!hasAny ? (
          <p className="p">{t("generalNotLoaded")} <b>{t("refresh")}</b>.</p>
        ) : null}

        <div className="grid2">
          <div className="kpi"><div><div className="muted tiny">{t("teachers")}</div><b>{teachers.length}</b></div><Pill kind="approved">users</Pill></div>
          <div className="kpi"><div><div className="muted tiny">{t("subsInRange")}</div><b>{subs.length}</b></div><Pill kind="pending">range</Pill></div>
          <div className="kpi"><div><div className="muted tiny">{t("pending")}</div><b>{pending.length}</b></div><Pill kind="pending">{t("pending")}</Pill></div>
          <div className="kpi">
            <div>
              <div className="muted tiny">{t("approved")}</div>
              <b>{fmtPoints(totalApprovedPts)}</b>
              <TrendBadge curr={recentPts} prev={olderPts} />
            </div>
            <Pill kind="approved">points</Pill>
          </div>
        </div>

        <div className="sep"></div>

        <div className="grid2">
          <div className="glass card">
            <div className="h2">{t("pointsDynamic")}</div>
            <div className="sep"></div>
            <LineChart values={bySeries} labels={bins.map(x => x.label)} />
          </div>

          <div className="glass card">
            <div className="h2">{t("statusSubs")}</div>
            <div className="sep"></div>
            <DonutChart
              segments={[
                { label: "approved", value: approved.length },
                { label: "pending", value: pending.length },
                { label: "rejected", value: rejected.length }
              ]}
              centerLabel={subs.length}
            />
          </div>

          <div className="glass card">
            <div className="h2">{t("top10Teachers")}</div>
            <div className="sep"></div>
            {topTeachers.length ? (
              <BarChart
                values={topTeachers.map(x => x.pts)}
                labels={topTeachers.map(x => (x.user?.displayName || x.user?.email || "—").slice(0, 10) + "…")}
              />
            ) : <p className="p">{t("noData")}</p>}
          </div>

          <div className="glass card">
            <div className="h2">{t("radarSections")}</div>
            <div className="sep"></div>
            <RadarChart labels={topSections.map(x => x[0])} values={topSections.map(x => x[1])} />
            {!topSections.length ? <p className="p">{t("noData")}</p> : null}
          </div>
        </div>

        <div className="sep"></div>

        <div className="glass card">
          <div className="h2">{t("byPeriods")}: approved / pending / rejected</div>
          <p className="p muted" style={{ fontSize: 12 }}>
            <span style={{ color: "rgba(135,188,46,.9)" }}>▇</span> Мақұлданды балл &nbsp;
            <span style={{ color: "rgba(251,191,36,.9)" }}>▇</span> Күтуде ×5 &nbsp;
            <span style={{ color: "rgba(239,68,68,.9)" }}>▇</span> Қабылданбады ×3
          </p>
          <div className="sep"></div>
          <StackedBarChart data={stackedData} labels={bins.map(x => x.label)} />
        </div>

        <div className="sep"></div>

        <div className="glass card">
          <div className="h2">{t("heatmap")}</div>
          <p className="p">Тек <b>мақұлданған</b> балдар / Только <b>одобренные</b> баллы. Топ-10 по диапазону.</p>
          <div className="sep"></div>

          {!hmTeachers.length
            ? <p className="p">{t("noData")}</p>
            : (
              <div className="heatmap-wrap">
                <div className="heatmap-scroll">
                  <table className="table heatmap-table">
                    <thead>
                      <tr>
                        <th className="heatmap-name-col">{t("teacher")}</th>
                        {bins.map(b => <th key={b.key} className="heatmap-bin-col">{b.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {hmTeachers.map(t => (
                        <tr key={t.uid}>
                          <td className="tiny heatmap-name-col"><b>{(t.displayName || t.email || "—").slice(0, 14)}</b></td>
                          {bins.map(b => {
                            const v = sum(approved.filter(s => s.uid === t.uid && (s.eventDate || "").slice(0, 7) === b.key), s => s.points);
                            return (
                              <td key={b.key} className="tiny" style={{ ...cellStyle(v), textAlign: "center", padding: "6px 4px", fontSize: 11 }} title={`${b.label}: ${v}`}>
                                {v ? fmtPoints(v) : ""}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="help" style={{ marginTop: 8 }}>← {t("scrollH")}</p>
              </div>
            )
          }
        </div>
      </div>
    );
  }

  if (u.role === "teacher") {
    return view === "platform" ? renderPlatform() : renderMine();
  }
  return renderPlatform();
}




