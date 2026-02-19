console.log("[KPI] main.jsx loaded");
try{ const el=document.getElementById("boot-status"); if(el){ el.textContent="JS: loaded"; el.dataset.kind="ok"; } }catch(e){}
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

/** Firebase CDN imports (required) */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  OAuthProvider,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  runTransaction,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

/** Firebase config (given) */
const firebaseConfig = {
  apiKey: "AIzaSyAQlLh2Abk92sZVCSsYSCxvps4Uld3C1Lk",
  authDomain: "bibonrat.firebaseapp.com",
  databaseURL: "https://bibonrat-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bibonrat",
  storageBucket: "bibonrat.firebasestorage.app",
  messagingSenderId: "78759159251",
  appId: "1:78759159251:web:3e40d7d5a2aa762f01bb26"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Microsoft Entra ID (Azure AD) tenant limitation for Microsoft OAuth sign-in.
// - "common" allows both personal Microsoft accounts and Azure AD accounts (default in Firebase).
// - For ONLY your Azure AD tenant, set to tenant GUID or domain like: "contoso.onmicrosoft.com".
const MICROSOFT_TENANT = "common";

/** Default KPI Types (required) */
const DEFAULT_TYPES = [
  { section:"Кәсіби даму", subsection:"Семинарлар", name:"Семинарға қатысу (мектепішілік)", defaultPoints:5 },
  { section:"Кәсіби даму", subsection:"Семинарлар", name:"Семинарға қатысу (аудандық)", defaultPoints:10 },
  { section:"Кәсіби даму", subsection:"Семинарлар", name:"Семинарға қатысу (облыстық)", defaultPoints:15 },
  { section:"Кәсіби даму", subsection:"Курстар", name:"Біліктілік арттыру (72+ сағат)", defaultPoints:25 },
  { section:"Кәсіби даму", subsection:"Сабақ", name:"Ашық сабақ өткізу", defaultPoints:20 },
  { section:"Жеке даму", subsection:"Кітап оқу", name:"Кәсіби кітап оқу (1 кітап)", defaultPoints:5 },
  { section:"Жеке даму", subsection:"Онлайн оқу", name:"Вебинарға қатысу (сертификатпен)", defaultPoints:5 },
  { section:"Жеке даму", subsection:"Цифрлық дағды", name:"Цифрлық платформа меңгеру", defaultPoints:10 },
  { section:"Қосымша даму", subsection:"Марапаттар", name:"Грамота (мектепішілік)", defaultPoints:5 },
  { section:"Қосымша даму", subsection:"Қоғамдық жұмыс", name:"Іс-шара ұйымдастыру", defaultPoints:10 },
  { section:"Инновациялар", subsection:"Жаңа әдіс", name:"Жаңа сабақ әдісін енгізу", defaultPoints:20 },
  { section:"Инновациялар", subsection:"Творчество", name:"Шығармашылық жоба жасау", defaultPoints:25 }
].map(x => ({ ...x, active:true }));

/** ---------- tiny state store ---------- */
const store = {
  state: {
    route: parseRoute(),
    booting: true,
    loading: false,
    toasts: [],
    modal: null, // {kind:'crop', file}
    authUser: null,
    userDoc: null,

    // data caches
    types: [],
    users: [],
    mySubmissions: [],
    pendingSubmissions: [],
    adminRecentSubs: [],

    // ui
    statsRangeMode: "14d"
  },
  subs: new Set()
};

function setState(patch){
  store.state = { ...store.state, ...patch };
  for (const fn of store.subs) fn(store.state);
}
function useStore(){
  const [, rerender] = useState(0);
  useEffect(() => {
    const fn = () => rerender(x => x+1);
    store.subs.add(fn);
    return () => store.subs.delete(fn);
  }, []);
  return store.state;
}

/** ---------- router ---------- */
const ROUTES = [
  "login","profile","rating","stats","add",
  "admin/approvals","admin/types","admin/users","admin/teacher"
];

function parseRoute(){
  const raw = (window.location.hash || "#/login").replace(/^#\/?/, "");
  const [pRaw, qs] = raw.split("?");
  let path = (pRaw || "login").replace(/\/+$/,"");
  if (!path || path === '/') path = 'login';
  const params = {};
  if (qs){
    const sp = new URLSearchParams(qs);
    for (const [k,v] of sp.entries()) params[k] = v;
  }
  return { path, params };
}
function navigate(path, params = {}){
  try{ window.__closeDrawer?.(); }catch(e){}
  const qs = new URLSearchParams(params).toString();
  window.location.hash = `#/${path}${qs ? `?${qs}` : ""}`;
}
function resolvePath(path){ return ROUTES.includes(path) ? path : "login"; }

function canAccess(path, userDoc){
  const isAuth = !!userDoc;
  if (!isAuth) return path === "login";
  const role = userDoc.role || "teacher";
  if (role === "teacher"){
    if (path.startsWith("admin/")) return false;
    return ["profile","rating","stats","add"].includes(path);
  }
  if (role === "admin"){
    if (path === "add") return false;
    return ["profile","rating","stats"].includes(path) || path.startsWith("admin/");
  }
  return false;
}
function updateRouteVisibility(path){
  document.querySelectorAll("[data-route]").forEach(sec => {
    sec.hidden = sec.getAttribute("data-route") !== path;
  });
}

/** ---------- React mount/render layer ---------- */
const __roots = new Map();
function mount(id, el){
  const node = document.getElementById(id);
  if (!node) return;
  let root = __roots.get(id);
  if (!root){
    root = createRoot(node);
    __roots.set(id, root);
  }
  root.render(el);
}

async function render(){
  const route = parseRoute();
  const prev = store.state.route;
  if (!prev || prev.path !== route.path || JSON.stringify(prev.params||{}) !== JSON.stringify(route.params||{})){
    // update store route so menus know active state
    store.state = { ...store.state, route };
    for (const fn of store.subs) fn(store.state);
  }

  const rawPath = route.path || "login";
  const path = resolvePath(rawPath);
  if (path !== rawPath){
    navigate(path, route.params || {});
    return;
  }
  updateRouteVisibility(path);

  // Layout (always)
  mount("mount-sidebar", <ErrorBoundary name="sidebar"><SidebarNav/></ErrorBoundary>);
  mount("mount-drawer", <ErrorBoundary name="drawer"><SidebarNav/></ErrorBoundary>);
  // topbar mount id differs between layouts; mount to both (missing nodes are ignored)
  mount("mount-topbar", <ErrorBoundary name="topbar"><TopbarRight/></ErrorBoundary>);
  mount("mount-topbar-right", <ErrorBoundary name="topbar"><TopbarRight/></ErrorBoundary>);
  mount("mount-bottomnav", <ErrorBoundary name="bottomnav"><BottomNav/></ErrorBoundary>);
  mount("mount-overlays", <ErrorBoundary name="overlays"><Overlays/></ErrorBoundary>);

  // Pages (only active route)
  const show = (p) => p === path;
  mount("mount-login", show("login") ? <ErrorBoundary name="login"><PageLogin/></ErrorBoundary> : null);
  mount("mount-profile", show("profile") ? <ErrorBoundary name="profile"><PageProfile/></ErrorBoundary> : null);
  mount("mount-rating", show("rating") ? <ErrorBoundary name="rating"><PageRating/></ErrorBoundary> : null);
  mount("mount-stats", show("stats") ? <ErrorBoundary name="stats"><PageStats/></ErrorBoundary> : null);
  mount("mount-add", show("add") ? <ErrorBoundary name="add"><PageAdd/></ErrorBoundary> : null);

  mount("mount-admin-approvals", show("admin/approvals") ? <ErrorBoundary name="admin/approvals"><PageAdminApprovals/></ErrorBoundary> : null);
  mount("mount-admin-types", show("admin/types") ? <ErrorBoundary name="admin/types"><PageAdminTypes/></ErrorBoundary> : null);
  mount("mount-admin-users", show("admin/users") ? <ErrorBoundary name="admin/users"><PageAdminUsers/></ErrorBoundary> : null);
  mount("mount-admin-teacher", show("admin/teacher") ? <ErrorBoundary name="admin/teacher"><PageAdminTeacher/></ErrorBoundary> : null);
}

function setupMobileDrawer(){
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


/** ---------- helpers ---------- */
const fmtPoints = (n) => (Number(n)||0).toLocaleString("ru-RU");
const safeText = (v) => (v ?? "").toString().trim();
function ymd(d=new Date()){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
}
function tsKey(x){
  const t = x?.createdAt;
  const sec = t?.seconds ?? 0;
  const ns = t?.nanoseconds ?? 0;
  return sec * 1_000_000_000 + ns;
}
function sum(arr, fn){ return arr.reduce((a,x)=>a+(Number(fn(x))||0),0); }
function lastDays(n){
  const out = [];
  const now = new Date();
  for (let i=n-1;i>=0;i--){
    const d = new Date(now);
    d.setDate(now.getDate()-i);
    out.push({ ymd: ymd(d), label: `${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` });
  }
  return out;
}

function lastMonths(n){
  const out = [];
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  for (let i=n-1;i>=0;i--){
    const d = new Date(start);
    d.setMonth(start.getMonth()-i);
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    out.push({ key:`${y}-${m}`, label:`${m}-${String(y).slice(2)}` });
  }
  return out;
}
function startYMDFromDays(days){
  const d = new Date();
  d.setDate(d.getDate() - (days-1));
  return ymd(d);
}
function levelFromPoints(p){
  const x = Number(p)||0;
  if (x>=500) return {name:"Легенда", next:null, pct:100};
  if (x>=300) return {name:"Лидер", next:500, pct: Math.round(((x-300)/(200))*100)};
  if (x>=150) return {name:"Профи", next:300, pct: Math.round(((x-150)/(150))*100)};
  if (x>=50) return {name:"Уверенный", next:150, pct: Math.round(((x-50)/(100))*100)};
  return {name:"Новичок", next:50, pct: Math.round((x/50)*100)};
}

/** ---------- toasts ---------- */
function toast(msg, kind="info"){
  const id = Math.random().toString(36).slice(2);
  const item = { id, msg, kind };
  setState({ toasts: [item, ...store.state.toasts].slice(0,3) });
  setTimeout(() => setState({ toasts: store.state.toasts.filter(t => t.id !== id) }), 3200);
}

/** ---------- firestore api ---------- */
async function ensureUserDoc(uid, email){
  const refU = doc(db, "users", uid);
  const snap = await getDoc(refU);
  if (snap.exists()) { const data = snap.data() || {}; if (!data.uid) { try{ await setDoc(refU, { uid }, { merge:true }); }catch(e){} } return { id:snap.id, ...data, uid: data.uid || snap.id }; }
  const base = {
    uid, email: email || "",
    displayName:"",
    role:"teacher",
    school:"",
    subject:"",
    experienceYears:0,
    phone:"",
    city:"",
    position:"",
    avatarUrl:"",
    totalPoints:0,
    createdAt: serverTimestamp()
  };
  await setDoc(refU, base, { merge:true });
  const snap2 = await getDoc(refU);
  const data2 = snap2.data() || {}; return { id:snap2.id, ...data2, uid: data2.uid || snap2.id };
}

async function hasAnyAdmin(){
  const qy = query(collection(db,"users"), where("role","==","admin"), limit(1));
  const res = await getDocs(qy);
  return res.docs.length > 0;
}

async function fetchTypesAll(){
  const res = await getDocs(collection(db,"types"));
  const arr = res.docs.map(d=>({id:d.id, ...d.data()}));
  arr.sort((a,b)=>{
    const s = (a.section||"").localeCompare(b.section||"", "ru"); if (s) return s;
    const ss = (a.subsection||"").localeCompare(b.subsection||"", "ru"); if (ss) return ss;
    return (a.name||"").localeCompare(b.name||"", "ru");
  });
  return arr;
}
async function fetchTypesActive(){
  const all = await fetchTypesAll();
  return all.filter(t=>t.active);
}
async function seedDefaultTypes(){
  const existing = await fetchTypesAll();
  const key = (t) => `${(t.section||"").toLowerCase()}||${(t.subsection||"").toLowerCase()}||${(t.name||"").toLowerCase()}`;
  const have = new Set(existing.map(key));
  const missing = DEFAULT_TYPES.filter(t => !have.has(key(t)));
  for (const t of missing) await addDoc(collection(db,"types"), t);
  return { added: missing.length };
}
async function addType(p){
  await addDoc(collection(db,"types"), {
    section: safeText(p.section),
    subsection: safeText(p.subsection),
    name: safeText(p.name),
    defaultPoints: Number(p.defaultPoints)||0,
    active: true
  });
}
async function toggleType(id, active){
  await updateDoc(doc(db,"types",id), { active: !!active });
}

async function fetchUsersAll(){
  const qy = query(collection(db,"users"), orderBy("totalPoints","desc"), limit(2000));
  const res = await getDocs(qy);
  return res.docs.map(d=>{
    const data = d.data() || {};
    return { id:d.id, ...data, uid: data.uid || d.id };
  });
}


// avoid where+orderBy composite indexes (sort client-side)
async function fetchMySubmissions(uid){
  const qy = query(collection(db,"submissions"), where("uid","==",uid));
  const res = await getDocs(qy);
  const arr = res.docs.map(d=>({id:d.id, ...d.data()}));
  arr.sort((a,b)=>tsKey(b)-tsKey(a));
  return arr;
}
async function fetchPendingSubmissions(){
  const qy = query(collection(db,"submissions"), where("status","==","pending"));
  const res = await getDocs(qy);
  const arr = res.docs.map(d=>({id:d.id, ...d.data()}));
  arr.sort((a,b)=>tsKey(b)-tsKey(a));
  return arr;
}
async function fetchAdminRecentSubs(){
  const qy = query(collection(db,"submissions"), orderBy("createdAt","desc"), limit(5000));
  const res = await getDocs(qy);
  return res.docs.map(d=>({id:d.id, ...d.data()}));
}

async function createSubmission({ uid, type, title, description, eventDate, evidenceLink, evidenceFileUrl }){
  await addDoc(collection(db,"submissions"), {
    uid,
    typeId: type.id,
    typeName: type.name,
    typeSection: type.section,
    typeSubsection: type.subsection,
    points: Number(type.defaultPoints)||0,
    title: safeText(title),
    description: safeText(description),
    eventDate: safeText(eventDate),
    evidenceLink: safeText(evidenceLink),
    evidenceFileUrl: safeText(evidenceFileUrl),
    status:"pending",
    createdAt: serverTimestamp()
  });
}
async function approveSubmission(subId, adminUid){
  const sRef = doc(db,"submissions", subId);
  await runTransaction(db, async (tx) => {
    const sSnap = await tx.get(sRef);
    if (!sSnap.exists()) throw new Error("Заявка не найдена");
    const s = sSnap.data();
    if (s.status !== "pending") return;
    const uRef = doc(db,"users", s.uid);
    tx.update(sRef, { status:"approved", decidedAt: serverTimestamp(), decidedBy: adminUid });
    tx.update(uRef, { totalPoints: increment(Number(s.points)||0) });
  });
}
async function rejectSubmission(subId, adminUid){
  await updateDoc(doc(db,"submissions", subId), { status:"rejected", decidedAt: serverTimestamp(), decidedBy: adminUid });
}

async function setRole(uid, role){
  await updateDoc(doc(db,"users",uid), { role });
}
async function updateProfile(uid, patch){
  await updateDoc(doc(db,"users",uid), patch);
}

/** ---------- storage ---------- */
async function uploadFile(path, file){
  const r = ref(storage, path);
  const buf = await file.arrayBuffer();
  await uploadBytes(r, new Uint8Array(buf), { contentType: file.type || "application/octet-stream" });
  return await getDownloadURL(r);
}
async function uploadEvidence(uid, file){
  const ts = Date.now();
  const safeName = file.name.replace(/[^\w.\-]+/g,"_");
  return uploadFile(`evidence/${uid}/${ts}_${safeName}`, file);
}
async function uploadAvatar(uid, blob){
  const ts = Date.now();
  const f = new File([blob], "avatar.png", { type: blob.type || "image/png" });
  return uploadFile(`avatars/${uid}/${ts}_avatar.png`, f);
}

/** ---------- ui components ---------- */
function Icon({ name }){
  const common = { width:18, height:18, viewBox:"0 0 24 24", fill:"none" };
  const s = { stroke:"currentColor", strokeWidth:"2", strokeLinecap:"round", strokeLinejoin:"round" };
  switch(name){
    case "user": return <svg {...common}><path {...s} d="M20 21a8 8 0 10-16 0"/><path {...s} d="M12 13a4 4 0 100-8 4 4 0 000 8z"/></svg>;
    case "rank": return <svg {...common}><path {...s} d="M4 20V10"/><path {...s} d="M10 20V4"/><path {...s} d="M16 20v-6"/><path {...s} d="M22 20v-9"/></svg>;
    case "chart": return <svg {...common}><path {...s} d="M4 19V5"/><path {...s} d="M4 19h16"/><path {...s} d="M7 15l3-3 3 2 5-6"/></svg>;
    case "plus": return <svg {...common}><path {...s} d="M12 5v14"/><path {...s} d="M5 12h14"/></svg>;
    case "logout": return <svg {...common}><path {...s} d="M10 17l5-5-5-5"/><path {...s} d="M15 12H3"/></svg>;
    case "check": return <svg {...common}><path {...s} d="M20 6L9 17l-5-5"/></svg>;
    case "x": return <svg {...common}><path {...s} d="M6 6l12 12M18 6L6 18"/></svg>;
    case "file": return <svg {...common}><path {...s} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path {...s} d="M14 2v6h6"/></svg>;
    case "shield": return <svg {...common}><path {...s} d="M12 22s8-4 8-10V6l-8-3-8 3v6c0 6 8 10 8 10z"/></svg>;
    default: return null;
  }
}
const Btn = ({ kind="", children, ...props }) => <button className={["btn", kind].join(" ").trim()} {...props}>{children}</button>;
const Input = (p) => <input className="input" {...p} />;
const Select = (p) => <select className="select" {...p} />;
const Textarea = (p) => <textarea className="textarea" {...p} />;
const Pill = ({ kind, children }) => <span className={`pill ${kind}`}>{children}</span>;

function Guard(){
  return (
    <div className="glass card">
      <div className="h2">Нужна авторизация</div>
      <p className="p">Войдите, чтобы продолжить.</p>
      <div className="sep"></div>
      <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
        <Btn kind="primary" onClick={()=>navigate("login")}>Войти</Btn>
      </div>
    </div>
  );
}


class ErrorBoundary extends React.Component{
  constructor(props){
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err){
    return { err };
  }
  componentDidCatch(err, info){
    console.error("[ErrorBoundary]", this.props?.name || "", err, info);
  }
  render(){
    if (this.state.err){
      const e = this.state.err;
      return (
        <div className="glass card">
          <div className="h2">Ошибка рендера</div>
          <p className="p">Секция: <b>{this.props?.name || "page"}</b></p>
          <div className="sep"></div>
          <div className="tiny"><b>{String(e?.name || "Error")}</b>: {String(e?.message || e)}</div>
          <div className="help">Открой DevTools → Console, там будет полный stacktrace.</div>
          <div className="sep"></div>
          <Btn onClick={()=>{ this.setState({err:null}); }}>Попробовать снова</Btn>
        </div>
      );
    }
    return this.props.children;
  }
}


function SidebarNav(){
  const st = useStore();
  const u = st.userDoc;
  const path = st.route.path;

  const teacher = [
    {p:"profile", t:"Профиль", i:"user"},
    {p:"rating", t:"Рейтинг", i:"rank"},
    {p:"stats", t:"Статистика", i:"chart"},
    {p:"add", t:"Добавить KPI", i:"plus"},
  ];
  const adminMain = [
    {p:"profile", t:"Профиль", i:"user"},
    {p:"rating", t:"Рейтинг", i:"rank"},
    {p:"stats", t:"Статистика", i:"chart"},
  ];
  const admin = [
    {p:"admin/approvals", t:"Approvals", i:"check"},
    {p:"admin/types", t:"Types", i:"file"},
    {p:"admin/users", t:"Users", i:"shield"},
  ];
  const list = !u ? [
    {p:"login", t:"Войти", i:"user"},
  ] : (u.role==="admin" ? adminMain : teacher);

  return (
    <div className="sidenav">
      <div className="navsec">Навигация</div>
      {list.map(it => (
        <div key={it.p} className={`navlink ${path===it.p?"active":""}`} role="button" tabIndex={0} onClick={()=>navigate(it.p)}>
          <Icon name={it.i}/> {it.t}
        </div>
      ))}
      {u?.role==="admin" && (
        <>
          <div className="navsec">Админ</div>
          {admin.map(it => (
            <div key={it.p} className={`navlink ${path===it.p?"active":""}`} role="button" tabIndex={0} onClick={()=>navigate(it.p)}>
              <Icon name={it.i}/> {it.t}
            </div>
          ))}
        </>
      )}

      {u && (
        <>
          <div className="navsec">Аккаунт</div>
          <div
            className="navlink"
            role="button"
            tabIndex={0}
            onClick={async()=>{ await signOut(auth); toast("Вы вышли","ok"); navigate("login"); }}
          >
            <Icon name="logout"/> Выйти
          </div>
        </>
      )}
    </div>
  );
}

function TopbarRight(){
  const st = useStore();
  const u = st.userDoc;
  return (
    <div style={{display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", justifyContent:"flex-end"}}>
      {u ? (
        <>
          <Pill kind={u.role==="admin" ? "pending" : "approved"}>{u.role}</Pill>
          <div className="tiny" style={{maxWidth:340, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
            <b>{u.displayName || "Без имени"}</b> <span className="muted">· {u.email}</span>
          </div>
          <Btn kind="ghost" onClick={async()=>{ await signOut(auth); toast("Вы вышли"); navigate("login"); }}>
            <Icon name="logout"/> Выйти
          </Btn>
        </>
      ) : (
        <div className="tiny muted">Гость</div>
      )}
    </div>
  );
}

function BottomNav(){
  const st = useStore();
  const u = st.userDoc;
  const path = st.route.path;
  const items = !u ? [
    {p:"login", t:"Вход", i:"user"},
    {p:"rating", t:"Рейтинг", i:"rank"},
  ] : [
    {p:"rating", t:"Рейтинг", i:"rank"},
    {p:"stats", t:"Статс", i:"chart"},
    {p:"profile", t:"Профиль", i:"user"},
  ];
  return (
    <div className="bottomnav__row">
      {items.map(it => (
        <div key={it.p} className={`navitem ${path===it.p?"active":""}`} role="button" tabIndex={0} onClick={()=>navigate(it.p)}>
          <Icon name={it.i}/> {it.t}
        </div>
      ))}
    </div>
  );
}

function Overlays(){
  const st = useStore();
  return (
    <>
      <div className="toastwrap" aria-live="polite" aria-atomic="true">
        {st.toasts.map(t => (
          <div key={t.id} className="toast">
            <div style={{fontWeight:900, marginBottom:4}}>{t.kind==="error"?"Ошибка":t.kind==="ok"?"Готово":"Сообщение"}</div>
            <div className="tiny muted">{t.msg}</div>
          </div>
        ))}
      </div>
      {st.modal?.kind==="crop" && <CropModal file={st.modal.file} onClose={()=>setState({modal:null})} />}
    </>
  );
}

/** ---------- avatar crop modal (simple square) ---------- */
function CropModal({ file, onClose }){
  const st = useStore();
  const u = st.userDoc;
  const [url, setUrl] = useState("");
  const [zoom, setZoom] = useState(1.2);
  const [off, setOff] = useState({x:0,y:0});
  const [drag, setDrag] = useState(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => { imgRef.current = img; draw(); };
    img.src = url;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => { draw(); /* eslint-disable-next-line */ }, [zoom, off]);

  function draw(){
    const c = canvasRef.current;
    const img = imgRef.current;
    if (!c || !img) return;
    const ctx = c.getContext("2d");
    const W=c.width, H=c.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle="rgba(0,0,0,.18)"; ctx.fillRect(0,0,W,H);

    const scale = zoom * Math.min(W/img.width, H/img.height);
    const dw = img.width*scale, dh = img.height*scale;
    const x = W/2 + off.x - dw/2;
    const y = H/2 + off.y - dh/2;
    ctx.drawImage(img, x, y, dw, dh);

    const size = Math.min(W,H)*0.62;
    const sx = (W-size)/2, sy=(H-size)/2;
    ctx.fillStyle="rgba(0,0,0,.35)";
    ctx.beginPath(); ctx.rect(0,0,W,H); ctx.rect(sx,sy,size,size); ctx.fill("evenodd");
    ctx.strokeStyle="rgba(255,255,255,.75)"; ctx.lineWidth=2; ctx.strokeRect(sx,sy,size,size);
  }

  function down(e){ e.preventDefault(); setDrag({x:e.clientX,y:e.clientY, ox:off.x, oy:off.y}); }
  function move(e){ if (!drag) return; setOff({x:drag.ox + (e.clientX-drag.x), y:drag.oy + (e.clientY-drag.y)}); }
  function up(){ setDrag(null); }

  async function save(){
    try{
      if (!u) return;
      setState({ loading:true });

      const preview = canvasRef.current, img = imgRef.current;
      const W=preview.width, H=preview.height;
      const size = Math.min(W,H)*0.62;
      const sx = (W-size)/2, sy=(H-size)/2;

      // render full canvas into temp then crop into 512x512
      const tmp = document.createElement("canvas");
      tmp.width = W; tmp.height = H;
      const tctx = tmp.getContext("2d");

      const scale = zoom * Math.min(W/img.width, H/img.height);
      const dw = img.width*scale, dh = img.height*scale;
      const x = W/2 + off.x - dw/2;
      const y = H/2 + off.y - dh/2;
      tctx.drawImage(img, x, y, dw, dh);

      const out = document.createElement("canvas");
      out.width = 512; out.height = 512;
      const octx = out.getContext("2d");
      octx.drawImage(tmp, sx, sy, size, size, 0, 0, 512, 512);

      const blob = await new Promise(res => out.toBlob(res, "image/png", 0.92));
      if (!blob) throw new Error("Не удалось сохранить");

      const avatarUrl = await uploadAvatar(u.uid, blob);
      await updateProfile(u.uid, { avatarUrl });
      const fresh = await ensureUserDoc(u.uid, u.email);
      setState({ userDoc: fresh });
      toast("Аватар обновлён","ok");
      onClose();
    }catch(e){
      console.error(e);
      toast(e?.message || "Ошибка сохранения", "error");
    }finally{
      setState({ loading:false });
    }
  }

  return (
    <div className="modalback" onMouseMove={move} onMouseUp={up}>
      <div className="modal glass">
        <div className="modal__head">
          <div className="modal__title">Обрезка аватара</div>
          <button className="iconbtn" onClick={onClose} aria-label="Закрыть"><Icon name="x"/></button>
        </div>
        <div className="sep"></div>
        <div className="grid2">
          <div className="glass card">
            <div className="h2">Предпросмотр</div>
            <canvas
              ref={canvasRef}
              width={820}
              height={520}
              style={{width:"100%", borderRadius:18, border:"1px solid rgba(255,255,255,.12)", background:"rgba(0,0,0,.12)"}}
              onMouseDown={down}
            />
            <div className="label">Масштаб</div>
            <input type="range" min="0.8" max="2.6" step="0.01" value={zoom} onChange={(e)=>setZoom(Number(e.target.value))} style={{width:"100%"}} />
            <div className="help">Перетаскивай изображение мышкой.</div>
          </div>
          <div className="glass card">
            <div className="h2">Действия</div>
            <div className="sep"></div>
            <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
              <Btn kind="primary" onClick={save} disabled={st.loading}><Icon name="check"/> Сохранить</Btn>
              <Btn onClick={onClose}>Отмена</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ---------- charts ---------- */
function BarChart({ values, labels }){
  const max = Math.max(1, ...values.map(v=>Number(v)||0));
  return (
    <div>
      <div className="barchart">
        {values.map((v,i)=>(
          <div key={i} className="bar" style={{height:`${Math.max(4, Math.round(((Number(v)||0)/max)*100))}%`}} title={`${labels[i]}: ${v}`}/>
        ))}
      </div>
      <div className="barlabel">
        <span>{labels[0]}</span>
        <span>{labels[Math.floor(labels.length/2)]}</span>
        <span>{labels[labels.length-1]}</span>
      </div>
    </div>
  );
}

/** ---------- pages ---------- */
function PageLogin(){
  const st = useStore();
  const [email,setEmail] = useState("");
  const [pass,setPass] = useState("");

  useEffect(()=>{ if (st.userDoc) navigate("profile"); }, [st.userDoc]);

  async function submit(e){
    e.preventDefault();
    try{
      setState({ loading:true });
      await signInWithEmailAndPassword(auth, email, pass);
      toast("Добро пожаловать!","ok");
      navigate("profile");
    }catch(err){
      console.error(err);
      toast(err?.message || "Ошибка входа","error");
    }finally{ setState({ loading:false }); }
  }

  async function signInMicrosoft(){
    try{
      setState({ loading:true });
      const provider = new OAuthProvider("microsoft.com");
      provider.setCustomParameters({
        prompt: "select_account",
        tenant: MICROSOFT_TENANT
      });

      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
      if (isMobile){
        await signInWithRedirect(auth, provider);
        return; // дальше будет редирект
      }

      await signInWithPopup(auth, provider);
      toast("Добро пожаловать!","ok");
      navigate("profile");
    }catch(err){
      console.error(err);
      toast(err?.message || "Ошибка входа через Microsoft","error");
    }finally{ setState({ loading:false }); }
  }

  return (
    <div className="grid2">
      <div className="glass card">
        <div className="h1">Вход</div>
        <p className="p">Войдите, чтобы добавлять KPI и видеть рейтинг.</p>
        <div className="sep"></div>
        <form onSubmit={submit}>
          <div className="label">Email</div>
          <Input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" required />
          <div className="label">Пароль</div>
          <Input value={pass} onChange={(e)=>setPass(e.target.value)} type="password" required />
          <div style={{display:"flex", gap:10, flexWrap:"wrap", marginTop:12}}>
            <Btn kind="primary" type="submit" disabled={st.loading}>Войти</Btn>
            <Btn type="button" onClick={signInMicrosoft} disabled={st.loading}>Войти через Microsoft</Btn>
          </div>
        </form>
      </div>

      <div className="glass card">
        <div className="h2">Как работает</div>
        <div className="sep"></div>
        <div className="kpi"><div><b>1)</b> Отправляй KPI</div><b>+</b></div>
        <div style={{height:10}}/>
        <div className="kpi"><div><b>2)</b> Админ проверяет</div><b>✓</b></div>
        <div style={{height:10}}/>
        <div className="kpi"><div><b>3)</b> Рейтинг растёт</div><b>★</b></div>
      </div>
    </div>
  );
}


function PageProfile(){
  const st = useStore();
  const u = st.userDoc;
  const subs = st.mySubmissions || [];

  if (!u) return <Guard/>;
  if (!canAccess("profile", u)) return <Guard/>;

  const lvl = levelFromPoints(u.totalPoints||0);
  const approved = subs.filter(s=>s.status==="approved");
  const pending = subs.filter(s=>s.status==="pending");
  const rejected = subs.filter(s=>s.status==="rejected");

  const [open,setOpen] = useState(false);
  const [form,setForm] = useState({
    displayName: u.displayName||"",
    school: u.school||"",
    subject: u.subject||"",
    experienceYears: u.experienceYears||0,
    phone: u.phone||"",
    city: u.city||"",
    position: u.position||""
  });
  useEffect(()=>setForm({
    displayName: u.displayName||"",
    school: u.school||"",
    subject: u.subject||"",
    experienceYears: u.experienceYears||0,
    phone: u.phone||"",
    city: u.city||"",
    position: u.position||""
}), [u.uid]);

// --- Security / password change ---
const authUser = st.authUser;
const isPasswordProvider = !!(authUser?.providerData || []).some(p => p?.providerId === "password");
const [pw, setPw] = useState({ current: "", next: "", next2: "" });
useEffect(() => setPw({ current: "", next: "", next2: "" }), [u.uid]);

async function changePassword(){
  const user = auth.currentUser;
  if (!user){ toast("Нет активной сессии","error"); return; }

  const next = String(pw.next || "");
  const next2 = String(pw.next2 || "");
  const current = String(pw.current || "");

  if (next.length < 6){ toast("Новый пароль должен быть минимум 6 символов","error"); return; }
  if (next !== next2){ toast("Новые пароли не совпадают","error"); return; }
  if (isPasswordProvider && !current){ toast("Введите текущий пароль","error"); return; }

  try{
    setState({ loading:true });

    // For email/password accounts we can re-auth with current password
    if (isPasswordProvider){
      const email = user.email || "";
      const cred = EmailAuthProvider.credential(email, current);
      await reauthenticateWithCredential(user, cred);
    }

    await updatePassword(user, next);
    toast("Пароль изменён","ok");
    setPw({ current:"", next:"", next2:"" });
  }catch(e){
    console.error(e);
    const code = e?.code || "";
    if (code === "auth/wrong-password" || code === "auth/invalid-credential") toast("Неверный текущий пароль","error");
    else if (code === "auth/requires-recent-login") toast("Нужен повторный вход. Выйдите и войдите снова, затем повторите.","error");
    else if (code === "auth/too-many-requests") toast("Слишком много попыток. Попробуйте позже.","error");
    else toast(e?.message || "Ошибка смены пароля","error");
  }finally{ setState({ loading:false }); }
}

async function resetPasswordEmail(){
  try{
    const email = (auth.currentUser?.email || u.email || "").trim();
    if (!email){ toast("Не найден email аккаунта","error"); return; }
    setState({ loading:true });
    await sendPasswordResetEmail(auth, email);
    toast("Ссылка для сброса пароля отправлена на email","ok");
  }catch(e){
    console.error(e);
    toast(e?.message || "Ошибка отправки письма","error");
  }finally{ setState({ loading:false }); }
}

async function save(){
    try{
      setState({ loading:true });
      await updateProfile(u.uid, {
        displayName: safeText(form.displayName),
        school: safeText(form.school),
        subject: safeText(form.subject),
        experienceYears: Number(form.experienceYears)||0,
        phone: safeText(form.phone),
        city: safeText(form.city),
        position: safeText(form.position)
      });
      const fresh = await ensureUserDoc(u.uid, u.email);
      setState({ userDoc: fresh });
      toast("Профиль обновлён","ok");
      setOpen(false);
    }catch(e){
      console.error(e);
      toast(e?.message || "Ошибка сохранения","error");
    }finally{ setState({ loading:false }); }
  }

  async function pickAvatar(file){
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast("Нужна картинка","error"); return; }
    setState({ modal:{kind:"crop", file} });
  }

  // Блок "Первый запуск / сделать меня админом" удалён по запросу.

  return (
    <div className="grid2">
      <div className="glass card">
        <div style={{display:"flex", gap:14, alignItems:"center"}}>
          <div className="avatar">
            {u.avatarUrl ? <img src={u.avatarUrl} alt="avatar"/> : <span style={{fontWeight:900}}>{(u.displayName||u.email||"?").slice(0,1).toUpperCase()}</span>}
          </div>
          <div style={{minWidth:0}}>
            <div className="h2" style={{margin:0}}>{u.displayName || "Без имени"}</div>
            <div className="tiny muted">{u.email} · роль: <b>{u.role}</b></div>
            <div style={{marginTop:8, display:"flex", gap:10, flexWrap:"wrap"}}>
              <label className="btn">
                <Icon name="file"/> Фото
                <input hidden type="file" accept="image/*" onChange={(e)=>pickAvatar(e.target.files?.[0])}/>
              </label>
              {u.role!=="admin" && <Btn kind="primary" onClick={()=>navigate("add")}><Icon name="plus"/> Добавить KPI</Btn>}
              <Btn kind="ghost" onClick={async()=>{ await signOut(auth); toast("Вы вышли","ok"); navigate("login"); }}>
                <Icon name="logout"/> Выйти
              </Btn>
            </div>
          </div>
        </div>

        <div className="sep"></div>

        <div className="grid3">
          <div className="kpi">
            <div><div className="muted tiny">Всего баллов</div><div style={{fontWeight:900,fontSize:22}}>{fmtPoints(u.totalPoints)}</div></div>
            <Pill kind="approved">{lvl.name}</Pill>
          </div>
          <div className="kpi">
            <div><div className="muted tiny">Заявок</div><div style={{fontWeight:900,fontSize:22}}>{fmtPoints(subs.length)}</div></div>
            <span className="tiny muted">APR {subs.length?Math.round((approved.length/subs.length)*100):0}%</span>
          </div>
          <div className="kpi">
            <div><div className="muted tiny">Одобрено баллов</div><div style={{fontWeight:900,fontSize:22}}>{fmtPoints(sum(approved,s=>s.points))}</div></div>
            <span className="tiny muted">{approved.length} шт</span>
          </div>
        </div>

        <div style={{marginTop:12, display:"flex", gap:10, flexWrap:"wrap"}}>
          <Pill kind="approved">approved: {approved.length}</Pill>
          <Pill kind="pending">pending: {pending.length}</Pill>
          <Pill kind="rejected">rejected: {rejected.length}</Pill>
        </div>

        <div className="sep"></div>
        <Btn onClick={()=>setOpen(v=>!v)}>{open?"Закрыть настройки":"Настройки"}</Btn>

        {open && (
          <div style={{marginTop:12}}>
            <div className="grid2">
              <div><div className="label">ФИО</div><Input value={form.displayName} onChange={(e)=>setForm(f=>({...f, displayName:e.target.value}))}/></div>
              <div><div className="label">Должность</div><Input value={form.position} onChange={(e)=>setForm(f=>({...f, position:e.target.value}))}/></div>
              <div><div className="label">Школа</div><Input value={form.school} onChange={(e)=>setForm(f=>({...f, school:e.target.value}))}/></div>
              <div><div className="label">Предмет</div><Input value={form.subject} onChange={(e)=>setForm(f=>({...f, subject:e.target.value}))}/></div>
              <div><div className="label">Стаж</div><Input type="number" min="0" max="60" value={form.experienceYears} onChange={(e)=>setForm(f=>({...f, experienceYears:e.target.value}))}/></div>
              <div><div className="label">Телефон</div><Input value={form.phone} onChange={(e)=>setForm(f=>({...f, phone:e.target.value}))}/></div>
              <div><div className="label">Город</div><Input value={form.city} onChange={(e)=>setForm(f=>({...f, city:e.target.value}))}/></div>
              <div/>
            </div>
            <div style={{display:"flex", gap:10, flexWrap:"wrap", marginTop:12}}>
              <Btn kind="primary" onClick={save} disabled={st.loading}>Сохранить</Btn>
              <Btn onClick={()=>setOpen(false)}>Отмена</Btn>
            </div>

<div className="sep"></div>
<div className="h2" style={{fontSize:18}}>Безопасность</div>
<div className="help">
  {isPasswordProvider
    ? "Введите текущий пароль, затем новый."
    : "Если вы входите через Google/другой провайдер, может потребоваться повторный вход для смены пароля."}
</div>
<div className="grid2" style={{marginTop:10}}>
  {isPasswordProvider && (
    <div>
      <div className="label">Текущий пароль</div>
      <Input type="password" autoComplete="current-password" value={pw.current}
        onChange={(e)=>setPw(p=>({...p, current:e.target.value}))}/>
    </div>
  )}
  <div>
    <div className="label">Новый пароль</div>
    <Input type="password" autoComplete="new-password" value={pw.next}
      onChange={(e)=>setPw(p=>({...p, next:e.target.value}))}/>
  </div>
  <div>
    <div className="label">Повторите новый пароль</div>
    <Input type="password" autoComplete="new-password" value={pw.next2}
      onChange={(e)=>setPw(p=>({...p, next2:e.target.value}))}/>
  </div>
  <div/>
</div>
<div style={{display:"flex", gap:10, flexWrap:"wrap", marginTop:12}}>
  <Btn kind="primary" onClick={changePassword} disabled={st.loading}>Изменить пароль</Btn>
  <Btn kind="ghost" onClick={resetPasswordEmail} disabled={st.loading}>Сбросить по email</Btn>
</div>
          </div>
        )}

        {/* блок "Первый запуск" удалён */}
      </div>

      <div className="glass card">
        <div className="h2">Последние заявки</div>
        <div className="sep"></div>
        <div className="heatwrap">
          <table className="table">
            <thead><tr><th>Дата</th><th>Тип</th><th>Название</th><th>Баллы</th><th>Статус</th></tr></thead>
            <tbody>
              {subs.slice(0,8).map(s=>(
                <tr key={s.id}>
                  <td className="tiny">{s.eventDate}</td>
                  <td className="tiny">{s.typeName}</td>
                  <td className="tiny">{s.title}</td>
                  <td className="tiny"><b>{fmtPoints(s.points)}</b></td>
                  <td className="tiny"><Pill kind={s.status}>{s.status}</Pill></td>
                </tr>
              ))}
              {!subs.length && <tr><td colSpan="5" className="tiny muted">Пока нет заявок</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PageAdd(){
  const st = useStore();
  const u = st.userDoc;
  if (!u) return <Guard/>;
  if (!canAccess("add", u)) return <Guard/>;

  const types = st.types.filter(t=>t.active);
  const sections = Array.from(new Set(types.map(t=>t.section))).sort();
  const [section,setSection] = useState(sections[0]||"");
  const subs = useMemo(()=>Array.from(new Set(types.filter(t=>t.section===section).map(t=>t.subsection))).sort(), [types, section]);
  const [subsection,setSubsection] = useState(subs[0]||"");
  const opts = useMemo(()=>types.filter(t=>t.section===section && t.subsection===subsection), [types, section, subsection]);
  const [typeId,setTypeId] = useState(opts[0]?.id || "");

  useEffect(()=>setSection(sections[0]||""), [sections.join("|")]);
  useEffect(()=>setSubsection(subs[0]||""), [subs.join("|")]);
  useEffect(()=>setTypeId(opts[0]?.id||""), [opts.map(x=>x.id).join("|")]);

  const type = opts.find(x=>x.id===typeId) || null;

  const [eventDate,setEventDate] = useState(ymd());
  const [title,setTitle] = useState("");
  const [description,setDescription] = useState("");
  const [evidenceLink,setEvidenceLink] = useState("");
  const [file,setFile] = useState(null);

  async function submit(e){
    e.preventDefault();
    try{
      if (!type){ toast("Выберите тип KPI","error"); return; }
      if (!safeText(title)){ toast("Введите название","error"); return; }
      if (!safeText(evidenceLink) && !file){ toast("Добавьте ссылку и/или файл","error"); return; }

      setState({ loading:true });
      let evidenceFileUrl = "";
      if (file) evidenceFileUrl = await uploadEvidence(u.uid, file);

      await createSubmission({ uid:u.uid, type, title, description, eventDate, evidenceLink, evidenceFileUrl });
      toast("Заявка отправлена на проверку","ok");

      const my = await fetchMySubmissions(u.uid);
      setState({ mySubmissions: my });

      setTitle(""); setDescription(""); setEvidenceLink(""); setFile(null);
      navigate("profile");
    }catch(err){
      console.error(err);
      toast(err?.message || "Ошибка отправки","error");
    }finally{ setState({ loading:false }); }
  }

  return (
    <div className="grid2">
      <div className="glass card">
        <div className="h1">Добавить KPI</div>
        <p className="p">Выберите тип KPI и прикрепите доказательства.</p>
        <div className="sep"></div>

        <form onSubmit={submit}>
          <div className="grid2">
            <div>
              <div className="label">Section</div>
              <Select value={section} onChange={(e)=>setSection(e.target.value)}>
                {sections.map(s=><option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <div className="label">Subsection</div>
              <Select value={subsection} onChange={(e)=>setSubsection(e.target.value)}>
                {subs.map(s=><option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <div className="label">Тип KPI</div>
              <Select value={typeId} onChange={(e)=>setTypeId(e.target.value)}>
                {opts.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
              <div className="help">Баллы подтянутся из типа автоматически.</div>
            </div>
          </div>

          <div className="grid2">
            <div>
              <div className="label">Дата</div>
              <Input type="date" value={eventDate} onChange={(e)=>setEventDate(e.target.value)} required />
            </div>
            <div>
              <div className="label">Баллы</div>
              <Input value={type?.defaultPoints ?? ""} readOnly />
            </div>
          </div>

          <div className="label">Название</div>
          <Input value={title} onChange={(e)=>setTitle(e.target.value)} required />

          <div className="label">Описание</div>
          <Textarea value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Коротко: что сделано, где, результат..." />

          <div className="label">Ссылка (optional)</div>
          <Input value={evidenceLink} onChange={(e)=>setEvidenceLink(e.target.value)} placeholder="https://..." />

          <div className="label">Файл (optional)</div>
          <Input type="file" accept=".pdf,image/png,image/jpeg" onChange={(e)=>setFile(e.target.files?.[0] || null)} />

          <div style={{display:"flex", gap:10, flexWrap:"wrap", marginTop:12}}>
            <Btn kind="primary" type="submit" disabled={st.loading}>Отправить</Btn>
            <Btn type="button" onClick={()=>navigate("profile")}>Назад</Btn>
          </div>
        </form>
      </div>

      <div className="glass card">
        <div className="h2">Подсказки</div>
        <div className="sep"></div>
        <p className="p">Админ увидит вашу заявку в Approvals и сможет approve/reject.</p>
      </div>
    </div>
  );
}

function ratingTrend(usersSorted){
  const prev = JSON.parse(localStorage.getItem("rating_snapshot") || "[]");
  const prevPos = new Map(prev.map((x,i)=>[x.uid, i+1]));
  const trend = new Map();
  usersSorted.forEach((u,i)=>{
    const c = i+1;
    const p = prevPos.get(u.uid);
    if (!p) trend.set(u.uid, "NEW");
    else {
      const diff = p - c;
      trend.set(u.uid, diff>0?`▲ ${diff}`:diff<0?`▼ ${Math.abs(diff)}`:"• 0");
    }
  });
  localStorage.setItem("rating_snapshot", JSON.stringify(usersSorted.map(u=>({uid:u.uid,total:Number(u.totalPoints)||0}))));
  return trend;
}


function PageRating(){
  const st = useStore();
  const u = st.userDoc;

  if (!u) return <Guard/>;
  if (!canAccess("rating", u)) return <Guard/>;

  const teachers = st.users.filter(x => (x.role||"teacher") !== "admin");
  const sorted = [...teachers].sort((a,b)=>(Number(b.totalPoints)||0)-(Number(a.totalPoints)||0)).slice(0,100);
  const trend = ratingTrend(sorted);

  const top3 = sorted.slice(0,3);
  const rest = sorted.slice(3);

  const Avatar = ({user, size="sm"}) => (
    <div className={`avatar ${size}`} aria-hidden="true">
      {user?.avatarUrl
        ? <img src={user.avatarUrl} alt="" />
        : <span style={{fontWeight:900}}>{(user?.displayName||user?.email||"?").slice(0,1).toUpperCase()}</span>}
    </div>
  );

  return (
    <div className="glass card">
      <div className="h1">Рейтинг преподавателей</div>
      <p className="p">Сортировка по <b>totalPoints</b>. Динамика — сравнение с прошлым снимком из localStorage.</p>
      <div className="sep"></div>

      <div className="podium">
        {[1,0,2].map((idx, i) => {
          const t = top3[idx];
          if (!t){
            return (
              <div key={i} className="podium__item glass">
                <div className="podium__inner">
                  <div className="podium__rank">—</div>
                  <div className="podium__name">Пусто</div>
                  <div className="podium__meta muted">Нет данных</div>
                </div>
              </div>
            );
          }
          return (
            <div key={t.uid} className={`podium__item glass ${idx===0?"first":""}`}>
              <div className="podium__inner" style={{display:"flex", gap:12, alignItems:"center"}}>
                <div className="podiumAvatar">
                  {t.avatarUrl
                    ? <img src={t.avatarUrl} alt="" />
                    : <span style={{fontWeight:900}}>{(t.displayName||t.email||"?").slice(0,1).toUpperCase()}</span>}
                </div>
                <div style={{minWidth:0}}>
                  <div className="podium__rank">#{idx+1} · {trend.get(t.uid)}</div>
                  <div className="podium__name">{t.displayName || t.email}</div>
                  <div className="podium__meta">{t.school || "—"} · {t.subject || "—"}</div>
                </div>
                <div style={{marginLeft:"auto", textAlign:"right"}}>
                  <div className="podium__points">{fmtPoints(t.totalPoints)}</div>
                  <div className="tiny muted">pts</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sep"></div>

      <div className="h2">Топ-100</div>
      <div className="ratinglist" style={{marginTop:10}}>
        {rest.map((t, i) => (
          <div key={t.uid} className="ratingrow">
            <div className="ratingrank">{i+4}</div>
            <Avatar user={t} />
            <div className="ratingmeta">
              <div className="ratingname">{t.displayName || "Без имени"}</div>
              <div className="ratingsub">{t.school || "—"} · {t.subject || "—"} · {t.email}</div>
            </div>
            <div className="ratingpts">{fmtPoints(t.totalPoints)}</div>
            <div className="ratingtrend">{trend.get(t.uid)}</div>
          </div>
        ))}
        {!sorted.length && (
          <div className="ratingrow"><div className="muted tiny">Нет данных</div></div>
        )}
      </div>
    </div>
  );
}




function PageStats(){
  const st = useStore();
  const u = st.userDoc;
  if (!u) return <Guard/>;
  if (!canAccess("stats", u)) return <Guard/>;

  const mode = st.statsRangeMode;
  const days = mode==="365d" ? 365 : 14;

  // keep UI responsive: 14d -> daily, 365d -> monthly
  const startYMD = startYMDFromDays(days);
  const dayBins = lastDays(14);
  const monthBins = lastMonths(12);
  const bins = mode==="365d" ? monthBins : dayBins;

  const rangeDays = new Set(dayBins.map(x=>x.ymd));
  const rangeMonths = new Set(monthBins.map(x=>x.key));

  const inRange = (s) => {
    if (!s?.eventDate) return false;
    if (mode==="365d"){
      const mk = (s.eventDate||"").slice(0,7);
      return s.eventDate >= startYMD && rangeMonths.has(mk);
    }
    return rangeDays.has(s.eventDate);
  };

  const seriesPoints = (approved, bin) => {
    if (mode==="365d"){
      return sum(approved.filter(s => (s.eventDate||"").slice(0,7)===bin.key), s=>s.points);
    }
    return sum(approved.filter(s => s.eventDate===bin.ymd), s=>s.points);
  };

  if (u.role === "teacher"){
    const subs = st.mySubmissions.filter(inRange);
    const approved = subs.filter(s=>s.status==="approved");
    const pending = subs.filter(s=>s.status==="pending");
    const rejected = subs.filter(s=>s.status==="rejected");

    const totalPts = sum(approved, s=>s.points);
    const bySeries = bins.map(b => seriesPoints(approved, b));

    const typeMap = new Map();
    approved.forEach(s=>{
      const key = s.typeName || "—";
      typeMap.set(key, (typeMap.get(key)||0) + (Number(s.points)||0));
    });
    const topType = Array.from(typeMap.entries()).sort((a,b)=>b[1]-a[1]).slice(0,12);

    return (
      <div className="glass card">
        <div className="h1">Моя статистика</div>
        <p className="p">Диапазон: <b>{mode==="365d"?"год":"14 дней"}</b>.</p>

        <div style={{display:"flex", gap:10, flexWrap:"wrap", marginTop:10}}>
          <Btn kind={mode==="14d"?"primary":""} onClick={()=>setState({statsRangeMode:"14d"})}>14 дней</Btn>
          <Btn kind={mode==="365d"?"primary":""} onClick={()=>setState({statsRangeMode:"365d"})}>Год</Btn>
          <Btn onClick={()=>navigate("add")}>Добавить KPI</Btn>
        </div>

        <div className="sep"></div>

        <div className="grid3">
          <div className="kpi"><div><div className="muted tiny">Одобрено (баллы)</div><b>{fmtPoints(totalPts)}</b></div><Pill kind="approved">approved</Pill></div>
          <div className="kpi"><div><div className="muted tiny">Pending</div><b>{fmtPoints(pending.length)}</b></div><Pill kind="pending">pending</Pill></div>
          <div className="kpi"><div><div className="muted tiny">Rejected</div><b>{fmtPoints(rejected.length)}</b></div><Pill kind="rejected">rejected</Pill></div>
        </div>

        <div className="sep"></div>

        <div className="grid2">
          <div className="glass card">
            <div className="h2">Баллы по {mode==="365d"?"месяцам":"дням"}</div>
            <div className="sep"></div>
            <BarChart values={bySeries} labels={bins.map(x=>x.label)} />
          </div>

          <div className="glass card">
            <div className="h2">Баллы по типам (топ-12)</div>
            <div className="sep"></div>
            {topType.length ? (
              <BarChart values={topType.map(x=>x[1])} labels={topType.map(x=>x[0].slice(0,10)+"…")} />
            ) : (
              <p className="p">Нет одобренных KPI в диапазоне.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // admin
  const subs = st.adminRecentSubs.filter(inRange);
  const approved = subs.filter(s=>s.status==="approved");
  const pending = subs.filter(s=>s.status==="pending");
  const rejected = subs.filter(s=>s.status==="rejected");

  const teachers = st.users.filter(x => (x.role||"teacher") !== "admin");

  const totalApprovedPts = sum(approved, s=>s.points);
  const bySeries = bins.map(b => seriesPoints(approved, b));

  const pointsByTeacher = new Map();
  approved.forEach(s=>{
    pointsByTeacher.set(s.uid, (pointsByTeacher.get(s.uid)||0) + (Number(s.points)||0));
  });
  const topTeachers = Array.from(pointsByTeacher.entries())
    .map(([uid,pts])=>({uid,pts, user: teachers.find(t=>t.uid===uid)}))
    .sort((a,b)=>b.pts-a.pts).slice(0,10);

  const typeMap = new Map();
  approved.forEach(s=>typeMap.set(s.typeName||"—", (typeMap.get(s.typeName||"—")||0) + (Number(s.points)||0)));
  const topType = Array.from(typeMap.entries()).sort((a,b)=>b[1]-a[1]).slice(0,12);

  // heatmap (top teachers x bins)
  const hmTeachers = topTeachers.map(x=>x.user).filter(Boolean).slice(0,10);
  const maxCell = Math.max(1, ...hmTeachers.map(t => Math.max(0, ...bins.map(b => {
    const v = mode==="365d"
      ? sum(approved.filter(s=>s.uid===t.uid && (s.eventDate||"").slice(0,7)===b.key), s=>s.points)
      : sum(approved.filter(s=>s.uid===t.uid && s.eventDate===b.ymd), s=>s.points);
    return v;
  }))));

  const cellStyle = (v) => {
    if (!v) return { background:"rgba(255,255,255,0.06)" };
    const t = Math.min(1, v / maxCell);
    if (t < 0.34) return { background:"rgba(255, 99, 132, 0.42)" };  // red-ish
    if (t < 0.67) return { background:"rgba(255, 200, 87, 0.48)" };  // yellow-ish
    return { background:"rgba(82, 214, 140, 0.50)" }; // green-ish
  };

  return (
    <div className="glass card">
      <div className="h1">Статистика платформы</div>
      <p className="p">Админ-обзор. Диапазон: <b>{mode==="365d"?"год":"14 дней"}</b>. (Для «Год» графики агрегируются по месяцам — адаптивность не ломается.)</p>

      <div style={{display:"flex", gap:10, flexWrap:"wrap", marginTop:10}}>
        <Btn kind={mode==="14d"?"primary":""} onClick={()=>setState({statsRangeMode:"14d"})}>14 дней</Btn>
        <Btn kind={mode==="365d"?"primary":""} onClick={()=>setState({statsRangeMode:"365d"})}>Год</Btn>
        <Btn onClick={()=>navigate("admin/approvals")}>Approvals</Btn>
      </div>

      <div className="sep"></div>

      <div className="grid4">
        <div className="kpi"><div><div className="muted tiny">Teachers</div><b>{teachers.length}</b></div><Pill kind="approved">users</Pill></div>
        <div className="kpi"><div><div className="muted tiny">Submissions</div><b>{subs.length}</b></div><Pill kind="pending">range</Pill></div>
        <div className="kpi"><div><div className="muted tiny">Pending</div><b>{pending.length}</b></div><Pill kind="pending">pending</Pill></div>
        <div className="kpi"><div><div className="muted tiny">Approved pts</div><b>{fmtPoints(totalApprovedPts)}</b></div><Pill kind="approved">points</Pill></div>
      </div>

      <div className="sep"></div>

      <div className="grid2">
        <div className="glass card">
          <div className="h2">Топ-10 учителей</div>
          <div className="sep"></div>
          {topTeachers.length ? (
            <BarChart values={topTeachers.map(x=>x.pts)} labels={topTeachers.map(x=>(x.user?.displayName||x.user?.email||"—").slice(0,10)+"…")} />
          ) : <p className="p">Нет данных</p>}
        </div>

        <div className="glass card">
          <div className="h2">Баллы по типам</div>
          <div className="sep"></div>
          {topType.length ? (
            <BarChart values={topType.map(x=>x[1])} labels={topType.map(x=>x[0].slice(0,10)+"…")} />
          ) : <p className="p">Нет данных</p>}
        </div>

        <div className="glass card">
          <div className="h2">Баллы по {mode==="365d"?"месяцам":"дням"}</div>
          <div className="sep"></div>
          <BarChart values={bySeries} labels={bins.map(x=>x.label)} />
        </div>

        <div className="glass card">
          <div className="h2">Статусы</div>
          <div className="sep"></div>
          <BarChart values={[approved.length,pending.length,rejected.length]} labels={["approved","pending","rejected"]} />
        </div>
      </div>

      <div className="sep"></div>

      <div className="glass card">
        <div className="h2">Тепловая карта: teacher × {mode==="365d"?"месяц":"день"}</div>
        <p className="p">Показывает <b>одобренные</b> баллы. Для компактности — только топ-10 по баллам за выбранный диапазон.</p>
        <div className="sep"></div>

        <div className="heatwrap">
          <table className="table">
            <thead>
              <tr>
                <th>Teacher</th>
                {bins.map(b => <th key={mode==="365d"?b.key:b.ymd}>{b.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {hmTeachers.map(t => (
                <tr key={t.uid}>
                  <td className="tiny"><b>{t.displayName || t.email || "—"}</b></td>
                  {bins.map(b => {
                    const v = mode==="365d"
                      ? sum(approved.filter(s=>s.uid===t.uid && (s.eventDate||"").slice(0,7)===b.key), s=>s.points)
                      : sum(approved.filter(s=>s.uid===t.uid && s.eventDate===b.ymd), s=>s.points);
                    return (
                      <td key={mode==="365d"?b.key:b.ymd} className="tiny" style={cellStyle(v)} title={`${b.label}: ${v}`}>
                        {v ? fmtPoints(v) : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!hmTeachers.length && <tr><td colSpan={bins.length+1} className="tiny muted">Нет данных</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}



function PageAdminApprovals(){
  const st = useStore();
  const u = st.userDoc;
  if (!u) return <Guard/>;
  if (u.role!=="admin") return <Guard/>;

  const pending = st.pendingSubmissions;
  const usersMap = new Map(st.users.map(x=>[x.uid,x]));

  async function decide(id, action){
    try{
      setState({ loading:true });
      if (action==="approve") await approveSubmission(id, u.uid);
      else await rejectSubmission(id, u.uid);

      toast(action==="approve"?"Одобрено":"Отклонено","ok");

      const [p, users] = await Promise.all([fetchPendingSubmissions(), fetchUsersAll()]);
      setState({ pendingSubmissions: p, users });
    }catch(e){
      console.error(e);
      toast(e?.message || "Ошибка","error");
    }finally{ setState({ loading:false }); }
  }

  return (
    <div className="glass card">
      <div className="h1">Approvals</div>
      <p className="p">Pending-заявки. Approve добавляет баллы в totalPoints.</p>
      <div className="sep"></div>

      <div className="heatwrap">
        <table className="table">
          <thead><tr><th>Учитель</th><th>Тип / Title</th><th>Дата</th><th>Баллы</th><th>Evidence</th><th>Действия</th></tr></thead>
          <tbody>
            {pending.map(s=>{
              const tu = usersMap.get(s.uid);
              return (
                <tr key={s.id}>
                  <td className="tiny"><b>{tu?.displayName || "—"}</b><div className="muted tiny">{tu?.email || s.uid}</div></td>
                  <td className="tiny"><div><b>{s.typeName}</b></div><div className="muted tiny">{s.title}</div>{s.description?<div className="muted tiny" style={{marginTop:4}}>{s.description}</div>:null}</td>
                  <td className="tiny">{s.eventDate}</td>
                  <td className="tiny"><b>{fmtPoints(s.points)}</b></td>
                  <td className="tiny">
                    <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                      {s.evidenceLink ? <a className="btn" href={s.evidenceLink} target="_blank" rel="noreferrer">Ссылка</a> : null}
                      {s.evidenceFileUrl ? <a className="btn" href={s.evidenceFileUrl} target="_blank" rel="noreferrer">Файл</a> : null}
                      {!s.evidenceLink && !s.evidenceFileUrl ? <span className="muted tiny">—</span> : null}
                    </div>
                  </td>
                  <td className="tiny">
                    <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
                      <Btn kind="ok" onClick={()=>decide(s.id,"approve")} disabled={st.loading}><Icon name="check"/> Approve</Btn>
                      <Btn kind="danger" onClick={()=>decide(s.id,"reject")} disabled={st.loading}><Icon name="x"/> Reject</Btn>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!pending.length && <tr><td colSpan="6" className="tiny muted">Нет заявок на проверке</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PageAdminTypes(){
  const st = useStore();
  const u = st.userDoc;
  if (!u) return <Guard/>;
  if (u.role!=="admin") return <Guard/>;

  const [form,setForm] = useState({ section:"", subsection:"", name:"", defaultPoints:5 });

  async function refresh(){
    const t = await fetchTypesAll();
    setState({ types:t });
  }
  async function seed(){
    try{
      setState({ loading:true });
      const r = await seedDefaultTypes();
      toast(r.added ? `Добавлено: ${r.added}` : "Ничего не добавлено", "ok");
      await refresh();
    }catch(e){
      console.error(e);
      toast(e?.message || e?.code || "Ошибка seed", "error");
    }finally{ setState({ loading:false }); }
  }
  async function add(){
    try{
      if (!safeText(form.section) || !safeText(form.subsection) || !safeText(form.name)){
        toast("Заполните section/subsection/name","error"); return;
      }
      setState({ loading:true });
      await addType(form);
      toast("Тип добавлен","ok");
      setForm({ section:"", subsection:"", name:"", defaultPoints:5 });
      await refresh();
    }catch(e){
      console.error(e);
      toast(e?.message || "Ошибка","error");
    }finally{ setState({ loading:false }); }
  }
  async function toggle(id, active){
    try{
      await toggleType(id, active);
      toast("Обновлено","ok");
      await refresh();
    }catch(e){
      console.error(e);
      toast(e?.message || "Ошибка","error");
    }
  }

  return (
    <div className="grid2">
      <div className="glass card">
        <div className="h1">Types</div>
        <p className="p">Список KPI-типов. Active управляет доступностью для учителей.</p>
        <div style={{display:"flex", gap:10, flexWrap:"wrap", marginTop:10}}>
          <Btn kind="primary" onClick={seed} disabled={st.loading}>Seed default types</Btn>
          <Btn onClick={refresh}>Обновить</Btn>
        </div>
        <div className="sep"></div>

        <div className="heatwrap">
          <table className="table">
            <thead><tr><th>Section</th><th>Subsection</th><th>Name</th><th>Points</th><th>Active</th></tr></thead>
            <tbody>
              {st.types.map(t=>(
                <tr key={t.id}>
                  <td className="tiny">{t.section}</td>
                  <td className="tiny">{t.subsection}</td>
                  <td className="tiny"><b>{t.name}</b></td>
                  <td className="tiny">{fmtPoints(t.defaultPoints)}</td>
                  <td className="tiny"><input type="checkbox" checked={!!t.active} onChange={(e)=>toggle(t.id, e.target.checked)} /></td>
                </tr>
              ))}
              {!st.types.length && <tr><td colSpan="5" className="tiny muted">Нет типов</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass card">
        <div className="h2">Добавить тип</div>
        <div className="sep"></div>
        <div className="label">Section</div>
        <Input value={form.section} onChange={(e)=>setForm(f=>({...f, section:e.target.value}))}/>
        <div className="label">Subsection</div>
        <Input value={form.subsection} onChange={(e)=>setForm(f=>({...f, subsection:e.target.value}))}/>
        <div className="label">Name</div>
        <Input value={form.name} onChange={(e)=>setForm(f=>({...f, name:e.target.value}))}/>
        <div className="label">Default Points</div>
        <Input type="number" min="0" max="9999" value={form.defaultPoints} onChange={(e)=>setForm(f=>({...f, defaultPoints:e.target.value}))}/>
        <div style={{display:"flex", gap:10, flexWrap:"wrap", marginTop:12}}>
          <Btn kind="primary" onClick={add} disabled={st.loading}>Добавить</Btn>
        </div>
      </div>
    </div>
  );
}

function PageAdminUsers(){
  const st = useStore();
  const u = st.userDoc;
  if (!u) return <Guard/>;
  if (u.role!=="admin") return <Guard/>;

  const [q,setQ] = useState("");
  const qn = q.trim().toLowerCase();

  const filtered = st.users.filter(x => {
    const hay = `${x.displayName||""} ${x.email||""} ${x.school||""} ${x.subject||""}`.toLowerCase();
    return hay.includes(qn);
  });

  async function setR(uid, role){
    try{
      setState({ loading:true });
      await setRole(uid, role);
      toast("Роль обновлена","ok");
      const users = await fetchUsersAll();
      setState({ users });
    }catch(e){
      console.error(e);
      toast(e?.message || "Ошибка","error");
    }finally{ setState({ loading:false }); }
  }

  return (
    <div className="glass card">
      <div className="h1">Users</div>
      <p className="p">Поиск и смена ролей. Можно открыть карточку учителя.</p>
      <div className="sep"></div>

      <div className="grid2">
        <div>
          <div className="label">Поиск</div>
          <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="ФИО / email / school / subject"/>
        </div>
        <div style={{display:"flex", alignItems:"flex-end", gap:10, flexWrap:"wrap"}}>
          <Btn onClick={async()=>{ const users = await fetchUsersAll(); setState({ users }); toast("Обновлено","ok"); }}>Обновить</Btn>
        </div>
      </div>

      <div className="sep"></div>

      <div className="heatwrap">
        <table className="table">
          <thead><tr><th>ФИО</th><th>Школа / Предмет</th><th>Email</th><th>Баллы</th><th>Роль</th><th>Действия</th></tr></thead>
          <tbody>
            {filtered.map(x=>(
              <tr key={x.uid}>
                <td className="tiny"><b>{x.displayName || "—"}</b></td>
                <td className="tiny">{x.school || "—"}<div className="muted tiny">{x.subject || "—"}</div></td>
                <td className="tiny">{x.email}</td>
                <td className="tiny"><b>{fmtPoints(x.totalPoints)}</b></td>
                <td className="tiny"><Pill kind={x.role==="admin"?"pending":"approved"}>{x.role}</Pill></td>
                <td className="tiny">
                  <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
                    <Btn onClick={()=>setR(x.uid,"teacher")} disabled={st.loading}>teacher</Btn>
                    <Btn onClick={()=>setR(x.uid,"admin")} disabled={st.loading}>admin</Btn>
                    <Btn kind="primary" onClick={()=>navigate("admin/teacher", { uid: (x.uid || x.id) })}>Профиль</Btn>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan="6" className="tiny muted">Нет результатов</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}


function PageAdminTeacher(){
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
    displayName:"",
    role:"teacher",
    school:"",
    subject:"",
    experienceYears:0,
    phone:"",
    city:"",
    position:"",
    avatarUrl:"",
    totalPoints:0
  });

  // Keep local teacherDoc in sync when list is already available
  useEffect(() => {
    if (!uid) return;
    if (teacherFromStore && (!teacherDoc || (teacherDoc.uid !== uid))){
      setTeacherDoc(teacherFromStore);
    }
  }, [uid, teacherFromStore?.uid]);

  // Load teacher profile directly (works even if st.users is empty)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!uid){
        if (alive){ setTeacherErr(null); setTeacherDoc(null); }
        return;
      }
      try{
        setTeacherErr(null);
        const snap = await getDoc(doc(db,"users",uid));
        if (!snap.exists()){
          throw new Error(`users/${uid} not found`);
        }
        const data = snap.data() || {};
        const t = { id: snap.id, ...data, uid: data.uid || snap.id };
        if (alive) setTeacherDoc(t);
      }catch(e){
        console.error(e);
        if (alive){
          setTeacherErr(e);
          // keep previous teacherDoc if any; but if none, stay null to show error state
          if (!teacherDoc) setTeacherDoc(null);
        }
      }
    })();
    return ()=>{ alive = false; };
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
      if (!uid){
        if (alive) setSubs([]);
        return;
      }
      try{
        setLoadingLocal(true);
        const qy = query(collection(db,"submissions"), where("uid","==",uid));
        const res = await getDocs(qy);
        const arr = res.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>tsKey(b)-tsKey(a));
        if (alive) setSubs(arr);
      }catch(e){
        console.error(e);
        toast(e?.message || "Не удалось загрузить заявки","error");
        if (alive) setSubs([]);
      }finally{
        if (alive) setLoadingLocal(false);
      }
    })();
    return ()=>{ alive=false; };
  }, [uid, reloadNonce]);

  // Access checks AFTER hooks
  if (!u) return <Guard/>;
  if (u.role!=="admin") return <Guard/>;

  if (!uid){
    return (
      <div className="glass card">
        <div className="h2">Учитель не выбран</div>
        <p className="p">Открой карточку из Users.</p>
        <div className="sep"></div>
        <Btn kind="primary" onClick={()=>navigate("admin/users")}>Перейти в Users</Btn>
      </div>
    );
  }

  if (!teacherDoc){
    return (
      <div className="glass card">
        <div className="h2">{teacherErr ? "Ошибка загрузки профиля" : "Загружаю профиль…"}</div>
        <p className="p">UID: <b>{uid}</b></p>
        <p className="tiny muted">Route: {st.route?.path} · me: {u.uid}</p>
        {teacherErr ? (
          <>
            <div className="sep"></div>
            <div className="tiny"><b>{String(teacherErr?.name||"Error")}</b>: {String(teacherErr?.message||teacherErr)}</div>
            <div className="help">Открой DevTools → Console, там будет stacktrace.</div>
            <div className="sep"></div>
            <Btn onClick={()=>setReloadNonce(x=>x+1)}>Повторить</Btn>
          </>
        ) : null}
      </div>
    );
  }

  const approved = subs.filter(s=>s.status==="approved");
  const pending = subs.filter(s=>s.status==="pending");
  const rejected = subs.filter(s=>s.status==="rejected");
  const approvedPts = sum(approved, s=>s.points);

  async function saveTeacher(){
    try{
      setState({ loading:true });
      await updateDoc(doc(db,"users",uid), {
        displayName: safeText(edit.displayName),
        role: edit.role==="admin" ? "admin" : "teacher",
        school: safeText(edit.school),
        subject: safeText(edit.subject),
        experienceYears: Number(edit.experienceYears)||0,
        phone: safeText(edit.phone),
        city: safeText(edit.city),
        position: safeText(edit.position),
        avatarUrl: safeText(edit.avatarUrl),
        totalPoints: Number(edit.totalPoints)||0
      });
      const users = await fetchUsersAll();
      setState({ users });
      toast("Сохранено","ok");
      setReloadNonce(x=>x+1);
    }catch(e){
      console.error(e);
      toast(e?.message || "Ошибка сохранения","error");
    }finally{
      setState({ loading:false });
    }
  }

  async function decide(id, action){
    try{
      setState({ loading:true });
      if (action==="approve") await approveSubmission(id, u.uid);
      else await rejectSubmission(id, u.uid);
      toast(action==="approve" ? "Одобрено" : "Отклонено", "ok");

      const users = await fetchUsersAll();
      setState({ users });
      setReloadNonce(x=>x+1);
    }catch(e){
      console.error(e);
      toast(e?.message || "Ошибка","error");
    }finally{
      setState({ loading:false });
    }
  }

  return (
    <div className="grid2">
      <div className="glass card">
        <div className="h1">Teacher detail</div>
        <p className="p">Полный просмотр и редактирование профиля учителя + управление его заявками.</p>

        <div className="sep"></div>

        <div className="kpi">
          <div style={{display:"flex", gap:12, alignItems:"center", minWidth:0}}>
            <div className="avatar">
              {edit.avatarUrl
                ? <img src={edit.avatarUrl} alt="avatar" />
                : <span style={{fontWeight:900}}>{(edit.displayName||teacherDoc?.email||uid).slice(0,1).toUpperCase()}</span>}
            </div>
            <div style={{minWidth:0}}>
              <div style={{fontWeight:900}}>{teacherDoc?.displayName || "—"}</div>
              <div className="muted tiny">{teacherDoc?.email || uid}</div>
            </div>
          </div>
          <Btn onClick={()=>navigate("admin/users")}>Назад</Btn>
        </div>

        <div className="sep"></div>

        <div className="grid3">
          <div className="kpi"><div><div className="muted tiny">users.totalPoints</div><b>{fmtPoints(teacherDoc?.totalPoints||0)}</b></div><Pill kind="approved">total</Pill></div>
          <div className="kpi"><div><div className="muted tiny">Approved sum</div><b>{fmtPoints(approvedPts)}</b></div><Pill kind="approved">approved</Pill></div>
          <div className="kpi"><div><div className="muted tiny">Pending</div><b>{fmtPoints(pending.length)}</b></div><Pill kind="pending">pending</Pill></div>
        </div>

        <div className="sep"></div>

        <div className="h2">Редактирование</div>
        <div className="grid2">
          <div>
            <div className="label">ФИО</div>
            <Input value={edit.displayName} onChange={(e)=>setEdit(v=>({...v, displayName:e.target.value}))} />
          </div>
          <div>
            <div className="label">Роль</div>
            <Select value={edit.role} onChange={(e)=>setEdit(v=>({...v, role:e.target.value}))}>
              <option value="teacher">teacher</option>
              <option value="admin">admin</option>
            </Select>
          </div>

          <div>
            <div className="label">Школа</div>
            <Input value={edit.school} onChange={(e)=>setEdit(v=>({...v, school:e.target.value}))} />
          </div>
          <div>
            <div className="label">Предмет</div>
            <Input value={edit.subject} onChange={(e)=>setEdit(v=>({...v, subject:e.target.value}))} />
          </div>

          <div>
            <div className="label">Стаж (лет)</div>
            <Input type="number" min="0" max="80" value={edit.experienceYears} onChange={(e)=>setEdit(v=>({...v, experienceYears:e.target.value}))} />
          </div>
          <div>
            <div className="label">Телефон</div>
            <Input value={edit.phone} onChange={(e)=>setEdit(v=>({...v, phone:e.target.value}))} />
          </div>

          <div>
            <div className="label">Город</div>
            <Input value={edit.city} onChange={(e)=>setEdit(v=>({...v, city:e.target.value}))} />
          </div>
          <div>
            <div className="label">Должность</div>
            <Input value={edit.position} onChange={(e)=>setEdit(v=>({...v, position:e.target.value}))} />
          </div>

          <div style={{gridColumn:"1/-1"}}>
            <div className="label">Avatar URL</div>
            <Input value={edit.avatarUrl} onChange={(e)=>setEdit(v=>({...v, avatarUrl:e.target.value}))} placeholder="https://..." />
            <div className="help">Админ может вставить URL вручную. (Upload в Storage — у владельца аккаунта.)</div>
          </div>

          <div>
            <div className="label">Total Points</div>
            <Input type="number" min="0" max="9999999" value={edit.totalPoints} onChange={(e)=>setEdit(v=>({...v, totalPoints:e.target.value}))} />
          </div>
          <div />
        </div>

        <div style={{display:"flex", gap:10, flexWrap:"wrap", marginTop:12}}>
          <Btn kind="primary" onClick={saveTeacher} disabled={st.loading}>Сохранить</Btn>
          <Btn onClick={()=>setEdit(v=>({...v, avatarUrl:""}))}>Очистить аватар</Btn>
          <Btn onClick={()=>setReloadNonce(x=>x+1)}>Обновить</Btn>
        </div>

        {loadingLocal && <div className="sep"></div>}
        {loadingLocal && <p className="p">Загрузка заявок…</p>}
      </div>

      <div className="glass card">
        <div className="h2">Заявки учителя</div>
        <div className="sep"></div>

        <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
          <Pill kind="approved">approved: {approved.length}</Pill>
          <Pill kind="pending">pending: {pending.length}</Pill>
          <Pill kind="rejected">rejected: {rejected.length}</Pill>
        </div>

        <div className="sep"></div>

        <div className="heatwrap">
          <table className="table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Тип</th>
                <th>Title</th>
                <th>Pts</th>
                <th>Status</th>
                <th>Evidence</th>
                <th>Действие</th>
              </tr>
            </thead>
            <tbody>
              {subs.map(s => (
                <tr key={s.id}>
                  <td className="tiny">{s.eventDate}</td>
                  <td className="tiny">{s.typeName}</td>
                  <td className="tiny">
                    <b>{s.title}</b>
                    {s.description ? <div className="muted tiny">{s.description}</div> : null}
                  </td>
                  <td className="tiny"><b>{fmtPoints(s.points)}</b></td>
                  <td className="tiny"><Pill kind={s.status}>{s.status}</Pill></td>
                  <td className="tiny">
                    <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                      {s.evidenceLink ? <a className="btn" href={s.evidenceLink} target="_blank" rel="noreferrer">Ссылка</a> : null}
                      {s.evidenceFileUrl ? <a className="btn" href={s.evidenceFileUrl} target="_blank" rel="noreferrer">Файл</a> : null}
                      {!s.evidenceLink && !s.evidenceFileUrl ? <span className="muted tiny">—</span> : null}
                    </div>
                  </td>
                  <td className="tiny">
                    {s.status==="pending" ? (
                      <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                        <Btn kind="ok" onClick={()=>decide(s.id,"approve")} disabled={st.loading}><Icon name="check"/> Approve</Btn>
                        <Btn kind="danger" onClick={()=>decide(s.id,"reject")} disabled={st.loading}><Icon name="x"/> Reject</Btn>
                      </div>
                    ) : <span className="muted tiny">—</span>}
                  </td>
                </tr>
              ))}
              {!subs.length && <tr><td colSpan="7" className="tiny muted">Нет заявок</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


async function hydrateForUser(userDoc){
  if (!userDoc) return;
  try{
    if (userDoc.role==="admin"){
      const [types, users, pend, recent] = await Promise.all([
        fetchTypesAll(),
        fetchUsersAll(),
        fetchPendingSubmissions(),
        fetchAdminRecentSubs()
      ]);
      setState({ types, users, pendingSubmissions: pend, adminRecentSubs: recent, mySubmissions: [] });
    }else{
      const [types, my] = await Promise.all([fetchTypesActive(), fetchMySubmissions(userDoc.uid)]);
      setState({ types, mySubmissions: my, users: [], pendingSubmissions: [], adminRecentSubs: [] });
    }
  }catch(e){
    console.error(e);
    toast(e?.message || "Ошибка загрузки данных","error");
  }
}

async function bootstrap(){
  setupMobileDrawer();
  window.addEventListener("hashchange", () => render().catch(console.error));

  // Needed for signInWithRedirect flows (including Microsoft on mobile)
  try{
    await getRedirectResult(auth);
  }catch(e){
    console.error(e);
    toast(e?.message || "Ошибка входа через Microsoft","error");
  }

  onAuthStateChanged(auth, async (user) => {
    try{
      setState({ booting:true, authUser: user || null });

      if (!user){
        setState({
          userDoc:null,
          types:[],
          users:[],
          mySubmissions:[],
          pendingSubmissions:[],
          adminRecentSubs:[]
        });
        setState({ booting:false });
        render();
        return;
      }

      const userDoc = await ensureUserDoc(user.uid, user.email || "");
      setState({ userDoc });
      await hydrateForUser(userDoc);

      setState({ booting:false });
      render();
    }catch(e){
      console.error(e);
      toast(e?.message || "Ошибка инициализации","error");
      setState({ booting:false });
      render();
    }
  });

  
// v11: ensure default hash route
try{ if(!location.hash || location.hash==="#" || location.hash==="#/"){ location.hash="#/login"; } }catch(e){}
render();
}

bootstrap().catch(console.error);

// debug
window.__KPI__ = { auth, db, storage, store, navigate };
