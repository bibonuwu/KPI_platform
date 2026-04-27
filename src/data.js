import React from "react";
import { t } from "./i18n.js";
import {
  auth, db, storage,
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, getDocs,
  query, where, orderBy, limit, serverTimestamp, runTransaction, increment, arrayUnion, arrayRemove,
  ref, uploadBytes, getDownloadURL
} from "./firebase-config.js";
import { store, setState } from "./store.js";
import { safeText, tsKey, ymd, dateRangeDays, REQUEST_KINDS } from "./utils.js";
import { NEWS_CATEGORIES } from "./constants.js";

export function renderRichDesc(text) {
  if (!text) return null;
  const parts = [];
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)/g;
  let last = 0;
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(React.createElement("strong", { key: m.index }, m[2]));
    else if (m[3]) parts.push(React.createElement("em", { key: m.index }, m[4]));
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function newsCatLabel(key) {
  const c = NEWS_CATEGORIES.find(x => x.key === key);
  return c ? t(c.tKey) : key;
}

export async function ensureUserDoc(uid, email) {
  const refU = doc(db, "users", uid);
  const snap = await getDoc(refU);
  if (snap.exists()) {
    const data = snap.data() || {};
    const patch = {};
    if (!data.uid) patch.uid = uid;
    if (typeof data.compDays !== "number") patch.compDays = 0;
    if (Object.keys(patch).length) {
      try { await setDoc(refU, patch, { merge: true }); } catch (e) { }
    }
    return { id: snap.id, ...data, ...patch, uid: (data.uid || patch.uid || snap.id) };
  }
  // Check preUsers for pre-populated name/position
  let preDisplayName = "";
  let prePosition = "";
  if (email) {
    try {
      const preSnap = await getDoc(doc(db, "preUsers", email.toLowerCase()));
      if (preSnap.exists()) {
        preDisplayName = preSnap.data().displayName || "";
        prePosition = preSnap.data().position || "";
      }
    } catch (_) { }
  }

  const base = {
    uid, email: email || "",
    displayName: preDisplayName,
    role: "teacher",
    school: "",
    subject: "",
    experienceYears: 0,
    phone: "",
    city: "",
    position: prePosition,
    avatarUrl: "",
    totalPoints: 0,
    compDays: 0,
    createdAt: serverTimestamp()
  };
  await setDoc(refU, base, { merge: true });
  const snap2 = await getDoc(refU);
  const data2 = snap2.data() || {}; return { id: snap2.id, ...data2, uid: data2.uid || snap2.id };
}

export async function hasAnyAdmin() {
  const qy = query(collection(db, "users"), where("role", "==", "admin"), limit(1));
  const res = await getDocs(qy);
  return res.docs.length > 0;
}

export async function fetchTypesAll() {
  const res = await getDocs(collection(db, "types"));
  const arr = res.docs.map(d => ({ id: d.id, ...d.data() }));
  arr.sort((a, b) => {
    const s = (a.section || "").localeCompare(b.section || "", "ru"); if (s) return s;
    const ss = (a.subsection || "").localeCompare(b.subsection || "", "ru"); if (ss) return ss;
    return (a.name || "").localeCompare(b.name || "", "ru");
  });
  return arr;
}
export async function fetchTypesActive() {
  const all = await fetchTypesAll();
  return all.filter(t => t.active);
}
export async function seedDefaultTypes() {
  const existing = await fetchTypesAll();
  const key = (t) => `${(t.section || "").toLowerCase()}||${(t.subsection || "").toLowerCase()}||${(t.name || "").toLowerCase()}`;
  const have = new Set(existing.map(key));
  const missing = DEFAULT_TYPES.filter(t => !have.has(key(t)));
  for (const t of missing) await addDoc(collection(db, "types"), t);
  return { added: missing.length };
}
export async function addType(p) {
  await addDoc(collection(db, "types"), {
    section: safeText(p.section),
    subsection: safeText(p.subsection),
    name: safeText(p.name),
    defaultPoints: Number(p.defaultPoints) || 0,
    active: true
  });
}
export async function toggleType(id, active) {
  await updateDoc(doc(db, "types", id), { active: !!active });
}
export async function deleteTypeDoc(id) {
  await deleteDoc(doc(db, "types", id));
}
export async function updateType(id, data) {
  await updateDoc(doc(db, "types", id), data);
}

