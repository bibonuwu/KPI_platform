import React, { useEffect, useRef, useState } from "react";
import { t } from "../i18n.js";
import { useStore, navigate } from "../store.js";
import { Icon, Btn } from "../components.jsx";

const DEV = {
  name: "Bibon",
  realName: "Äbeken Äibek",
  role: "Founder · Full-stack developer · Product designer",
  tagline: "Создаю продукты, которые экономят время учителям.",
  phone: "+7 708 185 14 33",
  phoneRaw: "+77081851433",
  email: "aibekabeken47@gmail.com",
  telegram: "bibonuwu",
  instagram: "bibonuwu",
  github: "bibonuwu",
  location: "Қызылорда, Қазақстан",
};

const PRODUCT = {
  name: "NIS KPI Platform",
  version: "v4.4",
  desc: {
    ru: "Современная платформа для учёта KPI, рейтинга и развития педагогов НИШ Кызылорда. Заявки, документы, аналитика и управление — в одном дорогом интерфейсе.",
    kz: "Қызылорда НЗМ педагогтерінің KPI, рейтингі мен дамуын есепке алуға арналған заманауи платформа. Өтінімдер, құжаттар, аналитика және басқару — бір сапалы интерфейсте.",
    en: "A modern platform for tracking KPI, ratings and growth of NIS Kyzylorda teachers. Submissions, documents, analytics and management — in one polished interface."
  },
  made: "Қызылорда · NIS",
};

const SOCIALS = [
  { key: "phone", label: "Телефон", value: DEV.phone, href: `tel:${DEV.phoneRaw}`, accent: "#22c55e", icon: "phone" },
  { key: "email", label: "Email", value: DEV.email, href: `mailto:${DEV.email}`, accent: "#38bdf8", icon: "mail" },
  { key: "telegram", label: "Telegram", value: `@${DEV.telegram}`, href: `https://t.me/${DEV.telegram}`, accent: "#0ea5e9", icon: "telegram" },
  { key: "instagram", label: "Instagram", value: `@${DEV.instagram}`, href: `https://instagram.com/${DEV.instagram}`, accent: "#f472b6", icon: "instagram" },
  { key: "github", label: "GitHub", value: `github.com/${DEV.github}`, href: `https://github.com/${DEV.github}`, accent: "#a78bfa", icon: "github" },
];

const FEATURES = [
  { icon: "rank", tone: "gold", title: "Рейтинг и уровни", text: "Прозрачная система баллов, уровней и достижений для каждого педагога." },
  { icon: "chart", tone: "blue", title: "Аналитика директора", text: "Награды года, динамика, категорийные лидеры, экспорт в Excel." },
  { icon: "check", tone: "green", title: "KPI и заявки", text: "Добавление достижений, проверка модераторами, история статусов." },
  { icon: "folder", tone: "purple", title: "Документы и отчёты", text: "Единое хранилище документов с фильтрами, поиском и превью." },
  { icon: "calendar", tone: "cyan", title: "Календарь событий", text: "Общие события школы, напоминания, интеграция с активностями." },
  { icon: "tools", tone: "amber", title: "Classroom-инструменты", text: "Набор быстрых утилит учителя: таймер, рандомайзер, посадка." },
];

const STACK = [
  { label: "React 18", color: "#61dafb" },
  { label: "Vite", color: "#a78bfa" },
  { label: "PocketBase", color: "#22c55e" },
  { label: "Nginx", color: "#38bdf8" },
  { label: "Docker", color: "#0ea5e9" },
  { label: "PWA", color: "#f472b6" },
];

