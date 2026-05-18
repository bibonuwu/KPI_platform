import React, { useEffect, useMemo, useRef, useState } from "react";
import { t, getLang, setLang } from "../i18n.js";
import {
  auth, db, doc, updateDoc, signOut, OAuthProvider, signInWithPopup,
  signInWithRedirect, signInWithEmailAndPassword, sendPasswordResetEmail,
  MICROSOFT_TENANT, serverTimestamp
} from "../firebase-config.js";
import { store, setState, useStore, navigate, toast, canAccess } from "../store.js";
import { fmtPoints, safeText, ymd, levelFromPoints } from "../utils.js";
import { DEFAULT_TYPES } from "../constants.js";
import {
  ensureUserDoc, hasAnyAdmin, seedDefaultTypes, updateProfile, fetchTypesAll,
  uploadFile
} from "../data.js";
import { Icon, Btn, Select, Textarea, Pill, Guard } from "../components.jsx";

export function PageOnboarding() {
  const st = useStore();
  // All hooks MUST be called before any conditional returns (React rules)
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [signed, setSigned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checks, setChecks] = useState([false, false, false, false, false]);
  const [expanded, setExpanded] = useState(null);
  const [brushSize, setBrushSize] = useState(2);

  const u = st.userDoc;
  if (!u) return <Guard />;
  if (!canAccess("onboarding", u)) return <Guard />;

  const isOnboarded = u.onboarded === true;

  const getPos = (e) => {
    const c = canvasRef.current;
    if (!c) return [0, 0];
    const rect = c.getBoundingClientRect();
    const scaleX = c.width / rect.width;
    const scaleY = c.height / rect.height;
    const t = e.touches ? e.touches[0] : e;
    return [(t.clientX - rect.left) * scaleX, (t.clientY - rect.top) * scaleY];
  };

  // Fill white bg on mount and on clear
  const fillCanvasWhite = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
  };
  useEffect(() => { fillCanvasWhite(); }, []); // eslint-disable-line

  const onDown = (e) => {
    e.preventDefault();
    setDrawing(true);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const [x, y] = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const onMove = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const [x, y] = getPos(e);
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1a1d2e";
    ctx.lineTo(x, y);
    ctx.stroke();
    setSigned(true);
  };

  const onUp = () => setDrawing(false);

  const clearSig = () => {
    fillCanvasWhite();
    setSigned(false);
  };

  const toggleCheck = (i) => {
    const copy = [...checks];
    copy[i] = !copy[i];
    setChecks(copy);
  };

  const allChecked = checks.every(Boolean);

  const submit = async () => {
    if (!signed || !allChecked) {
      toast(t("onbReadAndSign"), "error");
      return;
    }
    try {
      setSaving(true);
      const c = canvasRef.current;
      const blob = await new Promise(res => c.toBlob(res, "image/png"));
      const sigUrl = await uploadFile(`signatures/${u.uid}/${Date.now()}_onboarding.png`, new File([blob], "sig.png", { type: "image/png" }));
      await updateProfile(u.uid, { onboarded: true, onboardedAt: serverTimestamp(), signatureUrl: sigUrl, needsPasswordChange: true });
      const freshUser = await ensureUserDoc(u.uid, u.email);
      setState({ userDoc: freshUser });
      toast(t("onbCompleted"), "ok");
      // After onboarding, redirect to dashboard — ForcePasswordChange overlay will appear
      navigate("dashboard");
    } catch (e) {
      console.error(e);
      toast(e?.message || t("saveError"), "error");
    } finally {
      setSaving(false);
    }
  };

  const docs = [
    {
      title: t("onbDoc1Title"),
      kz: "NIS KPI Platform — мұғалімдердің кәсіби жетістіктерін есепке алу және рейтингін жасау жүйесі. Платформаны пайдалану барлық педагогтар үшін міндетті. Деректерді дәл және уақытылы енгізу — ар-намыс міндеттемесі.",
      ru: "NIS KPI Platform — система учёта и рейтингования профессиональных достижений педагогов. Пользование платформой обязательно для всех педагогов. Точность и своевременность вносимых данных является обязательством каждого сотрудника.",
    },
    {
      title: t("onbDoc2Title"),
      kz: "Мен, төменде қол қоюшы, өзімнің жеке деректерімді (аты-жөні, лауазымы, электрондық поштасы, жұмыс нәтижелері) «Назарбаев Зияткерлік Мектептері» дербес білім беру ұйымы ішіндегі рейтинг мен есеп беру мақсаттарында өңдеуге өз еркіммен келісімімді беремін.",
      ru: "Я, нижеподписавшийся, добровольно даю согласие на обработку моих персональных данных (ФИО, должность, e-mail, результаты работы) в целях рейтингования и отчётности внутри Автономная организация образования «Назарбаев Интеллектуальные Школы».",
    },
    {
      title: t("onbDoc3Title"),
      kz: "Жұмыс уақыты: 08:30–17:30 (дүйсенбі–жұма). Кешіккен жағдайда жазбаша хабарлама қажет. Жоқтықты рәсімдеу платформадағы «Өтініштер» бөлімі арқылы жүзеге асырылады. Ережені бұзу тәртіптік шараларға әкеледі.",
      ru: "Рабочее время: 08:30–17:30 (понедельник–пятница). При опоздании обязательно письменное уведомление. Оформление отсутствия осуществляется через раздел «Заявления» на платформе. Нарушение регламента влечёт дисциплинарные меры.",
    },
    {
      title: t("onbDoc4Title"),
      kz: "Жетістіктер санаттар бойынша бағаланады: кәсіби даму, жарыстар, жобалар, зерттеу жұмыстары және т.б. Балдарды тек әкімші растайды. Дәлелсіз немесе жалған мәліметтер тәртіптік жауапкершілікке әкеледі.",
      ru: "Достижения оцениваются по категориям: профессиональное развитие, конкурсы, проекты, исследовательские работы и др. Баллы начисляются исключительно администратором после проверки. Недостоверные данные влекут дисциплинарную ответственность.",
    },
    {
      title: t("onbDoc5Title"),
      kz: "Кіру деректерін (логин, пароль) үшінші тұлғаларға беруге тыйым салынады. Күдікті белсенділік анықталса, дереу әкімшіге хабарлаңыз. Есептік жазбаңызды үнемі бақылауда ұстаңыз.",
      ru: "Передача учётных данных (логин, пароль) третьим лицам строго запрещена. При обнаружении подозрительной активности немедленно уведомите администратора. Регулярно следите за безопасностью своей учётной записи.",
    },
  ];

  const checkedCount = isOnboarded ? docs.length : checks.filter(Boolean).length;

  return (
    <div className="onboarding">

      {/* ═══ HERO BANNER ═══════════════════════════ */}
      <div className={`onb-hero${isOnboarded ? " onb-hero--done" : ""}`}>
        {/* Floating particles */}
        <div className="onb-hero__particles" aria-hidden="true">
          {["✦", "★", "✦", "●", "✦", "★", "✦", "●", "✦", "★", "✦", "●"].map((s, i) => (
            <span key={i} className="onb-particle" style={{ "--i": i }}>{s}</span>
          ))}
        </div>

        <div className="onb-hero__inner">
          <img src="/logo-nis.png" alt="NIS" className="onb-hero__logo" />

          <div className="onb-hero__badge">
            {isOnboarded ? `✅ ${t("onbDoneBadge")}` : `🎉 ${t("onbNewEmployee")}`}
          </div>

          <div className="onb-hero__title">
            {t("onbWelcome")}
          </div>
          {u.displayName && (
            <div className="onb-hero__name">{u.displayName}</div>
          )}
          <div className="onb-hero__sub">
            {isOnboarded
              ? t("onbSuccessMsg")
              : t("onbInstructions")}
          </div>

          {/* Step indicators */}
          <div className="onb-steps">
            <div className={`onb-step${allChecked ? " onb-step--done" : checkedCount > 0 ? " onb-step--active" : ""}`}>
              <div className="onb-step__num">{allChecked ? "✓" : "1"}</div>
              <div className="onb-step__label">{t("onbStepDocs")}</div>
            </div>
            <div className={`onb-steps__line${allChecked ? " onb-steps__line--done" : ""}`} />
            <div className={`onb-step${isOnboarded ? " onb-step--done" : allChecked ? " onb-step--active" : ""}`}>
              <div className="onb-step__num">{isOnboarded ? "✓" : "2"}</div>
              <div className="onb-step__label">{t("onbStepSign")}</div>
            </div>
          </div>

          {/* Progress bar */}
          {!isOnboarded && (
            <div className="onb-progress">
              <div className="onb-progress__bar">
                <div className="onb-progress__fill" style={{ width: `${(checkedCount / docs.length) * 100}%` }} />
              </div>
              <span className="onb-progress__label">{checkedCount}/{docs.length} {t("onbRead")}</span>
            </div>
          )}
        </div>
      </div>
      <div class="grid2">
        {/* ═══ DOCUMENTS ════════════════════════════ */}
        <div className="glass card onb-docs-card">
          <div className="onb-docs-header">
            <div style={{ fontSize: 20, fontWeight: 800 }}>{`📄 ${t("onbOfficialDocs")}`}</div>
            {isOnboarded && <span className="pill approved">{t("onbAllRead")} ✓</span>}
          </div>

          <div className="onb-docs-list">
            {docs.map((d, i) => {
              const done = checks[i] || isOnboarded;
              const isOpen = expanded === i;
              return (
                <div key={i} className={`onb-doc${done ? " onb-doc--done" : ""}${isOpen ? " onb-doc--open" : ""}`}
                  style={{ animationDelay: `${i * 0.07}s` }}>
                  <div
                    className="onb-doc__head"
                    role="button" tabIndex={0}
                    onClick={() => setExpanded(isOpen ? null : i)}
                  >
                    <div className={`onb-doc__num${done ? " onb-doc__num--done" : ""}`}>
                      {done ? "✓" : i + 1}
                    </div>
                    <div className="onb-doc__title">{d.title}</div>
                    <div className={`onb-doc__chevron${isOpen ? " onb-doc__chevron--open" : ""}`}>›</div>
                  </div>
                  {isOpen && (
                    <div className="onb-doc__body">
                      <div className="onb-doc__lang-label">🇰🇿 {t("onbLangKz")}</div>
                      <p className="onb-doc__text">{d.kz}</p>
                      <div className="onb-doc__lang-label">🇷🇺 {t("onbLangRu")}</div>
                      <p className="onb-doc__text">{d.ru}</p>
                      {!isOnboarded && (
                        <button
                          className={`onb-doc__confirm${checks[i] ? " onb-doc__confirm--done" : ""}`}
                          onClick={() => { if (!checks[i]) toggleCheck(i); setExpanded(null); }}
                        >
                          {checks[i] ? `✓ ${t("onbReadDone")}` : t("onbAgree")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {isOnboarded && (
          <div className="glass card onb-done-card">
            <div className="onb-done-card__icon">🏆</div>
            <div className="onb-done-card__title">{t("onbSuccess")}</div>
            <div className="onb-done-card__checks">
              <div className="onb-done-check"><span>✓</span> {t("onbDocsRead")}</div>
              <div className="onb-done-check"><span>✓</span> {t("onbSignDone")}</div>
              {u.onboardedAt && (
                <div className="onb-done-check">
                  <span>📅</span> {t("date")}: {new Date(u.onboardedAt.seconds * 1000).toLocaleDateString("ru-RU")}
                </div>
              )}
            </div>
            {u.signatureUrl && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: .4 }}>{t("onbYourSign")}</div>
                <img src={u.signatureUrl} alt="Подпись" className="onb-done-card__sig" />
              </div>
            )}
          </div>
        )}

        {/* ═══ SIGNATURE ════════════════════════════ */}
        {!isOnboarded && (
          <div className={`onb-sig-section glass card${allChecked ? " onb-sig-section--ready" : ""}`}>
            {!allChecked ? (
              <div className="onb-sig-locked">
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{t("onbSignSection")}</div>
                <p className="p" style={{ textAlign: "center" }}>
                  {checkedCount} / {docs.length}
                </p>
                <div className="onb-sig-locked__progress">
                  <div className="onb-sig-locked__fill" style={{ width: `${(checkedCount / docs.length) * 100}%` }} />
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>{checkedCount} / {docs.length}</div>
              </div>
            ) : (
              <>
                <div className="onb-sig-ready-banner">
                  <div className="onb-sig-ready-banner__icon">🎊</div>
                  <div className="onb-sig-ready-banner__title">{t("onbAllDocsRead")}</div>
                  <div className="onb-sig-ready-banner__sub">{t("onbFinalStep")}</div>
                </div>

                <div className="onb-sig-wrap">
                  <div className="onb-sig-wrap__head">
                    <div>
                      <div className="h2" style={{ marginBottom: 4 }}>✍ {t("onbDrawSign")}</div>
                      <p className="p" style={{ margin: 0, fontSize: 13 }}>
                        {t("onbDrawHint")}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("onbThickness")}</span>
                      {[1, 2, 4].map(sz => (
                        <button key={sz} onClick={() => setBrushSize(sz)} style={{
                          width: 32, height: 32, borderRadius: 8,
                          border: `2px solid ${brushSize === sz ? "var(--accent)" : "var(--border)"}`,
                          background: brushSize === sz ? "var(--hover-bg)" : "transparent",
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s"
                        }}>
                          <div style={{ width: Math.max(sz * 4, 8), height: sz, background: "#1a2035", borderRadius: 99 }} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="onb-sig-canvas-wrap">
                    <canvas
                      ref={canvasRef}
                      width={800}
                      height={200}
                      className="onb-sig-canvas"
                      onMouseDown={onDown}
                      onMouseMove={onMove}
                      onMouseUp={onUp}
                      onMouseLeave={onUp}
                      onTouchStart={onDown}
                      onTouchMove={onMove}
                      onTouchEnd={onUp}
                    />
                    {!signed && (
                      <div className="onb-sig-hint">✍ {t("onbSignHere")}</div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <Btn onClick={clearSig}>↺ {t("onbClear")}</Btn>
                    <Btn kind="primary" onClick={submit} disabled={saving || !signed}>
                      {saving ? t("loading") : `✅ ${t("onbConfirmSign")}`}
                    </Btn>
                    {signed && <span style={{ fontSize: 13, color: "var(--green)", fontWeight: 700 }}>✓ {t("onbSignReady")}</span>}
                  </div>
                </div>
              </>
            )}
          </div>
        )}


      </div>



      {/* ═══ ALREADY ONBOARDED ════════════════════ */}

    </div>
  );
}


/** ---------- pages ---------- */
export function PageLogin() {
  const st = useStore();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused] = useState(null);
  const cardRef = useRef(null);

  useEffect(() => { if (st.userDoc) navigate("dashboard"); }, [st.userDoc]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      el.style.setProperty("--mx", `${x}%`);
      el.style.setProperty("--my", `${y}%`);
    };
    const onLeave = () => {
      el.style.setProperty("--mx", `50%`);
      el.style.setProperty("--my", `50%`);
    };
    window.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  async function submit(e) {
    e.preventDefault();
    try {
      setState({ loading: true });
      const fullEmail = email.includes("@") ? email : email + "@kzl.nis.edu.kz";
      await signInWithEmailAndPassword(auth, fullEmail, pass);
      toast(t("loginWelcome"), "ok");
    } catch (err) {
      console.error(err);
      toast(err?.message || t("loginError"), "error");
    } finally { setState({ loading: false }); }
  }

  async function signInMicrosoft() {
    try {
      setState({ loading: true });
      const provider = new OAuthProvider("microsoft.com");
      provider.setCustomParameters({ prompt: "select_account", tenant: MICROSOFT_TENANT });
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
      if (isMobile) { await signInWithRedirect(auth, provider); return; }
      await signInWithPopup(auth, provider);
      toast("Добро пожаловать!", "ok");
    } catch (err) {
      console.error(err);
      toast(err?.message || "Ошибка входа через Microsoft", "error");
    } finally { setState({ loading: false }); }
  }

  return (
    <div className="login-page login-page--vision">
      {/* Ambient Vision Pro background */}
      <div className="login-aurora" aria-hidden="true">
        <div className="login-aurora__orb login-aurora__orb--1" />
        <div className="login-aurora__orb login-aurora__orb--2" />
        <div className="login-aurora__orb login-aurora__orb--3" />
        <div className="login-aurora__mesh" />
        <div className="login-aurora__stars">
          {Array.from({ length: 28 }).map((_, i) => (
            <span key={i} className="login-star" style={{
              "--x": `${(i * 37) % 100}%`,
              "--y": `${(i * 71) % 100}%`,
              "--d": `${(i % 5) * 0.6 + 1.4}s`,
              "--dl": `${(i % 7) * 0.4}s`,
            }} />
          ))}
        </div>
        <div className="login-aurora__grain" />
      </div>

      {/* Centered glass card */}
      <main className="login-card" ref={cardRef}>
        <div className="login-card__halo" aria-hidden="true" />
        <div className="login-card__sheen" aria-hidden="true" />

        <div className="login-card__inner">
          <div className="login-card__brand">
            <div className="login-card__logo">
              <span className="login-card__logo-ring" aria-hidden="true" />
              <span className="login-card__logo-ring login-card__logo-ring--2" aria-hidden="true" />
              <img src="/logo-nis.png" alt="NIS" />
            </div>
            <div className="login-card__appname">{t("appName")}</div>
          </div>

          <h1 className="login-card__title">{t("loginHeading")}</h1>
          <p className="login-card__sub">{t("loginSubtext")}</p>

          <button
            className="login-ms-btn"
            onClick={signInMicrosoft}
            disabled={st.loading}
            type="button"
          >
            <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1h9v9H1z" fill="#f25022" />
              <path d="M11 1h9v9h-9z" fill="#7fba00" />
              <path d="M1 11h9v9H1z" fill="#00a4ef" />
              <path d="M11 11h9v9h-9z" fill="#ffb900" />
            </svg>
            <span>{st.loading ? t("loading") : t("msSignIn")}</span>
          </button>

          <div className="login-divider"><span>{t("or")}</span></div>

          <form onSubmit={submit} className="login-form">
            <div className={`login-field${focused === "email" ? " login-field--focused" : ""}`}>
              <label className="login-label">{t("email")}</label>
              <div className="login-input-suffix-wrap">
                <span className="login-input-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
                <input
                  className="login-input login-input--iconed"
                  value={email}
                  onChange={e => setEmail(e.target.value.replace(/@.*$/, ""))}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  type="text"
                  placeholder="abeken_a"
                  autoComplete="username"
                  required
                />
                <span className="login-input-suffix">@kzl.nis.edu.kz</span>
              </div>
            </div>

            <div className={`login-field${focused === "pass" ? " login-field--focused" : ""}`}>
              <label className="login-label">{t("password")}</label>
              <div className="login-pass-wrap">
                <span className="login-input-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </span>
                <input
                  className="login-input login-input--iconed login-input--pass"
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  onFocus={() => setFocused("pass")}
                  onBlur={() => setFocused(null)}
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-pass-toggle"
                  onClick={() => setShowPass(v => !v)}
                  tabIndex={-1}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={st.loading}
            >
              <span className="login-submit-btn__shine" aria-hidden="true" />
              <span className="login-submit-btn__text">
                {st.loading ? t("signingIn") : t("signIn")}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 8 }}>
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </span>
            </button>
          </form>

          <div className="login-card__footer">{t("copyright")}</div>
        </div>
      </main>
    </div>
  );
}


/* ══════════════════════════════════════════════ */
/* ═══ PAGE: DASHBOARD ════════════════════════= */
/* ══════════════════════════════════════════════ */