export async function fetchUsersAll() {
  const qy = query(collection(db, "users"), orderBy("totalPoints", "desc"), limit(2000));
  const res = await getDocs(qy);
  return res.docs.map(d => {
    const data = d.data() || {};
    return { id: d.id, ...data, uid: data.uid || d.id };
  });
}


// avoid where+orderBy composite indexes (sort client-side)
export async function fetchMySubmissions(uid) {
  const qy = query(collection(db, "submissions"), where("uid", "==", uid));
  const res = await getDocs(qy);
  const arr = res.docs.map(d => ({ id: d.id, ...d.data() }));
  arr.sort((a, b) => tsKey(b) - tsKey(a));
  return arr;
}
export async function fetchPendingSubmissions() {
  const qy = query(collection(db, "submissions"), where("status", "==", "pending"));
  const res = await getDocs(qy);
  const arr = res.docs.map(d => ({ id: d.id, ...d.data() }));
  arr.sort((a, b) => tsKey(b) - tsKey(a));
  return arr;
}
export async function fetchAdminRecentSubs() {
  const qy = query(collection(db, "submissions"), orderBy("createdAt", "desc"), limit(5000));
  const res = await getDocs(qy);
  return res.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createSubmission({ uid, type, title, description, eventDate, evidenceLink, evidenceFileUrl, teammates }) {
  const cleanTeammates = Array.isArray(teammates)
    ? [...new Set(teammates.filter(x => x && x !== uid))]
    : [];
  await addDoc(collection(db, "submissions"), {
    uid,
    typeId: type.id,
    typeName: type.name,
    typeSection: type.section,
    typeSubsection: type.subsection,
    points: Number(type.defaultPoints) || 0,
    title: safeText(title),
    description: safeText(description),
    eventDate: safeText(eventDate),
    evidenceLink: safeText(evidenceLink),
    evidenceFileUrl: safeText(evidenceFileUrl),
    teammates: cleanTeammates,
    status: "pending",
    createdAt: serverTimestamp()
  });
}
export async function approveSubmission(subId, adminUid) {
  const sRef = doc(db, "submissions", subId);
  await runTransaction(db, async (tx) => {
    const sSnap = await tx.get(sRef);
    if (!sSnap.exists()) throw new Error("Заявка не найдена");
    const s = sSnap.data();
    if (s.status !== "pending") return;
    const pts = Number(s.points) || 0;
    const mates = Array.isArray(s.teammates) ? s.teammates.filter(x => x && x !== s.uid) : [];
    const recipients = [s.uid, ...mates];
    tx.update(sRef, { status: "approved", decidedAt: serverTimestamp(), decidedBy: adminUid });
    for (const rUid of recipients) {
      tx.update(doc(db, "users", rUid), { totalPoints: increment(pts) });
    }
  });
}
export async function rejectSubmission(subId, adminUid) {
  await updateDoc(doc(db, "submissions", subId), { status: "rejected", decidedAt: serverTimestamp(), decidedBy: adminUid });
}

/** ---------- teacher statements / requests ---------- */

export async function fetchMyRequests(uid) {
  const qy = query(collection(db, "requests"), where("uid", "==", uid));
  const res = await getDocs(qy);
  const arr = res.docs.map(d => ({ id: d.id, ...d.data() }));
  arr.sort((a, b) => tsKey(b) - tsKey(a));
  return arr;
}
export async function fetchPendingRequests() {
  const qy = query(collection(db, "requests"), where("status", "==", "pending"));
  const res = await getDocs(qy);
  const arr = res.docs.map(d => ({ id: d.id, ...d.data() }));
  arr.sort((a, b) => tsKey(b) - tsKey(a));
  return arr;
}
export async function fetchAdminRecentRequests() {
  const qy = query(collection(db, "requests"), orderBy("createdAt", "desc"), limit(5000));
  const res = await getDocs(qy);
  return res.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function clearRequestHistory() {
  const qy = query(collection(db, "requests"), where("status", "!=", "pending"));
  const res = await getDocs(qy);
  await Promise.all(res.docs.map(d => deleteDoc(d.ref)));
}

export async function createTeacherRequest({ uid, kind, dateFrom, dateTo, note, evidenceFileUrl, timeFrom, timeTo }) {
  const k = REQUEST_KINDS.find(x => x.key === kind) || REQUEST_KINDS[0];
  const from = safeText(dateFrom);
  const to = safeText(dateTo) || from;
  const days = dateRangeDays(from, to);
  const doc = {
    uid,
    kind: k.key,
    kindLabel: t(k.tKey),
    compMode: k.compMode,
    dateFrom: from,
    dateTo: to,
    days,
    note: safeText(note),
    evidenceFileUrl: safeText(evidenceFileUrl),
    status: "pending",
    pointsDelta: 0,
    compDaysDelta: 0,
    createdAt: serverTimestamp()
  };
  if (timeFrom) doc.timeFrom = safeText(timeFrom);
  if (timeTo) doc.timeTo = safeText(timeTo);
  await addDoc(collection(db, "requests"), doc);
}

/* -------- Online presence -------- */
export async function setUserOnline(uid, isOnline) {
  try {
    await updateDoc(doc(db, "users", uid), {
      online: isOnline,
      lastSeen: serverTimestamp()
    });
  } catch (e) {
    console.warn("Presence update failed:", e);
  }
}

/* -------- Delete user + their data -------- */
export async function deleteUserAndData(uid) {
  const [subs, reqs, docs] = await Promise.all([
    getDocs(query(collection(db, "submissions"), where("uid", "==", uid))),
    getDocs(query(collection(db, "requests"), where("uid", "==", uid))),
    getDocs(query(collection(db, "documents"), where("toUid", "==", uid)))
  ]);
  await Promise.all([
    ...subs.docs.map(d => deleteDoc(d.ref)),
    ...reqs.docs.map(d => deleteDoc(d.ref)),
    ...docs.docs.map(d => deleteDoc(d.ref)),
    deleteDoc(doc(db, "users", uid))
  ]);
}

/* -------- Documents (admin → teacher) -------- */
export async function createDocument({ fromUid, toUid, toEmail, toName, title, body, requireSignature }) {
  await addDoc(collection(db, "documents"), {
    fromUid,
    toUid,
    toEmail: safeText(toEmail),
    toName: safeText(toName),
    title: safeText(title),
    body: safeText(body),
    requireSignature: !!requireSignature,
    status: "sent",
    signatureUrl: null,
    signedAt: null,
    createdAt: serverTimestamp()
  });
}
export async function fetchDocumentsForTeacher(uid) {
  const qy = query(collection(db, "documents"), where("toUid", "==", uid));
  const res = await getDocs(qy);
  const arr = res.docs.map(d => ({ id: d.id, ...d.data() }));
  arr.sort((a, b) => tsKey(b) - tsKey(a));
  return arr;
}
export async function fetchAllDocuments() {
  const qy = query(collection(db, "documents"), orderBy("createdAt", "desc"), limit(5000));
  const res = await getDocs(qy);
  return res.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function signDocument(docId, sigUrl) {
  await updateDoc(doc(db, "documents", docId), {
    status: "signed",
    signatureUrl: safeText(sigUrl),
    signedAt: serverTimestamp()
  });
}
export async function markDocumentViewed(docId) {
  await updateDoc(doc(db, "documents", docId), { status: "viewed" });
}

// ---- teacher personal documents (teacher_documents collection) ----
export async function fetchMyTeacherDocs(uid) {
  const qy = query(collection(db, "teacher_documents"), where("uid", "==", uid), orderBy("createdAt", "desc"));
  const res = await getDocs(qy);
  return res.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function createMyTeacherDoc({ uid, title, description, fileUrl, fileName }) {
  await addDoc(collection(db, "teacher_documents"), {
    uid,
    title: safeText(title),
    description: safeText(description),
    fileUrl: safeText(fileUrl),
    fileName: safeText(fileName),
    createdAt: serverTimestamp()
  });
}
export async function uploadTeacherDocFile(uid, file) {
  const ts = Date.now();
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  return uploadFile(`teacher_documents/${uid}/${ts}_${safeName}`, file);
}

export async function decideTeacherRequest(reqId, adminUid, action, pointsDelta) {
  const rRef = doc(db, "requests", reqId);
  await runTransaction(db, async (tx) => {
    const rSnap = await tx.get(rRef);
    if (!rSnap.exists()) throw new Error("Заявление не найдено");
    const r = rSnap.data() || {};
    if (r.status !== "pending") return;

    const uRef = doc(db, "users", r.uid);
    const uSnap = await tx.get(uRef);
    if (!uSnap.exists()) throw new Error("Пользователь не найден");
    const u = uSnap.data() || {};

    const aRef = doc(db, "users", adminUid);
    const aSnap = await tx.get(aRef);
    const admin = aSnap.exists() ? (aSnap.data() || {}) : {};
    const adminSigUrl = safeText(admin.signatureUrl || "");
    const adminName = safeText(admin.displayName || admin.email || "");

    if (action === "reject") {
      tx.update(rRef, {
        status: "rejected",
        decidedAt: serverTimestamp(),
        decidedBy: adminUid,
        decidedByName: adminName,
        adminSignatureUrl: adminSigUrl,
        pointsDelta: 0,
        compDaysDelta: 0
      });
      return;
    }

    const deltaPts = Number(pointsDelta) || 0;
    const days = Number(r.days) || dateRangeDays(r.dateFrom, r.dateTo);
    const mode = r.compMode || "none";
    const compDelta = mode === "earn" ? days : mode === "use" ? -days : 0;

    tx.update(rRef, {
      status: "approved",
      decidedAt: serverTimestamp(),
      decidedBy: adminUid,
      decidedByName: adminName,
      adminSignatureUrl: adminSigUrl,
      pointsDelta: deltaPts,
      compDaysDelta: compDelta
    });
    const patch = {};
    if (deltaPts) patch.totalPoints = increment(deltaPts);
    if (compDelta) patch.compDays = increment(compDelta);
    if (Object.keys(patch).length) tx.update(uRef, patch);
  });
}

export async function setRole(uid, role) {
  await updateDoc(doc(db, "users", uid), { role });
}
export async function setPosition(uid, position) {
  await updateDoc(doc(db, "users", uid), { position });
}
export async function logAdminAction({ action, targetUid, targetName, details }) {
  try {
    const u = store.state.userDoc;
    await addDoc(collection(db, "admin_logs"), {
      action,
      targetUid: targetUid || "",
      targetName: targetName || "",
      details: details || "",
      adminUid: u?.uid || "",
      adminName: u?.displayName || u?.email || "",
      createdAt: serverTimestamp()
    });
  } catch (e) { console.error("logAdminAction error:", e); }
}
export async function fetchAdminLogs(limitN = 200) {
  const qy = query(collection(db, "admin_logs"), orderBy("createdAt", "desc"), limit(limitN));
  const snap = await getDocs(qy);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function updateProfile(uid, patch) {
  await updateDoc(doc(db, "users", uid), patch);
}
export async function fetchCustomPositions() {
  const snap = await getDoc(doc(db, "settings", "positions"));
  if (snap.exists()) return snap.data().list || [];
  return [];
}
export async function saveCustomPositions(list) {
  await setDoc(doc(db, "settings", "positions"), { list });
}

/** ---------- storage ---------- */
export async function uploadFile(path, file) {
  const r = ref(storage, path);
  const buf = await file.arrayBuffer();
  await uploadBytes(r, new Uint8Array(buf), { contentType: file.type || "application/octet-stream" });
  return await getDownloadURL(r);
}
export async function uploadEvidence(uid, file) {
  const ts = Date.now();
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  return uploadFile(`evidence/${uid}/${ts}_${safeName}`, file);
}
export async function uploadAvatar(uid, blob) {
  const ts = Date.now();
  const f = new File([blob], "avatar.png", { type: blob.type || "image/png" });
  return uploadFile(`avatars/${uid}/${ts}_avatar.png`, f);
}


export async function fetchNewsAll() {
  const qy = query(collection(db, "news"), orderBy("createdAt", "desc"), limit(300));
  const res = await getDocs(qy);
  return res.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createNewsPost({ uid, authorName, authorRole, avatarUrl, category, title, description, photoUrl, coverUrl, link, mood, fontFamily }) {
  await addDoc(collection(db, "news"), {
    uid,
    authorName: safeText(authorName),
    authorRole: safeText(authorRole),
    avatarUrl: safeText(avatarUrl),
    category: safeText(category),
    title: safeText(title),
    description: safeText(description),
    photoUrl: safeText(photoUrl),
    coverUrl: safeText(coverUrl),
    link: safeText(link),
    mood: safeText(mood || ""),
    fontFamily: safeText(fontFamily || ""),
    likes: [],
    createdAt: serverTimestamp()
  });
}

export async function toggleNewsLike(newsId, uid, currentLikes) {
  const hasLiked = (currentLikes || []).includes(uid);
  if (hasLiked) {
    await updateDoc(doc(db, "news", newsId), { likes: arrayRemove(uid) });
  } else {
    await updateDoc(doc(db, "news", newsId), { likes: arrayUnion(uid) });
  }
}

export async function fetchNewsComments(newsId) {
  const qy = query(collection(db, "news", newsId, "comments"), orderBy("createdAt", "asc"));
  const res = await getDocs(qy);
  return res.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addNewsComment(newsId, { uid, authorName, avatarUrl, text }) {
  await addDoc(collection(db, "news", newsId, "comments"), {
    uid,
    authorName: safeText(authorName),
    avatarUrl: safeText(avatarUrl),
    text: safeText(text),
    createdAt: serverTimestamp()
  });
}

export async function deleteNewsPost(newsId) {
  await deleteDoc(doc(db, "news", newsId));
}

export async function toggleNewsPin(newsId, currentlyPinned) {
  await updateDoc(doc(db, "news", newsId), { pinned: !currentlyPinned });
}

/** ---------- support tickets ---------- */
export async function fetchAllTickets() {
  const qy = query(collection(db, "tickets"), orderBy("createdAt", "desc"), limit(500));
  const res = await getDocs(qy);
  return res.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function fetchMyTickets(uid) {
  const qy = query(collection(db, "tickets"), where("uid", "==", uid));
  const res = await getDocs(qy);
  return res.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}
export async function createTicket({ uid, authorName, authorEmail, subject, message, priority }) {
  await addDoc(collection(db, "tickets"), {
    uid,
    authorName: safeText(authorName),
    authorEmail: safeText(authorEmail),
    subject: safeText(subject),
    message: safeText(message),
    priority: priority || "medium",
    status: "new",
    createdAt: serverTimestamp()
  });
}
export async function updateTicketStatus(ticketId, newStatus) {
  await updateDoc(doc(db, "tickets", ticketId), { status: newStatus });
}

/** ---------- announcements (admin → all users banner) ---------- */
export async function fetchAnnouncements() {
  const qy = query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(100));
  const res = await getDocs(qy);
  return res.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function createAnnouncement({ emoji, text, link, startDate, endDate }) {
  await addDoc(collection(db, "announcements"), {
    emoji: safeText(emoji),
    text: safeText(text),
    link: safeText(link),
    startDate: startDate || "",
    endDate: endDate || "",
    createdAt: serverTimestamp()
  });
}
export async function deleteAnnouncement(id) {
  await deleteDoc(doc(db, "announcements", id));
}

/** ---------- goals api ---------- */
export async function fetchGoals(uid) {
  try {
    const qy = query(collection(db, "goals"), where("uid", "==", uid));
    const res = await getDocs(qy);
    const items = res.docs.map(d => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => {
      const ta = a.createdAt?.seconds || 0;
      const tb = b.createdAt?.seconds || 0;
      return tb - ta;
    });
    return items;
  } catch (e) {
    console.warn("[goals] fetch failed:", e);
    return [];
  }
}

export async function createGoal({ uid, targetPoints, deadline, note, scope, section, teammates }) {
  const cleanTeammates = Array.isArray(teammates)
    ? [...new Set(teammates.filter(x => x && x !== uid))]
    : [];
  await addDoc(collection(db, "goals"), {
    uid,
    targetPoints: Number(targetPoints) || 0,
    deadline: safeText(deadline),
    note: safeText(note),
    scope: safeText(scope) || "quarter",
    section: safeText(section),
    teammates: cleanTeammates,
    completed: false,
    createdAt: serverTimestamp()
  });
}

export async function updateGoal(goalId, patch) {
  await updateDoc(doc(db, "goals", goalId), patch);
}

export async function deleteGoalDoc(goalId) {
  await deleteDoc(doc(db, "goals", goalId));
}

export async function fetchMyBookQuizAttempts(uid) {
  const qy = query(collection(db, "bookQuizAttempts"), where("uid", "==", uid));
  const res = await getDocs(qy);
  const arr = res.docs.map(d => ({ id: d.id, ...d.data() }));
  arr.sort((a, b) => tsKey(b) - tsKey(a));
  return arr;
}

export async function createBookQuizAttempt(data) {
  await addDoc(collection(db, "bookQuizAttempts"), {
    uid: data.uid,
    bookKey: safeText(data.bookKey),
    bookTitle: safeText(data.bookTitle),
    month: safeText(data.month),
    correctCount: Number(data.correctCount) || 0,
    totalCount: Number(data.totalCount) || 0,
    scorePercent: Number(data.scorePercent) || 0,
    passed: !!data.passed,
    cooldownUntil: safeText(data.cooldownUntil),
    thresholdPercent: Number(data.thresholdPercent) || 70,
    pointsCandidate: Number(data.pointsCandidate) || 0,
    createdAt: serverTimestamp()
  });
}

export async function createBookQuizRewardSubmission({ uid, book, result }) {
  await addDoc(collection(db, "submissions"), {
    uid,
    typeId: `book_quiz:${book.id}`,
    typeName: "Книжный тест (NIS-пен бірге оқиық)",
    typeSection: "Чтение",
    typeSubsection: "Книжный тест",
    points: Number(book.points) || 20,
    title: `Книжный тест: ${book.title}`,
    description: `Результат теста: ${result.correct}/${result.total} (${result.percent}%). Порог: ${book.thresholdPercent || 70}%`,
    eventDate: ymd(),
    evidenceLink: "",
    evidenceFileUrl: "",
    quizBookKey: book.id,
    quizScorePercent: Number(result.percent) || 0,
    quizCorrectCount: Number(result.correct) || 0,
    quizTotalCount: Number(result.total) || 0,
    status: "pending",
    createdAt: serverTimestamp()
  });
}

/** ---------- events / calendar api ---------- */
export async function fetchEvents() {
  const qy = query(collection(db, "events"), orderBy("dateFrom", "asc"), limit(500));
  const res = await getDocs(qy);
  return res.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function createEvent({ title, description, dateFrom, dateTo, color }) {
  await addDoc(collection(db, "events"), {
    title: safeText(title),
    description: safeText(description),
    dateFrom: dateFrom || "",
    dateTo: dateTo || "",
    color: color || "#38bdf8",
    createdAt: serverTimestamp()
  });
}
export async function updateEvent(id, patch) {
  await updateDoc(doc(db, "events", id), patch);
}
export async function deleteEvent(id) {
  await deleteDoc(doc(db, "events", id));
}
