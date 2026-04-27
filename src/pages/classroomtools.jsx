import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { t } from "../i18n.js";
import { Btn } from "../components.jsx";

/* ── Tool definitions with categories ── */
const CATEGORIES = [
  {
    catKey: "catTime",
    tools: [
      { key: "clock",     tKey: "toolClock",     descKey: "toolClockDesc",     emoji: "🕐" },
      { key: "timer",     tKey: "toolTimer",     descKey: "toolTimerDesc",     emoji: "⏱️" },
      { key: "stopwatch", tKey: "toolStopwatch", descKey: "toolStopwatchDesc", emoji: "⏲️" },
    ],
  },
  {
    catKey: "catRandom",
    tools: [
      { key: "dice",         tKey: "toolDice",         descKey: "toolDiceDesc",         emoji: "🎲" },
      { key: "randomName",   tKey: "toolRandomName",   descKey: "toolRandomNameDesc",   emoji: "🎯" },
      { key: "randomNumber", tKey: "toolRandomNumber", descKey: "toolRandomNumberDesc", emoji: "🔢" },
      { key: "yesNo",        tKey: "toolYesNo",        descKey: "toolYesNoDesc",        emoji: "✅" },
    ],
  },
  {
    catKey: "catCollaboration",
    tools: [
      { key: "groupMaker", tKey: "toolGroupMaker", descKey: "toolGroupMakerDesc", emoji: "👥" },
      { key: "whiteboard", tKey: "toolWhiteboard", descKey: "toolWhiteboardDesc", emoji: "🖊️" },
    ],
  },
];

const ALL_TOOLS = CATEGORIES.flatMap(c => c.tools);

const pad = (n) => String(n).padStart(2, "0");

/* ── Shared icons ── */
const IconBack = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
    <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconFs = ({ active }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    {active ? (
      <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    )}
  </svg>
);

/* ── Native shell with header + fullscreen support ── */
function NativeShell({ title, onBack, children, fsRef, isFullscreen, onToggleFs, headExtra }) {
  const exitFsAndBack = useCallback(async () => {
    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch { /* ignore */ }
    }
    onBack();
  }, [onBack]);

  return (
    <div className="ct-embed ct-embed--enter">
      <div className="ct-embed__head">
        <Btn kind="ghost" onClick={onBack}>
          <IconBack />
          {t("toolBack")}
        </Btn>
        <span className="ct-embed__title">{title}</span>
        {headExtra}
        {onToggleFs && (
          <button className="ct-embed__fs-btn" onClick={onToggleFs} title={t("toolFullscreen")}>
            <IconFs active={isFullscreen} />
            {t("toolFullscreen")}
          </button>
        )}
      </div>
      <div
        ref={fsRef}
        className={`ct-native__wrap${isFullscreen ? " ct-native__wrap--fs" : ""}`}
      >
        {children}
        {isFullscreen && (
          <button
            className="ct-fs-back"
            onClick={exitFsAndBack}
            title={t("toolBack")}
          >
            <IconBack />
            {t("toolBack")}
          </button>
        )}
      </div>
    </div>
  );
}

/* hook for fullscreen on a ref */
function useFullscreen(ref) {
  const [isFs, setIsFs] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggle = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (ref.current) ref.current.requestFullscreen();
  }, [ref]);
  return [isFs, toggle];
}

/* ── Kazakhstan Clock ── */
function getKzTime() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 5 * 3600000);
}

function KazakhstanClock({ onBack }) {
  const [now, setNow] = useState(getKzTime);
  const ref = useRef(null);
  const [isFs, toggleFs] = useFullscreen(ref);

  useEffect(() => {
    const id = setInterval(() => setNow(getKzTime()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <NativeShell
      title={t("toolClockTitle")}
      onBack={onBack}
      fsRef={ref}
      isFullscreen={isFs}
      onToggleFs={toggleFs}
    >
      <div className={`kz-clock${isFs ? " kz-clock--fs" : ""}`}>
        <div className="kz-clock__face">
          <span className="kz-clock__digit">{pad(now.getHours())}</span>
          <span className="kz-clock__sep">:</span>
          <span className="kz-clock__digit">{pad(now.getMinutes())}</span>
          <span className="kz-clock__sep kz-clock__sep--dim">:</span>
          <span className="kz-clock__digit kz-clock__digit--sec">{pad(now.getSeconds())}</span>
        </div>
      </div>
    </NativeShell>
  );
}

/* ─────────────────────────────────────────────
   TIMER
   ───────────────────────────────────────────── */
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const beep = (t0, freq) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.4, t0 + 0.02);
      g.gain.linearRampToValueAtTime(0, t0 + 0.45);
      o.start(t0);
      o.stop(t0 + 0.5);
    };
    const now = ctx.currentTime;
    beep(now, 880);
    beep(now + 0.6, 880);
    beep(now + 1.2, 1175);
    setTimeout(() => ctx.close(), 2500);
  } catch { /* ignore */ }
}

const TIMER_PRESETS = [
  { label: "1m", h: 0, m: 1, s: 0 },
  { label: "3m", h: 0, m: 3, s: 0 },
  { label: "5m", h: 0, m: 5, s: 0 },
  { label: "10m", h: 0, m: 10, s: 0 },
  { label: "15m", h: 0, m: 15, s: 0 },
  { label: "30m", h: 0, m: 30, s: 0 },
];

