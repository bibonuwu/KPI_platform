import React, { useEffect, useMemo, useState } from "react";
import { t, getLang } from "../i18n.js";
import { useStore, setState } from "../store.js";
import { fetchEvents } from "../data.js";
import { Btn, Guard } from "../components.jsx";

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function startDayOfWeek(year, month) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Monday = 0
}

function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function PageCalendar() {
  const st = useStore();
  const u = st.userDoc;
  const events = st.events || [];
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);

  // Load events if not in store yet
  useEffect(() => {
    if (events.length === 0) {
      setLoading(true);
      fetchEvents().then(ev => {
        setState({ events: ev });
      }).catch(() => {}).finally(() => setLoading(false));
    }
  }, []);

  const lang = getLang();
  const monthNames = t("monthNames");
  const weekDays = t("weekDays");

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  const totalDays = daysInMonth(year, month);
  const startOff = startDayOfWeek(year, month);
  const todayStr = ymd(today);

  // Build grid cells
  const cells = [];
  for (let i = 0; i < startOff; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  // Map events to dates for this month
  const eventsForMonth = useMemo(() => {
    const map = {};
    const mStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const mEnd = `${year}-${String(month + 1).padStart(2, "0")}-${String(totalDays).padStart(2, "0")}`;
    events.forEach(ev => {
      if (ev.dateTo < mStart || ev.dateFrom > mEnd) return;
      // Mark every day in range that falls in this month
      const from = ev.dateFrom > mStart ? ev.dateFrom : mStart;
      const to = ev.dateTo < mEnd ? ev.dateTo : mEnd;
      let cur = new Date(from + "T00:00:00");
      const end = new Date(to + "T00:00:00");
      while (cur <= end) {
        const key = ymd(cur);
        if (!map[key]) map[key] = [];
        map[key].push(ev);
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [events, year, month, totalDays]);

  // Events for selected date
  const selectedEvents = selectedDate ? (eventsForMonth[selectedDate] || []) : [];

  // Upcoming events (next 30 days)
  const upcoming = useMemo(() => {
    const tStr = todayStr;
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 30);
    const fStr = ymd(futureDate);
    return events
      .filter(ev => ev.dateTo >= tStr && ev.dateFrom <= fStr)
      .sort((a, b) => a.dateFrom.localeCompare(b.dateFrom))
      .slice(0, 10);
  }, [events, todayStr]);

  if (!u) return <Guard />;

  return (
    <div className="cal-page">
      <div className="page-head">
        <h1 className="h1">{t("calendarTitle")}</h1>
        <p className="p muted">{t("calendarDesc")}</p>
      </div>

      <div className="cal-layout">
        {/* Calendar grid */}
        <div className="cal-main glass slide-up">
          <div className="cal-header">
            <button className="cal-nav-btn" onClick={prevMonth}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="cal-header__center">
              <span className="cal-header__month">
                {Array.isArray(monthNames) ? monthNames[month] : (month + 1)}
              </span>
              <span className="cal-header__year">{year}</span>
            </div>
            <button className="cal-nav-btn" onClick={nextMonth}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <Btn kind="ghost" onClick={goToday} style={{ margin: "0 auto 12px", display: "flex" }}>
            {t("calendarToday")}
          </Btn>

          {/* Weekday headers */}
          <div className="cal-grid cal-weekdays">
            {(Array.isArray(weekDays) ? weekDays : ["Mo","Tu","We","Th","Fr","Sa","Su"]).map(d => (
              <div key={d} className="cal-wday">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="cal-grid cal-days">
            {cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} className="cal-cell cal-cell--empty" />;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isToday = dateStr === todayStr;
              const dayEvents = eventsForMonth[dateStr] || [];
              const isSelected = dateStr === selectedDate;
              return (
                <button
                  key={dateStr}
                  className={`cal-cell${isToday ? " cal-cell--today" : ""}${dayEvents.length ? " cal-cell--has-events" : ""}${isSelected ? " cal-cell--selected" : ""}`}
                  onClick={() => setSelectedDate(dateStr === selectedDate ? null : dateStr)}
                >
                  <span className="cal-cell__num">{day}</span>
                  {dayEvents.length > 0 && (
                    <div className="cal-cell__dots">
                      {dayEvents.slice(0, 3).map((ev, j) => (
                        <span key={j} className="cal-cell__dot" style={{ background: ev.color || "#38bdf8" }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected date events */}
          {selectedDate && (
            <div className="cal-selected-events fade-in">
              <h3 className="cal-selected-events__title">{selectedDate}</h3>
              {selectedEvents.length === 0 ? (
                <p className="muted tiny">{t("calendarNoEvents")}</p>
              ) : (
                <div className="cal-event-list">
                  {selectedEvents.map((ev, i) => (
                    <div key={ev.id + i} className="cal-event-item" style={{ borderLeft: `3px solid ${ev.color || "#38bdf8"}` }}>
                      <div className="cal-event-item__title">{ev.title}</div>
                      {ev.description && <div className="cal-event-item__desc muted tiny">{ev.description}</div>}
                      <div className="cal-event-item__range muted tiny">{ev.dateFrom} — {ev.dateTo}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: Upcoming events */}
        <div className="cal-sidebar glass slide-up" style={{ animationDelay: ".1s" }}>
          <h2 className="h2">{t("calendarUpcoming")}</h2>
          {upcoming.length === 0 ? (
            <p className="muted tiny">{t("calendarNoUpcoming")}</p>
          ) : (
            <div className="cal-upcoming-list">
              {upcoming.map((ev, i) => {
                const daysAway = Math.max(0, Math.ceil((new Date(ev.dateFrom + "T00:00:00") - today) / 86400000));
                return (
                  <div key={ev.id} className="cal-upcoming-card fade-in" style={{ animationDelay: `${i * 0.05}s`, borderLeft: `3px solid ${ev.color || "#38bdf8"}` }}>
                    <div className="cal-upcoming-card__title">{ev.title}</div>
                    {ev.description && <div className="cal-upcoming-card__desc muted tiny">{ev.description}</div>}
                    <div className="cal-upcoming-card__meta muted tiny">
                      {ev.dateFrom} — {ev.dateTo}
                      {daysAway > 0 && <span className="cal-upcoming-card__badge">{daysAway} {t("calendarDays")}</span>}
                      {daysAway === 0 && <span className="cal-upcoming-card__badge cal-upcoming-card__badge--today">{t("calendarToday")}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
