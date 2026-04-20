console.log("[KPI] main.jsx loaded");
try { const el = document.getElementById("boot-status"); if (el) { el.textContent = "JS: loaded"; el.dataset.kind = "ok"; } } catch (e) { }

import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { t } from "./i18n.js";
import { auth, onAuthStateChanged, getRedirectResult } from "./firebase-config.js";
import {
  store, setState, navigate, toast, parseRoute, resolvePath,
  updateRouteVisibility, applyTheme, applyFont, applyAccessibility,
  getDefaultAccessibility, getDefaultSiteSettings, applySiteSettings
} from "./store.js";
import {
  ensureUserDoc, fetchTypesAll, fetchTypesActive, fetchUsersAll,
  fetchMySubmissions, fetchPendingSubmissions, fetchAdminRecentSubs,
  fetchMyRequests, fetchPendingRequests, fetchAdminRecentRequests,
  fetchAllDocuments, fetchDocumentsForTeacher, fetchMyTeacherDocs,
  fetchNewsAll, fetchMyTickets, fetchAllTickets, fetchAnnouncements,
  fetchGoals, setUserOnline, fetchEvents
} from "./data.js";
import {
  ErrorBoundary, LoadingScreen, SidebarNav, TopbarTitle, TopbarRight,
  BottomNav, Overlays
} from "./components.jsx";

// Page components
import { PageOnboarding, PageLogin } from "./pages/auth.jsx";
import {
  PageDashboard, PageProfile, PageAdd, PageRequests, PageRating, PageStats
} from "./pages/teacher.jsx";
import {
  PageAdminApprovals, PageAdminRequests, PageDocuments, PageAdminDocuments,
  PageAdminTypes, PageAdminUsers, PageAdminTeacher, PageAdminEvents
} from "./pages/admin.jsx";
import { PageAdminDirector } from "./pages/director.jsx";
import {
  PageNews, PageSettings, PageSupport, PageAdminSupport,
  PageAdminAnnouncements, AnnouncementBanner
} from "./pages/social.jsx";
import { PageClassroomTools } from "./pages/classroomtools.jsx";
import { PageCalendar } from "./pages/calendar.jsx";
import { PageAbout } from "./pages/about.jsx";

/* ---------- React mount/render layer ---------- */
const __roots = new Map();
function mount(id, el) {
  const node = document.getElementById(id);
  if (!node) return;
  let root = __roots.get(id);
  if (!root) {
    root = createRoot(node);
    __roots.set(id, root);
  }
  root.render(el);
}