function TimerTool({ onBack }) {
  const ref = useRef(null);
  const [isFs, toggleFs] = useFullscreen(ref);

  const [h, setH] = useState(0);
  const [m, setM] = useState(5);
  const [s, setS] = useState(0);
  const [remaining, setRemaining] = useState(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [sound, setSound] = useState(true);
  const tickRef = useRef(null);
  const endAtRef = useRef(0);

  const totalSet = h * 3600 + m * 60 + s;
  const display = remaining ?? totalSet;

  const dh = Math.floor(display / 3600);
  const dm = Math.floor((display % 3600) / 60);
  const ds = display % 60;

  useEffect(() => {
    if (!running) return;
    tickRef.current = setInterval(() => {
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        setRunning(false);
        setDone(true);
        if (sound) playBeep();
      }
    }, 200);
    return () => clearInterval(tickRef.current);
  }, [running, sound]);

  const start = () => {
    const total = remaining ?? totalSet;
    if (total <= 0) return;
    endAtRef.current = Date.now() + total * 1000;
    setRemaining(total);
    setDone(false);
    setRunning(true);
  };
  const pause = () => {
    setRunning(false);
    setRemaining(Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000)));
  };
  const reset = () => {
    setRunning(false);
    setRemaining(null);
    setDone(false);
  };

  const applyPreset = (p) => {
    setRunning(false);
    setRemaining(null);
    setDone(false);
    setH(p.h); setM(p.m); setS(p.s);
  };

  const NumStep = ({ value, set, max, label }) => (
    <div className="tm-step">
      <button className="tm-step__btn" onClick={() => set(Math.min(max, value + 1))} disabled={running}>+</button>
      <div className="tm-step__val">{pad(value)}</div>
      <div className="tm-step__label">{label}</div>
      <button className="tm-step__btn" onClick={() => set(Math.max(0, value - 1))} disabled={running}>−</button>
    </div>
  );

  const editing = remaining === null && !running;

  return (
    <NativeShell
      title={`⏱️ ${t("toolTimer")}`}
      onBack={onBack}
      fsRef={ref}
      isFullscreen={isFs}
      onToggleFs={toggleFs}
    >
      <div className={`tm${isFs ? " tm--fs" : ""}${done ? " tm--done" : ""}`}>
        {editing ? (
          <div className="tm__edit">
            <NumStep value={h} set={setH} max={23} label={t("timerHours")} />
            <span className="tm__edit-sep">:</span>
            <NumStep value={m} set={setM} max={59} label={t("timerMinutes")} />
            <span className="tm__edit-sep">:</span>
            <NumStep value={s} set={setS} max={59} label={t("timerSeconds")} />
          </div>
        ) : (
          <div className="tm__display">
            <span className="tm__digit">{pad(dh)}</span>
            <span className="tm__sep">:</span>
            <span className="tm__digit">{pad(dm)}</span>
            <span className="tm__sep">:</span>
            <span className="tm__digit">{pad(ds)}</span>
          </div>
        )}

        {done && <div className="tm__done-msg">🔔 {t("timerDone")}</div>}

        <div className="tm__presets">
          <span className="tm__presets-lbl">{t("timerPresets")}:</span>
          {TIMER_PRESETS.map(p => (
            <button key={p.label} className="tm__preset" onClick={() => applyPreset(p)} disabled={running}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="tm__actions">
          {!running && !done && (
            <button className="tm__btn tm__btn--primary" onClick={start} disabled={totalSet <= 0 && (remaining ?? 0) <= 0}>
              ▶ {remaining !== null && remaining > 0 ? t("toolResume") : t("toolStart")}
            </button>
          )}
          {running && (
            <button className="tm__btn tm__btn--primary" onClick={pause}>⏸ {t("toolPause")}</button>
          )}
          <button className="tm__btn" onClick={reset}>↺ {t("toolReset")}</button>
          <label className="tm__sound">
            <input type="checkbox" checked={sound} onChange={e => setSound(e.target.checked)} />
            <span>🔊 {t("timerSound")}</span>
          </label>
        </div>
      </div>
    </NativeShell>
  );
}

/* ─────────────────────────────────────────────
   STOPWATCH
   ───────────────────────────────────────────── */
function StopwatchTool({ onBack }) {
  const ref = useRef(null);
  const [isFs, toggleFs] = useFullscreen(ref);

  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // ms
  const [laps, setLaps] = useState([]);
  const startedAtRef = useRef(0);
  const baseRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      setElapsed(baseRef.current + (Date.now() - startedAtRef.current));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running]);

  const start = () => {
    startedAtRef.current = Date.now();
    setRunning(true);
  };
  const pause = () => {
    baseRef.current = baseRef.current + (Date.now() - startedAtRef.current);
    setElapsed(baseRef.current);
    setRunning(false);
  };
  const reset = () => {
    baseRef.current = 0;
    setElapsed(0);
    setLaps([]);
    setRunning(false);
  };
  const lap = () => {
    setLaps(prev => [{ t: elapsed, idx: prev.length + 1 }, ...prev]);
  };

  const fmt = (ms) => {
    const total = Math.floor(ms);
    const hh = Math.floor(total / 3600000);
    const mm = Math.floor((total % 3600000) / 60000);
    const ss = Math.floor((total % 60000) / 1000);
    const cs = Math.floor((total % 1000) / 10);
    return { hh: pad(hh), mm: pad(mm), ss: pad(ss), cs: pad(cs) };
  };
  const f = fmt(elapsed);

  return (
    <NativeShell
      title={`⏲️ ${t("toolStopwatch")}`}
      onBack={onBack}
      fsRef={ref}
      isFullscreen={isFs}
      onToggleFs={toggleFs}
    >
      <div className={`sw${isFs ? " sw--fs" : ""}`}>
        <div className="sw__display">
          {f.hh !== "00" && <><span className="sw__digit">{f.hh}</span><span className="sw__sep">:</span></>}
          <span className="sw__digit">{f.mm}</span>
          <span className="sw__sep">:</span>
          <span className="sw__digit">{f.ss}</span>
          <span className="sw__sep sw__sep--small">.</span>
          <span className="sw__digit sw__digit--small">{f.cs}</span>
        </div>

        <div className="sw__actions">
          {!running ? (
            <button className="sw__btn sw__btn--primary" onClick={start}>▶ {elapsed > 0 ? t("toolResume") : t("toolStart")}</button>
          ) : (
            <button className="sw__btn sw__btn--primary" onClick={pause}>⏸ {t("toolPause")}</button>
          )}
          <button className="sw__btn" onClick={lap} disabled={!running}>🚩 {t("swLap")}</button>
          <button className="sw__btn" onClick={reset} disabled={elapsed === 0 && laps.length === 0}>↺ {t("toolReset")}</button>
        </div>

        {laps.length > 0 && (
          <div className="sw__laps">
            <div className="sw__laps-title">{t("swLaps")}</div>
            <ol className="sw__laps-list">
              {laps.map((l) => {
                const lf = fmt(l.t);
                return (
                  <li key={l.idx} className="sw__lap">
                    <span className="sw__lap-idx">#{l.idx}</span>
                    <span className="sw__lap-time">
                      {lf.hh !== "00" ? `${lf.hh}:` : ""}{lf.mm}:{lf.ss}.{lf.cs}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
    </NativeShell>
  );
}

/* ─────────────────────────────────────────────
   DICE
   ───────────────────────────────────────────── */
const DICE_FACES_6 = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const DICE_SIDES = [4, 6, 8, 10, 12, 20];

function DiceTool({ onBack }) {
  const ref = useRef(null);
  const [isFs, toggleFs] = useFullscreen(ref);

  const [count, setCount] = useState(2);
  const [sides, setSides] = useState(6);
  const [values, setValues] = useState(() => Array(2).fill(1));
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    setValues(prev => {
      const next = prev.slice(0, count);
      while (next.length < count) next.push(1);
      return next;
    });
  }, [count]);

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    let ticks = 0;
    const id = setInterval(() => {
      setValues(Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides)));
      ticks++;
      if (ticks > 8) {
        clearInterval(id);
        setValues(Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides)));
        setRolling(false);
      }
    }, 70);
  };

  const total = values.reduce((a, b) => a + b, 0);
  const useGlyph = sides === 6;

  return (
    <NativeShell
      title={`🎲 ${t("toolDice")}`}
      onBack={onBack}
      fsRef={ref}
      isFullscreen={isFs}
      onToggleFs={toggleFs}
    >
      <div className={`dc${isFs ? " dc--fs" : ""}`}>
        <div className="dc__controls">
          <label className="dc__field">
            <span>{t("diceCount")}</span>
            <input type="number" min="1" max="6" value={count}
              onChange={e => setCount(Math.max(1, Math.min(6, +e.target.value || 1)))} />
          </label>
          <label className="dc__field">
            <span>{t("diceSides")}</span>
            <select value={sides} onChange={e => setSides(+e.target.value)}>
              {DICE_SIDES.map(s => <option key={s} value={s}>d{s}</option>)}
            </select>
          </label>
        </div>

        <div className="dc__stage">
          {values.map((v, i) => (
            <div key={i} className={`dc__die${rolling ? " dc__die--rolling" : ""}`}>
              {useGlyph ? <span className="dc__glyph">{DICE_FACES_6[v - 1]}</span> : <span className="dc__num">{v}</span>}
            </div>
          ))}
        </div>

        {count > 1 && (
          <div className="dc__total">{t("diceTotal")}: <b>{total}</b></div>
        )}

        <button className="dc__roll" onClick={roll} disabled={rolling}>
          🎲 {t("toolRoll")}
        </button>
      </div>
    </NativeShell>
  );
}

