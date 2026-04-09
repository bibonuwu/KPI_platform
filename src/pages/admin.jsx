import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { t, getLang, setLang } from "../i18n.js";
import {
  auth, db, storage, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc,
  getDocs, query, where, orderBy, limit, serverTimestamp, runTransaction, increment,
  ref, uploadBytes, getDownloadURL
} from "../firebase-config.js";
import {
  store, setState, useStore, navigate, toast, canAccess
} from "../store.js";
import {
  fmtPoints, safeText, ymd, tsKey, sum, lastDays, lastMonths, startYMDFromDays,
  levelFromPoints, getAcademicYear, QUARTER_RANGES, getQuarterDates, getCurrentQuarter,
  filterByQuarter, getAcademicYearLabel, exportToCsv, exportRatingCsv,
  exportSubmissionsCsv, getQuarterForDate, dateRangeDays, requestKindLabel, REQUEST_KINDS
} from "../utils.js";
import { DEFAULT_TYPES } from "../constants.js";
import {
  fetchTypesAll, fetchTypesActive, seedDefaultTypes, addType, toggleType,
  deleteTypeDoc, updateType, fetchUsersAll, fetchMySubmissions,
  fetchPendingSubmissions, fetchAdminRecentSubs, createSubmission,
  approveSubmission, rejectSubmission, fetchMyRequests, fetchPendingRequests,
  fetchAdminRecentRequests, createTeacherRequest, decideTeacherRequest,
  setRole, setPosition, logAdminAction, fetchAdminLogs, updateProfile,
  uploadAvatar, uploadEvidence, fetchDocumentsForTeacher, fetchAllDocuments,
  signDocument, markDocumentViewed, createDocument,
  fetchMyTeacherDocs, createMyTeacherDoc, uploadTeacherDocFile,
  deleteUserAndData, fetchCustomPositions, saveCustomPositions,
  fetchGoals, fetchNewsAll, renderRichDesc
} from "../data.js";
import {
  Icon, Btn, Input, Select, Textarea, Pill, DataCards, QuarterFilter,
  GoalsWidget, LoadingScreen, BarChart, LineChart, AreaLineChart,
  DonutChart, RadarChart, GaugeChart, StackedBarChart, HistogramChart,
  DocumentPreview, generateDocHTML, downloadDocAsWord, downloadDocAsPdf,
  ErrorBoundary, Guard
} from "../components.jsx";

