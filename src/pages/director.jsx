import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { t } from "../i18n.js";
import { useStore, navigate, toast } from "../store.js";
import {
  fmtPoints, ymd, sum, lastDays, lastMonths, levelFromPoints, RANK_TABLE,
  filterByQuarter, getQuarterForDate, getAcademicYearLabel
} from "../utils.js";
import {
  Icon, Btn, Input, Select, BarChart, AreaLineChart, DonutChart, Guard
} from "../components.jsx";

const RANGE_OPTIONS = [
  { v: "30d", label: { kz: "30 күн", ru: "30 дней", en: "30 days" } },
  { v: "90d", label: { kz: "90 күн", ru: "90 дней", en: "90 days" } },
  { v: "365d", label: { kz: "Жыл", ru: "Год", en: "Year" } },
  { v: "all", label: { kz: "Барлығы", ru: "Всё время", en: "All time" } },
];

const READING_RE = /(книг|чита|кітап|оқу|book|read)/i;

function rangeStartYMD(mode) {
  if (mode === "all") return "0000-01-01";
  const days = mode === "30d" ? 30 : mode === "90d" ? 90 : 365;
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  return ymd(d);
}

function prevRangeBounds(mode) {
  if (mode === "all") return { start: null, end: null };
  const days = mode === "30d" ? 30 : mode === "90d" ? 90 : 365;
  const endD = new Date();
  endD.setDate(endD.getDate() - days);
  const startD = new Date();
  startD.setDate(startD.getDate() - (days * 2 - 1));
  return { start: ymd(startD), end: ymd(endD) };
}

function saveSheet(wb, name) {
  const stamp = ymd();
  XLSX.writeFile(wb, `${name}_${stamp}.xlsx`);
}

function sheetFromRows(headers, rows) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const colWidths = headers.map((h, i) => {
    let max = String(h ?? "").length;
    for (const r of rows) {
      const v = r[i];
      const s = v == null ? "" : String(v);
      if (s.length > max) max = s.length;
    }
    return { wch: Math.min(48, Math.max(10, max + 2)) };
  });
  ws["!cols"] = colWidths;
  return ws;
}

function subMatchText(s) {
  return `${s.typeName || ""} ${s.title || ""} ${s.description || ""}`.toLowerCase();
}