async function render() {
  const route = parseRoute();
  const prev = store.state.route;
  if (!prev || prev.path !== route.path || JSON.stringify(prev.params || {}) !== JSON.stringify(route.params || {})) {
    store.state = { ...store.state, route };
    for (const fn of store.subs) fn(store.state);
  }

  const rawPath = route.path || "login";
  const path = resolvePath(rawPath);
  if (path !== rawPath) {
    navigate(path, route.params || {});
    return;
  }
  updateRouteVisibility(path);

  // Layout (always)
  mount("mount-topbar-title", <ErrorBoundary name="topbar-title"><TopbarTitle /></ErrorBoundary>);
  mount("mount-sidebar", <ErrorBoundary name="sidebar"><SidebarNav /></ErrorBoundary>);
  mount("mount-drawer", <ErrorBoundary name="drawer"><SidebarNav /></ErrorBoundary>);
  mount("mount-topbar", <ErrorBoundary name="topbar"><TopbarRight /></ErrorBoundary>);
  mount("mount-topbar-right", <ErrorBoundary name="topbar"><TopbarRight /></ErrorBoundary>);
  mount("mount-bottomnav", <ErrorBoundary name="bottomnav"><BottomNav /></ErrorBoundary>);
  mount("mount-overlays", <ErrorBoundary name="overlays"><Overlays /></ErrorBoundary>);
  mount("mount-announcements", <ErrorBoundary name="announcements"><AnnouncementBanner /></ErrorBoundary>);

  const show = (p) => p === path;
  const booting = store.state.booting;

  mount("mount-login", show("login") ? <ErrorBoundary name="login"><PageLogin /></ErrorBoundary> : null);
  mount("mount-onboarding", show("onboarding") ? <ErrorBoundary name="onboarding">{booting ? <LoadingScreen /> : <PageOnboarding />}</ErrorBoundary> : null);
  mount("mount-dashboard", show("dashboard") ? <ErrorBoundary name="dashboard">{booting ? <LoadingScreen /> : <PageDashboard />}</ErrorBoundary> : null);
  mount("mount-profile", show("profile") ? <ErrorBoundary name="profile">{booting ? <LoadingScreen /> : <PageProfile />}</ErrorBoundary> : null);
  mount("mount-rating", show("rating") ? <ErrorBoundary name="rating">{booting ? <LoadingScreen /> : <PageRating />}</ErrorBoundary> : null);
  mount("mount-stats", show("stats") ? <ErrorBoundary name="stats">{booting ? <LoadingScreen /> : <PageStats />}</ErrorBoundary> : null);
  mount("mount-add", show("add") ? <ErrorBoundary name="add">{booting ? <LoadingScreen /> : <PageAdd />}</ErrorBoundary> : null);
  mount("mount-requests", show("requests") ? <ErrorBoundary name="requests">{booting ? <LoadingScreen /> : <PageRequests />}</ErrorBoundary> : null);
  mount("mount-documents", show("documents") ? <ErrorBoundary name="documents">{booting ? <LoadingScreen /> : <PageDocuments />}</ErrorBoundary> : null);
  mount("mount-news", show("news") ? <ErrorBoundary name="news">{booting ? <LoadingScreen /> : <PageNews />}</ErrorBoundary> : null);
  mount("mount-support", show("support") ? <ErrorBoundary name="support">{booting ? <LoadingScreen /> : <PageSupport />}</ErrorBoundary> : null);
  mount("mount-settings", show("settings") ? <ErrorBoundary name="settings">{booting ? <LoadingScreen /> : <PageSettings />}</ErrorBoundary> : null);
  mount("mount-classroomtools", show("classroomtools") ? <ErrorBoundary name="classroomtools">{booting ? <LoadingScreen /> : <PageClassroomTools />}</ErrorBoundary> : null);
  mount("mount-calendar", show("calendar") ? <ErrorBoundary name="calendar">{booting ? <LoadingScreen /> : <PageCalendar />}</ErrorBoundary> : null);
  mount("mount-about", show("about") ? <ErrorBoundary name="about"><PageAbout /></ErrorBoundary> : null);

  mount("mount-admin-approvals", show("admin/approvals") ? <ErrorBoundary name="admin/approvals">{booting ? <LoadingScreen /> : <PageAdminApprovals />}</ErrorBoundary> : null);
  mount("mount-admin-requests", show("admin/requests") ? <ErrorBoundary name="admin/requests">{booting ? <LoadingScreen /> : <PageAdminRequests />}</ErrorBoundary> : null);
  mount("mount-admin-documents", show("admin/documents") ? <ErrorBoundary name="admin/documents">{booting ? <LoadingScreen /> : <PageAdminDocuments />}</ErrorBoundary> : null);
  mount("mount-admin-types", show("admin/types") ? <ErrorBoundary name="admin/types">{booting ? <LoadingScreen /> : <PageAdminTypes />}</ErrorBoundary> : null);
  mount("mount-admin-users", show("admin/users") ? <ErrorBoundary name="admin/users">{booting ? <LoadingScreen /> : <PageAdminUsers />}</ErrorBoundary> : null);
  mount("mount-admin-teacher", show("admin/teacher") ? <ErrorBoundary name="admin/teacher">{booting ? <LoadingScreen /> : <PageAdminTeacher />}</ErrorBoundary> : null);
  mount("mount-admin-support", show("admin/support") ? <ErrorBoundary name="admin/support">{booting ? <LoadingScreen /> : <PageAdminSupport />}</ErrorBoundary> : null);
  mount("mount-admin-announcements", show("admin/announcements") ? <ErrorBoundary name="admin/announcements">{booting ? <LoadingScreen /> : <PageAdminAnnouncements />}</ErrorBoundary> : null);
  mount("mount-admin-events", show("admin/events") ? <ErrorBoundary name="admin/events">{booting ? <LoadingScreen /> : <PageAdminEvents />}</ErrorBoundary> : null);
  mount("mount-admin-director", show("admin/director") ? <ErrorBoundary name="admin/director">{booting ? <LoadingScreen /> : <PageAdminDirector />}</ErrorBoundary> : null);
}

function setupMobileDrawer() {
  const drawer = document.getElementById("mobileDrawer");
  const backdrop = document.getElementById("mobileDrawerBackdrop");
  const btnOpen = document.getElementById("btnMobileMenu");
  const btnClose = document.getElementById("btnDrawerClose");
  if (!drawer || !backdrop || !btnOpen || !btnClose) return;

  const open = () => {
    drawer.hidden = false;
    backdrop.hidden = false;
    drawer.classList.add("open");
    backdrop.classList.add("open");
  };
  const close = () => {
    drawer.classList.remove("open");
    backdrop.classList.remove("open");
    drawer.hidden = true;
    backdrop.hidden = true;
  };

  btnOpen.addEventListener("click", open);
  btnClose.addEventListener("click", close);
  backdrop.addEventListener("click", close);

  window.__closeDrawer = close;
}