export function PageAdminApprovals() {
  const st = useStore();
  const u = st.userDoc;
  if (!u) return <Guard />;
  if (u.role !== "admin") return <Guard />;

  const pending = st.pendingSubmissions;
  const usersMap = new Map(st.users.map(x => [x.uid, x]));

  async function decide(id, action) {
    try {
      setState({ loading: true });
      if (action === "approve") await approveSubmission(id, u.uid);
      else await rejectSubmission(id, u.uid);

      toast(action === "approve" ? t("approvedToast") : t("rejectedToast"), "ok");

      const [p, users] = await Promise.all([fetchPendingSubmissions(), fetchUsersAll()]);
      setState({ pendingSubmissions: p, users });
    } catch (e) {
      console.error(e);
      toast(e?.message || t("error"), "error");
    } finally { setState({ loading: false }); }
  }

  return (
    <div className="glass card">
      {!pending.length && <p className="p muted" style={{ padding: "12px 0" }}>{t("noSubsToReview")}</p>}
      <div className="mobile-cards">
        {pending.map(s => {
          const tu = usersMap.get(s.uid);
          return (
            <div key={s.id} className="mobile-card glass">
              <div className="mobile-card__row">
                <span className="mobile-card__label">{t("teacher")}</span>
                <span className="mobile-card__val"><b>{tu?.displayName || "—"}</b><div className="muted tiny">{tu?.email || s.uid}</div></span>
              </div>
              <div className="mobile-card__row">
                <span className="mobile-card__label">{t("typeAndTitle")}</span>
                <span className="mobile-card__val"><b>{s.typeName}</b><div className="muted tiny">{s.title}</div>{s.description ? <div className="muted tiny">{s.description}</div> : null}</span>
              </div>
              <div className="mobile-card__row">
                <span className="mobile-card__label">{t("dateAndPts")}</span>
                <span className="mobile-card__val">{s.eventDate} · <b>{fmtPoints(s.points)} pts</b></span>
              </div>
              {(s.evidenceLink || s.evidenceFileUrl) && (
                <div className="mobile-card__row">
                  <span className="mobile-card__label">{t("evidence")}</span>
                  <span className="mobile-card__val" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {s.evidenceLink ? <a className="btn" href={s.evidenceLink} target="_blank" rel="noreferrer">{t("link")}</a> : null}
                    {s.evidenceFileUrl ? <a className="btn" href={s.evidenceFileUrl} target="_blank" rel="noreferrer">{t("file")}</a> : null}
                  </span>
                </div>
              )}
              <div className="mobile-card__actions">
                <Btn kind="ok" onClick={() => decide(s.id, "approve")} disabled={st.loading}><Icon name="check" /> {t("approve")}</Btn>
                <Btn kind="danger" onClick={() => decide(s.id, "reject")} disabled={st.loading}><Icon name="x" /> {t("reject")}</Btn>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PageAdminRequests() {
  const st = useStore();
  const u = st.userDoc;
  const [deltas, setDeltas] = useState({}); // hook before early return

  if (!u) return <Guard />;
  if (u.role !== "admin") return <Guard />;

  const pending = st.pendingRequests || [];
  const usersMap = new Map((st.users || []).map(x => [x.uid, x]));

  const getDelta = (id) => {
    const v = deltas[id];
    return (v === 0 || v) ? Number(v) : 0;
  };
  const setDelta = (id, v) => setDeltas(m => ({ ...m, [id]: v }));

  const compPreview = (r) => {
    const days = Number(r.days) || dateRangeDays(r.dateFrom, r.dateTo);
    const mode = r.compMode || (REQUEST_KINDS.find(x => x.key === r.kind)?.compMode) || "none";
    return mode === "earn" ? days : mode === "use" ? -days : 0;
  };
  const signNum = (n) => {
    const x = Number(n) || 0;
    return x > 0 ? `+${x}` : String(x);
  };

  async function decide(id, action) {
    try {
      setState({ loading: true });
      const delta = getDelta(id);
      await decideTeacherRequest(id, u.uid, action, delta);
      toast(action === "approve" ? t("approvedToast") : t("rejectedToast"), "ok");
      const [pendReq, recentReq, users] = await Promise.all([
        fetchPendingRequests(),
        fetchAdminRecentRequests(),
        fetchUsersAll()
      ]);
      setState({ pendingRequests: pendReq, adminRecentRequests: recentReq, users });
    } catch (e) {
      console.error(e);
      toast(e?.message || t("error"), "error");
    } finally { setState({ loading: false }); }
  }

  const recent = (st.adminRecentRequests || []).filter(r => r.status !== "pending").slice(0, 30);

  return (
    <div className="grid2">
      <div className="glass card">
        {!pending.length && <p className="p muted" style={{ padding: "12px 0" }}>{t("noReqToReview")}</p>}
        <div className="mobile-cards">
          {pending.map(r => {
            const tu = usersMap.get(r.uid);
            const delta = getDelta(r.id);
            const cd = compPreview(r);
            return (
              <div key={r.id} className="mobile-card glass">
                <div className="mobile-card__row">
                  <span className="mobile-card__label">{t("teacher")}</span>
                  <span className="mobile-card__val"><b>{tu?.displayName || "—"}</b><div className="muted tiny">{tu?.email || r.uid}</div></span>
                </div>
                <div className="mobile-card__row">
                  <span className="mobile-card__label">{t("typeAndPeriod")}</span>
                  <span className="mobile-card__val"><b>{r.kindLabel || requestKindLabel(r.kind)}</b><div className="muted tiny">{r.dateFrom}{r.dateTo && r.dateTo !== r.dateFrom ? ` → ${r.dateTo}` : ""} · дней: {Number(r.days) || dateRangeDays(r.dateFrom, r.dateTo)}</div>{r.note ? <div className="muted tiny">{r.note}</div> : null}</span>
                </div>
                <div className="mobile-card__row">
                  <span className="mobile-card__label">Баланс отгулов / Δ</span>
                  <span className="mobile-card__val"><b>{fmtPoints(tu?.compDays || 0)}</b> {t("compDaysShort")} · {t("compDeltaLabel")} <b>{signNum(cd)}</b></span>
                </div>
                <div className="mobile-card__row">
                  <span className="mobile-card__label">{t("pointsDelta")}</span>
                  <span className="mobile-card__val" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <Input type="number" value={delta} onChange={(e) => setDelta(r.id, e.target.value)} style={{ maxWidth: 100 }} />
                    <Btn type="button" onClick={() => setDelta(r.id, -2)}>-2</Btn>
                    <Btn type="button" onClick={() => setDelta(r.id, +2)}>+2</Btn>
                  </span>
                </div>
                <div className="mobile-card__actions">
                  <Btn kind="ok" onClick={() => decide(r.id, "approve")} disabled={st.loading}><Icon name="check" /> {t("ok")}</Btn>
                  <Btn kind="danger" onClick={() => decide(r.id, "reject")} disabled={st.loading}><Icon name="x" /> {t("no")}</Btn>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass card">
        <div className="h2">{t("recentDecisions")}</div>
        <div className="sep"></div>
        <DataCards
          emptyText={t("noHistory")}
          columns={[
            { key: "teacher", label: t("teacher"), render: r => { const tu = usersMap.get(r.uid); return <><b>{tu?.displayName || "—"}</b><div className="muted tiny">{tu?.email || r.uid}</div></>; } },
            { key: "kind", label: t("type"), render: r => r.kindLabel || requestKindLabel(r.kind) },
            { key: "period", label: t("period"), render: r => `${r.dateFrom}${r.dateTo && r.dateTo !== r.dateFrom ? ` → ${r.dateTo}` : ""}` },
            { key: "status", label: t("status"), render: r => <Pill kind={r.status}>{r.status}</Pill> },
            { key: "pts", label: t("pointsDelta"), render: r => <b>{signNum(r.pointsDelta || 0)}</b> },
            { key: "cd", label: t("compDaysDeltaCol"), render: r => <b>{signNum(r.compDaysDelta || 0)}</b> }
          ]}
          rows={recent.map(r => ({ ...r, __key: r.id }))}
        />

        <div className="sep"></div>
        <div className="help">{t("compRules")}</div>
      </div>
    </div>
  );
}

/** ---------- PageDocuments (teacher inbox + my documents) ---------- */
export function PageDocuments() {
  const st = useStore();
  // All hooks before any conditional returns
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signingDoc, setSigningDoc] = useState(null);
  const [viewDoc, setViewDoc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("sign"); // "sign" | "my"

  // My documents upload form state
  const [docTitle, setDocTitle] = useState("");
  const [docDesc, setDocDesc] = useState("");
  const [docFile, setDocFile] = useState(null);

  const u = st.userDoc;
  if (!u) return <Guard />;
  if (!canAccess("documents", u)) return <Guard />;

  const docs = st.myDocuments || [];
  const myTDocs = st.myTeacherDocs || [];
  const unsignedCount = docs.filter(d => d.status !== "signed").length;

  const getPos = (e) => {
    const c = canvasRef.current;
    if (!c) return [0, 0];
    const rect = c.getBoundingClientRect();
    const scaleX = c.width / rect.width;
    const scaleY = c.height / rect.height;
    const tch = e.touches ? e.touches[0] : e;
    return [(tch.clientX - rect.left) * scaleX, (tch.clientY - rect.top) * scaleY];
  };
  const onDown = (e) => {
    e.preventDefault();
    setDrawing(true);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const [x, y] = getPos(e);
    ctx.beginPath(); ctx.moveTo(x, y);
  };
  const onMove = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const [x, y] = getPos(e);
    ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "#ffffff"; ctx.lineTo(x, y); ctx.stroke();
    setSigned(true);
  };
  const onUp = () => setDrawing(false);
  const clearSig = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    setSigned(false);
  };

  const openDoc = async (d) => {
    setViewDoc(d);
    if (d.status === "sent") {
      try { await markDocumentViewed(d.id); } catch (e) { console.error(e); }
    }
  };

  const submitSign = async () => {
    if (!signed) { toast(t("putSignature"), "error"); return; }
    try {
      setSaving(true);
      const c = canvasRef.current;
      const blob = await new Promise(res => c.toBlob(res, "image/png"));
      const sigUrl = await uploadFile(
        `doc_signatures/${u.uid}/${signingDoc.id}_${Date.now()}.png`,
        new File([blob], "sig.png", { type: "image/png" })
      );
      await signDocument(signingDoc.id, sigUrl);
      const fresh = await fetchDocumentsForTeacher(u.uid);
      setState({ myDocuments: fresh });
      toast(t("docSigned"), "ok");
      setSigningDoc(null);
      setViewDoc(null);
    } catch (e) {
      toast(e?.message || t("error"), "error");
    } finally {
      setSaving(false);
    }
  };

  // ---- My documents upload ----
  const submitMyDoc = async (e) => {
    e.preventDefault();
    if (!safeText(docTitle)) { toast(t("enterDocName"), "error"); return; }
    if (!docFile) { toast(t("attachFile"), "error"); return; }
    try {
      setState({ loading: true });
      const fileUrl = await uploadTeacherDocFile(u.uid, docFile);
      await createMyTeacherDoc({ uid: u.uid, title: docTitle, description: docDesc, fileUrl, fileName: docFile.name });
      toast(t("docAdded"), "ok");
      const fresh = await fetchMyTeacherDocs(u.uid);
      setState({ myTeacherDocs: fresh });
      setDocTitle(""); setDocDesc(""); setDocFile(null);
    } catch (err) {
      console.error(err);
      toast(err?.message || t("error"), "error");
    } finally { setState({ loading: false }); }
  };

  const refreshMyDocs = async () => {
    try {
      setState({ loading: true });
      const fresh = await fetchMyTeacherDocs(u.uid);
      setState({ myTeacherDocs: fresh });
      toast(t("updated"), "ok");
    } catch (e) {
      toast(e?.message || t("error"), "error");
    } finally { setState({ loading: false }); }
  };

  const statusLabel = (s) => s === "signed" ? t("statusSigned") : s === "viewed" ? t("statusViewed") : t("statusNew");
  const statusColor = (s) => s === "signed" ? "approved" : s === "viewed" ? "pending" : "rejected";

  return (
    <>
      {/* View/Sign document modal */}
      {(viewDoc || signingDoc) && createPortal(
        <div className="tp-overlay" onClick={() => { setViewDoc(null); setSigningDoc(null); setSigned(false); }}>
          <div className="tp-card" onClick={e => e.stopPropagation()} style={{
            width: signingDoc && !signingDoc.signatureUrl ? "1100px" : "700px",
            maxWidth: "95vw", maxHeight: "95vh", overflowY: "auto"
          }}>
            <button className="tp-close" onClick={() => { setViewDoc(null); setSigningDoc(null); setSigned(false); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
            {(() => {
              const d = signingDoc || viewDoc;
              const dateStr = d.createdAt ? new Date(d.createdAt.seconds * 1000).toLocaleDateString("ru-RU") : ymd();
              const needsSign = signingDoc && !signingDoc.signatureUrl;
              return (
                <div style={needsSign ? { display: "flex", gap: 24, flexWrap: "wrap" } : undefined}>
                  {/* Document preview (left side) */}
                  <div style={needsSign ? { flex: "1 1 380px", minWidth: 0 } : undefined}>
                    <div className="doc-preview">
                      <div className="doc-preview__regnum">No. {(d.id || "").slice(-6).toUpperCase() || "——"}</div>
                      <div className="doc-preview__header">
                        <img src="/logo-nis.png" alt="NIS" className="doc-preview__logo" />
                        <div className="doc-preview__org">{t("nisOrg")}</div>
                      </div>
                      <div className="doc-preview__title">{d.title}</div>
                      <div className="doc-preview__body">
                        <div className="doc-preview__field">
                          <span className="doc-preview__field-label">{t("recipient")}:</span>
                          <span className="doc-preview__field-value">{d.toName || d.toEmail || u.displayName || u.email}</span>
                        </div>
                        {d.body && (
                          <div className="doc-preview__field">
                            <span className="doc-preview__field-label">{t("docDescLabel")}:</span>
                            <span className="doc-preview__field-value" style={{ whiteSpace: "pre-wrap" }}>{d.body}</span>
                          </div>
                        )}
                        <div className="doc-preview__field">
                          <span className="doc-preview__field-label">{t("date")}:</span>
                          <span className="doc-preview__field-value">{dateStr}</span>
                        </div>
                        <div className="doc-preview__field">
                          <span className="doc-preview__field-label">{t("statusLabel")}:</span>
                          <span className="doc-preview__field-value"><Pill kind={statusColor(d.status)}>{statusLabel(d.status)}</Pill></span>
                        </div>
                        {d.requireSignature && (
                          <div className="doc-preview__field">
                            <span className="doc-preview__field-label">{t("needsSignature")}:</span>
                            <span className="doc-preview__field-value">{d.status === "signed" ? t("statusSigned") : t("reqPending")}</span>
                          </div>
                        )}
                      </div>
                      <div className="doc-preview__signature">
                        <div className="doc-preview__sig-block">
                          {d.signatureUrl ? <img src={d.signatureUrl} alt="Подпись" className="doc-preview__sig-img" /> : <div className="doc-preview__sig-line" />}
                          <div className="doc-preview__sig-label">{t("employeeSign")}</div>
                          <div className="doc-preview__sig-name">{u.displayName || ""}</div>
                        </div>
                        <div className="doc-preview__sig-block">
                          {d.adminSignatureUrl ? <img src={d.adminSignatureUrl} alt="Admin" className="doc-preview__sig-img" /> : <div className="doc-preview__sig-line" />}
                          <div className="doc-preview__sig-label">{t("directorSign")}</div>
                        </div>
                      </div>
                      <div className="doc-preview__date">{t("date")}: {dateStr}</div>
                      {d.status === "signed" && (
                        <div className="doc-preview__stamp">
                          <img src="/logo-nis.png" alt="" style={{ width: 30, height: 30, objectFit: "contain", opacity: .4, marginBottom: 4 }} />
                          <div>{t("statusSigned")}</div>
                        </div>
                      )}
                      {!needsSign && (
                        <div style={{ marginTop: 20, textAlign: "center", display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }} className="doc-preview__actions">
                          <Btn kind="primary" onClick={() => window.print()}><Icon name="file" /> {t("preview")}</Btn>
                          {d.requireSignature && d.status !== "signed" && (
                            <Btn kind="primary" onClick={() => { setSigningDoc(d); setViewDoc(null); setSigned(false); clearSig(); }}>{t("signDoc")}</Btn>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Signature pad (right side) */}
                  {needsSign && (
                    <div style={{ flex: "1 1 280px", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <div className="glass card" style={{ padding: 20 }}>
                        <div className="h2" style={{ marginBottom: 12 }}>{t("putSignature")}</div>
                        <canvas
                          ref={canvasRef}
                          width={800} height={200}
                          className="signature-pad"
                          style={{ width: "100%", height: 140, display: "block", cursor: "crosshair", marginBottom: 12, borderRadius: 10, border: "2px dashed var(--border)" }}
                          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
                          onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
                        />
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <Btn onClick={clearSig}>{t("clear")}</Btn>
                          <Btn kind="primary" onClick={submitSign} disabled={saving || !signed}>
                            {saving ? t("loading") : t("signBtn")}
                          </Btn>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>,
        document.body
      )}

      <div className="page-wrap">
        {/* Tabs */}
        <div className="prof-tabs" style={{ marginBottom: 16 }}>
          <button className={`prof-tab${activeTab === "sign" ? " prof-tab--active" : ""}`} onClick={() => setActiveTab("sign")}>
            <Icon name="file" /> {t("tabToSign")} {unsignedCount > 0 && <span className="at-tab-count">{unsignedCount}</span>}
          </button>
          <button className={`prof-tab${activeTab === "my" ? " prof-tab--active" : ""}`} onClick={() => setActiveTab("my")}>
            <Icon name="plus" /> {t("tabMyDocs")} {myTDocs.length > 0 && <span className="at-tab-count">{myTDocs.length}</span>}
          </button>
        </div>

        {/* Tab: Documents to sign (from admin) */}
        {activeTab === "sign" && (
          <>
            {docs.length === 0 ? (
              <div className="glass card" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
                {t("noDocuments")}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {docs.map(d => {
                  const dateStr = d.createdAt ? new Date(d.createdAt.seconds * 1000).toLocaleDateString("ru-RU") : "—";
                  return (
                    <div key={d.id} className="glass card" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.title}</div>
                        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.body}</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <Pill kind={statusColor(d.status)}>{statusLabel(d.status)}</Pill>
                          {d.requireSignature && d.status !== "signed" && <Pill kind="pending">{t("needsSignature")}</Pill>}
                          <span className="tiny muted">{dateStr}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <Btn onClick={() => openDoc(d)}>{t("view")}</Btn>
                        {d.requireSignature && d.status !== "signed" && (
                          <Btn kind="primary" onClick={() => { setSigningDoc(d); setSigned(false); clearSig(); }}>{t("signDoc")}</Btn>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Tab: My documents (teacher uploads) */}
        {activeTab === "my" && (
          <div className="grid2">
            <div className="glass card">
              <div className="h2">{t("myDocsTitle")}</div>
              <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{t("myDocsDesc")}</div>
              <div className="sep"></div>

              <form onSubmit={submitMyDoc}>
                <div className="label">{t("docNameLabel")}</div>
                <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder={t("docNamePlaceholder")} required />

                <div className="label">{t("docDescLabel")}</div>
                <Textarea value={docDesc} onChange={(e) => setDocDesc(e.target.value)} placeholder={t("docDescPlaceholder")} />

                <div className="label">{t("docFileLabel")}</div>
                <Input type="file" accept=".pdf,.doc,.docx,image/png,image/jpeg" onChange={(e) => setDocFile(e.target.files?.[0] || null)} required />

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                  <Btn kind="primary" type="submit" disabled={st.loading}>{t("uploadBtn")}</Btn>
                  <Btn type="button" onClick={refreshMyDocs} disabled={st.loading}>{t("refresh")}</Btn>
                </div>
              </form>
            </div>

            <div className="glass card">
              <div className="h2">{t("uploadedDocs")}</div>
              <div className="sep"></div>

              {myTDocs.length === 0 && <p className="muted">{t("noMyDocs")}</p>}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {myTDocs.map(d => {
                  const dateStr = d.createdAt ? new Date(d.createdAt.seconds * 1000).toLocaleDateString("ru-RU") : "—";
                  return (
                    <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700 }}>{d.title}</div>
                        {d.description && <div className="muted tiny">{d.description}</div>}
                        <div className="muted tiny">{d.fileName || "файл"} · {dateStr}</div>
                      </div>
                      {d.fileUrl && <a className="btn" href={d.fileUrl} target="_blank" rel="noreferrer">{t("openDoc")}</a>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/** ---------- Staff positions for admin documents & users ---------- */
const DEFAULT_POSITION_LIST = [
  // --- Административно-управленческий персонал ---
  { position: "Директор", group: "admin" },
  { position: "Заместитель директора, эксперт", group: "admin" },
  { position: "Заместитель директора", group: "admin" },
  { position: "Заместитель директора, модератор", group: "admin" },
  { position: "Заведующий лабораторией, модератор", group: "admin" },
  { position: "Главный бухгалтер", group: "admin" },
  { position: "Бухгалтер", group: "admin" },
  { position: "Экономист", group: "admin" },
  { position: "Юрист", group: "admin" },
  { position: "Менеджер по персоналу (HR менеджер)", group: "admin" },
  { position: "Менеджер по связям с общественностью (PR менеджер)", group: "admin" },
  { position: "Специалист по закупкам", group: "admin" },
  { position: "Инженер по безопасности и охране труда", group: "admin" },
  { position: "Делопроизводитель-секретарь", group: "admin" },
  // --- Основной производственный персонал ---
  { position: "Учитель-эксперт казахского языка и литературы", group: "teacher" },
  { position: "Учитель-модератор казахского языка и литературы", group: "teacher" },
  { position: "Учитель казахского языка", group: "teacher" },
  { position: "Учитель-эксперт русского языка и литературы", group: "teacher" },
  { position: "Учитель-модератор русского языка и литературы", group: "teacher" },
  { position: "Учитель русского языка и литературы", group: "teacher" },
  { position: "Учитель-эксперт английского языка", group: "teacher" },
  { position: "Учитель-модератор английского языка", group: "teacher" },
  { position: "Учитель английского языка", group: "teacher" },
  { position: "Учитель-стажёр английского языка", group: "teacher" },
  { position: "Учитель-эксперт биологии", group: "teacher" },
  { position: "Учитель-модератор биологии", group: "teacher" },
  { position: "Учитель-эксперт физики", group: "teacher" },
  { position: "Учитель-модератор физики", group: "teacher" },
  { position: "Учитель физики", group: "teacher" },
  { position: "Учитель-эксперт химии", group: "teacher" },
  { position: "Учитель-модератор химии", group: "teacher" },
  { position: "Учитель химии", group: "teacher" },
  { position: "Учитель-эксперт математики", group: "teacher" },
  { position: "Учитель-модератор математики", group: "teacher" },
  { position: "Учитель математики", group: "teacher" },
  { position: "Учитель-эксперт информатики", group: "teacher" },
  { position: "Учитель-модератор информатики", group: "teacher" },
  { position: "Учитель информатики", group: "teacher" },
  { position: "Учитель-стажер информатики", group: "teacher" },
  { position: "Учитель-эксперт географии", group: "teacher" },
  { position: "Учитель-модератор географии", group: "teacher" },
  { position: "Учитель географии", group: "teacher" },
  { position: "Учитель-эксперт истории", group: "teacher" },
  { position: "Учитель-модератор истории", group: "teacher" },
  { position: "Учитель истории", group: "teacher" },
  { position: "Учитель-эксперт глобальных перспектив и проектных работ, экономики", group: "teacher" },
  { position: "Учитель-модератор физической культуры", group: "teacher" },
  { position: "Учитель физической культуры", group: "teacher" },
  { position: "Преподаватель-организатор по НВП", group: "teacher" },
  { position: "Учитель-эксперт музыки", group: "teacher" },
  { position: "Учитель-эксперт изобразительного искусства", group: "teacher" },
  { position: "Учитель-модератор изобразительного искусства", group: "teacher" },
  { position: "Учитель изобразительного искусства", group: "teacher" },
  // --- Не основной производственный персонал ---
  { position: "Методист", group: "support" },
  { position: "Консультант по профессиональной ориентации", group: "support" },
  { position: "Старший педагог-библиотекарь", group: "support" },
  { position: "Педагог-библиотекарь", group: "support" },
  { position: "Старший инженер", group: "support" },
  { position: "Инженер по специальному оборудованию", group: "support" },
  { position: "Инженер по компьютерному оборудованию", group: "support" },
  { position: "Педагог-психолог", group: "support" },
  { position: "Педагог-организатор-куратор", group: "support" },
  { position: "Педагог дополнительного образования", group: "support" },
  { position: "Лаборант (химия)", group: "support" },
  { position: "Лаборант (биология)", group: "support" },
  { position: "Лаборант (физика)", group: "support" },
];
const POSITION_GROUP_MAP = {};
DEFAULT_POSITION_LIST.forEach(p => { POSITION_GROUP_MAP[p.position.toLowerCase()] = p.group; });

const STAFF_GROUPS = [
  { key: "admin", label: "Административно-управленческий персонал" },
  { key: "teacher", label: "Основной производственный персонал" },
  { key: "support", label: "Не основной производственный персонал" },
];
export function getStaffGroup(email, position) {
  if (position) {
    const g = POSITION_GROUP_MAP[position.toLowerCase()];
    if (g) return g;
  }
  return "teacher";
}
export function getStaffPosition(email, position) {
  return position || "";
}

/** ---------- PageAdminDocuments ---------- */
export function PageAdminDocuments() {
  const st = useStore();
  // All hooks before any conditional returns
  const [toUids, setToUids] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [requireSig, setRequireSig] = useState(false);
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState("send");
  const [filterUid, setFilterUid] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [recipientQ, setRecipientQ] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const u = st.userDoc;
  if (!u) return <Guard />;
  if (u.role !== "admin") return <Guard />;

  const allUsers = (st.users || []).filter(x => x.uid !== u.uid);
  const users = roleFilter ? allUsers.filter(x => getStaffGroup(x.email, x.position) === roleFilter) : allUsers;
  const groupedUsers = STAFF_GROUPS.map(g => ({
    ...g,
    users: allUsers.filter(x => getStaffGroup(x.email, x.position) === g.key)
  })).filter(g => g.users.length > 0);
  const docs = st.allDocuments || [];

  const selectedUsers = allUsers.filter(x => toUids.includes(x.uid));
  const toggleUid = (uid) => setToUids(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);

  const send = async () => {
    if (toUids.length === 0 || !title.trim() || !body.trim()) {
      toast(t("fillFields"), "error");
      return;
    }
    try {
      setSending(true);
      for (const uid of toUids) {
        const rec = allUsers.find(x => x.uid === uid);
        await createDocument({
          fromUid: u.uid,
          toUid: uid,
          toEmail: rec?.email || "",
          toName: rec?.displayName || rec?.email || "",
          title: title.trim(),
          body: body.trim(),
          requireSignature: requireSig
        });
      }
      const fresh = await fetchAllDocuments();
      setState({ allDocuments: fresh });
      toast(t("docSent") + ` (${toUids.length})`, "ok");
      setToUids([]); setTitle(""); setBody(""); setRequireSig(false);
    } catch (e) {
      toast(e?.message || t("error"), "error");
    } finally {
      setSending(false);
    }
  };

  const filteredDocs = filterUid ? docs.filter(d => d.toUid === filterUid) : docs;
  const statusLabel = (s) => s === "signed" ? t("statusSigned") : s === "viewed" ? t("statusViewed") : t("sendTab");
  const statusColor = (s) => s === "signed" ? "approved" : s === "viewed" ? "pending" : "rejected";

  return (
    <div className="page-wrap">
      <div className="glass card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn kind={tab === "send" ? "primary" : "ghost"} onClick={() => setTab("send")}>{t("sendTab")}</Btn>
          <Btn kind={tab === "list" ? "primary" : "ghost"} onClick={() => setTab("list")}>{t("listTab")} ({docs.length})</Btn>
        </div>
      </div>

      {tab === "send" && (() => {
        const rq = recipientQ.trim().toLowerCase();
        const recipientList = (roleFilter ? users : allUsers).filter(x => {
          if (!rq) return true;
          const hay = `${x.displayName || ""} ${x.email || ""} ${x.position || ""}`.toLowerCase();
          return hay.includes(rq);
        });
        const recipientGrouped = STAFF_GROUPS.map(g => ({
          ...g,
          users: recipientList.filter(x => getStaffGroup(x.email, x.position) === g.key)
        })).filter(g => g.users.length > 0);

        return (
          <div className="admin-users-layout">
            {/* LEFT: Recipient picker */}
            <div className="admin-users-left">
              <div className="glass card" style={{ position: "sticky", top: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(135,188,46,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="user" />
                  </div>
                  <div className="h2" style={{ margin: 0, flex: 1 }}>{t("recipient")}</div>
                </div>

                {/* Selected users chips */}
                {selectedUsers.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {selectedUsers.map(su => (
                      <div key={su.uid} style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(135,188,46,.12)", borderRadius: 20, padding: "3px 10px 3px 6px", fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>
                        {su.avatarUrl ? (
                          <img src={su.avatarUrl} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(135,188,46,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800 }}>
                            {(su.displayName || su.email || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{su.displayName || su.email}</span>
                        <button className="iconbtn" onClick={() => toggleUid(su.uid)} style={{ width: 16, height: 16, fontSize: 10, padding: 0 }}><Icon name="x" /></button>
                      </div>
                    ))}
                    <button className="iconbtn" onClick={() => setToUids([])} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, color: "var(--muted)" }}>{t("clearAll")}</button>
                  </div>
                ) : (
                  <div className="admin-users-placeholder">
                    <div className="muted" style={{ fontSize: 13 }}>{t("selectRecipients")}</div>
                  </div>
                )}

                {/* Search */}
                <input className="input" style={{ width: "100%", marginBottom: 8 }} placeholder={t("searchPlaceholder")} value={recipientQ} onChange={e => setRecipientQ(e.target.value)} />

                {/* Group filter pills */}
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                  <Btn kind={roleFilter === "" ? "primary" : "ghost"} onClick={() => { setRoleFilter(""); }} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8 }}>{t("all")}</Btn>
                  {STAFF_GROUPS.map(g => {
                    const cnt = allUsers.filter(x => getStaffGroup(x.email, x.position) === g.key).length;
                    return cnt > 0 ? <Btn key={g.key} kind={roleFilter === g.key ? "primary" : "ghost"} onClick={() => { setRoleFilter(g.key); }} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8 }}>{g.label} ({cnt})</Btn> : null;
                  })}
                </div>

                {/* Scrollable user list */}
                <div style={{ maxHeight: "calc(100vh - 480px)", overflowY: "auto", margin: "0 -4px", padding: "0 4px" }}>
                  {recipientGrouped.length === 0 && <div className="muted" style={{ textAlign: "center", padding: 12, fontSize: 13 }}>{t("noResults")}</div>}
                  {recipientGrouped.map(g => {
                    const grpColor = g.key === "admin" ? "#6366f1" : g.key === "support" ? "#06b6d4" : "var(--accent)";
                    const isOpen = !collapsedGroups[g.key];
                    const grpUids = g.users.map(x => x.uid);
                    const allSel = grpUids.every(id => toUids.includes(id));
                    const selCount = grpUids.filter(id => toUids.includes(id)).length;
                    return (
                      <div key={g.key} style={{ marginBottom: 4 }}>
                        <div className="pos-group-label" style={{ color: grpColor, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}
                          onClick={() => setCollapsedGroups(prev => ({ ...prev, [g.key]: !prev[g.key] }))}>
                          <span style={{ transition: "transform .2s", transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", display: "inline-flex" }}>
                            <Icon name="chevron" />
                          </span>
                          <span style={{ flex: 1 }}>{g.label} ({g.users.length}){selCount > 0 && <span style={{ fontSize: 11, opacity: .7 }}> — {selCount} {t("selected") || "selected"}</span>}</span>
                          <button className="iconbtn" style={{ fontSize: 10, padding: "1px 6px", borderRadius: 6, color: grpColor, opacity: .7 }}
                            onClick={(e) => { e.stopPropagation(); setToUids(prev => allSel ? prev.filter(id => !grpUids.includes(id)) : [...new Set([...prev, ...grpUids])]); }}>
                            {allSel ? t("deselectAll") : t("selectAll")}
                          </button>
                        </div>
                        <div style={{ overflow: "hidden", maxHeight: isOpen ? g.users.length * 60 : 0, opacity: isOpen ? 1 : 0, transition: "max-height .25s ease, opacity .2s ease" }}>
                          {g.users.map(x => {
                            const isSel = toUids.includes(x.uid);
                            const initials = (x.displayName || x.email || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                            return (
                              <div key={x.uid} className={`pos-item${isSel ? " active" : ""}`} onClick={() => toggleUid(x.uid)} style={{ padding: "6px 10px", gap: 8 }}>
                                {x.avatarUrl ? (
                                  <img src={x.avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                                ) : (
                                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${grpColor}18`, color: grpColor, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{initials}</div>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: isSel ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.displayName || x.email}</div>
                                  {x.position && <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.position}</div>}
                                </div>
                                <div style={{ width: 18, height: 18, borderRadius: 4, border: isSel ? "none" : "2px solid var(--border)", background: isSel ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .15s" }}>
                                  {isSel && <Icon name="check" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* MIDDLE: Document form */}
            <div className="admin-docs-middle">
              <div className="glass card">
                <div className="h2" style={{ marginBottom: 16 }}>{t("newDocument")}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label className="label">{t("subjectLabel2")}</label>
                    <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder={t("subjectPlaceholder")} />
                  </div>
                  <div>
                    <label className="label">{t("docText")}</label>
                    <textarea className="input" rows={8} value={body} onChange={e => setBody(e.target.value)} placeholder={t("docTextPlaceholder")} style={{ resize: "vertical" }} />
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14 }}>
                    <input type="checkbox" checked={requireSig} onChange={e => setRequireSig(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--accent)" }} />
                    <span>{t("requireSignature")}</span>
                  </label>
                  <div>
                    <Btn kind="primary" onClick={send} disabled={sending || toUids.length === 0}>
                      {sending ? t("sending") : toUids.length > 1 ? `${t("sendDocument")} (${toUids.length})` : t("sendDocument")}
                    </Btn>
                    {toUids.length === 0 && <span className="muted" style={{ fontSize: 12, marginLeft: 10 }}>{t("selectRecipients")}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Live document preview */}
            <div className="admin-docs-preview">
              <div className="glass card" style={{ position: "sticky", top: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(135,188,46,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="file" />
                  </div>
                  <div className="h2" style={{ margin: 0 }}>{t("docPreview")}</div>
                </div>

                {(!title.trim() && !body.trim()) ? (
                  <div style={{ textAlign: "center", padding: "32px 12px", color: "var(--muted)" }}>
                    <Icon name="file" />
                    <div style={{ fontSize: 13, marginTop: 8 }}>{t("docPreviewHint")}</div>
                  </div>
                ) : (
                  <div className="doc-preview" style={{ fontSize: 12, padding: 20 }}>
                    <div className="doc-preview__header">
                      <img src="/logo-nis.png" alt="NIS" className="doc-preview__logo" style={{ width: 36, height: 36 }} />
                      <div className="doc-preview__org">{t("nisOrg")}</div>
                    </div>

                    <div className="doc-preview__title" style={{ fontSize: 14, margin: "14px 0 10px" }}>{title.trim() || t("officialLetter")}</div>

                    <div className="doc-preview__body" style={{ fontSize: 12 }}>
                      <div className="doc-preview__field">
                        <span className="doc-preview__field-label">{t("fromLabel")}:</span>
                        <span className="doc-preview__field-value">{u.displayName || u.email || "—"}</span>
                      </div>
                      {selectedUsers.length > 0 && (
                        <div className="doc-preview__field">
                          <span className="doc-preview__field-label">{t("toLabel")}:</span>
                          <span className="doc-preview__field-value">
                            {selectedUsers.length <= 3
                              ? selectedUsers.map(s => s.displayName || s.email).join(", ")
                              : `${selectedUsers.slice(0, 2).map(s => s.displayName || s.email).join(", ")} +${selectedUsers.length - 2}`}
                          </span>
                        </div>
                      )}
                      {body.trim() && (
                        <div style={{ marginTop: 10, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{body}</div>
                      )}
                    </div>

                    <div className="doc-preview__signature" style={{ marginTop: 18 }}>
                      <div className="doc-preview__sig-block">
                        {u.signatureUrl ? <img src={u.signatureUrl} alt="" className="doc-preview__sig-img" /> : <div className="doc-preview__sig-line" />}
                        <div className="doc-preview__sig-label">{t("directorSign")}</div>
                        <div className="doc-preview__sig-name">{u.displayName || ""}</div>
                      </div>
                      {requireSig && (
                        <div className="doc-preview__sig-block">
                          <div className="doc-preview__sig-line" />
                          <div className="doc-preview__sig-label">{t("employeeSign")}</div>
                        </div>
                      )}
                    </div>

                    <div className="doc-preview__date" style={{ fontSize: 11 }}>{t("date")}: {new Date().toLocaleDateString("ru-RU")}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {tab === "list" && (
        <div className="glass card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <div className="h2">{t("sentDocuments")}</div>
            <select className="input" style={{ width: "auto", minWidth: 180 }} value={filterUid} onChange={e => setFilterUid(e.target.value)}>
              <option value="">{t("all")}</option>
              {allUsers.map(x => <option key={x.uid} value={x.uid}>{x.displayName || x.email}</option>)}
            </select>
          </div>
          {filteredDocs.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>{t("noSentDocs")}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredDocs.map(d => {
                const dateStr = d.createdAt ? new Date(d.createdAt.seconds * 1000).toLocaleDateString("ru-RU") : "—";
                const recipient = allUsers.find(x => x.uid === d.toUid);
                return (
                  <div key={d.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>{d.title}</div>
                      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>
                        {recipient?.displayName || d.toName || d.toEmail}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <Pill kind={statusColor(d.status)}>{statusLabel(d.status)}</Pill>
                        {d.requireSignature && <Pill kind="pending">{t("signaturePill")}</Pill>}
                        <span className="tiny muted">{dateStr}</span>
                      </div>
                    </div>
                    {d.signatureUrl && (
                      <img src={d.signatureUrl} alt="Подпись" style={{ width: 80, height: 40, objectFit: "contain", border: "1px solid var(--border)", borderRadius: 6, padding: 2, background: "#fff" }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PageAdminTypes() {
  const st = useStore();
  const u = st.userDoc;
  const [form, setForm] = useState({ section: "", subsection: "", name: "", defaultPoints: 5 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ section: "", subsection: "", name: "", defaultPoints: 5 });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [q, setQ] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [sortCol, setSortCol] = useState("");
  const [sortDir, setSortDir] = useState("asc");

  if (!u) return <Guard />;
  if (u.role !== "admin") return <Guard />;

  async function refresh() {
    const tp = await fetchTypesAll();
    setState({ types: tp });
  }
  async function seed() {
    try {
      setState({ loading: true });
      const r = await seedDefaultTypes();
      toast(r.added ? `${t("typeSeedAdded")}: ${r.added}` : t("typeSeedNone"), "ok");
      await refresh();
    } catch (e) {
      console.error(e);
      toast(e?.message || e?.code || t("error"), "error");
    } finally { setState({ loading: false }); }
  }
  async function add() {
    try {
      if (!safeText(form.section) || !safeText(form.subsection) || !safeText(form.name)) {
        toast(t("fillFields"), "error"); return;
      }
      setState({ loading: true });
      await addType(form);
      toast(t("typeAdded"), "ok");
      setForm({ section: "", subsection: "", name: "", defaultPoints: 5 });
      setShowAddModal(false);
      await refresh();
    } catch (e) {
      console.error(e);
      toast(e?.message || t("error"), "error");
    } finally { setState({ loading: false }); }
  }
  async function toggle(id, active) {
    try {
      await toggleType(id, active);
      toast(t("updated"), "ok");
      await refresh();
    } catch (e) {
      console.error(e);
      toast(e?.message || t("error"), "error");
    }
  }
  async function doDelete(id) {
    try {
      setDeleting(true);
      await deleteTypeDoc(id);
      toast(t("typeDeleted"), "ok");
      setConfirmDelete(null);
      await refresh();
    } catch (e) {
      console.error(e);
      toast(e?.message || t("error"), "error");
    } finally { setDeleting(false); }
  }
  async function saveEdit() {
    try {
      if (!safeText(editForm.section) || !safeText(editForm.subsection) || !safeText(editForm.name)) {
        toast(t("fillFields"), "error"); return;
      }
      setState({ loading: true });
      await updateType(editModal, {
        section: safeText(editForm.section),
        subsection: safeText(editForm.subsection),
        name: safeText(editForm.name),
        defaultPoints: Number(editForm.defaultPoints) || 0
      });
      toast(t("updated"), "ok");
      setEditModal(null);
      await refresh();
    } catch (e) {
      console.error(e);
      toast(e?.message || t("error"), "error");
    } finally { setState({ loading: false }); }
  }

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  const allTypes = st.types || [];
  const sections = [...new Set(allTypes.map(x => x.section).filter(Boolean))].sort();
  const sectionCounts = {};
  sections.forEach(s => { sectionCounts[s] = allTypes.filter(x => x.section === s).length; });

  const qn = q.trim().toLowerCase();
  let filtered = allTypes.filter(x => {
    const hay = `${x.section || ""} ${x.subsection || ""} ${x.name || ""}`.toLowerCase();
    return hay.includes(qn);
  });
  if (sectionFilter) filtered = filtered.filter(x => x.section === sectionFilter);

  const sorted = [...filtered].sort((a, b) => {
    if (!sortCol) return 0;
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortCol === "section") return dir * (a.section || "").localeCompare(b.section || "", "ru");
    if (sortCol === "subsection") return dir * (a.subsection || "").localeCompare(b.subsection || "", "ru");
    if (sortCol === "name") return dir * (a.name || "").localeCompare(b.name || "", "ru");
    if (sortCol === "points") return dir * ((Number(a.defaultPoints) || 0) - (Number(b.defaultPoints) || 0));
    if (sortCol === "active") return dir * ((a.active ? 1 : 0) - (b.active ? 1 : 0));
    return 0;
  });

  const activeCount = allTypes.filter(x => x.active).length;
  const delType = confirmDelete ? allTypes.find(x => x.id === confirmDelete) : null;

  return (
    <>
      {/* Delete confirmation modal */}
      {confirmDelete && createPortal(
        <div className="modalback" onClick={() => setConfirmDelete(null)}>
          <div className="modal glass" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="h2" style={{ marginBottom: 12 }}>{t("typeDeleteTitle")}</div>
            <p className="p" style={{ marginBottom: 16 }}>
              <b>{delType?.name || confirmDelete}</b><br />
              <span className="muted" style={{ fontSize: 13 }}>{delType?.section} &rarr; {delType?.subsection}</span><br />
              <span className="muted" style={{ fontSize: 13, marginTop: 8, display: "block" }}>{t("typeDeleteWarning")}</span>
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={() => setConfirmDelete(null)}>{t("cancel")}</Btn>
              <Btn kind="primary" style={{ background: "var(--red, #ef4444)" }} onClick={() => doDelete(confirmDelete)} disabled={deleting}>
                {deleting ? t("deleting") : `\u2715 ${t("delete")}`}
              </Btn>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add type modal */}
      {showAddModal && createPortal(
        <div className="modalback" onClick={() => setShowAddModal(false)}>
          <div className="modal glass" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div className="h2" style={{ margin: 0 }}>{t("addTypeTitle")}</div>
              <button className="iconbtn" onClick={() => setShowAddModal(false)}><Icon name="x" /></button>
            </div>
            <div className="label">{t("typeSection")}</div>
            <Input value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} placeholder={t("typeSectionPlaceholder")} />
            <div className="label" style={{ marginTop: 10 }}>{t("typeSubsection")}</div>
            <Input value={form.subsection} onChange={e => setForm(f => ({ ...f, subsection: e.target.value }))} placeholder={t("typeSubsectionPlaceholder")} />
            <div className="label" style={{ marginTop: 10 }}>{t("typeName")}</div>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t("typeNamePlaceholder")} />
            <div className="label" style={{ marginTop: 10 }}>{t("typePoints")}</div>
            <Input type="number" min="0" max="9999" value={form.defaultPoints} onChange={e => setForm(f => ({ ...f, defaultPoints: e.target.value }))} />
            <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
              <Btn onClick={() => setShowAddModal(false)}>{t("cancel")}</Btn>
              <Btn kind="primary" onClick={add} disabled={st.loading}><Icon name="plus" /> {t("typeAddBtn")}</Btn>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit type modal */}
      {editModal && createPortal(
        <div className="modalback" onClick={() => setEditModal(null)}>
          <div className="modal glass" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div className="h2" style={{ margin: 0 }}>{t("typeEditTitle")}</div>
              <button className="iconbtn" onClick={() => setEditModal(null)}><Icon name="x" /></button>
            </div>
            <div className="label">{t("typeSection")}</div>
            <Input value={editForm.section} onChange={e => setEditForm(f => ({ ...f, section: e.target.value }))} />
            <div className="label" style={{ marginTop: 10 }}>{t("typeSubsection")}</div>
            <Input value={editForm.subsection} onChange={e => setEditForm(f => ({ ...f, subsection: e.target.value }))} />
            <div className="label" style={{ marginTop: 10 }}>{t("typeName")}</div>
            <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            <div className="label" style={{ marginTop: 10 }}>{t("typePoints")}</div>
            <Input type="number" min="0" max="9999" value={editForm.defaultPoints} onChange={e => setEditForm(f => ({ ...f, defaultPoints: e.target.value }))} />
            <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
              <Btn onClick={() => setEditModal(null)}>{t("cancel")}</Btn>
              <Btn kind="primary" onClick={saveEdit} disabled={st.loading}>{t("save")}</Btn>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Page header */}
      <div className="glass card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="types-stat-pill">
            <Icon name="check" />
            <span>{activeCount} {t("typeActive")}</span>
          </div>
          <div className="types-stat-pill muted-pill">
            <Icon name="file" />
            <span>{allTypes.length} {t("typeTotal")}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
          <Btn kind="primary" onClick={() => setShowAddModal(true)}><Icon name="plus" /> {t("addTypeTitle")}</Btn>
          <Btn onClick={seed} disabled={st.loading}>{t("seedDefaults")}</Btn>
          <Btn onClick={refresh}><Icon name="refresh" /></Btn>
        </div>
      </div>

      {/* Filters */}
      <div className="glass card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder={t("typeSearchPlaceholder")} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Btn kind={sectionFilter === "" ? "primary" : "ghost"} onClick={() => setSectionFilter("")} style={{ fontSize: 12, padding: "5px 14px", borderRadius: 8 }}>
            {t("typeAllSections")} ({allTypes.length})
          </Btn>
          {sections.map(s => (
            <Btn key={s} kind={sectionFilter === s ? "primary" : "ghost"} onClick={() => setSectionFilter(sectionFilter === s ? "" : s)} style={{ fontSize: 12, padding: "5px 14px", borderRadius: 8 }}>
              {s} ({sectionCounts[s] || 0})
            </Btn>
          ))}
        </div>
      </div>

      {/* Types table */}
      {!filtered.length && <div className="glass card"><p className="p muted" style={{ padding: "12px 0", textAlign: "center" }}>{t("noTypes")}</p></div>}

      {filtered.length > 0 && (
        <div className="excel-table-wrap glass">
          <table className="excel-table">
            <thead>
              <tr>
                <th style={{ width: 44 }}>#</th>
                {[
                  { key: "section", label: t("typeSection") },
                  { key: "subsection", label: t("typeSubsection") },
                  { key: "name", label: t("typeName") },
                  { key: "points", label: t("typePoints"), style: { width: 80, textAlign: "right" } },
                  { key: "active", label: t("typeActiveCol"), style: { width: 80, textAlign: "center" } },
                ].map(col => (
                  <th key={col.key} className="excel-th-sort" style={col.style || {}} onClick={() => toggleSort(col.key)}>
                    <span>{col.label}</span>
                    <span className="excel-sort-icon">{sortCol === col.key ? (sortDir === "asc" ? "\u25B2" : "\u25BC") : "\u25B4\u25BE"}</span>
                  </th>
                ))}
                <th style={{ width: 110, textAlign: "center" }}>{t("colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((x, idx) => (
                <tr key={x.id}>
                  <td className="excel-cell-num">{idx + 1}</td>
                  <td>
                    <span className="excel-pos-pill" style={{ background: "rgba(135,188,46,.08)", color: "var(--accent)", borderColor: "rgba(135,188,46,.25)" }}>{x.section}</span>
                  </td>
                  <td><span className="muted" style={{ fontSize: 13 }}>{x.subsection}</span></td>
                  <td><b style={{ fontSize: 13 }}>{x.name}</b></td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "var(--accent)", fontSize: 14 }}>{fmtPoints(x.defaultPoints)}</td>
                  <td style={{ textAlign: "center" }}>
                    <label className="type-toggle">
                      <input type="checkbox" checked={!!x.active} onChange={e => toggle(x.id, e.target.checked)} />
                      <span className="type-toggle-slider" />
                    </label>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                      <button className="excel-action-btn" title={t("typeEditTitle")} onClick={() => { setEditModal(x.id); setEditForm({ section: x.section || "", subsection: x.subsection || "", name: x.name || "", defaultPoints: x.defaultPoints || 0 }); }}>
                        <Icon name="settings" />
                      </button>
                      <button className="excel-action-btn excel-action-del" title={t("delete")} onClick={() => setConfirmDelete(x.id)}>
                        <Icon name="x" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function PageAdminUsers() {
  const st = useStore();
  const [q, setQ] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmRole, setConfirmRole] = useState(null);
  const [groupFilter, setGroupFilter] = useState("");
  const [posFilter, setPosFilter] = useState("");
  const [selectedUid, setSelectedUid] = useState(null);
  const [customPos, setCustomPos] = useState([]);
  const [newPosName, setNewPosName] = useState("");
  const [posSearch, setPosSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [usersTab, setUsersTab] = useState("users");
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilter, setLogFilter] = useState("");
  const [sortCol, setSortCol] = useState("");
  const [sortDir, setSortDir] = useState("asc");

  const u = st.userDoc;

  useEffect(() => {
    fetchCustomPositions().then(setCustomPos).catch(() => { });
  }, []);

  const loadLogs = async () => {
    try {
      setLogsLoading(true);
      const data = await fetchAdminLogs(300);
      setLogs(data);
    } catch (e) { console.error(e); }
    finally { setLogsLoading(false); }
  };

  useEffect(() => {
    if (usersTab === "history") loadLogs();
  }, [usersTab]);

  if (!u) return <Guard />;
  if (u.role !== "admin") return <Guard />;

  const allPositions = [...DEFAULT_POSITION_LIST.map(p => p.position), ...customPos];
  const allUsrs = st.users || [];

  const qn = q.trim().toLowerCase();
  const afterSearch = allUsrs.filter(x => {
    const hay = `${x.displayName || ""} ${x.email || ""} ${x.position || ""} ${x.school || ""} ${x.subject || ""}`.toLowerCase();
    return hay.includes(qn);
  });
  let filtered = groupFilter ? afterSearch.filter(x => getStaffGroup(x.email, x.position) === groupFilter) : afterSearch;
  if (posFilter) filtered = filtered.filter(x => (x.position || "") === posFilter);

  const groupCounts = {};
  STAFF_GROUPS.forEach(g => { groupCounts[g.key] = 0; });
  allUsrs.forEach(x => { const g = getStaffGroup(x.email, x.position); groupCounts[g] = (groupCounts[g] || 0) + 1; });

  // Position counts for sub-filter
  const posCounts = {};
  const afterGroupFilter = groupFilter ? afterSearch.filter(x => getStaffGroup(x.email, x.position) === groupFilter) : afterSearch;
  afterGroupFilter.forEach(x => { const p = x.position || ""; posCounts[p] = (posCounts[p] || 0) + 1; });
  const uniquePositions = Object.keys(posCounts).filter(p => p).sort();

  async function setR(uid, role) {
    try {
      setState({ loading: true });
      const target = allUsrs.find(x => x.uid === uid);
      const oldRole = target?.role || "";
      await setRole(uid, role);
      await logAdminAction({ action: "role_change", targetUid: uid, targetName: target?.displayName || target?.email || uid, details: `${oldRole} → ${role}` });
      toast(t("roleUpdated"), "ok");
      const users = await fetchUsersAll();
      setState({ users });
    } catch (e) {
      console.error(e);
      toast(e?.message || "Error", "error");
    } finally { setState({ loading: false }); }
  }

  async function assignPos(uid, pos) {
    try {
      setState({ loading: true });
      const target = allUsrs.find(x => x.uid === uid);
      const oldPos = target?.position || "—";
      await setPosition(uid, pos);
      await logAdminAction({ action: "position_change", targetUid: uid, targetName: target?.displayName || target?.email || uid, details: `${oldPos} → ${pos || "—"}` });
      toast(t("positionUpdated"), "ok");
      const users = await fetchUsersAll();
      setState({ users });
    } catch (e) {
      console.error(e);
      toast(e?.message || "Error", "error");
    } finally { setState({ loading: false }); }
  }

  async function doDelete(uid) {
    try {
      setDeleting(true);
      const target = allUsrs.find(x => x.uid === uid);
      const targetName = target?.displayName || target?.email || uid;
      const targetPos = target?.position || "";
      await deleteUserAndData(uid);
      await logAdminAction({ action: "user_delete", targetUid: uid, targetName, details: targetPos });
      const users = await fetchUsersAll();
      setState({ users });
      toast(t("accountDeleted"), "ok");
      setConfirmDelete(null);
    } catch (e) {
      console.error(e);
      toast(e?.message || t("deleteError"), "error");
    } finally { setDeleting(false); }
  }

  async function addCustomPos() {
    const name = newPosName.trim();
    if (!name) return;
    if (allPositions.some(p => p.toLowerCase() === name.toLowerCase())) {
      toast(t("positionExists"), "error"); return;
    }
    const updated = [...customPos, name];
    await saveCustomPositions(updated);
    setCustomPos(updated);
    setNewPosName("");
    toast(t("positionAdded"), "ok");
  }

  async function removeCustomPos(name) {
    const updated = customPos.filter(p => p !== name);
    await saveCustomPositions(updated);
    setCustomPos(updated);
    toast(t("positionRemoved"), "ok");
  }

  function toggleSort(col) {
    if (sortCol === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  const sorted = [...filtered].sort((a, b) => {
    if (!sortCol) return 0;
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortCol === "name") {
      return dir * (a.displayName || "").localeCompare(b.displayName || "", "ru");
    }
    if (sortCol === "email") {
      return dir * (a.email || "").localeCompare(b.email || "", "ru");
    }
    if (sortCol === "position") {
      return dir * (a.position || "").localeCompare(b.position || "", "ru");
    }
    if (sortCol === "role") {
      return dir * (a.role || "").localeCompare(b.role || "", "ru");
    }
    if (sortCol === "points") {
      return dir * ((Number(a.totalPoints) || 0) - (Number(b.totalPoints) || 0));
    }
    return 0;
  });

  const onlineCount = filtered.filter(x => x.online === true).length;
  const delUser = confirmDelete ? allUsrs.find(x => x.uid === confirmDelete) : null;
  const selUser = selectedUid ? allUsrs.find(x => x.uid === selectedUid) : null;

  return (
    <>
      {/* Delete confirmation modal (portal to body) */}
      {confirmDelete && createPortal(
        <div className="modalback" onClick={() => setConfirmDelete(null)}>
          <div className="modal glass" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="h2" style={{ marginBottom: 12 }}>{t("deleteAccount")}</div>
            <p className="p" style={{ marginBottom: 16 }}>
              <b>{delUser?.displayName || delUser?.email || confirmDelete}</b> {t("deleteConfirm")}<br />
              <span className="muted" style={{ fontSize: 13 }}>{t("deleteWarning")}</span>
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={() => setConfirmDelete(null)}>{t("cancel")}</Btn>
              <Btn kind="primary" style={{ background: "var(--red, #ef4444)" }} onClick={() => doDelete(confirmDelete)} disabled={deleting}>
                {deleting ? t("deleting") : `\u2715 ${t("delete")}`}
              </Btn>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Role change confirmation modal (portal to body) */}
      {confirmRole && createPortal((() => {
        const crUser = allUsrs.find(x => x.uid === confirmRole.uid);
        const newRole = confirmRole.newRole;
        return (
          <div className="modalback" onClick={() => setConfirmRole(null)}>
            <div className="modal glass" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
              <div className="h2" style={{ marginBottom: 12 }}>{t("roleChangeTitle")}</div>
              <p className="p" style={{ marginBottom: 16 }}>
                <b>{crUser?.displayName || crUser?.email || confirmRole.uid}</b><br />
                <span style={{ fontSize: 13 }}>{t("roleChangeConfirm")} <b style={{ color: newRole === "admin" ? "#6366f1" : "var(--accent)" }}>{newRole}</b>?</span>
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={() => setConfirmRole(null)}>{t("cancel")}</Btn>
                <Btn kind="primary" onClick={() => { setR(confirmRole.uid, newRole); setConfirmRole(null); }} disabled={st.loading}>
                  {t("confirm")}
                </Btn>
              </div>
            </div>
          </div>
        );
      })(), document.body)}

      {/* Page header */}
      <div className="glass card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
          <span className="online-dot" />
          <span style={{ color: "var(--green, #22c55e)" }}>{onlineCount} online</span>
          <span className="muted">/ {filtered.length}</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <Btn kind={usersTab === "users" ? "primary" : "ghost"} onClick={() => setUsersTab("users")}>{t("usersTabUsers")}</Btn>
          <Btn kind={usersTab === "history" ? "primary" : "ghost"} onClick={() => setUsersTab("history")}>{t("usersTabHistory")} ({logs.length})</Btn>
        </div>
      </div>

      {/* Position assignment overlay */}
      {selUser && createPortal(
        <div className="tp-overlay" onClick={() => setSelectedUid(null)}>
          <div className="tp-card tp-card--v2" onClick={e => e.stopPropagation()} style={{ maxHeight: "90vh", overflowY: "auto" }}>
            <button className="tp-close" onClick={() => setSelectedUid(null)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>

            <div style={{ padding: "24px 24px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(135,188,46,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="briefcase" />
                </div>
                <div className="tp-name" style={{ margin: 0, flex: 1 }}>{t("assignPosition")}</div>
              </div>

              {/* Selected user */}
              <div className="admin-users-selected">
                {selUser.avatarUrl ? (
                  <img src={selUser.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(135,188,46,.15)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                    {(selUser.displayName || selUser.email || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 14 }}>{selUser.displayName || selUser.email}</b>
                  {selUser.position && <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>{selUser.position}</div>}
                </div>
              </div>

              {/* Position search */}
              <div style={{ marginBottom: 10, marginTop: 12 }}>
                <input className="input" style={{ fontSize: 13 }} placeholder={t("searchPositionPlaceholder")} value={posSearch} onChange={e => setPosSearch(e.target.value)} />
              </div>

              {/* Position list grouped — collapsible */}
              <div className="pos-scroll" style={{ maxHeight: "calc(90vh - 360px)", overflowY: "auto", margin: "0 -4px", padding: "0 4px" }}>
                {(() => {
                  const psq = posSearch.trim().toLowerCase();
                  return STAFF_GROUPS.map(g => {
                    const gPos = DEFAULT_POSITION_LIST.filter(p => p.group === g.key);
                    const cPos = g.key === "teacher" ? customPos : [];
                    const filteredGPos = psq ? gPos.filter(p => p.position.toLowerCase().includes(psq)) : gPos;
                    const filteredCPos = psq ? cPos.filter(p => p.toLowerCase().includes(psq)) : cPos;
                    if (!filteredGPos.length && !filteredCPos.length) return null;
                    const grpColor = g.key === "admin" ? "#6366f1" : g.key === "support" ? "#06b6d4" : "var(--accent)";
                    const totalInGroup = filteredGPos.length + filteredCPos.length;
                    const isCollapsed = !psq && collapsedGroups[g.key];
                    const toggleCollapse = () => setCollapsedGroups(prev => ({ ...prev, [g.key]: !prev[g.key] }));
                    return (
                      <div key={g.key} className="pos-group-section">
                        <div className="pos-group-header" style={{ color: grpColor }} onClick={toggleCollapse}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                            <span className="pos-group-chevron" style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0)" }}><Icon name="chevron" /></span>
                            <span className="pos-group-title">{g.label}</span>
                          </div>
                          <span className="pos-group-count" style={{ background: `${grpColor}18`, color: grpColor }}>{totalInGroup}</span>
                        </div>
                        {!isCollapsed && (
                          <div className="pos-group-items">
                            {filteredGPos.map(p => {
                              const active = selUser?.position === p.position;
                              const cnt = allUsrs.filter(x => x.position === p.position).length;
                              return (
                                <div key={p.position} className={`pos-item${active ? " active" : ""}`} onClick={() => assignPos(selUser.uid, p.position)}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    {active && <Icon name="check" />}
                                    <span>{p.position}</span>
                                  </div>
                                  {cnt > 0 && <span className="tiny muted">{cnt}</span>}
                                </div>
                              );
                            })}
                            {filteredCPos.map(p => {
                              const active = selUser?.position === p;
                              const cnt = allUsrs.filter(x => x.position === p).length;
                              return (
                                <div key={p} className={`pos-item${active ? " active" : ""}`} style={{ paddingRight: 4 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }} onClick={() => assignPos(selUser.uid, p)}>
                                    {active && <Icon name="check" />}
                                    <span>{p}</span>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    {cnt > 0 && <span className="tiny muted">{cnt}</span>}
                                    <button className="iconbtn" onClick={(e) => { e.stopPropagation(); removeCustomPos(p); }} style={{ color: "var(--red, #ef4444)", width: 22, height: 22 }}><Icon name="x" /></button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}

                {/* Clear position */}
                {selUser.position && (
                  <div className="pos-item" style={{ color: "var(--red, #ef4444)", marginTop: 8 }} onClick={() => assignPos(selUser.uid, "")}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon name="x" />
                      <span>{t("noPosition")}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Add custom position */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", marginTop: 14, paddingTop: 12, paddingBottom: 20 }}>
                <div className="label" style={{ fontSize: 12, marginBottom: 6 }}>{t("addPosition")}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="input" style={{ flex: 1 }} placeholder={t("positionName")} value={newPosName} onChange={e => setNewPosName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addCustomPos(); }} />
                  <Btn kind="primary" onClick={addCustomPos} disabled={!newPosName.trim()}><Icon name="plus" /></Btn>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ===== Users layout ===== */}
      {usersTab === "users" && <div>
          {/* Filters */}
          <div className="glass card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <Input value={q} onChange={e => setQ(e.target.value)} placeholder={t("searchPlaceholder")} />
              </div>
              <Btn onClick={async () => { const users = await fetchUsersAll(); setState({ users }); toast(t("updated"), "ok"); }} style={{ flexShrink: 0 }}><Icon name="refresh" /></Btn>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Btn kind={groupFilter === "" ? "primary" : "ghost"} onClick={() => { setGroupFilter(""); setPosFilter(""); }} style={{ fontSize: 12, padding: "5px 14px", borderRadius: 8 }}>
                {t("allStaff")} ({allUsrs.length})
              </Btn>
              {STAFF_GROUPS.map(g => (
                <Btn key={g.key} kind={groupFilter === g.key ? "primary" : "ghost"} onClick={() => { setGroupFilter(groupFilter === g.key ? "" : g.key); setPosFilter(""); }} style={{ fontSize: 12, padding: "5px 14px", borderRadius: 8 }}>
                  {g.label} ({groupCounts[g.key] || 0})
                </Btn>
              ))}
            </div>
            {uniquePositions.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <select className="input" style={{ width: "auto", minWidth: 240, maxWidth: "100%", fontSize: 13 }} value={posFilter} onChange={e => setPosFilter(e.target.value)}>
                  <option value="">{t("allStaff")} ({afterGroupFilter.length})</option>
                  {STAFF_GROUPS.map(g => {
                    const gPositions = uniquePositions.filter(p => {
                      const pg = POSITION_GROUP_MAP[p.toLowerCase()];
                      return pg ? pg === g.key : g.key === "teacher";
                    });
                    if (!gPositions.length) return null;
                    return (
                      <optgroup key={g.key} label={`${g.label} (${gPositions.reduce((s, p) => s + (posCounts[p] || 0), 0)})`}>
                        {gPositions.map(p => (
                          <option key={p} value={p}>{p} ({posCounts[p] || 0})</option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          {/* Employee table (Excel-style) */}
          {!filtered.length && <div className="glass card"><p className="p muted" style={{ padding: "12px 0", textAlign: "center" }}>{t("noResults")}</p></div>}

          {filtered.length > 0 && (
            <div className="excel-table-wrap glass">
              <table className="excel-table">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>#</th>
                    {[
                      { key: "name", label: t("colName") },
                      { key: "email", label: t("colEmail") },
                      { key: "position", label: t("colPosition") },
                      { key: "role", label: t("colRole") },
                      { key: "points", label: t("colPoints"), style: { width: 80, textAlign: "right" } },
                    ].map(col => (
                      <th key={col.key} className="excel-th-sort" style={col.style || {}} onClick={() => toggleSort(col.key)}>
                        <span>{col.label}</span>
                        <span className="excel-sort-icon">{sortCol === col.key ? (sortDir === "asc" ? "\u25B2" : "\u25BC") : "\u25B4\u25BE"}</span>
                      </th>
                    ))}
                    <th style={{ width: 120, textAlign: "center" }}>{t("colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((x, idx) => {
                    const grp = getStaffGroup(x.email, x.position);
                    const grpColor = grp === "admin" ? "#6366f1" : grp === "support" ? "#06b6d4" : "var(--accent)";
                    const isSel = selectedUid === x.uid;
                    const initials = (x.displayName || x.email || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <tr key={x.uid} className={isSel ? "excel-row-selected" : ""} style={{ borderLeft: `3px solid ${grpColor}` }}>
                        <td className="excel-cell-num">{idx + 1}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {x.avatarUrl ? (
                              <img src={x.avatarUrl} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 30, height: 30, borderRadius: "50%", background: `${grpColor}18`, color: grpColor, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{initials}</div>
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                {x.online && <span className="online-dot" />}
                                <b style={{ fontSize: 13 }}>{x.displayName || "\u2014"}</b>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td><span className="muted" style={{ fontSize: 12 }}>{x.email}</span></td>
                        <td>
                          {x.position ? (
                            <span className="excel-pos-pill" style={{ background: `${grpColor}12`, color: grpColor, borderColor: `${grpColor}30` }}>{x.position}</span>
                          ) : <span className="muted" style={{ fontSize: 12 }}>{"\u2014"}</span>}
                        </td>
                        <td><Pill kind={x.role === "admin" ? "pending" : "approved"} style={{ fontSize: 11 }}>{x.role}</Pill></td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "var(--accent)", fontSize: 14 }}>{fmtPoints(x.totalPoints)}</td>
                        <td>
                          <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                            <button className="excel-action-btn" title={x.role === "admin" ? "\u2192 teacher" : "\u2192 admin"} onClick={() => setConfirmRole({ uid: x.uid, newRole: x.role === "admin" ? "teacher" : "admin" })} disabled={st.loading}>
                              <Icon name="refresh" />
                            </button>
                            <button className={`excel-action-btn${isSel ? " active" : ""}`} title={t("position")} onClick={() => setSelectedUid(isSel ? null : x.uid)}>
                              <Icon name="briefcase" />
                            </button>
                            <button className="excel-action-btn" title={t("profileBtn")} onClick={() => navigate("admin/teacher", { uid: (x.uid || x.id) })}>
                              <Icon name="user" />
                            </button>
                            {x.uid !== u.uid && (
                              <button className="excel-action-btn excel-action-del" title={t("delete")} onClick={() => setConfirmDelete(x.uid || x.id)}>
                                <Icon name="x" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>}

      {/* ===== History tab ===== */}
      {usersTab === "history" && (
        <div className="glass card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <div className="h2">{t("historyTitle")}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select className="input" style={{ width: "auto", minWidth: 180, fontSize: 13 }} value={logFilter} onChange={e => setLogFilter(e.target.value)}>
                <option value="">{t("actionAll")}</option>
                <option value="role_change">{t("actionRoleChange")}</option>
                <option value="position_change">{t("actionPositionChange")}</option>
                <option value="user_delete">{t("actionUserDelete")}</option>
              </select>
              <Btn onClick={loadLogs} disabled={logsLoading}><Icon name="refresh" /></Btn>
            </div>
          </div>
          {logsLoading ? (
            <div style={{ textAlign: "center", padding: 24 }}><LoadingScreen /></div>
          ) : (() => {
            const filteredLogs = logFilter ? logs.filter(l => l.action === logFilter) : logs;
            return filteredLogs.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>{t("noLogs")}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filteredLogs.map(l => {
                  const dateStr = l.createdAt ? new Date(l.createdAt.seconds * 1000).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "\u2014";
                  const actionLabel = l.action === "role_change" ? t("actionRoleChange") : l.action === "position_change" ? t("actionPositionChange") : l.action === "user_delete" ? t("actionUserDelete") : l.action;
                  const actionColor = l.action === "user_delete" ? "rejected" : l.action === "role_change" ? "pending" : "approved";
                  const initials = (l.targetName || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <div key={l.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: l.action === "user_delete" ? "rgba(239,68,68,.1)" : "rgba(135,188,46,.1)", color: l.action === "user_delete" ? "var(--red, #ef4444)" : "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                          <b style={{ fontSize: 14 }}>{l.targetName}</b>
                          <Pill kind={actionColor}>{actionLabel}</Pill>
                        </div>
                        {l.details && <div style={{ fontSize: 13, color: "var(--muted)" }}>{l.details}</div>}
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                          <span className="tiny muted">{t("adminLabel")}: {l.adminName}</span>
                          <span className="tiny muted">{dateStr}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </>
  );
}



export function PageAdminTeacher() {
  const st = useStore();
  const u = st.userDoc;

  // IMPORTANT: do not early-return before hooks (prevents "Rendered fewer hooks..." during auth hydration)
  const uid = (st.route?.params?.uid) || (parseRoute().params.uid) || "";

  const teacherFromStore = uid ? (st.users.find(x => (x.uid || x.id) === uid) || null) : null;

  const [teacherDoc, setTeacherDoc] = useState(teacherFromStore);
  const [teacherErr, setTeacherErr] = useState(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const [subs, setSubs] = useState([]);
  const [loadingLocal, setLoadingLocal] = useState(false);

  const [edit, setEdit] = useState({
    displayName: "",
    role: "teacher",
    school: "",
    subject: "",
    experienceYears: 0,
    phone: "",
    city: "",
    position: "",
    avatarUrl: "",
    totalPoints: 0
  });

  // Keep local teacherDoc in sync when list is already available
  useEffect(() => {
    if (!uid) return;
    if (teacherFromStore && (!teacherDoc || (teacherDoc.uid !== uid))) {
      setTeacherDoc(teacherFromStore);
    }
  }, [uid, teacherFromStore?.uid]);

  // Load teacher profile directly (works even if st.users is empty)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!uid) {
        if (alive) { setTeacherErr(null); setTeacherDoc(null); }
        return;
      }
      try {
        setTeacherErr(null);
        const snap = await getDoc(doc(db, "users", uid));
        if (!snap.exists()) {
          throw new Error(`users/${uid} not found`);
        }
        const data = snap.data() || {};
        const t = { id: snap.id, ...data, uid: data.uid || snap.id };
        if (alive) setTeacherDoc(t);
      } catch (e) {
        console.error(e);
        if (alive) {
          setTeacherErr(e);
          // keep previous teacherDoc if any; but if none, stay null to show error state
          if (!teacherDoc) setTeacherDoc(null);
        }
      }
    })();
    return () => { alive = false; };
  }, [uid, reloadNonce]);

  // Fill edit form whenever teacherDoc changes
  useEffect(() => {
    if (!teacherDoc) return;
    setEdit({
      displayName: teacherDoc.displayName || "",
      role: teacherDoc.role || "teacher",
      school: teacherDoc.school || "",
      subject: teacherDoc.subject || "",
      experienceYears: teacherDoc.experienceYears ?? 0,
      phone: teacherDoc.phone || "",
      city: teacherDoc.city || "",
      position: teacherDoc.position || "",
      avatarUrl: teacherDoc.avatarUrl || "",
      totalPoints: teacherDoc.totalPoints ?? 0
    });
  }, [teacherDoc?.uid]);

  // Teacher submissions
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!uid) {
        if (alive) setSubs([]);
        return;
      }
      try {
        setLoadingLocal(true);
        const qy = query(collection(db, "submissions"), where("uid", "==", uid));
        const res = await getDocs(qy);
        const arr = res.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => tsKey(b) - tsKey(a));
        if (alive) setSubs(arr);
      } catch (e) {
        console.error(e);
        toast(e?.message || "Не удалось загрузить заявки", "error");
        if (alive) setSubs([]);
      } finally {
        if (alive) setLoadingLocal(false);
      }
    })();
    return () => { alive = false; };
  }, [uid, reloadNonce]);

  // Teacher personal documents
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!uid) { if (alive) setTeacherDocs([]); return; }
      try {
        setLoadingDocs(true);
        const arr = await fetchMyTeacherDocs(uid);
        if (alive) setTeacherDocs(arr);
      } catch (e) {
        console.error(e);
        if (alive) setTeacherDocs([]);
      } finally {
        if (alive) setLoadingDocs(false);
      }
    })();
    return () => { alive = false; };
  }, [uid, reloadNonce]);

  const [atTab, setAtTab] = useState("overview"); // overview | edit | subs | docs
  const [teacherDocs, setTeacherDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Access checks AFTER hooks
  if (!u) return <Guard />;
  if (u.role !== "admin") return <Guard />;

  if (!uid) {
    return (
      <div className="glass card">
        <div className="h2">{t("teacherNotSelected")}</div>
        <p className="p">{t("openFromUsers")}</p>
        <div className="sep"></div>
        <Btn kind="primary" onClick={() => navigate("admin/users")}>{t("goToUsers")}</Btn>
      </div>
    );
  }

  if (!teacherDoc) {
    return (
      <div className="glass card">
        <div className="h2">{teacherErr ? t("profileLoadError") : t("loadingProfile")}</div>
        <p className="p">UID: <b>{uid}</b></p>
        <p className="tiny muted">Route: {st.route?.path} · me: {u.uid}</p>
        {teacherErr ? (
          <>
            <div className="sep"></div>
            <div className="tiny"><b>{String(teacherErr?.name || "Error")}</b>: {String(teacherErr?.message || teacherErr)}</div>
            <div className="help">Открой DevTools → Console, там будет stacktrace.</div>
            <div className="sep"></div>
            <Btn onClick={() => setReloadNonce(x => x + 1)}>{t("retry")}</Btn>
          </>
        ) : null}
      </div>
    );
  }

  const approved = subs.filter(s => s.status === "approved");
  const pending = subs.filter(s => s.status === "pending");
  const rejected = subs.filter(s => s.status === "rejected");
  const approvedPts = sum(approved, s => s.points);
  const tLvl = levelFromPoints(teacherDoc?.totalPoints || 0);
  const aprPct = subs.length ? Math.round((approved.length / subs.length) * 100) : 0;

  async function saveTeacher() {
    try {
      setState({ loading: true });
      await updateDoc(doc(db, "users", uid), {
        displayName: safeText(edit.displayName),
        role: edit.role === "admin" ? "admin" : "teacher",
        school: safeText(edit.school),
        subject: safeText(edit.subject),
        experienceYears: Number(edit.experienceYears) || 0,
        phone: safeText(edit.phone),
        city: safeText(edit.city),
        position: safeText(edit.position),
        avatarUrl: safeText(edit.avatarUrl),
        totalPoints: Number(edit.totalPoints) || 0
      });
      const users = await fetchUsersAll();
      setState({ users });
      toast(t("save"), "ok");
      setReloadNonce(x => x + 1);
    } catch (e) {
      console.error(e);
      toast(e?.message || t("saveError"), "error");
    } finally {
      setState({ loading: false });
    }
  }

  async function decide(id, action) {
    try {
      setState({ loading: true });
      if (action === "approve") await approveSubmission(id, u.uid);
      else await rejectSubmission(id, u.uid);
      toast(action === "approve" ? t("approvedToast") : t("rejectedToast"), "ok");

      const users = await fetchUsersAll();
      setState({ users });
      setReloadNonce(x => x + 1);
    } catch (e) {
      console.error(e);
      toast(e?.message || t("error"), "error");
    } finally {
      setState({ loading: false });
    }
  }

  const AtTabBtn = ({ id, icon, label, count }) => (
    <button className={`prof-tab${atTab === id ? " prof-tab--active" : ""}`} onClick={() => setAtTab(id)}>
      <Icon name={icon} /> {label} {count != null && <span className="at-tab-count">{count}</span>}
    </button>
  );

  const initials = (() => {
    const name = teacherDoc?.displayName || "";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase() || "?";
  })();

  const ptsRemain = tLvl.next ? (tLvl.next - (teacherDoc?.totalPoints || 0)) : 0;

  return (
    <div className="prof">
      {/* ══ Hero Card ══ */}
      <div className="glass card rop-hero" style={{ "--di": 0 }}>
        <div className="rop-hero__banner" />
        <div className="rop-hero__content">
          <div className="rop-hero__avatar-col">
            <div className="rop-hero__avatar-ring">
              <div className="rop-hero__avatar">
                {edit.avatarUrl
                  ? <img src={edit.avatarUrl} alt="" />
                  : <span>{initials}</span>}
              </div>
            </div>
          </div>
          <div className="rop-hero__info">
            <div className="rop-hero__name">{teacherDoc?.displayName || "—"}</div>
            <div className="rop-hero__tags">
              <span className="prof-tag prof-tag--role">{teacherDoc?.role === "admin" ? "Admin" : "Teacher"}</span>
              <span className="prof-tag prof-tag--level">{tLvl.name}</span>
              {teacherDoc?.position && <span className="prof-tag">{teacherDoc.position}</span>}
            </div>
            <div className="rop-hero__meta">
              <span className="rop-hero__meta-item"><Icon name="shield" /> {teacherDoc?.email || uid}</span>
              {teacherDoc?.school && <span className="rop-hero__meta-item"><Icon name="home" /> {teacherDoc.school}</span>}
              {teacherDoc?.subject && <span className="rop-hero__meta-item"><Icon name="file" /> {teacherDoc.subject}</span>}
            </div>
            <div className="rop-hero__social">
              {teacherDoc?.email && (
                <a href={`https://teams.microsoft.com/l/chat/0/0?users=${teacherDoc.email}`} target="_blank" rel="noopener noreferrer" className="prof-social-btn">
                  <Icon name="info" /> Teams
                </a>
              )}
              <Btn kind="ghost" onClick={() => navigate("admin/users")}><Icon name="arrow-left" /> {t("back")}</Btn>
              <Btn kind="ghost" onClick={() => setReloadNonce(x => x + 1)}><Icon name="refresh" /></Btn>
            </div>
          </div>
          <div className="rop-hero__right">
            <div className="rop-hero__level-wrap">
              <div className="rop-hero__level-inner">
                <div className="rop-hero__level-pts">{fmtPoints(teacherDoc?.totalPoints || 0)}</div>
                <div className="rop-hero__level-label">{t("points")}</div>
              </div>
              <div className="rop-hero__progress-track">
                <div className="rop-hero__progress-fill" style={{ width: `${tLvl.pct}%` }} />
              </div>
            </div>
            {tLvl.next && <div className="rop-hero__level-hint">{ptsRemain} {t("toNextLevel")}</div>}
          </div>
        </div>
      </div>

      {/* ══ Stats row ══ */}
      <div className="prof-stats">
        <div className="prof-stat glass card" style={{ "--di": 1 }}>
          <div className="prof-stat__icon prof-stat__icon--green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="prof-stat__num">{fmtPoints(teacherDoc?.totalPoints || 0)}</div>
          <div className="prof-stat__label">{t("totalPoints")}</div>
          <div className="prof-stat__bar"><div className="prof-stat__fill" style={{ width: `${tLvl.pct}%` }} /></div>
        </div>
        <div className="prof-stat glass card" style={{ "--di": 2 }}>
          <div className="prof-stat__icon prof-stat__icon--blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="prof-stat__num">{fmtPoints(approvedPts)}</div>
          <div className="prof-stat__label">{t("approved")}</div>
          <div className="prof-stat__hint">{approved.length} {t("profTabSubs").toLowerCase()}</div>
        </div>
        <div className="prof-stat glass card" style={{ "--di": 3 }}>
          <div className="prof-stat__icon prof-stat__icon--amber">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </div>
          <div className="prof-stat__num">{pending.length}</div>
          <div className="prof-stat__label">{t("pending")}</div>
          <div className="prof-stat__hint">{t("profApprovalRate")}: {aprPct}%</div>
        </div>
        <div className="prof-stat glass card" style={{ "--di": 4 }}>
          <div className="prof-stat__icon prof-stat__icon--purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </div>
          <div className="prof-stat__num">{Number(teacherDoc?.compDays || 0)}</div>
          <div className="prof-stat__label">{t("compDays")}</div>
          <div className="prof-stat__hint">{t("dayShort")}</div>
        </div>
      </div>

      {/* ══ Tabs ══ */}
      <div className="prof-tabs">
        <AtTabBtn id="overview" icon="info" label={t("profileOverview")} />
        <AtTabBtn id="edit" icon="settings" label={t("editSection")} />
        <AtTabBtn id="subs" icon="file" label={t("profTabSubs")} count={subs.length} />
        <AtTabBtn id="docs" icon="shield" label={t("teacherDocsTitle")} count={teacherDocs.length} />
      </div>

      {/* Tab: overview */}
      {atTab === "overview" && (
        <div className="glass card prof-card" style={{ "--di": 5 }}>
          <div className="h2">{t("profAbout")}</div>
          <div className="sep"></div>
          <div className="at-info-grid">
            <div className="at-info-item">
              <div className="at-info-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 21a8 8 0 10-16 0" stroke="currentColor" strokeWidth="2" /><path d="M12 13a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2" /></svg>
              </div>
              <div>
                <div className="at-info-label">{t("fullName")}</div>
                <div className="at-info-value">{teacherDoc?.displayName || "—"}</div>
              </div>
            </div>
            <div className="at-info-item">
              <div className="at-info-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" /></svg>
              </div>
              <div>
                <div className="at-info-label">{t("profSchool")}</div>
                <div className="at-info-value">{teacherDoc?.school || t("profNoSchool")}</div>
              </div>
            </div>
            <div className="at-info-item">
              <div className="at-info-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" stroke="currentColor" strokeWidth="2" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" stroke="currentColor" strokeWidth="2" /></svg>
              </div>
              <div>
                <div className="at-info-label">{t("profSubject")}</div>
                <div className="at-info-value">{teacherDoc?.subject || t("profNoSubject")}</div>
              </div>
            </div>
            <div className="at-info-item">
              <div className="at-info-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke="currentColor" strokeWidth="2" /></svg>
              </div>
              <div>
                <div className="at-info-label">{t("profExperience")}</div>
                <div className="at-info-value">{teacherDoc?.experienceYears || 0} {t("profYear")}</div>
              </div>
            </div>
            <div className="at-info-item">
              <div className="at-info-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" /></svg>
              </div>
              <div>
                <div className="at-info-label">{t("profCity")}</div>
                <div className="at-info-value">{teacherDoc?.city || "—"}</div>
              </div>
            </div>
            <div className="at-info-item">
              <div className="at-info-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V6l-8-3-8 3v6c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" /></svg>
              </div>
              <div>
                <div className="at-info-label">{t("roleLabel")}</div>
                <div className="at-info-value">{teacherDoc?.role || "teacher"}</div>
              </div>
            </div>
          </div>

          {/* Recent submissions preview */}
          {subs.length > 0 && (
            <>
              <div className="sep"></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="h2">{t("recentSubs")}</div>
                <Btn kind="ghost" onClick={() => setAtTab("subs")} style={{ fontSize: 12 }}>{t("profTabSubs")} →</Btn>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                {subs.slice(0, 4).map(s => (
                  <div key={s.id} className="at-sub-preview">
                    <div className="at-sub-preview__left">
                      <Pill kind={s.status}>{s.status}</Pill>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{s.title}</div>
                        <div className="muted tiny">{s.typeName} · {s.eventDate}</div>
                      </div>
                    </div>
                    <div className="at-sub-preview__pts">+{fmtPoints(s.points)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: edit */}
      {atTab === "edit" && (
        <div className="glass card prof-card" style={{ "--di": 5 }}>
          <div className="h2">{t("editSection")}</div>
          <div className="sep"></div>
          <div className="grid2">
            <div>
              <div className="label">{t("fullName")}</div>
              <Input value={edit.displayName} onChange={(e) => setEdit(v => ({ ...v, displayName: e.target.value }))} />
            </div>
            <div>
              <div className="label">{t("roleLabel")}</div>
              <Select value={edit.role} onChange={(e) => setEdit(v => ({ ...v, role: e.target.value }))}>
                <option value="teacher">teacher</option>
                <option value="admin">admin</option>
              </Select>
            </div>
            <div>
              <div className="label">{t("school")}</div>
              <Input value={edit.school} onChange={(e) => setEdit(v => ({ ...v, school: e.target.value }))} />
            </div>
            <div>
              <div className="label">{t("subject")}</div>
              <Input value={edit.subject} onChange={(e) => setEdit(v => ({ ...v, subject: e.target.value }))} />
            </div>
            <div>
              <div className="label">{t("expYears")}</div>
              <Input type="number" min="0" max="80" value={edit.experienceYears} onChange={(e) => setEdit(v => ({ ...v, experienceYears: e.target.value }))} />
            </div>
            <div>
              <div className="label">{t("phone")}</div>
              <Input value={edit.phone} onChange={(e) => setEdit(v => ({ ...v, phone: e.target.value }))} />
            </div>
            <div>
              <div className="label">{t("city")}</div>
              <Input value={edit.city} onChange={(e) => setEdit(v => ({ ...v, city: e.target.value }))} />
            </div>
            <div>
              <div className="label">{t("position")}</div>
              <Input value={edit.position} onChange={(e) => setEdit(v => ({ ...v, position: e.target.value }))} />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <div className="label">{t("avatarUrl")}</div>
              <Input value={edit.avatarUrl} onChange={(e) => setEdit(v => ({ ...v, avatarUrl: e.target.value }))} placeholder="https://..." />
              <div className="help">{t("avatarHelp")}</div>
            </div>
            <div>
              <div className="label">{t("totalPoints")}</div>
              <Input type="number" min="0" max="9999999" value={edit.totalPoints} onChange={(e) => setEdit(v => ({ ...v, totalPoints: e.target.value }))} />
            </div>
            <div />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
            <Btn kind="primary" onClick={saveTeacher} disabled={st.loading}><Icon name="check" /> {t("save")}</Btn>
            <Btn onClick={() => setEdit(v => ({ ...v, avatarUrl: "" }))}>{t("clearAvatar")}</Btn>
          </div>
        </div>
      )}

      {/* Tab: submissions */}
      {atTab === "subs" && (
        <div className="glass card prof-card" style={{ "--di": 5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div className="h2">{t("teacherSubs")}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Pill kind="approved">{t("approved")}: {approved.length}</Pill>
              <Pill kind="pending">{t("pending")}: {pending.length}</Pill>
              <Pill kind="rejected">{t("rejected")}: {rejected.length}</Pill>
            </div>
          </div>
          <div className="sep"></div>

          {loadingLocal && <p className="p">{t("loadingSubs")}</p>}

          <DataCards
            emptyText={t("noSubs")}
            columns={[
              { key: "eventDate", label: t("date") },
              { key: "typeName", label: t("type") },
              {
                key: "title", label: t("title"), render: s => (
                  <div>
                    <b>{s.title}</b>
                    {s.description ? <div className="muted tiny">{s.description}</div> : null}
                  </div>
                )
              },
              { key: "points", label: t("points"), render: s => <b>{fmtPoints(s.points)}</b> },
              { key: "status", label: t("status"), render: s => <Pill kind={s.status}>{s.status}</Pill> },
              {
                key: "evidence", label: "Evidence", render: s => (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {s.evidenceLink ? <a className="btn" href={s.evidenceLink} target="_blank" rel="noreferrer">{t("link")}</a> : null}
                    {s.evidenceFileUrl ? <a className="btn" href={s.evidenceFileUrl} target="_blank" rel="noreferrer">{t("file")}</a> : null}
                    {!s.evidenceLink && !s.evidenceFileUrl ? <span className="muted tiny">—</span> : null}
                  </div>
                )
              },
              {
                key: "action", label: t("action"), render: s => s.status === "pending" ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Btn kind="ok" onClick={() => decide(s.id, "approve")} disabled={st.loading}><Icon name="check" /></Btn>
                    <Btn kind="danger" onClick={() => decide(s.id, "reject")} disabled={st.loading}><Icon name="x" /></Btn>
                  </div>
                ) : <span className="muted tiny">—</span>
              }
            ]}
            rows={subs.map(s => ({ ...s, __key: s.id }))}
          />
        </div>
      )}

      {/* Tab: teacher documents */}
      {atTab === "docs" && (
        <div className="glass card prof-card" style={{ "--di": 5 }}>
          <div className="h2">{t("teacherDocsTitle")}</div>
          <div className="sep"></div>

          {loadingDocs && <p className="p">{t("loading")}</p>}

          {!loadingDocs && teacherDocs.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>{t("noTeacherDocs")}</div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {teacherDocs.map(d => {
              const dateStr = d.createdAt ? new Date(d.createdAt.seconds * 1000).toLocaleDateString("ru-RU") : "—";
              return (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "12px 16px", border: "1px solid var(--border)", borderRadius: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{d.title}</div>
                    {d.description && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{d.description}</div>}
                    <div className="muted tiny" style={{ marginTop: 4 }}>{d.fileName || "файл"} · {dateStr}</div>
                  </div>
                  {d.fileUrl && <a className="btn" href={d.fileUrl} target="_blank" rel="noreferrer">{t("openDoc")}</a>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


/** ---------- PageNews ---------- */
