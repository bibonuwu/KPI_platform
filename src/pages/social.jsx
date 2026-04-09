import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { t, getLang, setLang } from "../i18n.js";
import {
  auth, db, storage, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc,
  getDocs, query, where, orderBy, limit, serverTimestamp, ref, uploadBytes, getDownloadURL,
  arrayUnion, arrayRemove
} from "../firebase-config.js";
import {
  store, setState, useStore, navigate, toast, applyTheme, toggleTheme,
  FONT_MAP, applyFont, getDefaultAccessibility, applyAccessibility,
  saveAccessibilityToFirestore, getDefaultSiteSettings, applySiteSettings,
  saveSiteSettings, canAccess
} from "../store.js";
import {
  fmtPoints, safeText, ymd, tsKey, sum, levelFromPoints, filterByQuarter,
  getCurrentQuarter, getAcademicYearLabel
} from "../utils.js";
import { NEWS_CAT_ICONS, NEWS_CATEGORIES, NEWS_FONTS, NEWS_MOODS } from "../constants.js";
import {
  fetchNewsAll, createNewsPost, toggleNewsLike, fetchNewsComments,
  addNewsComment, deleteNewsPost, toggleNewsPin, uploadFile, uploadEvidence,
  fetchAllTickets, fetchMyTickets, createTicket, updateTicketStatus,
  fetchAnnouncements, createAnnouncement, deleteAnnouncement,
  updateProfile, renderRichDesc, newsCatLabel
} from "../data.js";
import {
  Icon, Btn, Input, Select, Textarea, Pill, DataCards, LoadingScreen, ErrorBoundary, Guard
} from "../components.jsx";