function ExtraIcon({ name }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none" };
  const s = { stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "phone":
      return (
        <svg {...common}>
          <path {...s} d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.8a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.9.34 1.84.57 2.8.7A2 2 0 0122 16.92z" />
        </svg>
      );
    case "mail":
      return (
        <svg {...common}>
          <rect {...s} x="2" y="4" width="20" height="16" rx="2" />
          <path {...s} d="M22 6l-10 7L2 6" />
        </svg>
      );
    case "telegram":
      return (
        <svg {...common}>
          <path {...s} d="M21.5 3.5L2 11l6 2 2 7 3.5-4 5 4 3-16.5z" />
          <path {...s} d="M8 13l9-6-6 8" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...common}>
          <rect {...s} x="3" y="3" width="18" height="18" rx="5" />
          <circle {...s} cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
        </svg>
      );
    case "github":
      return (
        <svg {...common}>
          <path {...s} d="M9 19c-4 1.5-4-2-6-2m12 5v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0019.1 4.77a5.07 5.07 0 00-.09-3.77S17.87.62 15 2.48a13.38 13.38 0 00-7 0C5.13.62 4 1 4 1a5.07 5.07 0 00-.09 3.77A5.44 5.44 0 002.5 8.55c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 008 18.13V22" />
        </svg>
      );
    case "copy":
      return (
        <svg {...common}>
          <rect {...s} x="9" y="9" width="13" height="13" rx="2" />
          <path {...s} d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...common}>
          <path {...s} d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
        </svg>
      );
    case "heart":
      return (
        <svg {...common}>
          <path {...s} d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
      );
    case "globe":
      return (
        <svg {...common}>
          <circle {...s} cx="12" cy="12" r="10" />
          <path {...s} d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
        </svg>
      );
    case "arrow-up-right":
      return (
        <svg {...common}>
          <path {...s} d="M7 17L17 7M8 7h9v9" />
        </svg>
      );
    default:
      return <Icon name={name} />;
  }
}

function useCopy() {
  const [copied, setCopied] = useState(null);
  const copy = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1400);
    } catch {
      setCopied(null);
    }
  };
  return { copied, copy };
}

