console.log("[KPI] main.jsx loaded");
try { const el = document.getElementById("boot-status"); if (el) { el.textContent = "JS: loaded"; el.dataset.kind = "ok"; } } catch (e) { }

import React, { Suspense, lazy } from "react";
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
  BottomNav, Overlays, AnnouncementBanner
} from "./components.jsx";

// Page components — lazy-loaded into separate chunks so weak PCs don't parse
// code for pages the user never opens. Each import() maps to one chunk per file.
const PageOnboarding = lazy(() => import("./pages/auth.jsx").then(m => ({ default: m.PageOnboarding })));
const PageLogin      = lazy(() => import("./pages/auth.jsx").then(m => ({ default: m.PageLogin })));

const PageDashboard = lazy(() => import("./pages/teacher.jsx").then(m => ({ default: m.PageDashboard })));
const PageProfile   = lazy(() => import("./pages/teacher.jsx").then(m => ({ default: m.PageProfile })));
const PageAdd       = lazy(() => import("./pages/teacher.jsx").then(m => ({ default: m.PageAdd })));
const PageRequests  = lazy(() => import("./pages/teacher.jsx").then(m => ({ default: m.PageRequests })));
const PageRating    = lazy(() => import("./pages/teacher.jsx").then(m => ({ default: m.PageRating })));
const PageStats     = lazy(() => import("./pages/teacher.jsx").then(m => ({ default: m.PageStats })));

const PageAdminApprovals = lazy(() => import("./pages/admin.jsx").then(m => ({ default: m.PageAdminApprovals })));
const PageAdminRequests  = lazy(() => import("./pages/admin.jsx").then(m => ({ default: m.PageAdminRequests })));
const PageDocuments      = lazy(() => import("./pages/admin.jsx").then(m => ({ default: m.PageDocuments })));
const PageAdminDocuments = lazy(() => import("./pages/admin.jsx").then(m => ({ default: m.PageAdminDocuments })));
const PageAdminTypes     = lazy(() => import("./pages/admin.jsx").then(m => ({ default: m.PageAdminTypes })));
const PageAdminUsers     = lazy(() => import("./pages/admin.jsx").then(m => ({ default: m.PageAdminUsers })));
const PageAdminTeacher   = lazy(() => import("./pages/admin.jsx").then(m => ({ default: m.PageAdminTeacher })));
const PageAdminEvents    = lazy(() => import("./pages/admin.jsx").then(m => ({ default: m.PageAdminEvents })));

const PageAdminDirector = lazy(() => import("./pages/director.jsx").then(m => ({ default: m.PageAdminDirector })));

const PageNews               = lazy(() => import("./pages/social.jsx").then(m => ({ default: m.PageNews })));
const PageSettings           = lazy(() => import("./pages/social.jsx").then(m => ({ default: m.PageSettings })));
const PageSupport            = lazy(() => import("./pages/social.jsx").then(m => ({ default: m.PageSupport })));
const PageAdminSupport       = lazy(() => import("./pages/social.jsx").then(m => ({ default: m.PageAdminSupport })));
const PageAdminAnnouncements = lazy(() => import("./pages/social.jsx").then(m => ({ default: m.PageAdminAnnouncements })));

const PageClassroomTools = lazy(() => import("./pages/classroomtools.jsx").then(m => ({ default: m.PageClassroomTools })));
const PageCalendar       = lazy(() => import("./pages/calendar.jsx").then(m => ({ default: m.PageCalendar })));
const PageAbout          = lazy(() => import("./pages/about.jsx").then(m => ({ default: m.PageAbout })));

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

  const pageMount = (slot, routePath, Comp, checkBooting = true) => {
    if (!show(routePath)) { mount(slot, null); return; }
    const content = (checkBooting && booting)
      ? <LoadingScreen />
      : <Suspense fallback={<LoadingScreen />}><Comp /></Suspense>;
    mount(slot, <ErrorBoundary name={routePath}>{content}</ErrorBoundary>);
  };

  pageMount("mount-login", "login", PageLogin, false);
  pageMount("mount-onboarding", "onboarding", PageOnboarding);
  pageMount("mount-dashboard", "dashboard", PageDashboard);
  pageMount("mount-profile", "profile", PageProfile);
  pageMount("mount-rating", "rating", PageRating);
  pageMount("mount-stats", "stats", PageStats);
  pageMount("mount-add", "add", PageAdd);
  pageMount("mount-requests", "requests", PageRequests);
  pageMount("mount-documents", "documents", PageDocuments);
  pageMount("mount-news", "news", PageNews);
  pageMount("mount-support", "support", PageSupport);
  pageMount("mount-settings", "settings", PageSettings);
  pageMount("mount-classroomtools", "classroomtools", PageClassroomTools);
  pageMount("mount-calendar", "calendar", PageCalendar);
  pageMount("mount-about", "about", PageAbout, false);

  pageMount("mount-admin-approvals", "admin/approvals", PageAdminApprovals);
  pageMount("mount-admin-requests", "admin/requests", PageAdminRequests);
  pageMount("mount-admin-documents", "admin/documents", PageAdminDocuments);
  pageMount("mount-admin-types", "admin/types", PageAdminTypes);
  pageMount("mount-admin-users", "admin/users", PageAdminUsers);
  pageMount("mount-admin-teacher", "admin/teacher", PageAdminTeacher);
  pageMount("mount-admin-support", "admin/support", PageAdminSupport);
  pageMount("mount-admin-announcements", "admin/announcements", PageAdminAnnouncements);
  pageMount("mount-admin-events", "admin/events", PageAdminEvents);
  pageMount("mount-admin-director", "admin/director", PageAdminDirector);
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

      const curPath = store.state.route?.path;
      if (userDoc.onboarded !== true && userDoc.role !== "admin") {
        navigate("onboarding");
      } else if (curPath === "login" || !curPath) {
        navigate("dashboard");
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