export function NewsCard({ item, user, index }) {
  const [liked, setLiked] = useState((item.likes || []).includes(user?.uid));
  const [likesCount, setLikesCount] = useState((item.likes || []).length);
  const [likeAnim, setLikeAnim] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [addingComment, setAddingComment] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const catLabel = (() => { const c = NEWS_CATEGORIES.find(c => c.key === item.category); return c ? t(c.tKey) : item.category; })();
  const dateStr = item.createdAt?.seconds
    ? new Date(item.createdAt.seconds * 1000).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" })
    : "";

  const handleLike = async () => {
    if (!user) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount(c => c + (newLiked ? 1 : -1));
    if (newLiked) { setLikeAnim(true); setTimeout(() => setLikeAnim(false), 700); }
    try {
      await toggleNewsLike(item.id, user.uid, item.likes || []);
    } catch (e) {
      setLiked(!newLiked);
      setLikesCount(c => c + (newLiked ? -1 : 1));
    }
  };

  const handleToggleComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) {
      setLoadingComments(true);
      try { setComments(await fetchNewsComments(item.id)); }
      finally { setLoadingComments(false); }
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !user) return;
    setAddingComment(true);
    try {
      await addNewsComment(item.id, {
        uid: user.uid,
        authorName: user.displayName || user.email || t("anonymous"),
        avatarUrl: user.avatarUrl || "",
        text: commentText.trim(),
      });
      setCommentText("");
      setComments(await fetchNewsComments(item.id));
    } catch (e) {
      toast(e?.message || "Ошибка", "error");
    } finally {
      setAddingComment(false);
    }
  };

  const isOwner = user?.uid === item.uid || user?.role === "admin";
  const desc = item.description || "";
  const descLong = desc.length > 200;

  const timeAgo = (() => {
    if (!item.createdAt?.seconds) return dateStr;
    const diff = Math.floor((Date.now() / 1000) - item.createdAt.seconds);
    if (diff < 60) return t("justNow");
    if (diff < 3600) return `${Math.floor(diff / 60)} ${t("minAgo")}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ${t("hAgo")}`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ${t("dAgo")}`;
    return dateStr;
  })();

  const handleShare = async () => {
    const url = window.location.origin + "/#news";
    if (navigator.share) {
      try { await navigator.share({ title: item.title, url }); } catch { }
    } else {
      await navigator.clipboard.writeText(`${item.title} — ${url}`);
      toast(t("linkCopied"), "ok");
    }
  };

  return (
    <div className={`news-card${item.pinned ? " news-card--pinned" : ""}`} style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}>
      {item.pinned && (
        <div className="news-pinned-banner">
          <svg className="news-pinned-banner__icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" /></svg>
          <span>{t("pinned")}</span>
        </div>
      )}
      <div className="news-card__body">
        <div className="news-card__meta">
          {item.avatarUrl
            ? <img className="news-card__avatar" src={item.avatarUrl} alt="" />
            : <div className="news-card__avatar news-card__avatar--ph">{(item.authorName || "A")[0].toUpperCase()}</div>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="news-card__author">{item.authorName || t("anonymous")}</div>
            <div className="tiny muted">{timeAgo}</div>
          </div>
          <span className={`news-pill news-pill--${item.category}`}>{catLabel}</span>
          {user?.role === "admin" && (
            <button className="news-pin-btn" title={item.pinned ? t("unpin") : t("pin")} onClick={async () => {
              await toggleNewsPin(item.id, !!item.pinned);
              const updated = await fetchNewsAll();
              setState({ news: updated });
              toast(item.pinned ? t("unpinned") : t("pinnedDone"), "ok");
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill={item.pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" /></svg>
            </button>
          )}
          {isOwner && (
            <button className="news-del-btn" title={t("delete")} onClick={async () => {
              if (!window.confirm(t("deleteNewsConfirm"))) return;
              await deleteNewsPost(item.id);
              const updated = await fetchNewsAll();
              setState({ news: updated });
              toast(t("deleted"), "ok");
            }}>✕</button>
          )}
        </div>

        <div className="news-card__title">{item.mood && <span className="news-card__mood">{item.mood}</span>}{item.title}</div>

        {desc && (
          <div className="news-card__desc" style={item.fontFamily ? { fontFamily: item.fontFamily } : undefined}>
            {descLong && !expanded ? renderRichDesc(desc.slice(0, 200) + "…") : renderRichDesc(desc)}
            {descLong && (
              <button className="news-expand-btn" onClick={() => setExpanded(e => !e)}>
                {expanded ? ` ${t("collapse")}` : ` ${t("readMore")}`}
              </button>
            )}
          </div>
        )}

        {item.photoUrl && (
          <div className="news-card__photo-wrap">
            <img className="news-card__photo" src={item.photoUrl} alt="news" loading="lazy" />
          </div>
        )}

        {item.link && (
          <a className="news-card__link-btn" href={item.link} target="_blank" rel="noopener noreferrer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            {t("openLink")}
          </a>
        )}

        <div className="news-card__actions">
          <button className={`news-like-btn${liked ? " liked" : ""}${likeAnim ? " pop" : ""}`} onClick={handleLike}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
            <span>{likesCount > 0 ? likesCount : ""}</span>
          </button>
          <button className={`news-comment-btn${showComments ? " active" : ""}`} onClick={handleToggleComments}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <span>{t("comments")}</span>
          </button>
          <button className="news-share-btn" onClick={handleShare}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>
        </div>

        {showComments && (
          <div className="news-comments">
            {loadingComments ? (
              <div className="tiny muted" style={{ padding: "8px 0" }}>{t("loadingComments")}</div>
            ) : comments.length === 0 ? (
              <div className="tiny muted" style={{ padding: "8px 0" }}>{t("noComments")}</div>
            ) : (
              <div className="news-comments__list">
                {comments.map(c => (
                  <div key={c.id} className="news-comment">
                    {c.avatarUrl
                      ? <img className="news-comment__av" src={c.avatarUrl} alt="" />
                      : <div className="news-comment__av news-comment__av--ph">{(c.authorName || "A")[0].toUpperCase()}</div>
                    }
                    <div className="news-comment__bubble">
                      <div className="news-comment__author">{c.authorName}</div>
                      <div className="news-comment__text">{c.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {user && (
              <div className="news-comment-form">
                <input
                  className="input"
                  placeholder={t("writeComment")}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !addingComment) { e.preventDefault(); handleAddComment(); } }}
                />
                <Btn kind="primary" disabled={addingComment || !commentText.trim()} onClick={handleAddComment}>
                  {addingComment ? "…" : t("send")}
                </Btn>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function PageNews() {
  const st = useStore();
  const u = st.userDoc;
  const [localNews, setLocalNews] = useState(st.news || []);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [photo, setPhoto] = useState(null);
  const [mood, setMood] = useState("");
  const [fontFamily, setFontFamily] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const descRef = useRef(null);

  useEffect(() => { setLocalNews(st.news || []); }, [st.news]);

  const doRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await fetchNewsAll();
      setState({ news: data });
    } finally { setRefreshing(false); }
  };

  // auto-load if empty
  useEffect(() => {
    if ((st.news || []).length === 0) doRefresh();
  }, []);

  const validateFile = (file, label) => {
    if (file && file.size > 10 * 1024 * 1024) {
      toast(`${label} — ${t("max10mb")}`, "error");
      return false;
    }
    return true;
  };

  const wrapSelection = (before, after) => {
    const ta = descRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = description.slice(start, end);
    const wrapped = before + sel + after;
    const next = description.slice(0, start) + wrapped + description.slice(end);
    setDescription(next);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + before.length, start + before.length + sel.length); }, 0);
  };

  const photoInputRef = useRef(null);

  const handleSubmit = async () => {
    if (!title.trim()) return toast(t("fillFields"), "error");
    if (!category) return toast(t("fillFields"), "error");
    if (!validateFile(photo, "Фото")) return;
    setSubmitting(true);
    try {
      let photoUrl = "";
      if (photo) photoUrl = await uploadFile(`news/${u.uid}/${Date.now()}_photo`, photo);
      await createNewsPost({
        uid: u.uid,
        authorName: u.displayName || u.email || t("anonymous"),
        authorRole: u.role,
        avatarUrl: u.avatarUrl || "",
        category, title: title.trim(), description: description.trim(),
        photoUrl, coverUrl: "", link: link.trim(),
        mood, fontFamily,
      });
      toast(t("newsPublished"), "ok");
      setShowForm(false);
      setTitle(""); setDescription(""); setLink(""); setCategory(""); setPhoto(null); setMood(""); setFontFamily("");
      const updated = await fetchNewsAll();
      setState({ news: updated });
    } catch (e) {
      toast(e?.message || t("publishError"), "error");
    } finally { setSubmitting(false); }
  };

  const filteredRaw = filter === "all" ? localNews : localNews.filter(n => n.category === filter);
  const filtered = [...filteredRaw].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  // Sidebar data
  const totalLikes = localNews.reduce((s, n) => s + (n.likes || []).length, 0);
  const popular = [...localNews].sort((a, b) => (b.likes || []).length - (a.likes || []).length).slice(0, 5);
  const authorMap = new Map();
  localNews.forEach(n => {
    const name = n.authorName || t("anonymous");
    const prev = authorMap.get(name) || { name, avatarUrl: n.avatarUrl || "", count: 0 };
    prev.count++;
    authorMap.set(name, prev);
  });
  const topAuthors = Array.from(authorMap.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  const catCounts = {};
  localNews.forEach(n => { catCounts[n.category] = (catCounts[n.category] || 0) + 1; });
  const maxCatCount = Math.max(...Object.values(catCounts), 1);

  return (
    <div className="page-news">
      {/* Hero header */}
      <div className="news-hero">
        <div className="news-hero__bg">
          <div className="news-hero__orb news-hero__orb--1" />
          <div className="news-hero__orb news-hero__orb--2" />
          <div className="news-hero__orb news-hero__orb--3" />
        </div>
        <div className="news-hero__content">
          <div className="news-hero__left">
            <div className="news-hero__icon-wrap">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 002-2V7.5L14.5 2H6a2 2 0 00-2 2v4" /><path d="M14 2v6h6" /><path d="M2 15h10M2 19h6" /></svg>
            </div>
            <div>
              <div className="news-hero__title">{t("newsTitle")}</div>
              <div className="news-hero__sub">{t("sharedFeed")} · <span className="news-hero__count">{localNews.length}</span> {t("publication")}</div>
            </div>
          </div>
          <div className="news-hero__actions">
            <button className={`news-hero__refresh${refreshing ? " spin" : ""}`} onClick={doRefresh} title={t("refresh")} disabled={refreshing}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
            </button>
            {u && (
              <button className={`news-hero__publish${showForm ? " active" : ""}`} onClick={() => setShowForm(v => !v)}>
                <span className="news-hero__publish-icon">{showForm ? "✕" : "+"}</span>
                {showForm ? t("close") : t("publish")}
              </button>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="news-form-card">
          <div className="h2" style={{ marginBottom: 16 }}>{t("publishNews")}</div>
          <div className="news-form-grid">
            <div className="field">
              <label className="label">{t("category")} *</label>
              <select className="select" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">{t("selectCategory")}</option>
                {NEWS_CATEGORIES.map(c => <option key={c.key} value={c.key}>{NEWS_CAT_ICONS[c.key] || ""} {t(c.tKey)}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label">{t("title")} *</label>
              <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder={t("newsTopicPlaceholder")} />
            </div>
            <div className="field" style={{ gridColumn: "1/-1" }}>
              <label className="label">{t("description")}</label>
              <div className="news-desc-toolbar">
                <button type="button" className="news-tb-btn" title="Bold" onClick={() => wrapSelection("**", "**")}><b>B</b></button>
                <button type="button" className="news-tb-btn news-tb-btn--i" title="Italic" onClick={() => wrapSelection("*", "*")}><i>I</i></button>
                <span className="news-tb-sep" />
                <select className="news-tb-font" value={fontFamily} onChange={e => setFontFamily(e.target.value)}>
                  {NEWS_FONTS.map(f => <option key={f.key} value={f.key} style={{ fontFamily: f.key || "inherit" }}>{f.label}</option>)}
                </select>
              </div>
              <textarea ref={descRef} className="textarea" rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder={t("newsContentPlaceholder")} style={fontFamily ? { fontFamily } : undefined} />
              <div className="news-mood-row">
                <span className="tiny muted">{t("mood")}:</span>
                {NEWS_MOODS.map(em => (
                  <button type="button" key={em} className={`news-mood-btn${mood === em ? " active" : ""}`} onClick={() => setMood(mood === em ? "" : em)}>{em}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label className="label">{t("link")}</label>
              <input className="input" value={link} onChange={e => setLink(e.target.value)} placeholder="https://…" />
            </div>
            <div className="field">
              <label className="label">{t("photoMax10")}</label>
              <input ref={photoInputRef} type="file" accept="image/*" className="input" onChange={e => setPhoto(e.target.files[0] || null)} />
              {photo && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                  <img src={URL.createObjectURL(photo)} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border2)" }} />
                  <span className="tiny muted">{photo.name} ({(photo.size / 1024 / 1024).toFixed(1)} MB)</span>
                  <button type="button" className="news-clear-photo" onClick={() => { setPhoto(null); if (photoInputRef.current) photoInputRef.current.value = ""; }}>✕ {t("clearPhoto")}</button>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <Btn kind="ghost" onClick={() => setShowForm(false)}>{t("cancel")}</Btn>
            <Btn kind="primary" disabled={submitting} onClick={handleSubmit}>
              {submitting ? t("publishing") : t("publish")}
            </Btn>
          </div>
        </div>
      )}

      <div className="news-filter" role="tablist">
        <button role="tab" className={`news-filter__btn${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>{t("all")}</button>
        {NEWS_CATEGORIES.map(c => (
          <button role="tab" key={c.key} className={`news-filter__btn${filter === c.key ? " active" : ""}`} onClick={() => setFilter(c.key)}>
            {NEWS_CAT_ICONS[c.key] || ""} {t(c.tKey)}
          </button>
        ))}
      </div>

      <div className="news-layout">
        {/* LEFT: news feed */}
        <div className="news-main">
          <div className="news-list">
            {filtered.length === 0 ? (
              <div className="news-empty">
                <div className="news-empty__icon-wrap">
                  <div className="news-empty__pulse" />
                  <div className="news-empty__icon">{filter !== "all" ? (NEWS_CAT_ICONS[filter] || "\u{1F4F0}") : "\u{1F4F0}"}</div>
                </div>
                <div className="news-empty__title">{t("noNews")}</div>
                <div className="news-empty__sub">{t("noNewsCat")}</div>
              </div>
            ) : (
              filtered.map((n, i) => <NewsCard key={n.id} item={n} user={u} index={i} />)
            )}
          </div>
        </div>

        {/* RIGHT: sidebar */}
        <div className="news-sidebar">
          {/* Stats */}
          <div className="news-sidebar-card news-sidebar-card--stats">
            <h3>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></svg>
              {t("newsStats")}
            </h3>
            <div className="news-stat-grid">
              <div className="news-stat-item news-stat-item--posts">
                <div className="news-stat-item__icon-bg">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 002-2V7.5L14.5 2H6a2 2 0 00-2 2v4" /><path d="M14 2v6h6" /></svg>
                </div>
                <span className="news-stat-item__num">{localNews.length}</span>
                <span className="news-stat-item__label">{t("totalPosts")}</span>
              </div>
              <div className="news-stat-item news-stat-item--likes">
                <div className="news-stat-item__icon-bg">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
                </div>
                <span className="news-stat-item__num">{totalLikes}</span>
                <span className="news-stat-item__label">{t("totalLikes")}</span>
              </div>
            </div>
          </div>

          {/* Popular news */}
          {popular.length > 0 && (
            <div className="news-sidebar-card">
              <h3>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                {t("popularNews")}
              </h3>
              {popular.map((n, i) => (
                <div key={n.id} className="news-popular-item">
                  <div className="news-popular-rank">{i + 1}</div>
                  <div className="news-popular-info">
                    <div className="news-popular-title">{n.title}</div>
                    <div className="news-popular-meta">{(n.likes || []).length} {t("likes")} · {n.authorName || t("anonymous")}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Top authors */}
          {topAuthors.length > 0 && (
            <div className="news-sidebar-card">
              <h3>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
                {t("topAuthors")}
              </h3>
              {topAuthors.map((a, i) => (
                <div key={i} className="news-author-item">
                  {a.avatarUrl
                    ? <img className="news-author-av" src={a.avatarUrl} alt="" />
                    : <div className="news-author-av news-author-av--ph">{a.name[0].toUpperCase()}</div>
                  }
                  <div className="news-author-name">{a.name}</div>
                  <div className="news-author-count">{a.count} {t("posts")}</div>
                </div>
              ))}
            </div>
          )}

          {/* Category breakdown */}
          <div className="news-sidebar-card">
            <h3>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
              {t("category")}
            </h3>
            <div className="news-cat-stats">
              {NEWS_CATEGORIES.map(c => (
                <div key={c.key} className="news-cat-stat-row">
                  <div className="news-cat-stat-label">{NEWS_CAT_ICONS[c.key]} {t(c.tKey)}</div>
                  <div className="news-cat-stat-bar">
                    <div className="news-cat-stat-fill" style={{ width: `${((catCounts[c.key] || 0) / maxCatCount) * 100}%` }} />
                  </div>
                  <div className="news-cat-stat-num">{catCounts[c.key] || 0}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ---------- PageSupport (teacher: bug report + FAQ + social) ---------- */
/* ══════════════════════════════════════════════ */
/* ═══ PAGE: SETTINGS ═════════════════════════  */
/* ══════════════════════════════════════════════ */
export function PageSettings() {
  const st = useStore();
  const u = st.userDoc;
  const site = st.siteSettings || getDefaultSiteSettings();
  const acc = st.accessibility || getDefaultAccessibility();
  const isDark = st.theme !== "light";
  const lang = getLang();

  const toggleSite = (key) => {
    const next = { ...site, [key]: !site[key] };
    applySiteSettings(next);
    if (u) saveSiteSettings(u.uid, next);
    toast(t("settingsSaved"), "ok");
  };

  const toggleAcc = (key) => {
    const next = { ...acc, [key]: !acc[key] };
    applyAccessibility(next);
    if (u) saveAccessibilityToFirestore(u.uid, next);
  };

  const changeLang = (code) => {
    setLang(code);
    setState({ lang: code });
    render();
  };

  const changeTheme = (theme) => {
    applyTheme(theme);
    if (u) updateDoc(doc(db, "users", u.uid), { preferredTheme: theme }).catch(() => {});
  };

  const currentFont = st.font || "default";
  const changeFont = (f) => {
    applyFont(f);
    if (u) updateDoc(doc(db, "users", u.uid), { preferredFont: f }).catch(() => {});
    toast(t("settingsSaved"), "ok");
  };

  const fontOptions = [
    { id: "default", label: t("settFontDefault"), cls: "default" },
    { id: "sans", label: t("settFontSans"), cls: "sans" },
    { id: "system", label: t("settFontSystem"), cls: "system" },
    { id: "dyslexic", label: t("settFontDyslexic"), cls: "dyslexic" },
  ];

  const displayRows = [
    { key: "showClock", label: t("settShowClock"), desc: t("settShowClockDesc") },
    { key: "showWeather", label: t("settShowWeather"), desc: t("settShowWeatherDesc") },
  ];

  const accRows = [
    { key: "reduceMotion", label: t("accReduceMotion"), desc: t("accReduceMotionDesc") },
    { key: "largeText", label: t("accLargeText"), desc: t("accLargeTextDesc") },
    { key: "highContrast", label: t("accHighContrast"), desc: t("accHighContrastDesc") },
  ];

  const langs = [
    { code: "kz", label: "Қазақша", flag: "🇰🇿" },
    { code: "ru", label: "Русский", flag: "🇷🇺" },
    { code: "en", label: "English", flag: "🇬🇧" },
  ];

  const ToggleRow = ({ label, desc, on, onToggle }) => (
    <div className="sett-row">
      <div className="sett-row__info">
        <div className="sett-row__label">{label}</div>
        {desc && <div className="sett-row__desc">{desc}</div>}
      </div>
      <button className={`sett-toggle${on ? " sett-toggle--on" : ""}`} onClick={onToggle} aria-label={label} />
    </div>
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("settGreetMorning") : hour < 18 ? t("settGreetDay") : t("settGreetEvening");
  const initial = (u?.displayName || "?")[0].toUpperCase();

  return (
    <div className="sett">
      {/* Banner */}
      <div className="sett-banner">
        <div className="sett-banner__deco sett-banner__deco--1" />
        <div className="sett-banner__deco sett-banner__deco--2" />
        <div className="sett-banner__deco sett-banner__deco--3" />
        <div className="sett-banner__content">
          <div className="sett-banner__avatar">
            {u?.avatarUrl
              ? <img src={u.avatarUrl} alt="" />
              : <span>{initial}</span>}
          </div>
          <div className="sett-banner__text">
            <div className="sett-banner__greeting">{greeting}</div>
            <div className="sett-banner__name">{u?.displayName || t("unnamed")}</div>
            <div className="sett-banner__sub">{t("settingsDesc")}</div>
          </div>
          <div className="sett-banner__gear"><Icon name="settings" /></div>
        </div>
      </div>

      <div className="sett__grid">
        {/* Display */}
        <div className="sett__card glass" style={{ animationDelay: "0s" }}>
          <div className="sett__card-title"><Icon name="eye" /> {t("settingsGroupDisplay")}</div>
          {displayRows.map(r => (
            <ToggleRow key={r.key} label={r.label} desc={r.desc} on={site[r.key]} onToggle={() => toggleSite(r.key)} />
          ))}
        </div>

        {/* Theme */}
        <div className="sett__card glass" style={{ animationDelay: ".07s" }}>
          <div className="sett__card-title"><Icon name={isDark ? "moon" : "sun"} /> {t("settingsGroupTheme")}</div>
          <div className="sett__choice-grid">
            <button className={`sett__choice${!isDark ? " sett__choice--on" : ""}`} onClick={() => changeTheme("light")}>
              <Icon name="sun" /><span>{t("settThemeLight")}</span>
            </button>
            <button className={`sett__choice${isDark ? " sett__choice--on" : ""}`} onClick={() => changeTheme("dark")}>
              <Icon name="moon" /><span>{t("settThemeDark")}</span>
            </button>
          </div>
        </div>

        {/* Font */}
        <div className="sett__card glass" style={{ animationDelay: ".14s" }}>
          <div className="sett__card-title"><Icon name="file-text" /> {t("settingsGroupFont")}</div>
          <div className="sett__font-grid">
            {fontOptions.map(fo => (
              <button key={fo.id} className={`sett__font-card sett__font-card--${fo.cls}${currentFont === fo.id ? " sett__font-card--on" : ""}`} onClick={() => changeFont(fo.id)}>
                <span className="sett__font-preview">Aa</span>
                <span className="sett__font-label">{fo.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="sett__card glass" style={{ animationDelay: ".21s" }}>
          <div className="sett__card-title"><Icon name="info" /> {t("settingsGroupLang")}</div>
          <div className="sett__choice-grid sett__choice-grid--3">
            {langs.map(l => (
              <button key={l.code} className={`sett__choice${lang === l.code ? " sett__choice--on" : ""}`} onClick={() => changeLang(l.code)}>
                <span style={{ fontSize: 18 }}>{l.flag}</span><span>{l.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Accessibility */}
        <div className="sett__card glass" style={{ animationDelay: ".28s" }}>
          <div className="sett__card-title"><Icon name="eye" /> {t("settingsGroupAccess")}</div>
          {accRows.map(r => (
            <ToggleRow key={r.key} label={r.label} desc={r.desc} on={acc[r.key]} onToggle={() => toggleAcc(r.key)} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function PageSupport() {
  const st = useStore();
  const u = st.userDoc;
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("medium");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  if (!canAccess("support", u)) return <Guard />;

  const myTickets = st.myTickets || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    try {
      await createTicket({
        uid: u.uid,
        authorName: u.displayName || u.email,
        authorEmail: u.email || "",
        subject,
        message,
        priority
      });
      setSubject("");
      setMessage("");
      setPriority("medium");
      setSent(true);
      setTimeout(() => setSent(false), 3500);
      const tix = await fetchMyTickets(u.uid);
      setState({ myTickets: tix });
      toast(t("bugSent"), "ok");
    } catch (e) {
      toast(e?.message || t("bugSendError"), "error");
    } finally {
      setSending(false);
    }
  };

  const faqItems = [
    { q: t("faq1q"), a: t("faq1a") },
    { q: t("faq2q"), a: t("faq2a") },
    { q: t("faq3q"), a: t("faq3a") },
    { q: t("faq4q"), a: t("faq4a") },
    { q: t("faq5q"), a: t("faq5a") },
    { q: t("faq6q"), a: t("faq6a") },
  ];

  const prioPill = (p) => p === "high" ? "rejected" : p === "medium" ? "pending" : "approved";
  const statusPill = (s) => s === "done" ? "approved" : s === "in_progress" ? "pending" : "rejected";
  const statusLabel = (s) => s === "done" ? t("ticketDone") : s === "in_progress" ? t("ticketInProgress") : t("ticketNew");

  return (
    <div className="page-support fade-in">
      <div className="support-grid">
        {/* LEFT COLUMN: Form + My Tickets */}
        <div className="support-left slide-up">
          <div className="support-form-card">
            <div className="support-form-header">
              <Icon name="bug" />
              <span>{t("send")}</span>
            </div>
            {sent && (
              <div className="support-success-banner pop-in">
                <Icon name="check" /> {t("bugSent")}
              </div>
            )}
            <form onSubmit={handleSubmit} className="support-form">
              <label className="form-label">{t("bugSubject")}</label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder={t("bugSubjectPh")} required />

              <label className="form-label">{t("bugMessage")}</label>
              <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={t("bugMessagePh")} rows={4} required />

              <label className="form-label">{t("bugPriority")}</label>
              <Select value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="low">{t("prioLow")}</option>
                <option value="medium">{t("prioMedium")}</option>
                <option value="high">{t("prioHigh")}</option>
              </Select>

              <Btn kind="primary" type="submit" disabled={sending} style={{ marginTop: 14 }}>
                {sending ? t("sending") : t("send")}
              </Btn>
            </form>
          </div>

          {/* My tickets */}
          {myTickets.length > 0 && (
            <div className="support-my-tickets">
              <h2 className="h2">{t("myTickets")}</h2>
              <div className="support-ticket-list">
                {myTickets.map((tk, i) => (
                  <div key={tk.id} className="support-ticket-card fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="support-ticket-header">
                      <span className="support-ticket-subject">{tk.subject}</span>
                      <Pill kind={prioPill(tk.priority)}>{tk.priority}</Pill>
                    </div>
                    <div className="support-ticket-body">{tk.message}</div>
                    <div className="support-ticket-footer">
                      <Pill kind={statusPill(tk.status)}>{statusLabel(tk.status)}</Pill>
                      <span className="tiny muted">{tk.createdAt?.seconds ? new Date(tk.createdAt.seconds * 1000).toLocaleDateString() : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: FAQ + Social */}
        <div className="support-right slide-up" style={{ animationDelay: ".12s" }}>
          {/* FAQ */}
          <div className="support-faq-section">
            <h2 className="h2">{t("faqTitle")}</h2>
            <div className="faq-list">
              {faqItems.map((item, i) => (
                <div key={i} className={`faq-item ${openFaq === i ? "faq-item--open" : ""}`}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <div className="faq-question">
                    <span className="faq-num">{String(i + 1).padStart(2, "0")}</span>
                    <span className="faq-q-text">{item.q}</span>
                    <span className={`faq-chevron ${openFaq === i ? "faq-chevron--open" : ""}`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  </div>
                  <div className={`faq-answer ${openFaq === i ? "faq-answer--visible" : ""}`}>
                    {item.a}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Social — minimalist */}
          <div className="support-social-section">
            <h2 className="h2">{t("socialTitle")}</h2>
            <div className="social-mini-links">
              <a href="https://kzl.nis.edu.kz/" target="_blank" rel="noopener noreferrer" className="social-mini" title="kzl.nis.edu.kz">
                <img src="/logo-nis.png" alt="NIS" className="social-mini__logo" />
                <span>kzl.nis.edu.kz</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="social-mini__arrow"><path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
              <a href="https://www.youtube.com/@NISKyzylorda" target="_blank" rel="noopener noreferrer" className="social-mini" title="YouTube">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#FF0000"><path d="M23.5 6.19a3 3 0 00-2.11-2.13C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.39.56A3 3 0 00.5 6.19 31.5 31.5 0 000 12a31.5 31.5 0 00.5 5.81 3 3 0 002.11 2.13c1.89.56 9.39.56 9.39.56s7.5 0 9.39-.56a3 3 0 002.11-2.13A31.5 31.5 0 0024 12a31.5 31.5 0 00-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" /></svg>
                <span>YouTube</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="social-mini__arrow"><path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
              <a href="https://www.instagram.com/nis_qyzylorda/" target="_blank" rel="noopener noreferrer" className="social-mini" title="Instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="ig" x1="0" y1="24" x2="24" y2="0"><stop offset="0%" stopColor="#F77737" /><stop offset="50%" stopColor="#E1306C" /><stop offset="100%" stopColor="#833AB4" /></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig)" strokeWidth="2" /><circle cx="12" cy="12" r="5" stroke="url(#ig)" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1.5" fill="url(#ig)" /></svg>
                <span>Instagram</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="social-mini__arrow"><path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ---------- PageAdminSupport (admin: ticket list + status toggle) ---------- */
export function PageAdminSupport() {
  const st = useStore();
  const u = st.userDoc;
  const tickets = st.allTickets || [];
  const [filter, setFilter] = useState("all");
  const [updating, setUpdating] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  if (!canAccess("admin/support", u)) return <Guard />;

  const filtered = filter === "all" ? tickets : tickets.filter(tk => tk.status === filter);

  const cycleStatus = async (tk) => {
    const next = tk.status === "new" ? "in_progress" : tk.status === "in_progress" ? "done" : "new";
    setUpdating(tk.id);
    try {
      await updateTicketStatus(tk.id, next);
      const updated = await fetchAllTickets();
      setState({ allTickets: updated });
    } catch (e) {
      toast(e?.message || t("error"), "error");
    } finally {
      setUpdating(null);
    }
  };

  const prioPill = (p) => p === "high" ? "rejected" : p === "medium" ? "pending" : "approved";
  const statusLabel = (s) => s === "done" ? t("ticketDone") : s === "in_progress" ? t("ticketInProgress") : t("ticketNew");

  const users = st.users || [];
  const userName = (uid) => { const uu = users.find(x => x.uid === uid); return uu ? (uu.displayName || uu.email) : uid; };

  const counts = { new: tickets.filter(t => t.status === "new").length, in_progress: tickets.filter(t => t.status === "in_progress").length, done: tickets.filter(t => t.status === "done").length };

  return (
    <div className="page-admin-support fade-in">
      {/* Stats pills */}
      <div className="admin-support-stats slide-up">
        <div className="admin-support-stat admin-support-stat--new" onClick={() => setFilter("new")}>
          <span className="admin-support-stat__num">{counts.new}</span>
          <span className="admin-support-stat__label">{t("ticketNew")}</span>
        </div>
        <div className="admin-support-stat admin-support-stat--progress" onClick={() => setFilter("in_progress")}>
          <span className="admin-support-stat__num">{counts.in_progress}</span>
          <span className="admin-support-stat__label">{t("ticketInProgress")}</span>
        </div>
        <div className="admin-support-stat admin-support-stat--done" onClick={() => setFilter("done")}>
          <span className="admin-support-stat__num">{counts.done}</span>
          <span className="admin-support-stat__label">{t("ticketDone")}</span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="support-filter-bar slide-up" style={{ animationDelay: ".08s" }}>
        {["all", "new", "in_progress", "done"].map(f => (
          <button key={f} className={`support-filter-btn ${filter === f ? "support-filter-btn--active" : ""}`}
            onClick={() => setFilter(f)}>
            {f === "all" ? t("all") : f === "new" ? t("ticketNew") : f === "in_progress" ? t("ticketInProgress") : t("ticketDone")}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="admin-support-empty slide-up">
          <Icon name="check" />
          <p>{t("noTickets")}</p>
        </div>
      ) : (
        <div className="admin-ticket-list">
          {filtered.map((tk, i) => {
            const isExpanded = expandedId === tk.id;
            return (
              <div key={tk.id} className={`admin-ticket-card admin-ticket-card--${tk.status} fade-in`} style={{ animationDelay: `${i * 0.04}s` }}>
                <div className="admin-ticket-top" onClick={() => setExpandedId(isExpanded ? null : tk.id)} style={{ cursor: "pointer" }}>
                  <div className="admin-ticket-left-strip" />
                  <div style={{ flex: 1 }}>
                    <div className="admin-ticket-subject">{tk.subject}</div>
                    <div className="tiny muted">{userName(tk.uid)} · {tk.createdAt?.seconds ? new Date(tk.createdAt.seconds * 1000).toLocaleDateString() : ""}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Pill kind={prioPill(tk.priority)}>{tk.priority}</Pill>
                    <span className={`faq-chevron ${isExpanded ? "faq-chevron--open" : ""}`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  </div>
                </div>
                <div className={`admin-ticket-expand ${isExpanded ? "admin-ticket-expand--open" : ""}`}>
                  <div className="admin-ticket-body">{tk.message}</div>
                  <div className="admin-ticket-meta">
                    <span className="tiny muted">{tk.authorEmail}</span>
                  </div>
                </div>
                <div className="admin-ticket-bottom">
                  <div className="admin-ticket-status-toggle" onClick={() => cycleStatus(tk)}>
                    <div className={`status-switch status-switch--${tk.status}`}>
                      <div className="status-switch__track">
                        <div className="status-switch__thumb" />
                      </div>
                      <span className="status-switch__label">
                        {updating === tk.id ? "..." : statusLabel(tk.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** ---------- admin announcements page ---------- */
const EMOJI_OPTIONS = ["📢", "🎉", "⚠️", "📅", "🏆", "📚", "🔔", "💡", "🎓", "⭐", "🚀", "❗", "✅", "📝", "🎯", "💪"];

export function PageAdminAnnouncements() {
  const st = useStore();
  const u = st.userDoc;
  const announcements = st.announcements || [];
  const [emoji, setEmoji] = useState("📢");
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [linkText, setLinkText] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(null);

  if (!canAccess("admin/announcements", u)) return <Guard />;

  const handleCreate = async () => {
    if (!text.trim()) { toast(t("annTextRequired"), "error"); return; }
    if (!startDate || !endDate) { toast(t("annDatesRequired"), "error"); return; }
    if (new Date(endDate) < new Date(startDate)) { toast(t("annEndBeforeStart"), "error"); return; }
    setSending(true);
    try {
      await createAnnouncement({ emoji, text: text.trim(), link: (link.trim() ? (linkText.trim() || link.trim()) + "||" + link.trim() : ""), startDate, endDate });
      const fresh = await fetchAnnouncements();
      setState({ announcements: fresh });
      setText(""); setLink(""); setLinkText(""); setStartDate(""); setEndDate("");
      toast(t("annCreated"), "ok");
    } catch (e) {
      toast(e?.message || t("error"), "error");
    } finally { setSending(false); }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await deleteAnnouncement(id);
      const fresh = await fetchAnnouncements();
      setState({ announcements: fresh });
      toast(t("annDeleted"), "ok");
    } catch (e) {
      toast(e?.message || t("error"), "error");
    } finally { setDeleting(null); }
  };

  const now = new Date().toISOString().slice(0, 10);
  const isActive = (a) => a.startDate <= now && a.endDate >= now;

  return (
    <div className="page-admin-announcements fade-in">
      <div className="ann-columns">
        {/* Left: Create form */}
        <div className="ann-col-left">
          <div className="ann-form glass slide-up">
            <h2 className="h2">{t("annNewTitle")}</h2>

            <label className="label">{t("annEmojiLabel")}</label>
            <div className="ann-emoji-grid">
              {EMOJI_OPTIONS.map(e => (
                <button key={e} type="button" className={`ann-emoji-btn ${emoji === e ? "ann-emoji-btn--active" : ""}`} onClick={() => setEmoji(e)}>{e}</button>
              ))}
            </div>

            <label className="label">{t("annTextLabel")}</label>
            <Textarea value={text} onChange={e => setText(e.target.value)} placeholder={t("annTextPlaceholder")} rows={2} />

            <div className="ann-row">
              <div className="ann-field">
                <label className="label">{t("annLinkLabel")}</label>
                <Input value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." />
              </div>
              <div className="ann-field">
                <label className="label">{t("annLinkTextLabel")}</label>
                <Input value={linkText} onChange={e => setLinkText(e.target.value)} placeholder={t("annLinkTextPlaceholder")} />
              </div>
            </div>

            <div className="ann-row">
              <div className="ann-field">
                <label className="label">{t("annStartDate")}</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="ann-field">
                <label className="label">{t("annEndDate")}</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>

            {/* Preview */}
            {text.trim() && (
              <div className="ann-preview">
                <label className="label">{t("preview")}</label>
                <div className="ann-banner-preview">
                  <span className="ann-banner__emoji">{emoji}</span>
                  <span className="ann-banner__text">{text}</span>
                  {link.trim() && <a className="ann-banner__link" href={link} target="_blank" rel="noopener noreferrer">{linkText || link}</a>}
                </div>
              </div>
            )}

            <Btn kind="primary" onClick={handleCreate} disabled={sending} style={{ marginTop: 12 }}>
              {sending ? "..." : t("send")}
            </Btn>
          </div>
        </div>

        {/* Right: List */}
        <div className="ann-col-right">
          <h2 className="h2">{t("annListTitle")} ({announcements.length})</h2>
          {announcements.length === 0 ? (
            <p className="p muted">{t("annEmpty")}</p>
          ) : (
            <div className="ann-list">
              {announcements.map((a, i) => {
                const active = isActive(a);
                const parsedLink = (a.link || "").includes("||") ? a.link.split("||") : [a.link, a.link];
                return (
                  <div key={a.id} className={`ann-card glass fade-in ${active ? "ann-card--active" : "ann-card--inactive"}`} style={{ animationDelay: `${i * 0.04}s` }}>
                    <div className="ann-card__top">
                      <span className="ann-card__emoji">{a.emoji}</span>
                      <span className="ann-card__text">{a.text}</span>
                      <Pill kind={active ? "approved" : "rejected"}>{active ? t("annActive") : t("annInactive")}</Pill>
                    </div>
                    {a.link && (
                      <div className="ann-card__link tiny">
                        <a href={parsedLink[1]} target="_blank" rel="noopener noreferrer">{parsedLink[0]}</a>
                      </div>
                    )}
                    <div className="ann-card__meta tiny muted">
                      {a.startDate} — {a.endDate}
                      {a.createdAt?.seconds && <span> · {new Date(a.createdAt.seconds * 1000).toLocaleDateString()}</span>}
                    </div>
                    <button className="ann-card__del" onClick={() => handleDelete(a.id)} disabled={deleting === a.id} title={t("delete")}>
                      {deleting === a.id ? "..." : <Icon name="x" />}
                    </button>
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

/** ---------- announcement banner (shown to all users) ---------- */
export function AnnouncementBanner() {
  const st = useStore();
  const announcements = st.announcements || [];
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kpi_ann_dismissed") || "[]"); } catch { return []; }
  });

  const now = new Date().toISOString().slice(0, 10);
  const active = announcements.filter(a => a.startDate <= now && a.endDate >= now && !dismissed.includes(a.id));

  const dismiss = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try { localStorage.setItem("kpi_ann_dismissed", JSON.stringify(next)); } catch { }
  };

  if (!active.length || !st.userDoc) return null;

  return (
    <div className="ann-banners-wrap">
      {active.map(a => {
        const parsedLink = (a.link || "").includes("||") ? a.link.split("||") : [a.link, a.link];
        return (
          <div key={a.id} className="ann-banner slide-down">
            <div className="ann-banner__content">
              <span className="ann-banner__emoji">{a.emoji}</span>
              <span className="ann-banner__text">{a.text}</span>
              {a.link && <a className="ann-banner__link" href={parsedLink[1]} target="_blank" rel="noopener noreferrer">{parsedLink[0]}</a>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