async function hydrateForUser(userDoc) {
  if (!userDoc) return;
  try {
    if (userDoc.role === "admin") {
      const [types, users, pend, recent, pendReq, recentReq, allDocs, newsData, ticketsData, announcementsData, eventsData] = await Promise.all([
        fetchTypesAll(),
        fetchUsersAll(),
        fetchPendingSubmissions(),
        fetchAdminRecentSubs(),
        fetchPendingRequests(),
        fetchAdminRecentRequests(),
        fetchAllDocuments(),
        fetchNewsAll(),
        fetchAllTickets(),
        fetchAnnouncements(),
        fetchEvents()
      ]);
      setState({
        types, users,
        pendingSubmissions: pend, adminRecentSubs: recent,
        pendingRequests: pendReq, adminRecentRequests: recentReq,
        allDocuments: allDocs, news: newsData,
        allTickets: ticketsData, announcements: announcementsData,
        events: eventsData,
        mySubmissions: [], myRequests: [], myDocuments: [], myTickets: [], myGoals: []
      });
    } else {
      const [types, my, myReq, myDocs, myTDocs, users, recent, newsData, myTix, announcementsData, myGoalsData, eventsData] = await Promise.all([
        fetchTypesActive(),
        fetchMySubmissions(userDoc.uid),
        fetchMyRequests(userDoc.uid),
        fetchDocumentsForTeacher(userDoc.uid),
        fetchMyTeacherDocs(userDoc.uid),
        fetchUsersAll(),
        fetchAdminRecentSubs(),
        fetchNewsAll(),
        fetchMyTickets(userDoc.uid),
        fetchAnnouncements(),
        fetchGoals(userDoc.uid),
        fetchEvents()
      ]);
      setState({
        types, mySubmissions: my, myRequests: myReq, myDocuments: myDocs,
        myTeacherDocs: myTDocs, users, adminRecentSubs: recent,
        news: newsData, myTickets: myTix, announcements: announcementsData,
        myGoals: myGoalsData, events: eventsData,
        pendingSubmissions: [], pendingRequests: [],
        adminRecentRequests: [], allDocuments: [], allTickets: []
      });
    }
  } catch (e) {
    console.error(e);
    toast(e?.message || t("error"), "error");
  }
}

window.__kpiHydrate = async () => {
  const ud = store.state.userDoc;
  if (!ud) return;
  await hydrateForUser(ud);
  render();
};

function setupAboutFootButton() {
  const handler = (e) => {
    const btn = e.target.closest && e.target.closest("#btnAboutFoot");
    if (!btn) return;
    e.preventDefault();
    try { window.__closeDrawer?.(); } catch (err) { }
    navigate("about");
  };
  document.addEventListener("click", handler);
}

async function bootstrap() {
  setupMobileDrawer();
  setupAboutFootButton();
  applyTheme(store.state.theme);
  applyFont(store.state.font);
  applyAccessibility(getDefaultAccessibility());
  window.addEventListener("hashchange", () => render().catch(console.error));

  try {
    await getRedirectResult(auth);
  } catch (e) {
    console.error(e);
    toast(e?.message || t("msLoginError"), "error");
  }

  onAuthStateChanged(auth, async (user) => {
    try {
      setState({ booting: true, authUser: user || null });

      if (!user) {
        if (window.__kpiHeartbeat) { clearInterval(window.__kpiHeartbeat); window.__kpiHeartbeat = null; }
        setState({
          userDoc: null, types: [], users: [],
          mySubmissions: [], pendingSubmissions: [], adminRecentSubs: [],
          myRequests: [], pendingRequests: [], adminRecentRequests: [],
          myDocuments: [], allDocuments: [], myTeacherDocs: [],
          news: [], myTickets: [], allTickets: [], announcements: [], myGoals: [], events: []
        });
        setState({ booting: false });
        render();
        return;
      }

      const userDoc = await ensureUserDoc(user.uid, user.email || "");
      setState({ userDoc });

      const savedAcc = userDoc.accessibility || getDefaultAccessibility();
      applyAccessibility(savedAcc);
      const savedSite = userDoc.siteSettings || getDefaultSiteSettings();
      applySiteSettings(savedSite);
      if (userDoc.preferredTheme) applyTheme(userDoc.preferredTheme);
      if (userDoc.preferredFont) applyFont(userDoc.preferredFont);

      await hydrateForUser(userDoc);

      await setUserOnline(user.uid, true);
      if (window.__kpiHeartbeat) clearInterval(window.__kpiHeartbeat);
      window.__kpiHeartbeat = setInterval(() => {
        if (auth.currentUser) setUserOnline(auth.currentUser.uid, true);
      }, 60000);

      if (userDoc.onboarded !== true && userDoc.role !== "admin") {
        navigate("onboarding");
      }

      setState({ booting: false });
      render();
    } catch (e) {
      console.error(e);
      toast(e?.message || t("initError"), "error");
      setState({ booting: false });
      render();
    }
  });

  document.addEventListener("visibilitychange", () => {
    const cu = auth.currentUser;
    if (cu) setUserOnline(cu.uid, document.visibilityState === "visible");
  });
  window.addEventListener("beforeunload", () => {
    const cu = auth.currentUser;
    if (cu) setUserOnline(cu.uid, false);
  });

  try { if (!location.hash || location.hash === "#" || location.hash === "#/") { location.hash = "#/login"; } } catch (e) { }
  render();
}

bootstrap().catch(console.error);

window.__KPI__ = { auth, store, navigate };
