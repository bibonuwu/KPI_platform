import React, { useEffect, useRef, useState, useCallback } from "react";
import { t } from "../i18n.js";
import { Btn } from "../components.jsx";

/* ── Tool definitions with categories ── */
const CATEGORIES = [
  {
    catKey: "catTime",
    tools: [
      { key: "clock",       tKey: "toolClock",        descKey: "toolClockDesc",        emoji: "🕐" },
      { key: "timer",       tKey: "toolTimer",        descKey: "toolTimerDesc",        emoji: "⏱️", url: "https://www.classroomtools.app/tools/timer?embed=true" },
      { key: "stopwatch",   tKey: "toolStopwatch",    descKey: "toolStopwatchDesc",    emoji: "⏲️", url: "https://www.classroomtools.app/tools/stopwatch?embed=true" },
    ],
  },
  {
    catKey: "catRandom",
    tools: [
      { key: "dice",         tKey: "toolDice",          descKey: "toolDiceDesc",          emoji: "🎲", url: "https://www.classroomtools.app/tools/dice?count=2&sides=6&embed=true" },
      { key: "randomName",   tKey: "toolRandomName",    descKey: "toolRandomNameDesc",    emoji: "🎯", url: "https://www.classroomtools.app/tools/picker?embed=true" },
      { key: "randomNumber", tKey: "toolRandomNumber",  descKey: "toolRandomNumberDesc",  emoji: "🔢", url: "https://www.classroomtools.app/tools/random-number-generator?embed=true" },
      { key: "yesNo",        tKey: "toolYesNo",         descKey: "toolYesNoDesc",         emoji: "✅", url: "https://www.classroomtools.app/tools/yes-no-picker?embed=true" },
    ],
  },
  {
    catKey: "catCollaboration",
    tools: [
      { key: "groupMaker",  tKey: "toolGroupMaker",   descKey: "toolGroupMakerDesc",   emoji: "👥", url: "https://www.classroomtools.app/tools/group-maker?embed=true" },
      { key: "whiteboard",  tKey: "toolWhiteboard",   descKey: "toolWhiteboardDesc",   emoji: "🖊️", url: "https://www.classroomtools.app/tools/whiteboard?embed=true" },
    ],
  },
];

const ALL_TOOLS = CATEGORIES.flatMap(c => c.tools);

/* ── Kazakhstan Clock ── */
function getKzTime() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 5 * 3600000);
}

function pad(n) { return String(n).padStart(2, "0"); }

function KazakhstanClock({ onBack }) {
  const [now, setNow] = useState(getKzTime);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const clockRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setNow(getKzTime()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (clockRef.current) {
      clockRef.current.requestFullscreen();
    }
  };

  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  return (
    <div className="ct-embed ct-embed--enter">
      <div className="ct-embed__head">
        <Btn kind="ghost" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t("toolBack")}
        </Btn>
        <span className="ct-embed__title">{t("toolClockTitle")}</span>
      </div>
      <div className={`kz-clock${isFullscreen ? " kz-clock--fs" : ""}`} ref={clockRef}>
        <div className="kz-clock__face">
          <span className="kz-clock__digit">{hours}</span>
          <span className="kz-clock__sep">:</span>
          <span className="kz-clock__digit">{minutes}</span>
          <span className="kz-clock__sep kz-clock__sep--dim">:</span>
          <span className="kz-clock__digit kz-clock__digit--sec">{seconds}</span>
        </div>
        <button className="kz-clock__fs-btn" onClick={toggleFullscreen} title={t("toolFullscreen")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            {isFullscreen ? (
              <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
          {t("toolFullscreen")}
        </button>
      </div>
    </div>
  );
}

/* ── Embed view for external tools ── */
function ToolEmbed({ tool, onBack }) {
  const [loaded, setLoaded] = useState(false);
  const hasFullscreen = tool.key === "whiteboard";
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!hasFullscreen) return;
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [hasFullscreen]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (wrapRef.current) {
      wrapRef.current.requestFullscreen();
    }
  };

  return (
    <div className="ct-embed ct-embed--enter">
      <div className="ct-embed__head">
        <Btn kind="ghost" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t("toolBack")}
        </Btn>
        <span className="ct-embed__title">{tool.emoji} {t(tool.tKey)}</span>
        {hasFullscreen && (
          <button className="ct-embed__fs-btn" onClick={toggleFullscreen} title={t("toolFullscreen")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              {isFullscreen ? (
                <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
            {t("toolFullscreen")}
          </button>
        )}
      </div>
      <div
        className={`ct-embed__frame-wrap${isFullscreen ? " ct-embed__frame-wrap--fs" : ""}`}
        ref={hasFullscreen ? wrapRef : undefined}
      >
        {!loaded && (
          <div className="ct-embed__loader">
            <div className="ct-embed__spinner" />
          </div>
        )}
        <iframe
          src={tool.url}
          className={`ct-embed__iframe${loaded ? " ct-embed__iframe--ready" : ""}`}
          allow="fullscreen"
          title={t(tool.tKey)}
          onLoad={() => setLoaded(true)}
        />
        {isFullscreen && (
          <button className="ct-embed__fs-back" onClick={() => document.exitFullscreen()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("toolBack")}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Tool card ── */
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

/* ── Main page ── */
export function PageClassroomTools() {
  const [activeTool, setActiveTool] = useState(null);
  const goBack = useCallback(() => setActiveTool(null), []);

  if (activeTool === "clock") {
    return <KazakhstanClock onBack={goBack} />;
  }

  if (activeTool) {
    const tool = ALL_TOOLS.find(item => item.key === activeTool);
    if (tool) return <ToolEmbed tool={tool} onBack={goBack} />;
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