export function PageAdminDirector() {
  const st = useStore();
  const u = st.userDoc;

  const [range, setRange] = useState("365d");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("score");
  const [sortDir, setSortDir] = useState("desc");
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      if (typeof window.__kpiHydrate === "function") {
        await window.__kpiHydrate();
        setLastRefresh(Date.now());
        toast(t("dirRefreshed") || "Обновлено", "ok");
      }
    } catch (e) {
      toast(e?.message || t("error") || "Ошибка", "error");
    } finally {
      setRefreshing(false);
    }
  };

  if (!u) return <Guard />;
  if (u.role !== "admin") return <Guard />;

  const users = (st.users || []).filter(x => (x.role || "teacher") !== "admin");
  const subs = st.adminRecentSubs || [];
  const requests = st.adminRecentRequests || [];
  const types = st.types || [];

  const startYmd = rangeStartYMD(range);
  const inRange = (s) => (s.eventDate || "") >= startYmd;

  const subsRange = subs.filter(inRange);
  const approvedRange = subsRange.filter(s => s.status === "approved");
  const pendingRange = subsRange.filter(s => s.status === "pending");
  const rejectedRange = subsRange.filter(s => s.status === "rejected");

  const prev = prevRangeBounds(range);
  const subsPrev = prev.start
    ? subs.filter(s => {
      const d = s.eventDate || "";
      return d >= prev.start && d < prev.end;
    })
    : [];
  const approvedPrev = subsPrev.filter(s => s.status === "approved");

  const totalApprovedPts = sum(approvedRange, s => s.points);
  const totalAllPts = sum(users, x => x.totalPoints);
  const approvalRate = subsRange.length
    ? Math.round((approvedRange.length / subsRange.length) * 100)
    : 0;

  const usersMap = useMemo(() => new Map(users.map(x => [x.uid, x])), [users]);

  /* ───── per-teacher aggregations ───── */
  const teacherRows = useMemo(() => {
    const rows = users.map(x => {
      const mine = subsRange.filter(s => s.uid === x.uid);
      const approved = mine.filter(s => s.status === "approved");
      const pending = mine.filter(s => s.status === "pending");
      const rejected = mine.filter(s => s.status === "rejected");
      const pts = sum(approved, s => s.points);

      const readingPts = sum(approved.filter(s => READING_RE.test(subMatchText(s))), s => s.points);

      const monthSet = new Set(
        approved.map(s => (s.eventDate || "").slice(0, 7)).filter(k => k.length === 7)
      );
      const typeSet = new Set(
        approved.map(s => s.typeName || s.typeId || "").filter(Boolean)
      );

      const prevPts = sum(approvedPrev.filter(s => s.uid === x.uid), s => s.points);
      const growth = prevPts > 0
        ? Math.round(((pts - prevPts) / prevPts) * 100)
        : (pts > 0 ? 100 : 0);

      const lvl = levelFromPoints(x.totalPoints || 0);

      return {
        uid: x.uid,
        name: x.displayName || x.email || "—",
        email: x.email || "",
        position: x.position || "",
        subject: x.subject || "",
        school: x.school || "",
        phone: x.phone || "",
        total: Number(x.totalPoints) || 0,
        periodPts: pts,
        approved: approved.length,
        pending: pending.length,
        rejected: rejected.length,
        all: mine.length,
        rate: mine.length ? Math.round((approved.length / mine.length) * 100) : 0,
        compDays: Number(x.compDays) || 0,
        level: lvl.name,
        readingPts,
        months: monthSet.size,
        typeKinds: typeSet.size,
        prevPts,
        growth,
        score: 0,
      };
    });

    // Composite "Teacher of the Year" score (0–100)
    const maxTotal = Math.max(1, ...rows.map(r => r.total));
    const maxApproved = Math.max(1, ...rows.map(r => r.approved));
    const maxMonths = Math.max(1, ...rows.map(r => r.months));
    const maxKinds = Math.max(1, ...rows.map(r => r.typeKinds));
    rows.forEach(r => {
      const a = (r.total / maxTotal) * 50;
      const b = (r.rate / 100) * 15;
      const c = (r.approved / maxApproved) * 20;
      const d = (r.months / maxMonths) * 8;
      const e = (r.typeKinds / maxKinds) * 7;
      r.score = Math.round((a + b + c + d + e) * 10) / 10;
    });

    const q = search.trim().toLowerCase();
    const filtered = q
      ? rows.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.position.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q) ||
        r.school.toLowerCase().includes(q))
      : rows;
    const dir = sortDir === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      const A = a[sortKey], B = b[sortKey];
      if (typeof A === "number" && typeof B === "number") return (A - B) * dir;
      return String(A ?? "").localeCompare(String(B ?? "")) * dir;
    });
    return sorted;
  }, [users, subsRange, approvedPrev, search, sortKey, sortDir]);

  const topTeachers = useMemo(
    () => [...teacherRows].sort((a, b) => b.total - a.total).slice(0, 10),
    [teacherRows]
  );

  /* ───── Activity segmentation ───── */
  const activityBuckets = useMemo(() => {
    const superActive = teacherRows.filter(r => r.approved >= 5);
    const active = teacherRows.filter(r => r.approved >= 2 && r.approved < 5);
    const passive = teacherRows.filter(r => r.approved === 1);
    const inactive = teacherRows.filter(r => r.approved === 0);
    return { superActive, active, passive, inactive };
  }, [teacherRows]);

  /* ───── Awards ───── */
  const awards = useMemo(() => {
    if (!teacherRows.length) return null;

    const teacherOfYear = [...teacherRows].sort((a, b) => b.score - a.score)[0];

    const mostActive = [...teacherRows]
      .sort((a, b) => b.approved - a.approved || b.periodPts - a.periodPts)[0];

    const efficientPool = teacherRows.filter(r => r.all >= 3);
    const mostEfficient = efficientPool.length
      ? [...efficientPool].sort((a, b) => b.rate - a.rate || b.approved - a.approved)[0]
      : null;

    const risingPool = teacherRows.filter(r => r.periodPts > 0);
    const risingStar = risingPool.length
      ? [...risingPool].sort((a, b) => b.growth - a.growth || b.periodPts - a.periodPts)[0]
      : null;

    const readingPool = teacherRows.filter(r => r.readingPts > 0);
    const readingLeader = readingPool.length
      ? [...readingPool].sort((a, b) => b.readingPts - a.readingPts)[0]
      : null;

    const consistentPool = teacherRows.filter(r => r.months >= 2);
    const mostConsistent = consistentPool.length
      ? [...consistentPool].sort((a, b) => b.months - a.months || b.periodPts - a.periodPts)[0]
      : null;

    const diversePool = teacherRows.filter(r => r.typeKinds >= 2);
    const mostDiverse = diversePool.length
      ? [...diversePool].sort((a, b) => b.typeKinds - a.typeKinds || b.periodPts - a.periodPts)[0]
      : null;

    return { teacherOfYear, mostActive, mostEfficient, risingStar, readingLeader, mostConsistent, mostDiverse };
  }, [teacherRows]);

  /* ───── Category leaders (per KPI type) ───── */
  const categoryLeaders = useMemo(() => {
    const byType = new Map();
    approvedRange.forEach(s => {
      const key = s.typeName || "—";
      if (!byType.has(key)) byType.set(key, new Map());
      const m = byType.get(key);
      m.set(s.uid, (m.get(s.uid) || 0) + (Number(s.points) || 0));
    });
    const rows = [];
    for (const [typeName, m] of byType) {
      const totalPts = [...m.values()].reduce((a, b) => a + b, 0);
      let winnerUid = null, winnerPts = 0;
      for (const [uid, pts] of m) {
        if (pts > winnerPts) { winnerPts = pts; winnerUid = uid; }
      }
      const user = usersMap.get(winnerUid);
      rows.push({
        typeName,
        totalPts,
        winnerName: user?.displayName || user?.email || "—",
        winnerUid,
        winnerPts,
        teacherCount: m.size,
      });
    }
    rows.sort((a, b) => b.totalPts - a.totalPts);
    return rows.slice(0, 10);
  }, [approvedRange, usersMap]);

  /* ───── Charts ───── */
  const trend = useMemo(() => {
    const months = lastMonths(12);
    const byMonth = new Map(months.map(m => [m.key, 0]));
    approvedRange.forEach(s => {
      const d = s.eventDate || "";
      if (d.length < 7) return;
      const k = d.slice(0, 7);
      if (byMonth.has(k)) byMonth.set(k, byMonth.get(k) + 1);
    });
    return {
      values: months.map(m => byMonth.get(m.key) || 0),
      labels: months.map(m => m.label),
    };
  }, [approvedRange]);

  const typeDistribution = useMemo(() => {
    const m = new Map();
    approvedRange.forEach(s => {
      const key = s.typeName || "—";
      m.set(key, (m.get(key) || 0) + 1);
    });
    const arr = [...m.entries()].map(([label, value]) => ({ label, value }));
    arr.sort((a, b) => b.value - a.value);
    const top = arr.slice(0, 6);
    const rest = arr.slice(6).reduce((a, x) => a + x.value, 0);
    if (rest > 0) top.push({ label: t("other") || "Прочее", value: rest });
    return top;
  }, [approvedRange]);

  const bySubject = useMemo(() => {
    const m = new Map();
    users.forEach(x => {
      const s = x.subject || "—";
      m.set(s, (m.get(s) || 0) + (Number(x.totalPoints) || 0));
    });
    const arr = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    return { labels: arr.map(x => x[0]), values: arr.map(x => x[1]) };
  }, [users]);

  const byPosition = useMemo(() => {
    const m = new Map();
    users.forEach(x => {
      const p = x.position || "—";
      m.set(p, (m.get(p) || 0) + 1);
    });
    const arr = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    return { labels: arr.map(x => x[0]), values: arr.map(x => x[1]) };
  }, [users]);

  /* ───── Distribution by level ───── */
  const levelBuckets = useMemo(() => {
    const buckets = RANK_TABLE.map(r => ({
      key: r.key,
      name: t(r.key),
      icon: r.icon,
      color: r.color,
      min: r.min,
      max: r.max,
      teachers: [],
    }));
    users.forEach(x => {
      const pts = Number(x.totalPoints) || 0;
      let idx = 0;
      for (let i = RANK_TABLE.length - 1; i >= 0; i--) {
        if (pts >= RANK_TABLE[i].min) { idx = i; break; }
      }
      buckets[idx].teachers.push({
        uid: x.uid,
        name: x.displayName || x.email || "—",
        position: x.position || x.subject || "",
        pts,
      });
    });
    buckets.forEach(b => b.teachers.sort((a, b2) => b2.pts - a.pts));
    return buckets;
  }, [users]);

  const activityDonut = useMemo(() => {
    const segs = [
      { label: t("statusSuperActive"), value: activityBuckets.superActive.length },
      { label: t("statusActive"), value: activityBuckets.active.length },
      { label: t("statusPassive"), value: activityBuckets.passive.length },
      { label: t("statusInactive"), value: activityBuckets.inactive.length },
    ].filter(x => x.value > 0);
    return segs;
  }, [activityBuckets]);

  const changeSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  /* ───── exports ───── */
  const exportTeachers = () => {
    const headers = [
      "#", t("teacher"), "Email", t("position"), t("subject"), t("school"),
      t("totalPoints"), t("dirPeriodPts"), t("approved"), t("pending"),
      t("rejected"), t("dirAll"), t("dirApprovalPct"), t("compDays"), t("level"),
      t("dirScore"), t("dirReadingPts"), t("dirMonthsActive"), t("dirTypeKinds"), t("dirGrowthPct")
    ];
    const ranked = [...teacherRows].sort((a, b) => b.total - a.total);
    const rows = ranked.map((r, i) => [
      i + 1, r.name, r.email, r.position, r.subject, r.school,
      r.total, r.periodPts, r.approved, r.pending, r.rejected, r.all,
      r.rate, r.compDays, r.level,
      r.score, r.readingPts, r.months, r.typeKinds, r.growth
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheetFromRows(headers, rows), t("navRating"));
    saveSheet(wb, "teachers_rating");
  };

  const exportSubmissions = () => {
    const headers = [
      t("date"), t("teacher"), "Email", t("type"), t("title"),
      t("points"), t("status"), t("quarter"), t("dirDescription"), t("dirEvidence")
    ];
    const rows = subsRange.map(s => {
      const tu = usersMap.get(s.uid);
      const q = getQuarterForDate(s.eventDate);
      return [
        s.eventDate || "—",
        tu?.displayName || tu?.email || s.uid,
        tu?.email || "",
        s.typeName || "—",
        s.title || "—",
        Number(s.points) || 0,
        s.status || "—",
        q ? t(q) : "—",
        s.description || "",
        s.evidenceLink || s.evidenceFileUrl || ""
      ];
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheetFromRows(headers, rows), t("profTabSubs"));
    saveSheet(wb, "submissions");
  };

  const exportRequests = () => {
    const headers = [
      t("date"), t("teacher"), "Email", t("dirRequestKind"),
      t("status"), t("points"), t("dirComment")
    ];
    const rows = requests.map(r => {
      const tu = usersMap.get(r.uid);
      const d = r.createdAt?.seconds
        ? ymd(new Date(r.createdAt.seconds * 1000))
        : (r.dateFrom || "—");
      return [
        d,
        tu?.displayName || tu?.email || r.uid,
        tu?.email || "",
        r.kind || "—",
        r.status || "—",
        Number(r.pointsDelta) || 0,
        r.comment || r.reason || ""
      ];
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheetFromRows(headers, rows), t("navRequests"));
    saveSheet(wb, "requests");
  };

  const exportInactive = () => {
    const headers = [t("teacher"), "Email", t("position"), t("subject"), t("school"), t("totalPoints"), t("level")];
    const rows = activityBuckets.inactive.map(r => [
      r.name, r.email, r.position, r.subject, r.school, r.total, r.level
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheetFromRows(headers, rows), t("dirInactiveTitle"));
    saveSheet(wb, "inactive_teachers");
  };

  const exportAwards = () => {
    if (!awards) return;
    const A = awards;
    const row = (lbl, w, metric) => [lbl, w?.name || "—", w?.email || "", metric];
    const rows = [
      row(t("awardTeacherOfYear"), A.teacherOfYear, A.teacherOfYear ? `${A.teacherOfYear.score} ${t("dirScore")}` : ""),
      row(t("awardMostActive"), A.mostActive, A.mostActive ? `${A.mostActive.approved} ${t("approved")}` : ""),
      row(t("awardMostEfficient"), A.mostEfficient, A.mostEfficient ? `${A.mostEfficient.rate}% · ${A.mostEfficient.all}` : ""),
      row(t("awardRisingStar"), A.risingStar, A.risingStar ? `+${A.risingStar.growth}%` : ""),
      row(t("awardReadingLeader"), A.readingLeader, A.readingLeader ? `${fmtPoints(A.readingLeader.readingPts)} ${t("points")}` : ""),
      row(t("awardMostConsistent"), A.mostConsistent, A.mostConsistent ? `${A.mostConsistent.months} ${t("dirMonthsActive")}` : ""),
      row(t("awardMostDiverse"), A.mostDiverse, A.mostDiverse ? `${A.mostDiverse.typeKinds} ${t("dirTypeKinds")}` : ""),
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      sheetFromRows([t("dirAward"), t("dirWinner"), "Email", t("dirMetricValue")], rows),
      t("dirAwardsTitle")
    );
    saveSheet(wb, "awards");
  };

  const exportCategories = () => {
    const headers = [t("type"), t("dirWinner"), "Email", t("dirCategoryTotalPts"), t("dirPeriodPts"), t("dirCategoryTeacherCount")];
    const rows = categoryLeaders.map(c => {
      const winner = usersMap.get(c.winnerUid);
      return [
        c.typeName,
        winner?.displayName || winner?.email || "—",
        winner?.email || "",
        c.totalPts,
        c.winnerPts,
        c.teacherCount
      ];
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheetFromRows(headers, rows), t("dirCategoryLeadersTitle"));
    saveSheet(wb, "category_leaders");
  };

  const exportFullReport = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: overview
    const overviewRows = [
      [t("dirTotalTeachers"), users.length],
      [t("totalPoints"), totalAllPts],
      [t("dirApprovedPts"), totalApprovedPts],
      [t("approved"), approvedRange.length],
      [t("pending"), pendingRange.length],
      [t("rejected"), rejectedRange.length],
      [t("dirApprovalPct"), approvalRate],
      [t("statusSuperActive"), activityBuckets.superActive.length],
      [t("statusActive"), activityBuckets.active.length],
      [t("statusPassive"), activityBuckets.passive.length],
      [t("statusInactive"), activityBuckets.inactive.length],
      [t("dirAcademicYear"), getAcademicYearLabel()],
      [t("dirGeneratedAt"), new Date().toLocaleString()],
    ];
    XLSX.utils.book_append_sheet(wb,
      sheetFromRows([t("dirMetric"), t("dirValue")], overviewRows),
      t("dirOverview"));

    // Sheet 2: awards
    if (awards) {
      const A = awards;
      const awRows = [
        [t("awardTeacherOfYear"), A.teacherOfYear?.name || "—", A.teacherOfYear?.email || "", A.teacherOfYear ? `${A.teacherOfYear.score}` : ""],
        [t("awardMostActive"), A.mostActive?.name || "—", A.mostActive?.email || "", A.mostActive?.approved || 0],
        [t("awardMostEfficient"), A.mostEfficient?.name || "—", A.mostEfficient?.email || "", A.mostEfficient ? `${A.mostEfficient.rate}%` : ""],
        [t("awardRisingStar"), A.risingStar?.name || "—", A.risingStar?.email || "", A.risingStar ? `+${A.risingStar.growth}%` : ""],
        [t("awardReadingLeader"), A.readingLeader?.name || "—", A.readingLeader?.email || "", A.readingLeader?.readingPts || 0],
        [t("awardMostConsistent"), A.mostConsistent?.name || "—", A.mostConsistent?.email || "", A.mostConsistent?.months || 0],
        [t("awardMostDiverse"), A.mostDiverse?.name || "—", A.mostDiverse?.email || "", A.mostDiverse?.typeKinds || 0],
      ];
      XLSX.utils.book_append_sheet(wb,
        sheetFromRows([t("dirAward"), t("dirWinner"), "Email", t("dirMetricValue")], awRows),
        t("dirAwardsTitle"));
    }

    // Sheet 3: teachers
    const tHeaders = [
      "#", t("teacher"), "Email", t("position"), t("subject"), t("school"),
      t("totalPoints"), t("dirPeriodPts"), t("approved"), t("pending"),
      t("rejected"), t("dirAll"), t("dirApprovalPct"), t("compDays"), t("level"),
      t("dirScore"), t("dirReadingPts"), t("dirMonthsActive"), t("dirTypeKinds"), t("dirGrowthPct")
    ];
    const ranked = [...teacherRows].sort((a, b) => b.total - a.total);
    const tRows = ranked.map((r, i) => [
      i + 1, r.name, r.email, r.position, r.subject, r.school,
      r.total, r.periodPts, r.approved, r.pending, r.rejected, r.all,
      r.rate, r.compDays, r.level,
      r.score, r.readingPts, r.months, r.typeKinds, r.growth
    ]);
    XLSX.utils.book_append_sheet(wb, sheetFromRows(tHeaders, tRows), t("navRating"));

    // Sheet 4: category leaders
    const catHeaders = [t("type"), t("dirWinner"), "Email", t("dirCategoryTotalPts"), t("dirPeriodPts"), t("dirCategoryTeacherCount")];
    const catRows = categoryLeaders.map(c => {
      const w = usersMap.get(c.winnerUid);
      return [c.typeName, w?.displayName || w?.email || "—", w?.email || "", c.totalPts, c.winnerPts, c.teacherCount];
    });
    XLSX.utils.book_append_sheet(wb, sheetFromRows(catHeaders, catRows), t("dirCategoryLeadersTitle"));

    // Sheet 5: inactive
    const inactRows = activityBuckets.inactive.map(r => [r.name, r.email, r.position, r.subject, r.school, r.total, r.level]);
    XLSX.utils.book_append_sheet(wb,
      sheetFromRows([t("teacher"), "Email", t("position"), t("subject"), t("school"), t("totalPoints"), t("level")], inactRows),
      t("dirInactiveTitle"));

    // Sheet 6: submissions
    const sHeaders = [
      t("date"), t("teacher"), "Email", t("type"), t("title"),
      t("points"), t("status"), t("quarter")
    ];
    const sRows = subsRange.map(s => {
      const tu = usersMap.get(s.uid);
      const q = getQuarterForDate(s.eventDate);
      return [
        s.eventDate || "—",
        tu?.displayName || tu?.email || s.uid,
        tu?.email || "",
        s.typeName || "—",
        s.title || "—",
        Number(s.points) || 0,
        s.status || "—",
        q ? t(q) : "—"
      ];
    });
    XLSX.utils.book_append_sheet(wb, sheetFromRows(sHeaders, sRows), t("profTabSubs"));

    // Sheet 7: KPI types
    const typesRows = types.map(tp => [
      tp.name || "—",
      Number(tp.defaultPoints) || 0,
      tp.isActive !== false ? t("eventActive") : "—"
    ]);
    XLSX.utils.book_append_sheet(wb,
      sheetFromRows([t("type"), t("dirDefaultPts"), t("status")], typesRows),
      t("navKpiTypes"));

    saveSheet(wb, "director_full_report");
  };

  /* ───── UI helpers ───── */
  const metric = (n, lbl, hint, icon, kind) => (
    <div className="glass card prof-stat">
      <div className={`prof-stat__icon prof-stat__icon--${kind}`}><Icon name={icon} /></div>
      <div className="prof-stat__num">{n}</div>
      <div className="prof-stat__label">{lbl}</div>
      {hint && <div className="prof-stat__hint">{hint}</div>}
    </div>
  );

  const SortHead = ({ k, children }) => (
    <th onClick={() => changeSort(k)} style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", padding: "8px 10px" }}>
      {children}{sortKey === k ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
    </th>
  );

  const AwardCard = ({ icon, tone, title, hint, winner, metricText, onClick }) => {
    const clickable = !!(winner && onClick);
    return (
      <div
        onClick={clickable ? onClick : undefined}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        className={`dir-award dir-award--${tone || "blue"}${clickable ? " dir-award--clickable" : ""}`}
      >
        <div className="dir-award__head">
          <div className="dir-award__icon">
            <Icon name={icon} />
          </div>
          <div className="dir-award__title">{title}</div>
        </div>
        <div className="dir-award__hint">{hint}</div>
        {winner ? (
          <>
            <div className="dir-award__name">{winner.name}</div>
            <div className="dir-award__sub">{winner.position || winner.subject || "—"}</div>
            <div className="dir-award__foot">
              <div className="dir-award__metric">{metricText}</div>
              <Icon name="eye" />
            </div>
          </>
        ) : (
          <div className="p muted" style={{ marginTop: "auto", fontSize: 12 }}>{t("awardEmpty")}</div>
        )}
      </div>
    );
  };

  const HBarList = ({ labels, values, valueFmt, accent = "#38bdf8" }) => {
    const max = Math.max(1, ...values.map(v => Number(v) || 0));
    if (!values.length) return <p className="p muted">{t("noChartData")}</p>;
    return (
      <div className="dir-hbar-list">
        {values.map((v, i) => {
          const pct = Math.max(2, Math.round(((Number(v) || 0) / max) * 100));
          return (
            <div key={i} className="dir-hbar-row" title={`${labels[i]}: ${v}`}>
              <div className="dir-hbar-label">{labels[i] || "—"}</div>
              <div className="dir-hbar-track">
                <div
                  className="dir-hbar-fill"
                  style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accent}, ${accent}aa)` }}
                />
              </div>
              <div className="dir-hbar-value">{valueFmt ? valueFmt(v) : v}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const ActivityPill = ({ title, count, tone, list }) => (
    <div className={`glass dir-pill dir-pill--${tone}`}>
      <div className="dir-pill__head">
        <div className="dir-pill__title">{title}</div>
        <div className="dir-pill__count">{count}</div>
      </div>
      <div className="dir-pill__list">
        {list.length
          ? list.slice(0, 5).map(r => r.name).join(", ") + (list.length > 5 ? `, +${list.length - 5}` : "")
          : "—"}
      </div>
    </div>
  );

  const goTeacher = (uid) => navigate("admin/teacher", { uid });

  const refreshTime = new Date(lastRefresh).toLocaleTimeString();

  return (
    <div className="pg dir-page">
      {/* Hero */}
      <div className="glass card">
        <div className="dir-hero">
          <div style={{ minWidth: 0 }}>
            <div className="h2" style={{ marginBottom: 4 }}>
              <Icon name="chart" /> {t("dirTitle")}
            </div>
            <div className="tiny muted">
              {t("dirSubtitle")} · {getAcademicYearLabel()} · {t("dirUpdatedAt") || "Обновлено"}: {refreshTime}
            </div>
          </div>
          <div className="dir-section-actions">
            <Select value={range} onChange={(e) => setRange(e.target.value)}>
              {RANGE_OPTIONS.map(r => (
                <option key={r.v} value={r.v}>{r.label.ru}</option>
              ))}
            </Select>
            <Btn
              onClick={handleRefresh}
              disabled={refreshing}
              title={t("dirRefresh") || "Обновить"}
            >
              <span className={`dir-refresh-ico${refreshing ? " dir-refresh-ico--busy" : ""}`}>
                <Icon name="tools" />
              </span>
              {" "}{refreshing ? (t("dirRefreshing") || "Обновляем…") : (t("dirRefresh") || "Обновить")}
            </Btn>
            <Btn kind="primary" onClick={exportFullReport}>
              <Icon name="file" /> {t("dirExportFull")}
            </Btn>
          </div>
        </div>
      </div>

      {/* Awards */}
      <div className="glass card">
        <div className="dir-section-head">
          <div className="dir-section-titles">
            <div className="h3"><Icon name="rank" /> {t("dirAwardsTitle")}</div>
            <div className="tiny muted">{t("dirAwardsHint")}</div>
          </div>
          <div className="dir-section-actions">
            <Btn onClick={exportAwards}><Icon name="file" /> {t("dirExportAwards")}</Btn>
          </div>
        </div>
        <div className="sep"></div>
        {awards ? (
          <div className="dir-grid-awards">
            <AwardCard
              icon="rank" tone="gold"
              title={t("awardTeacherOfYear")} hint={t("awardTeacherOfYearHint")}
              winner={awards.teacherOfYear}
              metricText={awards.teacherOfYear ? `${awards.teacherOfYear.score} / 100` : ""}
              onClick={() => goTeacher(awards.teacherOfYear.uid)}
            />
            <AwardCard
              icon="trending-up" tone="blue"
              title={t("awardMostActive")} hint={t("awardMostActiveHint")}
              winner={awards.mostActive}
              metricText={awards.mostActive ? `${awards.mostActive.approved} ${t("approved")}` : ""}
              onClick={() => awards.mostActive && goTeacher(awards.mostActive.uid)}
            />
            <AwardCard
              icon="shield" tone="green"
              title={t("awardMostEfficient")} hint={t("awardMostEfficientHint")}
              winner={awards.mostEfficient}
              metricText={awards.mostEfficient ? `${awards.mostEfficient.rate}%` : ""}
              onClick={() => awards.mostEfficient && goTeacher(awards.mostEfficient.uid)}
            />
            <AwardCard
              icon="trending-up" tone="pink"
              title={t("awardRisingStar")} hint={t("awardRisingStarHint")}
              winner={awards.risingStar}
              metricText={awards.risingStar ? `+${awards.risingStar.growth}%` : ""}
              onClick={() => awards.risingStar && goTeacher(awards.risingStar.uid)}
            />
            <AwardCard
              icon="file" tone="amber"
              title={t("awardReadingLeader")} hint={t("awardReadingLeaderHint")}
              winner={awards.readingLeader}
              metricText={awards.readingLeader ? `${fmtPoints(awards.readingLeader.readingPts)} ${t("points")}` : ""}
              onClick={() => awards.readingLeader && goTeacher(awards.readingLeader.uid)}
            />
            <AwardCard
              icon="calendar" tone="cyan"
              title={t("awardMostConsistent")} hint={t("awardMostConsistentHint")}
              winner={awards.mostConsistent}
              metricText={awards.mostConsistent ? `${awards.mostConsistent.months} ${t("dirMonthsActive")}` : ""}
              onClick={() => awards.mostConsistent && goTeacher(awards.mostConsistent.uid)}
            />
            <AwardCard
              icon="tools" tone="purple"
              title={t("awardMostDiverse")} hint={t("awardMostDiverseHint")}
              winner={awards.mostDiverse}
              metricText={awards.mostDiverse ? `${awards.mostDiverse.typeKinds} ${t("dirTypeKinds")}` : ""}
              onClick={() => awards.mostDiverse && goTeacher(awards.mostDiverse.uid)}
            />
          </div>
        ) : <p className="p muted">{t("awardEmpty")}</p>}
      </div>

      {/* Metrics */}
      <div className="prof-stats dir-grid-metrics">
        {metric(users.length, t("dirTotalTeachers"), t("dirActiveUsers"), "user", "blue")}
        {metric(fmtPoints(totalAllPts), t("totalPoints"), t("dirAllPoints"), "rank", "amber")}
        {metric(approvedRange.length, t("approved"), `${fmtPoints(totalApprovedPts)} ${t("points")}`, "check", "green")}
        {metric(pendingRange.length, t("pending"), t("dirAwaiting"), "clock", "amber")}
        {metric(rejectedRange.length, t("rejected"), t("dirRejected"), "x", "amber")}
        {metric(`${approvalRate}%`, t("dirApprovalPct"), t("dirApprovalHint"), "shield", "purple")}
      </div>

      {/* Activity segmentation */}
      <div className="glass card">
        <div className="dir-section-head">
          <div className="dir-section-titles">
            <div className="h3"><Icon name="user" /> {t("dirActivityTitle")}</div>
            <div className="tiny muted">{t("dirActivityHint")}</div>
          </div>
        </div>
        <div className="sep"></div>
        <div className="dir-grid-activity">
          <ActivityPill title={t("statusSuperActive")} count={activityBuckets.superActive.length} tone="green" list={activityBuckets.superActive} />
          <ActivityPill title={t("statusActive")}      count={activityBuckets.active.length}      tone="blue"  list={activityBuckets.active} />
          <ActivityPill title={t("statusPassive")}     count={activityBuckets.passive.length}     tone="amber" list={activityBuckets.passive} />
          <ActivityPill title={t("statusInactive")}    count={activityBuckets.inactive.length}    tone="red"   list={activityBuckets.inactive} />
        </div>
      </div>

      {/* Charts row */}
      <div className="dir-grid-charts">
        <div className="glass card">
          <div className="h3"><Icon name="chart" /> {t("dirSubmissionsTrend")}</div>
          <div className="sep"></div>
          <AreaLineChart values={trend.values} labels={trend.labels} />
        </div>
        <div className="glass card">
          <div className="h3"><Icon name="file" /> {t("dirTypesDistribution")}</div>
          <div className="sep"></div>
          {typeDistribution.length > 0
            ? <DonutChart segments={typeDistribution} centerLabel={approvedRange.length} />
            : <p className="p muted">{t("noChartData")}</p>}
        </div>
      </div>

      <div className="dir-grid-charts">
        <div className="glass card">
          <div className="h3"><Icon name="rank" /> {t("dirPointsBySubject")}</div>
          <div className="sep"></div>
          <HBarList
            labels={bySubject.labels}
            values={bySubject.values}
            valueFmt={(v) => `${fmtPoints(v)} ${t("points")}`}
            accent="#38bdf8"
          />
        </div>
        <div className="glass card">
          <div className="h3"><Icon name="user" /> {t("dirByPosition")}</div>
          <div className="sep"></div>
          <HBarList
            labels={byPosition.labels}
            values={byPosition.values}
            valueFmt={(v) => `${v} ${t("dirTotalTeachers").toLowerCase()}`}
            accent="#a855f7"
          />
        </div>
      </div>

      {/* Distribution by level */}
      <div className="glass card">
        <div className="dir-section-head">
          <div className="dir-section-titles">
            <div className="h3"><Icon name="rank" /> {t("dirByLevel")}</div>
            <div className="tiny muted">{t("dirByLevelHint")}</div>
          </div>
        </div>
        <div className="sep"></div>
        <div className="dir-level-grid">
          {levelBuckets.map(b => {
            const pct = users.length ? Math.round((b.teachers.length / users.length) * 100) : 0;
            return (
              <div key={b.key} className="dir-level-card" style={{ borderColor: `${b.color}55` }}>
                <div className="dir-level-head">
                  <div className="dir-level-icon" style={{ background: `${b.color}22`, color: b.color }}>
                    <span className="dir-level-emoji">{b.icon}</span>
                  </div>
                  <div className="dir-level-titles">
                    <div className="dir-level-name" style={{ color: b.color }}>{b.name}</div>
                    <div className="dir-level-range tiny muted">{b.min}–{b.max} {t("points")}</div>
                  </div>
                  <div className="dir-level-count" style={{ color: b.color }}>{b.teachers.length}</div>
                </div>
                <div className="dir-level-bar">
                  <div
                    className="dir-level-bar-fill"
                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${b.color}, ${b.color}aa)` }}
                  />
                </div>
                <div className="dir-level-pct tiny muted">{pct}% {t("dirOfTotal")}</div>
                {b.teachers.length > 0 ? (
                  <div className="dir-level-chips">
                    {b.teachers.slice(0, 5).map(p => (
                      <div
                        key={p.uid}
                        className="dir-level-chip"
                        onClick={() => goTeacher(p.uid)}
                        role="button" tabIndex={0}
                        title={`${p.name} · ${fmtPoints(p.pts)}`}
                      >
                        <div className="dir-level-chip__name">{p.name}</div>
                        <div className="dir-level-chip__pts">{fmtPoints(p.pts)}</div>
                      </div>
                    ))}
                    {b.teachers.length > 5 && (
                      <div className="dir-level-more tiny muted">+{b.teachers.length - 5}</div>
                    )}
                  </div>
                ) : (
                  <div className="tiny muted" style={{ marginTop: 6 }}>—</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Category leaders */}
      <div className="glass card">
        <div className="dir-section-head">
          <div className="dir-section-titles">
            <div className="h3"><Icon name="rank" /> {t("dirCategoryLeadersTitle")}</div>
            <div className="tiny muted">{t("dirCategoryLeadersHint")}</div>
          </div>
          <div className="dir-section-actions">
            <Btn onClick={exportCategories}><Icon name="file" /> {t("dirExportCategories")}</Btn>
          </div>
        </div>
        <div className="sep"></div>
        {categoryLeaders.length ? (
          <div className="dir-grid-cats">
            {categoryLeaders.map((c) => {
              const pct = c.totalPts ? Math.round((c.winnerPts / c.totalPts) * 100) : 0;
              return (
                <div key={c.typeName}
                  className={`glass dir-cat${c.winnerUid ? " dir-cat--clickable" : ""}`}
                  onClick={() => c.winnerUid && goTeacher(c.winnerUid)}>
                  <div className="dir-cat__row">
                    <div className="dir-cat__name">{c.typeName}</div>
                    <div className="dir-cat__meta">{c.teacherCount} · {fmtPoints(c.totalPts)}</div>
                  </div>
                  <div className="dir-cat__row">
                    <div className="dir-cat__winner">{c.winnerName}</div>
                    <div className="dir-cat__pts">{fmtPoints(c.winnerPts)} ({pct}%)</div>
                  </div>
                  <div className="dir-cat__bar">
                    <div className="dir-cat__bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : <p className="p muted">{t("noData") || "—"}</p>}
      </div>

      {/* Inactive teachers alert */}
      {activityBuckets.inactive.length > 0 && (
        <div className="glass card" style={{ border: "1px solid rgba(239,68,68,.35)" }}>
          <div className="dir-section-head">
            <div className="dir-section-titles">
              <div className="h3 dir-inactive-title"><Icon name="bell" /> {t("dirInactiveTitle")} · {activityBuckets.inactive.length}</div>
              <div className="tiny muted">{t("dirInactiveHint")}</div>
            </div>
            <div className="dir-section-actions">
              <Btn onClick={exportInactive}><Icon name="file" /> {t("dirExportInactive")}</Btn>
            </div>
          </div>
          <div className="sep"></div>
          <div className="dir-grid-inactive">
            {activityBuckets.inactive.slice(0, 24).map(r => (
              <div key={r.uid}
                onClick={() => goTeacher(r.uid)}
                role="button" tabIndex={0}
                className="dir-inactive-chip">
                <div className="dir-inactive-chip__body">
                  <div className="dir-inactive-chip__name">{r.name}</div>
                  <div className="dir-inactive-chip__sub">{r.position || r.subject || "—"}</div>
                </div>
                <div className="dir-inactive-chip__pts">{fmtPoints(r.total)}</div>
              </div>
            ))}
            {activityBuckets.inactive.length > 24 && (
              <div className="tiny muted" style={{ alignSelf: "center" }}>+{activityBuckets.inactive.length - 24}</div>
            )}
          </div>
        </div>
      )}

      {/* Top-10 podium */}
      <div className="glass card">
        <div className="dir-section-head">
          <div className="dir-section-titles">
            <div className="h3"><Icon name="rank" /> {t("dirTopTeachers")}</div>
          </div>
          <div className="dir-section-actions">
            <Btn onClick={exportTeachers}><Icon name="file" /> {t("dirExportXlsx")}</Btn>
          </div>
        </div>
        <div className="sep"></div>
        <div className="dir-grid-top">
          {topTeachers.map((r, i) => (
            <div key={r.uid} className="glass dir-top-item"
              onClick={() => goTeacher(r.uid)}
              role="button" tabIndex={0}>
              <div className={`dir-top-item__rank dir-top-item__rank--${i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "plain"}`}>{i + 1}</div>
              <div className="dir-top-item__body">
                <div className="dir-top-item__name">{r.name}</div>
                <div className="dir-top-item__sub">{r.position || r.subject || "—"}</div>
              </div>
              <div className="dir-top-item__meta">
                <div style={{ fontWeight: 900 }}>{fmtPoints(r.total)}</div>
                <div className="tiny muted">{r.level}</div>
              </div>
            </div>
          ))}
          {topTeachers.length === 0 && <p className="p muted">{t("noData") || "—"}</p>}
        </div>
      </div>

      {/* Exports panel */}
      <div className="glass card">
        <div className="h3"><Icon name="shield" /> {t("dirExports")}</div>
        <div className="tiny muted">{t("dirExportsHint")}</div>
        <div className="sep"></div>
        <div className="dir-exports">
          <Btn kind="primary" onClick={exportFullReport}>
            <Icon name="file" /> {t("dirExportFull")}
          </Btn>
          <Btn onClick={exportTeachers}><Icon name="user" /> {t("dirExportTeachers")}</Btn>
          <Btn onClick={exportSubmissions}><Icon name="check" /> {t("dirExportSubmissions")}</Btn>
          <Btn onClick={exportRequests}><Icon name="clock" /> {t("dirExportRequests")}</Btn>
          <Btn onClick={exportAwards}><Icon name="rank" /> {t("dirExportAwards")}</Btn>
          <Btn onClick={exportCategories}><Icon name="file" /> {t("dirExportCategories")}</Btn>
          <Btn onClick={exportInactive}><Icon name="bell" /> {t("dirExportInactive")}</Btn>
        </div>
      </div>

      {/* Teacher table */}
      <div className="glass card">
        <div className="dir-section-head">
          <div className="dir-section-titles">
            <div className="h3"><Icon name="user" /> {t("dirTeachersTable")}</div>
          </div>
          <div className="dir-section-actions">
            <Input
              placeholder={t("searchPlaceholder") || "Поиск…"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 280 }}
            />
          </div>
        </div>
        <div className="sep"></div>
        <div className="dir-table-wrap">
          <table className="dir-table">
            <thead>
              <tr>
                <th>#</th>
                <SortHead k="name">{t("teacher")}</SortHead>
                <SortHead k="position">{t("position")}</SortHead>
                <SortHead k="subject">{t("subject")}</SortHead>
                <SortHead k="score">{t("dirScore")}</SortHead>
                <SortHead k="total">{t("totalPoints")}</SortHead>
                <SortHead k="periodPts">{t("dirPeriodPts")}</SortHead>
                <SortHead k="approved">{t("approved")}</SortHead>
                <SortHead k="pending">{t("pending")}</SortHead>
                <SortHead k="rejected">{t("rejected")}</SortHead>
                <SortHead k="rate">{t("dirApprovalPct")}</SortHead>
                <SortHead k="growth">{t("dirGrowthPct")}</SortHead>
                <SortHead k="months">{t("dirMonthsActive")}</SortHead>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {teacherRows.map((r, i) => (
                <tr key={r.uid}>
                  <td style={{ opacity: .6 }}>{i + 1}</td>
                  <td className="dir-col-name" style={{ fontWeight: 600 }}>{r.name}</td>
                  <td className="dir-col-pos">{r.position || "—"}</td>
                  <td className="dir-col-sub">{r.subject || "—"}</td>
                  <td className="dir-col-num dir-col-score">{r.score}</td>
                  <td className="dir-col-num" style={{ fontWeight: 700 }}>{fmtPoints(r.total)}</td>
                  <td className="dir-col-num">{fmtPoints(r.periodPts)}</td>
                  <td className="dir-col-num dir-col-pos-val">{r.approved}</td>
                  <td className="dir-col-num dir-col-pen-val">{r.pending}</td>
                  <td className="dir-col-num dir-col-rej-val">{r.rejected}</td>
                  <td className="dir-col-num">{r.rate}%</td>
                  <td className={`dir-col-num ${r.growth >= 0 ? "dir-col-growth--up" : "dir-col-growth--down"}`}>
                    {r.growth > 0 ? `+${r.growth}` : r.growth}%
                  </td>
                  <td className="dir-col-num">{r.months}</td>
                  <td style={{ textAlign: "right" }}>
                    <Btn size="sm" onClick={() => goTeacher(r.uid)}>
                      <Icon name="eye" />
                    </Btn>
                  </td>
                </tr>
              ))}
              {teacherRows.length === 0 && (
                <tr><td colSpan={14} style={{ padding: 20, textAlign: "center", opacity: .6 }}>{t("noData") || "—"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
