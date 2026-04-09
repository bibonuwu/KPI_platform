import React, { useEffect, useMemo, useRef, useState } from "react";
import { t, getLang, setLang } from "../i18n.js";
import {
  auth, db, doc, updateDoc, signOut, OAuthProvider, signInWithPopup,
  signInWithRedirect, signInWithEmailAndPassword, sendPasswordResetEmail,
  MICROSOFT_TENANT
} from "../firebase-config.js";
import { store, setState, useStore, navigate, toast, canAccess } from "../store.js";
import { fmtPoints, safeText, ymd, levelFromPoints } from "../utils.js";
import { DEFAULT_TYPES } from "../constants.js";
import {
  ensureUserDoc, hasAnyAdmin, seedDefaultTypes, updateProfile, fetchTypesAll
} from "../data.js";
import { Icon, Btn, Input, Select, Textarea, Pill, Guard } from "../components.jsx";

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
      kz: "Мен, төменде қол қоюшы, өзімнің жеке деректерімді (аты-жөні, лауазымы, электрондық поштасы, жұмыс нәтижелері) «Назарбаев Зияткерлік Мектептері» АҚ ішіндегі рейтинг мен есеп беру мақсаттарында өңдеуге өз еркіммен келісімімді беремін.",
      ru: "Я, нижеподписавшийся, добровольно даю согласие на обработку моих персональных данных (ФИО, должность, e-mail, результаты работы) в целях рейтингования и отчётности внутри АО «Назарбаев Интеллектуальные Школы».",
    },
    {
      title: t("onbDoc3Title"),
      kz: "Жұмыс уақыты: 09:00–18:00 (дүйсенбі–жұма). Кешіккен жағдайда жазбаша хабарлама қажет. Жоқтықты рәсімдеу платформадағы «Өтініштер» бөлімі арқылы жүзеге асырылады. Ережені бұзу тәртіптік шараларға әкеледі.",
      ru: "Рабочее время: 09:00–18:00 (понедельник–пятница). При опоздании обязательно письменное уведомление. Оформление отсутствия осуществляется через раздел «Заявления» на платформе. Нарушение регламента влечёт дисциплинарные меры.",
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
  const [slide, setSlide] = useState(0);

  useEffect(() => { if (st.userDoc) navigate("dashboard"); }, [st.userDoc]);

  useEffect(() => {
    const id = setInterval(() => setSlide(s => (s + 1) % 3), 4500);
    return () => clearInterval(id);
  }, []);

  const slides = [
    { icon: "📊", tTitle: "loginTitle1", tDesc: "loginDesc", accent: "#7dd3fc" },
    { icon: "🏆", tTitle: "loginSlide1Title", tDesc: "loginSlide1Desc", accent: "#818cf8" },
    { icon: "✨", tTitle: "loginSlide2Title", tDesc: "loginSlide2Desc", accent: "#a78bfa" },
  ];

  async function submit(e) {
    e.preventDefault();
    try {
      setState({ loading: true });
      await signInWithEmailAndPassword(auth, email, pass);
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

  const s = slides[slide];

  return (
    <div className="login-page">

      {/* ═══ LEFT: Slideshow ═══ */}
      <div className="login-slider">
        {/* Animated bg blobs */}
        <div className="login-slider__blobs" aria-hidden="true">
          <div className="login-blob login-blob--1" />
          <div className="login-blob login-blob--2" />
          <div className="login-blob login-blob--3" />
        </div>

        <div className="login-slider__inner">
          {/* Brand */}
          <div className="login-slider__brand">
            <img src="/logo-nis.png" alt="NIS" className="login-slider__logo" />
            <div>
              <div className="login-slider__brandname">{t("appName")}</div>
              <div className="login-slider__brandsub">{t("loginNisName")}</div>
            </div>
          </div>

          {/* Slide */}
          <div className="login-slide" key={slide}>
            <div className="login-slide__icon" style={{ "--accent": s.accent }}>{s.icon}</div>
            <div className="login-slide__title">{t(s.tTitle)}</div>
            <div className="login-slide__desc">{t(s.tDesc)}</div>
          </div>

          {/* Dots */}
          <div className="login-dots">
            {slides.map((sl, i) => (
              <button
                key={i}
                className={`login-dot${i === slide ? " login-dot--active" : ""}`}
                onClick={() => setSlide(i)}
                aria-label={`Слайд ${i + 1}`}
                style={{ "--acc": sl.accent }}
              />
            ))}
          </div>

          {/* Bottom strip */}
          <div className="login-slider__footer">
            <div className="login-slider__stat"><span>📈</span> {t("loginMotivation1")}</div>
            <div className="login-slider__stat"><span>🎯</span> {t("loginMotivation2")}</div>
            <div className="login-slider__stat"><span>🏅</span> {t("loginMotivation3")}</div>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT: Form ═══ */}
      <div className="login-form-panel">
        <div className="login-form-wrap">
          <div className="login-form-header">
            <div className="login-form-logo">
              <img src="/logo-nis.png" alt="NIS" />
            </div>
            <div className="login-form-title">{t("loginHeading")}</div>
            <div className="login-form-sub">{t("loginSubtext")}</div>
          </div>

          {/* Microsoft btn — primary CTA */}
          <button
            className="login-ms-btn"
            onClick={signInMicrosoft}
            disabled={st.loading}
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1h9v9H1z" fill="#f25022" />
              <path d="M11 1h9v9h-9z" fill="#7fba00" />
              <path d="M1 11h9v9H1z" fill="#00a4ef" />
              <path d="M11 11h9v9h-9z" fill="#ffb900" />
            </svg>
            {st.loading ? t("loading") : t("msSignIn")}
          </button>

          <div className="login-divider"><span>{t("or")}</span></div>

          <form onSubmit={submit}>
            <div className="login-field">
              <label className="login-label">{t("email")}</label>
              <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="name@nis.edu.kz" required />
            </div>
            <div className="login-field" style={{ marginTop: 10 }}>
              <label className="login-label">{t("password")}</label>
              <Input value={pass} onChange={e => setPass(e.target.value)} type="password" placeholder="••••••••" required />
            </div>
            <Btn kind="primary" type="submit" disabled={st.loading}
              style={{ width: "100%", justifyContent: "center", marginTop: 14, padding: "12px 20px", fontSize: 15 }}>
              {st.loading ? t("signingIn") : t("signIn")}
            </Btn>
          </form>

          <div className="login-form-footer">{t("copyright")}</div>
        </div>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════ */
/* ═══ PAGE: DASHBOARD ════════════════════════= */
/* ══════════════════════════════════════════════ */