function useRevealOnScroll() {
  const rootRef = useRef(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const items = root.querySelectorAll("[data-reveal]");
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    items.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
  return rootRef;
}

function ContactRow({ row, copied, onCopy }) {
  const isLink = row.href.startsWith("http") || row.href.startsWith("tel") || row.href.startsWith("mailto");
  return (
    <div
      className="about-contact"
      style={{ "--c": row.accent }}
      data-reveal
    >
      <div className="about-contact__icon">
        <ExtraIcon name={row.icon} />
      </div>
      <div className="about-contact__body">
        <div className="about-contact__label">{row.label}</div>
        <div className="about-contact__value">{row.value}</div>
      </div>
      <div className="about-contact__actions">
        <button
          className="about-iconbtn"
          title="Скопировать"
          onClick={() => onCopy(row.key, row.value.replace(/^@/, ""))}
        >
          {copied === row.key ? <Icon name="check" /> : <ExtraIcon name="copy" />}
        </button>
        {isLink && (
          <a className="about-iconbtn" href={row.href} target="_blank" rel="noopener noreferrer" title="Открыть">
            <ExtraIcon name="arrow-up-right" />
          </a>
        )}
      </div>
    </div>
  );
}

export function PageAbout() {
  const st = useStore();
  const rootRef = useRevealOnScroll();
  const { copied, copy } = useCopy();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onTilt = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 14;
    const y = ((e.clientY - r.top) / r.height - 0.5) * -10;
    setTilt({ x, y });
  };
  const resetTilt = () => setTilt({ x: 0, y: 0 });

  return (
    <div ref={rootRef} className="pg about-page">
      {/* ── HERO ───────────────────────────────────── */}
      <section className="about-hero glass card" data-reveal>
        <div className="about-hero__bgOrbs" aria-hidden="true">
          <span className="about-orb about-orb--1" />
          <span className="about-orb about-orb--2" />
          <span className="about-orb about-orb--3" />
        </div>

        <div className="about-hero__grid">
          <div className="about-hero__left">
            <div className="about-chip">
              <ExtraIcon name="sparkle" />
              <span>О платформе · About</span>
            </div>
            <h1 className="about-hero__title">
              <span className="about-hero__gradient">NIS KPI</span>
              <br />
              Platform
            </h1>
            <p className="about-hero__sub">
              {PRODUCT.desc.ru}
            </p>

            <div className="about-hero__meta">
              <div className="about-meta-pill">
                <ExtraIcon name="globe" />
                <span>{PRODUCT.made}</span>
              </div>
              <div className="about-meta-pill">
                <Icon name="shield" />
                <span>{PRODUCT.version}</span>
              </div>
              <div className="about-meta-pill">
                <ExtraIcon name="heart" />
                <span>Crafted with care</span>
              </div>
            </div>

            <div className="about-hero__cta">
              <a className="btn primary about-btn-shine" href={`mailto:${DEV.email}`}>
                <ExtraIcon name="mail" /> Написать разработчику
              </a>
              <a className="btn about-ghost" href={`https://github.com/${DEV.github}`} target="_blank" rel="noopener noreferrer">
                <ExtraIcon name="github" /> GitHub
              </a>
            </div>
          </div>

          <div
            className="about-hero__right"
            onMouseMove={onTilt}
            onMouseLeave={resetTilt}
          >
            <div
              className="about-card-3d"
              style={{ transform: `perspective(900px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)` }}
            >
              <div className="about-card-3d__shine" />
              <div className="about-card-3d__logo">
                <img src="/logo-nis.png" alt="NIS" />
              </div>
              <div className="about-card-3d__brand">NIS KPI</div>
              <div className="about-card-3d__sub">Мұғалімдер рейтингі</div>

              <div className="about-card-3d__stats">
                <div>
                  <div className="about-card-3d__n">{(st.users || []).length || "—"}</div>
                  <div className="about-card-3d__l">Педагогов</div>
                </div>
                <div>
                  <div className="about-card-3d__n">14+</div>
                  <div className="about-card-3d__l">Модулей</div>
                </div>
                <div>
                  <div className="about-card-3d__n">3</div>
                  <div className="about-card-3d__l">Языка</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────── */}
      <section className="about-section" data-reveal>
        <div className="about-section__head">
          <div className="about-eyebrow">О продукте</div>
          <h2 className="about-section__title">
            Всё для учителя. <span className="about-hero__gradient">В одном месте.</span>
          </h2>
          <p className="about-section__sub">
            Платформа объединяет рейтинги, документы, заявки, аналитику и повседневные инструменты педагога в чистом, быстром интерфейсе.
          </p>
        </div>

        <div className="about-features">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`about-feature about-feature--${f.tone}`}
              data-reveal
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <div className="about-feature__icon">
                <Icon name={f.icon} />
              </div>
              <div className="about-feature__title">{f.title}</div>
              <div className="about-feature__text">{f.text}</div>
              <div className="about-feature__glow" aria-hidden="true" />
            </div>
          ))}
        </div>
      </section>

      {/* ── DEVELOPER / CONTACT ────────────────────── */}
      <section className="about-section" data-reveal>
        <div className="about-section__head">
          <div className="about-eyebrow">Контакты</div>
          <h2 className="about-section__title">
            Разработчик · <span className="about-hero__gradient">Bibon</span>
          </h2>
          <p className="about-section__sub">
            Пишите по любым вопросам, предложениям и багам. Отвечаю быстро.
          </p>
        </div>

        <div className="about-contact-grid">
          <div className="about-dev-card glass" data-reveal>
            <div className="about-dev-card__avatar">
              <span>Ä</span>
              <div className="about-dev-card__avatarRing" />
            </div>
            <div className="about-dev-card__name">{DEV.realName}</div>
            <div className="about-dev-card__role">{DEV.role}</div>
            <div className="about-dev-card__tagline">“{DEV.tagline}”</div>
            <div className="about-dev-card__loc">
              <ExtraIcon name="globe" /> <span>{DEV.location}</span>
            </div>
          </div>

          <div className="about-contact-list">
            {SOCIALS.map(row => (
              <ContactRow key={row.key} row={row} copied={copied} onCopy={copy} />
            ))}
          </div>
        </div>
      </section>

      {/* ── STACK ──────────────────────────────────── */}
      <section className="about-section" data-reveal>
        <div className="about-section__head">
          <div className="about-eyebrow">Технологии</div>
          <h2 className="about-section__title">
            Собрано на современном стеке
          </h2>
          <p className="about-section__sub">
            Быстрая загрузка, живое стекло, адаптивный UI и PWA-установка — под капотом только проверенные инструменты.
          </p>
        </div>

        <div className="about-stack">
          {STACK.map((s) => (
            <div
              key={s.label}
              className="about-stack__pill"
              style={{ "--c": s.color }}
              data-reveal
            >
              <span className="about-stack__dot" />
              {s.label}
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────── */}
      <section className="about-footer glass card" data-reveal>
        <div className="about-footer__left">
          <div className="about-footer__brand">© {new Date().getFullYear()} NIS KPI Platform</div>
          <div className="about-footer__sub">
            Сделано с <span style={{ color: "#f472b6" }}>♥</span> в Кызылорде — by <b>Bibon</b>
          </div>
        </div>
        <div className="about-footer__right">
          <Btn onClick={() => navigate(st.userDoc ? "dashboard" : "login")}>
            <Icon name="home" /> На главную
          </Btn>
        </div>
      </section>
    </div>
  );
}
