import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
  AreaChart, Area,
  PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter,
  ComposedChart,
  FunnelChart, Funnel, LabelList
} from "recharts";

function dayKeyFromSubmission(s) {
  const ed = (s.eventDate || "").trim();
  if (ed) return ed;

  const ts = s.decidedAt || s.createdAt;
  if (ts?.toMillis) {
    const d = new Date(ts.toMillis());
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return "—";
}

function makeLastDays(n = 14) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    out.push(`${yyyy}-${mm}-${dd}`);
  }
  return out;
}

function shortName(u) {
  const nm = (u.displayName || "").trim();
  if (nm) return nm;
  const em = (u.email || "").split("@")[0];
  if (em) return em;
  return (u.uid || "").slice(0, 6) || "teacher";
}

function topNWithOther(items, n = 6, nameKey = "name", valueKey = "value") {
  const sorted = [...items].sort((a, b) => (b[valueKey] ?? 0) - (a[valueKey] ?? 0));
  const top = sorted.slice(0, n);
  const rest = sorted.slice(n);
  const restSum = rest.reduce((a, x) => a + (x[valueKey] ?? 0), 0);
  if (restSum > 0) top.push({ [nameKey]: "Другое", [valueKey]: restSum });
  return top;
}

export default function Stats() {
  const { user, role } = useAuth();
  const [err, setErr] = useState("");

  // teacher mode
  const [approved, setApproved] = useState([]);

  // admin mode
  const [teachers, setTeachers] = useState([]);
  const [adminSubs, setAdminSubs] = useState([]); // all submissions (for extra charts)
  const [approvedAll, setApprovedAll] = useState([]);

  const days14 = useMemo(() => makeLastDays(14), []);

  useEffect(() => {
    (async () => {
      if (!user) return;
      setErr("");

      try {
        if (role === "admin") {
          // teachers (admins excluded)
          const uq = query(collection(db, "users"), orderBy("totalPoints", "desc"), limit(800));
          const us = await getDocs(uq);
          const allUsers = us.docs.map(d => d.data());
          const onlyTeachers = allUsers.filter(u => (u.role ?? "teacher") !== "admin");
          setTeachers(onlyTeachers);

          // submissions (avoid composite indexes): orderBy createdAt only, then filter in code
          const sq = query(collection(db, "submissions"), orderBy("createdAt", "desc"), limit(5000));
          const ss = await getDocs(sq);
          const allSubs = ss.docs.map(d => ({ id: d.id, ...d.data() }));
          setAdminSubs(allSubs);
          setApprovedAll(allSubs.filter(s => s.status === "approved"));
        } else {
          const q1 = query(collection(db, "submissions"), where("uid", "==", user.uid), limit(2500));
          const snap = await getDocs(q1);
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          const approvedOnly = list.filter(x => x.status === "approved");
          approvedOnly.sort((a, b) => {
            const ta = (a.decidedAt?.toMillis ? a.decidedAt.toMillis() : (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0));
            const tb = (b.decidedAt?.toMillis ? b.decidedAt.toMillis() : (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0));
            return ta - tb;
          });
          setApproved(approvedOnly);
        }
      } catch (e) {
        setErr(e.message);
      }
    })();
  }, [user?.uid, role]);

  // ---------------- Teacher charts ----------------
  const teacherDaily = useMemo(() => {
    const map = new Map();
    for (const s of approved) {
      const k = dayKeyFromSubmission(s);
      const prev = map.get(k) ?? 0;
      map.set(k, prev + (s.points ?? 0));
    }
    const keys = [...map.keys()].filter(k => k !== "—").sort((a, b) => String(a).localeCompare(String(b)));
    let run = 0;
    return keys.map(k => {
      run += map.get(k) ?? 0;
      return { day: k, daily: map.get(k) ?? 0, total: run };
    });
  }, [approved]);

  const teacherByType = useMemo(() => {
    const map = new Map();
    for (const s of approved) {
      const key = (s.typeName || s.typeId || "—").trim();
      map.set(key, (map.get(key) ?? 0) + (s.points ?? 0));
    }
    const rows = [...map.entries()].map(([name, points]) => ({ name, points }));
    rows.sort((a, b) => b.points - a.points);
    return rows.slice(0, 12);
  }, [approved]);

  // ---------------- Admin: base charts ----------------
  const topTeachers = useMemo(() => {
    const list = [...teachers];
    list.sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0));
    return list.slice(0, 20).map(t => ({
      name: shortName(t),
      points: t.totalPoints ?? 0
    }));
  }, [teachers]);

  const adminByType = useMemo(() => {
    const map = new Map();
    for (const s of approvedAll) {
      const key = (s.typeName || s.typeId || "—").trim();
      map.set(key, (map.get(key) ?? 0) + (s.points ?? 0));
    }
    const rows = [...map.entries()].map(([name, points]) => ({ name, points }));
    rows.sort((a, b) => b.points - a.points);
    return rows.slice(0, 12);
  }, [approvedAll]);

  const adminDaily14 = useMemo(() => {
    const totals = new Map(days14.map(d => [d, 0]));
    for (const s of approvedAll) {
      const d = dayKeyFromSubmission(s);
      if (!totals.has(d)) continue;
      totals.set(d, (totals.get(d) ?? 0) + (s.points ?? 0));
    }
    return days14.map(d => ({ day: d, points: totals.get(d) ?? 0 }));
  }, [approvedAll, days14]);

  // Heatmap (teacher x day)
  const heat = useMemo(() => {
    const days = days14;

    const tList = [...teachers];
    tList.sort((a, b) => shortName(a).localeCompare(shortName(b), "ru"));

    const byUid = new Map(tList.map(t => [t.uid, t]));

    const sums = new Map();
    let max = 0;

    for (const s of approvedAll) {
      const d = dayKeyFromSubmission(s);
      if (!days.includes(d)) continue;
      if (!byUid.has(s.uid)) continue;

      if (!sums.has(s.uid)) sums.set(s.uid, new Map());
      const m = sums.get(s.uid);
      const prev = m.get(d) ?? 0;
      const val = prev + (s.points ?? 0);
      m.set(d, val);
      if (val > max) max = val;
    }

    return { days, teachers: tList, sums, max };
  }, [teachers, approvedAll, days14]);

  // ---------------- Admin: EXTRA 10 charts (datasets) ----------------
  // 1) Line chart: approved points vs approvals count by day (14d)
  const dailyPointsAndCount14 = useMemo(() => {
    const points = new Map(days14.map(d => [d, 0]));
    const count = new Map(days14.map(d => [d, 0]));
    for (const s of approvedAll) {
      const d = dayKeyFromSubmission(s);
      if (!points.has(d)) continue;
      points.set(d, (points.get(d) ?? 0) + (s.points ?? 0));
      count.set(d, (count.get(d) ?? 0) + 1);
    }
    return days14.map(d => ({ day: d, points: points.get(d) ?? 0, count: count.get(d) ?? 0 }));
  }, [approvedAll, days14]);

  // 2) Area chart cumulative (14d)
  const cumulative14 = useMemo(() => {
    let run = 0;
    return dailyPointsAndCount14.map(r => {
      run += r.points;
      return { ...r, total: run };
    });
  }, [dailyPointsAndCount14]);

  // 3) Pie: points by type (top 6 + other)
  const piePointsByType = useMemo(() => {
    const map = new Map();
    for (const s of approvedAll) {
      const key = (s.typeName || s.typeId || "—").trim();
      map.set(key, (map.get(key) ?? 0) + (s.points ?? 0));
    }
    const arr = [...map.entries()].map(([name, value]) => ({ name, value }));
    return topNWithOther(arr, 6, "name", "value");
  }, [approvedAll]);

  // 4) Pie: approved submissions count by type (top 6 + other)
  const pieCountByType = useMemo(() => {
    const map = new Map();
    for (const s of approvedAll) {
      const key = (s.typeName || s.typeId || "—").trim();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const arr = [...map.entries()].map(([name, value]) => ({ name, value }));
    return topNWithOther(arr, 6, "name", "value");
  }, [approvedAll]);

  // 5) Radar: average points per approved submission by type (top 8)
  const radarAvgPointsByType = useMemo(() => {
    const sum = new Map();
    const cnt = new Map();
    for (const s of approvedAll) {
      const key = (s.typeName || s.typeId || "—").trim();
      sum.set(key, (sum.get(key) ?? 0) + (s.points ?? 0));
      cnt.set(key, (cnt.get(key) ?? 0) + 1);
    }
    const arr = [...sum.keys()].map(k => ({
      type: k,
      avg: Math.round((sum.get(k) ?? 0) / Math.max(1, (cnt.get(k) ?? 1)))
    }));
    arr.sort((a, b) => b.avg - a.avg);
    return arr.slice(0, 8);
  }, [approvedAll]);

  // 6) Scatter: each approved submission (dayIndex, points)
  const scatterApproved14 = useMemo(() => {
    const index = new Map(days14.map((d, i) => [d, i]));
    return approvedAll
      .map(s => {
        const d = dayKeyFromSubmission(s);
        if (!index.has(d)) return null;
        return { x: index.get(d), y: s.points ?? 0, day: d };
      })
      .filter(Boolean);
  }, [approvedAll, days14]);

  // 7) Funnel: statuses counts (all submissions)
  const funnelStatuses = useMemo(() => {
    const counts = { pending: 0, approved: 0, rejected: 0 };
    for (const s of adminSubs) {
      const st = (s.status || "pending").toLowerCase();
      if (st in counts) counts[st] += 1;
      else counts.pending += 1;
    }
    return [
      { name: "pending", value: counts.pending },
      { name: "approved", value: counts.approved },
      { name: "rejected", value: counts.rejected }
    ];
  }, [adminSubs]);

  // 8) Bar (horizontal): points by teacher for last 14 days
  const barTeacherPoints14 = useMemo(() => {
    const map = new Map(); // uid -> points
    const daySet = new Set(days14);
    for (const s of approvedAll) {
      const d = dayKeyFromSubmission(s);
      if (!daySet.has(d)) continue;
      map.set(s.uid, (map.get(s.uid) ?? 0) + (s.points ?? 0));
    }
    const rows = teachers
      .filter(t => (t.role ?? "teacher") !== "admin")
      .map(t => ({ name: shortName(t), points: map.get(t.uid) ?? 0 }))
      .filter(r => r.points > 0);
    rows.sort((a, b) => b.points - a.points);
    return rows.slice(0, 20);
  }, [approvedAll, teachers, days14]);

  // 9) Composed: daily count (bar) + points (line)
  const composedDaily = useMemo(() => dailyPointsAndCount14, [dailyPointsAndCount14]);

  // 10) Bar: top teachers by approvals count (all time)
  const barTeacherApprovalsCount = useMemo(() => {
    const map = new Map(); // uid -> count
    for (const s of approvedAll) {
      map.set(s.uid, (map.get(s.uid) ?? 0) + 1);
    }
    const rows = teachers.map(t => ({ name: shortName(t), count: map.get(t.uid) ?? 0 }));
    rows.sort((a, b) => b.count - a.count);
    return rows.slice(0, 20);
  }, [approvedAll, teachers]);

  const isAdmin = role === "admin";

  return (
    <div className="container">
      <div className="card">
        <h2>Статистика</h2>
        {err && <div className="error">{err}</div>}

        {isAdmin ? (
          <>
            <div className="sectionLead">
              <small className="muted">
                Общая статистика по всем учителям (админы не учитываются).
              </small>
            </div>

            <div className="section">
              <div className="sectionTitle">
                <h3>Баллы учителей по дням</h3>
                <span className="badge">14 дней</span>
              </div>
              <small className="muted">
                Слева — учителя, снизу — дни. В ячейке — баллы за день (только подтверждённые).
              </small>

              <div className="heatWrap" style={{ marginTop: 12 }}>
                <div
                  className="heatGrid"
                  style={{
                    gridTemplateColumns: `240px repeat(${heat.days.length}, 76px)`
                  }}
                >
                  <div className="heatHead sticky">Учитель</div>
                  {heat.days.map(d => (
                    <div key={d} className="heatHead stickyTop" title={d}>
                      {d.slice(5)}
                    </div>
                  ))}

                  {heat.teachers.map(t => {
                    const row = heat.sums.get(t.uid) ?? new Map();
                    return (
                      <React.Fragment key={t.uid}>
                        <div className="heatName stickyLeft" title={shortName(t)}>
                          {shortName(t)}
                        </div>
                        {heat.days.map(d => {
                          const v = row.get(d) ?? 0;
                          const alpha = heat.max ? Math.min(0.92, 0.14 + (v / heat.max) * 0.78) : 0.1;
                          const bg = v ? `rgba(37,99,235,${alpha})` : "rgba(2,6,23,0.035)";
                          const fg = v ? "#ffffff" : "#0f172a";
                          return (
                            <div
                              key={t.uid + d}
                              className={"heatCell" + (v ? " filled" : "")}
                              style={{ background: bg, color: fg }}
                              title={`${shortName(t)} • ${d} • ${v} балл(ов)`}
                            >
                              {v ? v : ""}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              <div className="legend">
                <span className="legendDot" style={{background:"rgba(2,6,23,0.035)"}}></span> 0
                <span className="legendDot" style={{background:"rgba(37,99,235,0.25)"}}></span> мало
                <span className="legendDot" style={{background:"rgba(37,99,235,0.65)"}}></span> больше
                <span className="legendDot" style={{background:"rgba(37,99,235,0.92)"}}></span> много
              </div>
            </div>

            {/* ===== 10 extra charts gallery (you will choose later) ===== */}
            <div className="chartGrid">
              <div className="chartCard">
                <div className="chartHead">
                  <h3>1) Баллы по дням</h3>
                  <span className="badge">X=баллы • Y=дни</span>
                </div>
                <div className="chartBox">
                  <ResponsiveContainer>
                    <BarChart data={[...adminDaily14].reverse()} layout="vertical" margin={{left: 8, right: 18}}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="day" width={96} />
                      <Tooltip />
                      <Bar dataKey="points" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chartCard">
                <div className="chartHead">
                  <h3>2) Баллы и кол-во заявок</h3>
                  <span className="badge">14 дней</span>
                </div>
                <div className="chartBox">
                  <ResponsiveContainer>
                    <LineChart data={dailyPointsAndCount14}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" hide={dailyPointsAndCount14.length > 12} />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="points" />
                      <Line type="monotone" dataKey="count" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chartCard">
                <div className="chartHead">
                  <h3>3) Кумулятивные баллы</h3>
                  <span className="badge">Area</span>
                </div>
                <div className="chartBox">
                  <ResponsiveContainer>
                    <AreaChart data={cumulative14}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" hide={cumulative14.length > 12} />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="total" />
                      <Area type="monotone" dataKey="points" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chartCard">
                <div className="chartHead">
                  <h3>4) Топ учителей по баллам</h3>
                  <span className="badge">Bar</span>
                </div>
                <div className="chartBox tall">
                  <ResponsiveContainer>
                    <BarChart data={topTeachers}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" hide={topTeachers.length > 10} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="points" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chartCard">
                <div className="chartHead">
                  <h3>5) Типы (баллы)</h3>
                  <span className="badge">Pie</span>
                </div>
                <div className="chartBox">
                  <ResponsiveContainer>
                    <PieChart>
                      <Tooltip />
                      <Pie data={piePointsByType} dataKey="value" nameKey="name" outerRadius={110} label />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <small className="muted">Топ-6 + “другое”.</small>
              </div>

              <div className="chartCard">
                <div className="chartHead">
                  <h3>6) Типы (кол-во)</h3>
                  <span className="badge">Pie</span>
                </div>
                <div className="chartBox">
                  <ResponsiveContainer>
                    <PieChart>
                      <Tooltip />
                      <Pie data={pieCountByType} dataKey="value" nameKey="name" outerRadius={110} label />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chartCard">
                <div className="chartHead">
                  <h3>7) Средние баллы по типам</h3>
                  <span className="badge">Radar</span>
                </div>
                <div className="chartBox">
                  <ResponsiveContainer>
                    <RadarChart data={radarAvgPointsByType}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="type" />
                      <PolarRadiusAxis />
                      <Tooltip />
                      <Radar dataKey="avg" />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <small className="muted">Топ-8 типов по средним баллам.</small>
              </div>

              <div className="chartCard">
                <div className="chartHead">
                  <h3>8) Точки: заявки (14 дней)</h3>
                  <span className="badge">Scatter</span>
                </div>
                <div className="chartBox">
                  <ResponsiveContainer>
                    <ScatterChart margin={{left: 10, right: 20}}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" dataKey="x" tickFormatter={(v)=>days14[v]?.slice(5) ?? v} />
                      <YAxis type="number" dataKey="y" />
                      <Tooltip formatter={(v, n, p) => [v, n]} labelFormatter={(l) => `День: ${days14[l] || ""}`} />
                      <Scatter data={scatterApproved14} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <small className="muted">Каждая точка — подтверждённая заявка (баллы).</small>
              </div>

              <div className="chartCard">
                <div className="chartHead">
                  <h3>9) Воронка статусов</h3>
                  <span className="badge">Funnel</span>
                </div>
                <div className="chartBox">
                  <ResponsiveContainer>
                    <FunnelChart>
                      <Tooltip />
                      <Funnel dataKey="value" data={funnelStatuses} isAnimationActive={false}>
                        <LabelList position="right" fill="#111827" stroke="none" dataKey="name" />
                      </Funnel>
                    </FunnelChart>
                  </ResponsiveContainer>
                </div>
                <small className="muted">Все заявки: pending/approved/rejected.</small>
              </div>

              <div className="chartCard">
                <div className="chartHead">
                  <h3>10) Смешанный: заявки и баллы</h3>
                  <span className="badge">Composed</span>
                </div>
                <div className="chartBox">
                  <ResponsiveContainer>
                    <ComposedChart data={composedDaily}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" hide={composedDaily.length > 12} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" />
                      <Line type="monotone" dataKey="points" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* existing additional charts */}
            <div className="section gridTwo" style={{marginTop: 12}}>
              <div className="sectionInner">
                <h3 style={{marginTop:0}}>Баллы по типам достижений (Bar)</h3>
                <small className="muted">Топ-12 типов по сумме баллов.</small>
                <div style={{ width: "100%", height: 340, marginTop: 10 }}>
                  <ResponsiveContainer>
                    <BarChart data={adminByType}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" hide />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="points" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="sectionInner">
                <h3 style={{marginTop:0}}>Топ учителей по кол-ву подтверждений</h3>
                <small className="muted">Топ-20 по количеству approved заявок.</small>
                <div style={{ width: "100%", height: 340, marginTop: 10 }}>
                  <ResponsiveContainer>
                    <BarChart data={barTeacherApprovalsCount}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" hide={barTeacherApprovalsCount.length > 10} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="section">
              <div className="sectionTitle">
                <h3>Больше баллов за 14 дней (по учителям)</h3>
                <span className="badge">X=баллы • Y=учителя</span>
              </div>
              <small className="muted">Горизонтальный рейтинг баллов за последние 14 дней.</small>
              <div style={{ width: "100%", height: 520, marginTop: 8 }}>
                <ResponsiveContainer>
                  <BarChart data={barTeacherPoints14} layout="vertical" margin={{left: 8, right: 18}}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={160} />
                    <Tooltip />
                    <Bar dataKey="points" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="sectionLead">
              <small className="muted">
                Ваша статистика по подтверждённым достижениям.
              </small>
            </div>

            <div className="section">
              <div className="sectionTitle">
                <h3>Баллы по дням</h3>
              </div>
              <div style={{ width: "100%", height: 320, marginTop: 8 }}>
                <ResponsiveContainer>
                  <LineChart data={teacherDaily}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" hide={teacherDaily.length > 18} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="daily" />
                    <Line type="monotone" dataKey="total" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {!teacherDaily.length && <small className="muted">Пока нет подтверждённых заявок.</small>}
            </div>

            <div className="section">
              <div className="sectionTitle">
                <h3>Баллы по типам достижений</h3>
              </div>
              <div style={{ width: "100%", height: 340, marginTop: 8 }}>
                <ResponsiveContainer>
                  <BarChart data={teacherByType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" hide />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="points" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