/* ─────────────────────────────────────────────
   RANDOM NAME (chips + numbers mode)
   ───────────────────────────────────────────── */
function RandomNameTool({ onBack }) {
  const ref = useRef(null);
  const [isFs, toggleFs] = useFullscreen(ref);

  const [mode, setMode] = useState("names"); // names | numbers
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [maxNumber, setMaxNumber] = useState(20);
  const [removeAfter, setRemoveAfter] = useState(false);

  const [winner, setWinner] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [scroll, setScroll] = useState("");

  const pool = useMemo(() => {
    if (mode === "names") return items;
    const n = Math.max(0, Math.min(999, Math.floor(maxNumber)));
    return Array.from({ length: n }, (_, i) => String(i + 1));
  }, [mode, items, maxNumber]);

  const addDraft = () => {
    const v = draft.trim();
    if (!v) return;
    setItems(prev => [...prev, v]);
    setDraft("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addDraft();
    } else if (e.key === "Backspace" && draft === "" && items.length > 0) {
      setItems(prev => prev.slice(0, -1));
    }
  };

  const removeChip = (i) => setItems(prev => prev.filter((_, j) => j !== i));

  const importBulk = () => {
    const next = bulkText.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    if (next.length) {
      setItems(prev => [...prev, ...next]);
      setBulkText("");
      setBulkOpen(false);
    }
  };

  const clearAll = () => {
    setItems([]);
    setBulkText("");
    setWinner(null);
  };

  const spin = () => {
    if (spinning || pool.length === 0) return;
    setSpinning(true);
    setWinner(null);
    let ticks = 0;
    const id = setInterval(() => {
      const i = Math.floor(Math.random() * pool.length);
      setScroll(pool[i]);
      ticks++;
      if (ticks > 18) {
        clearInterval(id);
        const idx = Math.floor(Math.random() * pool.length);
        const pick = pool[idx];
        setScroll(pick);
        setWinner(pick);
        setSpinning(false);
        if (mode === "names" && removeAfter) {
          setItems(prev => prev.filter((_, j) => j !== idx));
        }
      }
    }, 80);
  };

  return (
    <NativeShell
      title={`🎯 ${t("toolRandomName")}`}
      onBack={onBack}
      fsRef={ref}
      isFullscreen={isFs}
      onToggleFs={toggleFs}
    >
      <div className={`rn${isFs ? " rn--fs" : ""}`}>
        {/* Stage column — primary */}
        <div className="rn__col rn__col--stage">
          <div className="rn__stage">
            {pool.length === 0 ? (
              <div className="rn__empty">{t("rnNoNames")}</div>
            ) : winner ? (
              <>
                <div className="rn__crown">👑</div>
                <div className="rn__winner-lbl">{t("rnWinner")}</div>
                <div className="rn__winner">{winner}</div>
              </>
            ) : spinning ? (
              <div className="rn__scroll">{scroll}</div>
            ) : (
              <div className="rn__hint">🎯 {t("rnSpin")}</div>
            )}
          </div>
          <button className="rn__btn" onClick={spin} disabled={spinning || pool.length === 0}>
            🎯 {t("rnSpin")}
          </button>
        </div>

        {/* Setup column */}
        <div className="rn__col rn__col--setup">
          <div className="rn__tabs">
            <button
              className={`rn__tab${mode === "names" ? " rn__tab--on" : ""}`}
              onClick={() => { setMode("names"); setWinner(null); }}
            >
              👤 {t("rnTabNames")}
            </button>
            <button
              className={`rn__tab${mode === "numbers" ? " rn__tab--on" : ""}`}
              onClick={() => { setMode("numbers"); setWinner(null); }}
            >
              🔢 {t("rnTabNumbers")}
            </button>
          </div>

          {mode === "names" ? (
            <>
              <div className="rn__chip-input">
                <input
                  type="text"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={t("rnAddPlaceholder")}
                />
                <button onClick={addDraft} disabled={!draft.trim()} title={t("rnImport")}>+</button>
              </div>

              <div className="rn__chips">
                {items.length === 0 ? (
                  <span className="rn__chips-empty">{t("rnNoNames")}</span>
                ) : (
                  items.map((n, i) => (
                    <span key={i} className="rn__chip" style={{ animationDelay: `${i * 18}ms` }}>
                      {n}
                      <button onClick={() => removeChip(i)} aria-label="remove">×</button>
                    </span>
                  ))
                )}
              </div>

              <div className="rn__opts-row">
                <button className="rn__link" onClick={() => setBulkOpen(o => !o)}>
                  {bulkOpen ? "▴" : "▾"} {t("rnBulkAdd")}
                </button>
                <span className="rn__count">{items.length}</span>
              </div>

              {bulkOpen && (
                <div className="rn__bulk">
                  <textarea
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    placeholder={t("rnNamesPlaceholder")}
                    spellCheck={false}
                  />
                  <button className="rn__bulk-btn" onClick={importBulk} disabled={!bulkText.trim()}>
                    {t("rnImport")}
                  </button>
                </div>
              )}

              <label className="rn__check">
                <input type="checkbox" checked={removeAfter} onChange={e => setRemoveAfter(e.target.checked)} />
                <span>{t("rnRemoveAfterPick")}</span>
              </label>

              {items.length > 0 && (
                <button className="rn__clear" onClick={clearAll}>↺ {t("toolClear")}</button>
              )}
            </>
          ) : (
            <div className="rn__num-mode">
              <label className="rn__field">
                <span>{t("rnNumberRange")}</span>
                <div className="rn__num-row">
                  <span className="rn__num-from">1</span>
                  <span className="rn__num-sep">—</span>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={maxNumber}
                    onChange={e => setMaxNumber(Math.max(1, Math.min(999, +e.target.value || 1)))}
                  />
                </div>
              </label>
              <p className="rn__num-hint">{t("rnNumberHint")}</p>
              <div className="rn__num-quick">
                {[10, 15, 20, 25, 30].map(n => (
                  <button
                    key={n}
                    className={`rn__num-pill${maxNumber === n ? " rn__num-pill--on" : ""}`}
                    onClick={() => setMaxNumber(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </NativeShell>
  );
}

/* ─────────────────────────────────────────────
   RANDOM NUMBER
   ───────────────────────────────────────────── */
function RandomNumberTool({ onBack }) {
  const ref = useRef(null);
  const [isFs, toggleFs] = useFullscreen(ref);

  const [min, setMin] = useState(1);
  const [max, setMax] = useState(100);
  const [noRepeat, setNoRepeat] = useState(false);
  const [history, setHistory] = useState([]);
  const [current, setCurrent] = useState(null);
  const [rolling, setRolling] = useState(false);

  const exhausted = noRepeat && history.length >= (max - min + 1);

  const generate = () => {
    if (rolling || max < min) return;
    setRolling(true);
    let ticks = 0;
    let pool = null;
    if (noRepeat) {
      pool = [];
      for (let n = min; n <= max; n++) if (!history.includes(n)) pool.push(n);
      if (pool.length === 0) {
        setRolling(false);
        return;
      }
    }
    const id = setInterval(() => {
      if (noRepeat) {
        setCurrent(pool[Math.floor(Math.random() * pool.length)]);
      } else {
        setCurrent(min + Math.floor(Math.random() * (max - min + 1)));
      }
      ticks++;
      if (ticks > 12) {
        clearInterval(id);
        const final = noRepeat
          ? pool[Math.floor(Math.random() * pool.length)]
          : min + Math.floor(Math.random() * (max - min + 1));
        setCurrent(final);
        setHistory(prev => [final, ...prev].slice(0, 50));
        setRolling(false);
      }
    }, 60);
  };

  const reset = () => {
    setHistory([]);
    setCurrent(null);
  };

  return (
    <NativeShell
      title={`🔢 ${t("toolRandomNumber")}`}
      onBack={onBack}
      fsRef={ref}
      isFullscreen={isFs}
      onToggleFs={toggleFs}
    >
      <div className={`rnum${isFs ? " rnum--fs" : ""}`}>
        <div className="rnum__controls">
          <label className="rnum__field">
            <span>{t("rnumMin")}</span>
            <input type="number" value={min} onChange={e => setMin(Math.floor(+e.target.value || 0))} />
          </label>
          <label className="rnum__field">
            <span>{t("rnumMax")}</span>
            <input type="number" value={max} onChange={e => setMax(Math.floor(+e.target.value || 0))} />
          </label>
          <label className="rnum__check">
            <input type="checkbox" checked={noRepeat} onChange={e => { setNoRepeat(e.target.checked); setHistory([]); }} />
            <span>{t("rnumNoRepeat")}</span>
          </label>
        </div>

        <div className="rnum__display">
          {current === null ? "?" : current}
        </div>

        {exhausted && <div className="rnum__exhausted">{t("rnumExhausted")}</div>}

        <div className="rnum__actions">
          <button className="rnum__btn rnum__btn--primary" onClick={generate} disabled={rolling || exhausted || max < min}>
            🎲 {t("toolGenerate")}
          </button>
          <button className="rnum__btn" onClick={reset} disabled={history.length === 0 && current === null}>
            ↺ {t("toolReset")}
          </button>
        </div>

        {history.length > 0 && (
          <div className="rnum__history">
            <div className="rnum__history-title">{t("toolHistory")}</div>
            <div className="rnum__history-list">
              {history.map((n, i) => (
                <span key={i} className="rnum__chip">{n}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </NativeShell>
  );
}

/* ─────────────────────────────────────────────
   YES / NO
   ───────────────────────────────────────────── */
function YesNoTool({ onBack }) {
  const ref = useRef(null);
  const [isFs, toggleFs] = useFullscreen(ref);

  const [answer, setAnswer] = useState(null); // null | "yes" | "no"
  const [spinning, setSpinning] = useState(false);
  const [flicker, setFlicker] = useState(null);

  const reveal = () => {
    if (spinning) return;
    setSpinning(true);
    setAnswer(null);
    let ticks = 0;
    const id = setInterval(() => {
      setFlicker(Math.random() < 0.5 ? "yes" : "no");
      ticks++;
      if (ticks > 12) {
        clearInterval(id);
        const result = Math.random() < 0.5 ? "yes" : "no";
        setAnswer(result);
        setFlicker(null);
        setSpinning(false);
      }
    }, 80);
  };

  const view = answer || flicker;

  return (
    <NativeShell
      title={`✅ ${t("toolYesNo")}`}
      onBack={onBack}
      fsRef={ref}
      isFullscreen={isFs}
      onToggleFs={toggleFs}
    >
      <div className={`yn${isFs ? " yn--fs" : ""}`}>
        <button
          className={`yn__big yn__big--${view || "idle"}${spinning ? " yn__big--spin" : ""}`}
          onClick={reveal}
          disabled={spinning}
        >
          {view === "yes" ? t("ynYes") : view === "no" ? t("ynNo") : "?"}
        </button>
        <div className="yn__hint">{spinning ? "…" : answer ? t("toolReveal") : t("ynTap")}</div>
        {answer && (
          <button className="yn__again" onClick={() => { setAnswer(null); }}>
            ↺ {t("toolReset")}
          </button>
        )}
      </div>
    </NativeShell>
  );
}

/* ─────────────────────────────────────────────
   GROUP MAKER (chips + count mode)
   ───────────────────────────────────────────── */
function GroupMakerTool({ onBack }) {
  const ref = useRef(null);
  const [isFs, toggleFs] = useFullscreen(ref);

  const [source, setSource] = useState("names"); // names | count
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [studentCount, setStudentCount] = useState(20);

  const [mode, setMode] = useState("count"); // count | size
  const [groupCount, setGroupCount] = useState(3);
  const [groupSize, setGroupSize] = useState(4);
  const [groups, setGroups] = useState([]);

  const pool = useMemo(() => {
    if (source === "names") return items;
    const n = Math.max(0, Math.min(999, Math.floor(studentCount)));
    return Array.from({ length: n }, (_, i) => `${t("gmStudent")} ${i + 1}`);
  }, [source, items, studentCount]);

  const addDraft = () => {
    const v = draft.trim();
    if (!v) return;
    setItems(prev => [...prev, v]);
    setDraft("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addDraft();
    } else if (e.key === "Backspace" && draft === "" && items.length > 0) {
      setItems(prev => prev.slice(0, -1));
    }
  };

  const removeChip = (i) => setItems(prev => prev.filter((_, j) => j !== i));

  const importBulk = () => {
    const next = bulkText.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    if (next.length) {
      setItems(prev => [...prev, ...next]);
      setBulkText("");
      setBulkOpen(false);
    }
  };

  const clearAll = () => {
    setItems([]);
    setBulkText("");
    setGroups([]);
  };

  const shuffle = () => {
    if (pool.length === 0) return;
    const arr = pool.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    let buckets = [];
    if (mode === "count") {
      const k = Math.max(1, Math.min(arr.length, groupCount));
      buckets = Array.from({ length: k }, () => []);
      arr.forEach((n, i) => buckets[i % k].push(n));
    } else {
      const sz = Math.max(1, groupSize);
      for (let i = 0; i < arr.length; i += sz) {
        buckets.push(arr.slice(i, i + sz));
      }
    }
    setGroups(buckets);
  };

  const palette = ["#7dd3fc", "#fbbf24", "#a78bfa", "#34d399", "#fb7185", "#60a5fa", "#f472b6", "#22d3ee"];

  return (
    <NativeShell
      title={`👥 ${t("toolGroupMaker")}`}
      onBack={onBack}
      fsRef={ref}
      isFullscreen={isFs}
      onToggleFs={toggleFs}
    >
      <div className={`gm${isFs ? " gm--fs" : ""}`}>
        <div className="gm__col gm__col--input">
          {/* Source tabs */}
          <div className="rn__tabs">
            <button
              className={`rn__tab${source === "names" ? " rn__tab--on" : ""}`}
              onClick={() => setSource("names")}
            >
              👤 {t("rnTabNames")}
            </button>
            <button
              className={`rn__tab${source === "count" ? " rn__tab--on" : ""}`}
              onClick={() => setSource("count")}
            >
              🔢 {t("rnTabNumbers")}
            </button>
          </div>

          {source === "names" ? (
            <>
              <div className="rn__chip-input">
                <input
                  type="text"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={t("rnAddPlaceholder")}
                />
                <button onClick={addDraft} disabled={!draft.trim()} title={t("rnImport")}>+</button>
              </div>

              <div className="rn__chips">
                {items.length === 0 ? (
                  <span className="rn__chips-empty">{t("rnNoNames")}</span>
                ) : (
                  items.map((n, i) => (
                    <span key={i} className="rn__chip" style={{ animationDelay: `${i * 18}ms` }}>
                      {n}
                      <button onClick={() => removeChip(i)} aria-label="remove">×</button>
                    </span>
                  ))
                )}
              </div>

              <div className="rn__opts-row">
                <button className="rn__link" onClick={() => setBulkOpen(o => !o)}>
                  {bulkOpen ? "▴" : "▾"} {t("rnBulkAdd")}
                </button>
                <span className="rn__count">{items.length}</span>
              </div>

              {bulkOpen && (
                <div className="rn__bulk">
                  <textarea
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    placeholder={t("rnNamesPlaceholder")}
                    spellCheck={false}
                  />
                  <button className="rn__bulk-btn" onClick={importBulk} disabled={!bulkText.trim()}>
                    {t("rnImport")}
                  </button>
                </div>
              )}

              {items.length > 0 && (
                <button className="rn__clear" onClick={clearAll}>↺ {t("toolClear")}</button>
              )}
            </>
          ) : (
            <div className="rn__num-mode">
              <label className="rn__field">
                <span>{t("rnNumberRange")}</span>
                <div className="rn__num-row">
                  <span className="rn__num-from">1</span>
                  <span className="rn__num-sep">—</span>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={studentCount}
                    onChange={e => setStudentCount(Math.max(1, Math.min(999, +e.target.value || 1)))}
                  />
                </div>
              </label>
              <div className="rn__num-quick">
                {[10, 15, 20, 25, 30].map(n => (
                  <button
                    key={n}
                    className={`rn__num-pill${studentCount === n ? " rn__num-pill--on" : ""}`}
                    onClick={() => setStudentCount(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Group mode */}
          <div className="gm__divider" />

          <div className="gm__mode">
            <label className={`gm__radio${mode === "count" ? " gm__radio--on" : ""}`}>
              <input type="radio" name="gm-mode" checked={mode === "count"} onChange={() => setMode("count")} />
              <span>{t("gmModeByCount")}</span>
            </label>
            <label className={`gm__radio${mode === "size" ? " gm__radio--on" : ""}`}>
              <input type="radio" name="gm-mode" checked={mode === "size"} onChange={() => setMode("size")} />
              <span>{t("gmModeBySize")}</span>
            </label>
          </div>

          {mode === "count" ? (
            <label className="gm__field">
              <span>{t("gmGroupCount")}</span>
              <div className="gm__stepper">
                <button
                  className="gm__step-btn"
                  onClick={() => setGroupCount(c => Math.max(1, c - 1))}
                  disabled={groupCount <= 1}
                >−</button>
                <input type="number" min="1" max="50" value={groupCount}
                  onChange={e => setGroupCount(Math.max(1, +e.target.value || 1))} />
                <button
                  className="gm__step-btn"
                  onClick={() => setGroupCount(c => Math.min(50, c + 1))}
                  disabled={groupCount >= 50}
                >+</button>
              </div>
            </label>
          ) : (
            <label className="gm__field">
              <span>{t("gmGroupSize")}</span>
              <div className="gm__stepper">
                <button
                  className="gm__step-btn"
                  onClick={() => setGroupSize(c => Math.max(1, c - 1))}
                  disabled={groupSize <= 1}
                >−</button>
                <input type="number" min="1" max="50" value={groupSize}
                  onChange={e => setGroupSize(Math.max(1, +e.target.value || 1))} />
                <button
                  className="gm__step-btn"
                  onClick={() => setGroupSize(c => Math.min(50, c + 1))}
                  disabled={groupSize >= 50}
                >+</button>
              </div>
            </label>
          )}

          <button className="gm__btn" onClick={shuffle} disabled={pool.length === 0}>
            🔀 {t("gmShuffle")}
          </button>
        </div>

        <div className="gm__col gm__col--out">
          {groups.length === 0 ? (
            <div className="gm__empty">{t("gmNeedNames")}</div>
          ) : (
            <div className="gm__groups">
              {groups.map((g, i) => (
                <div
                  key={i}
                  className="gm__group"
                  style={{
                    "--gm-c": palette[i % palette.length],
                    animationDelay: `${i * 60}ms`,
                  }}
                >
                  <div className="gm__group-head">
                    <span className="gm__group-title">{t("gmGroup")} {i + 1}</span>
                    <span className="gm__group-size">{g.length}</span>
                  </div>
                  <ul className="gm__group-list">
                    {g.map((n, j) => <li key={j}>{n}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </NativeShell>
  );
}

/* ─────────────────────────────────────────────
   WHITEBOARD
   ───────────────────────────────────────────── */
const WB_COLORS = ["#ffffff", "#000000", "#7dd3fc", "#fb7185", "#34d399", "#fbbf24", "#a78bfa", "#f472b6"];
const WB_SIZES = [2, 4, 8, 14, 22];

function WhiteboardTool({ onBack }) {
  const ref = useRef(null);
  const [isFs, toggleFs] = useFullscreen(ref);

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [color, setColor] = useState("#ffffff");
  const [size, setSize] = useState(4);
  const [tool, setTool] = useState("pen"); // pen | eraser
  const [bg, setBg] = useState("#1a1d26");
  const drawingRef = useRef(false);
  const lastRef = useRef(null);
  const stackRef = useRef([]); // history
  const redoRef = useRef([]);
  const [, force] = useState(0);

  const fitCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const prev = document.createElement("canvas");
    prev.width = canvas.width;
    prev.height = canvas.height;
    if (canvas.width > 0 && canvas.height > 0) {
      prev.getContext("2d").drawImage(canvas, 0, 0);
    }
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (prev.width > 0) ctx.drawImage(prev, 0, 0);
  }, [bg]);

  useEffect(() => {
    fitCanvas();
    const obs = new ResizeObserver(fitCanvas);
    if (wrapRef.current) obs.observe(wrapRef.current);
    return () => obs.disconnect();
  }, [fitCanvas]);

  // Re-fit when entering/leaving fullscreen
  useEffect(() => { setTimeout(fitCanvas, 50); }, [isFs, fitCanvas]);

  const saveState = () => {
    const c = canvasRef.current;
    if (!c) return;
    try {
      stackRef.current.push(c.toDataURL());
      if (stackRef.current.length > 30) stackRef.current.shift();
      redoRef.current = [];
      force(x => x + 1);
    } catch { /* ignore */ }
  };

  const restoreFrom = (data) => {
    const c = canvasRef.current;
    if (!c || !data) return;
    const img = new Image();
    img.onload = () => {
      const ctx = c.getContext("2d");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = data;
  };

  const undo = () => {
    if (stackRef.current.length === 0) return;
    const c = canvasRef.current;
    if (c) redoRef.current.push(c.toDataURL());
    const prev = stackRef.current.pop();
    restoreFrom(prev);
    force(x => x + 1);
  };
  const redo = () => {
    if (redoRef.current.length === 0) return;
    const c = canvasRef.current;
    if (c) stackRef.current.push(c.toDataURL());
    const next = redoRef.current.pop();
    restoreFrom(next);
    force(x => x + 1);
  };

  const clear = () => {
    saveState();
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, c.width, c.height);
  };

  // Repaint background when bg changes
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    // Re-fill but keep strokes by composite
    const tmp = document.createElement("canvas");
    tmp.width = c.width;
    tmp.height = c.height;
    tmp.getContext("2d").drawImage(c, 0, 0);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(tmp, 0, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bg]);

  const getPos = (e) => {
    const c = canvasRef.current;
    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const x = (e.clientX - rect.left) * dpr;
    const y = (e.clientY - rect.top) * dpr;
    return { x, y };
  };

  const onDown = (e) => {
    e.preventDefault();
    const c = canvasRef.current;
    if (!c) return;
    saveState();
    drawingRef.current = true;
    lastRef.current = getPos(e);
    if (e.target.setPointerCapture) {
      try { e.target.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
  };
  const onMove = (e) => {
    if (!drawingRef.current) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const pos = getPos(e);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = size * dpr;
    if (tool === "eraser") {
      ctx.strokeStyle = bg;
    } else {
      ctx.strokeStyle = color;
    }
    ctx.beginPath();
    ctx.moveTo(lastRef.current.x, lastRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastRef.current = pos;
  };
  const onUp = () => { drawingRef.current = false; };

  const download = () => {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement("a");
    a.download = "whiteboard.png";
    a.href = c.toDataURL("image/png");
    a.click();
  };

  return (
    <NativeShell
      title={`🖊️ ${t("toolWhiteboard")}`}
      onBack={onBack}
      fsRef={ref}
      isFullscreen={isFs}
      onToggleFs={toggleFs}
    >
      <div className={`wb${isFs ? " wb--fs" : ""}`}>
        <div className="wb__canvas-wrap" ref={wrapRef}>
          <canvas
            ref={canvasRef}
            className="wb__canvas"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={onUp}
            onPointerCancel={onUp}
            style={{ touchAction: "none", cursor: tool === "eraser" ? "cell" : "crosshair" }}
          />
        </div>
        <div className="wb__toolbar">
          <div className="wb__group">
            <button
              className={`wb__tbtn${tool === "pen" ? " wb__tbtn--on" : ""}`}
              onClick={() => setTool("pen")}
              title={t("wbPen")}
            >🖊️</button>
            <button
              className={`wb__tbtn${tool === "eraser" ? " wb__tbtn--on" : ""}`}
              onClick={() => setTool("eraser")}
              title={t("wbEraser")}
            >🧽</button>
          </div>

          <div className="wb__group" title={t("wbColor")}>
            {WB_COLORS.map(c => (
              <button
                key={c}
                className={`wb__swatch${color === c ? " wb__swatch--on" : ""}`}
                style={{ background: c }}
                onClick={() => { setColor(c); setTool("pen"); }}
              />
            ))}
            <input
              type="color"
              className="wb__picker"
              value={color}
              onChange={e => { setColor(e.target.value); setTool("pen"); }}
            />
          </div>

          <div className="wb__group wb__group--sizes" title={t("wbSize")}>
            {WB_SIZES.map(s => (
              <button
                key={s}
                className={`wb__size${size === s ? " wb__size--on" : ""}`}
                onClick={() => setSize(s)}
              >
                <span style={{ width: s + 4, height: s + 4, background: tool === "eraser" ? "#aaa" : color }} />
              </button>
            ))}
          </div>

          <div className="wb__group">
            <button className="wb__tbtn" onClick={undo} disabled={stackRef.current.length === 0} title={t("toolUndo")}>↶</button>
            <button className="wb__tbtn" onClick={redo} disabled={redoRef.current.length === 0} title={t("toolRedo")}>↷</button>
            <button className="wb__tbtn" onClick={clear} title={t("toolClear")}>🗑️</button>
            <button className="wb__tbtn" onClick={download} title={t("toolDownload")}>⬇</button>
          </div>

          <div className="wb__group" title={t("wbBg")}>
            <button className="wb__bg" style={{ background: "#1a1d26" }} onClick={() => setBg("#1a1d26")} />
            <button className="wb__bg" style={{ background: "#ffffff" }} onClick={() => setBg("#ffffff")} />
            <button className="wb__bg" style={{ background: "#0f3460" }} onClick={() => setBg("#0f3460")} />
            <button className="wb__bg" style={{ background: "#1f1611" }} onClick={() => setBg("#1f1611")} />
          </div>
        </div>
      </div>
    </NativeShell>
  );
}

/* ─────────────────────────────────────────────
   Tool card
   ───────────────────────────────────────────── */
function ToolCard({ tool, index, onClick }) {
  return (
    <button
      className="ct-card glass"
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={onClick}
    >
      <span className="ct-card__emoji">{tool.emoji}</span>
      <div className="ct-card__text">
        <span className="ct-card__name">{t(tool.tKey)}</span>
        <span className="ct-card__desc">{t(tool.descKey)}</span>
      </div>
      <svg className="ct-card__arrow" width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/* ─────────────────────────────────────────────
   Main page
   ───────────────────────────────────────────── */
const TOOL_COMPONENTS = {
  clock: KazakhstanClock,
  timer: TimerTool,
  stopwatch: StopwatchTool,
  dice: DiceTool,
  randomName: RandomNameTool,
  randomNumber: RandomNumberTool,
  yesNo: YesNoTool,
  groupMaker: GroupMakerTool,
  whiteboard: WhiteboardTool,
};

export function PageClassroomTools() {
  const [activeTool, setActiveTool] = useState(null);
  const goBack = useCallback(() => setActiveTool(null), []);

  if (activeTool) {
    const Comp = TOOL_COMPONENTS[activeTool];
    if (Comp) return <Comp onBack={goBack} />;
  }

  let cardIndex = 0;

  return (
    <div className="ct-page">
      <div className="page-head">
        <h1 className="h1">{t("classroomToolsTitle")}</h1>
        <p className="p muted">{t("classroomToolsDesc")}</p>
      </div>

      {CATEGORIES.map(cat => (
        <section key={cat.catKey} className="ct-section">
          <h2 className="ct-section__title">{t(cat.catKey)}</h2>
          <div className="ct-grid">
            {cat.tools.map(tool => (
              <ToolCard
                key={tool.key}
                tool={tool}
                index={cardIndex++}
                onClick={() => setActiveTool(tool.key)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// Suppress lint warning for ALL_TOOLS unused
void ALL_TOOLS;
