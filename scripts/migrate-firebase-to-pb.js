#!/usr/bin/env node
/**
 * Firebase → PocketBase data migration script.
 *
 * Prerequisites:
 *   1. PocketBase is running and all collections have been created via Admin UI.
 *   2. Place your Firebase service account key as `scripts/firebase-service-account.json`.
 *   3. Install deps: npm install firebase-admin pocketbase node-fetch
 *
 * Usage:
 *   PB_URL=http://localhost:8090 PB_ADMIN_EMAIL=admin@example.com PB_ADMIN_PASS=secret \
 *   node scripts/migrate-firebase-to-pb.js
 *
 * What it does:
 *   - Reads all Firestore collections + Firebase Auth users
 *   - Creates corresponding records in PocketBase
 *   - Downloads files from Firebase Storage and uploads to PocketBase file fields
 *   - Preserves Firebase UIDs as PocketBase record IDs where possible
 */

import admin from "firebase-admin";
import PocketBase from "pocketbase";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ──────────────────────────────────────────────────
const PB_URL = process.env.PB_URL || "http://localhost:8090";
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const PB_ADMIN_PASS = process.env.PB_ADMIN_PASS;
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || "Temp1234!";

if (!PB_ADMIN_EMAIL || !PB_ADMIN_PASS) {
  console.error("Set PB_ADMIN_EMAIL and PB_ADMIN_PASS env vars");
  process.exit(1);
}

// ─── Init Firebase Admin ─────────────────────────────────────
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "firebase-service-account.json"), "utf-8")
);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "kpiplatform-85ef9.firebasestorage.app",
});
const db = admin.firestore();
const bucket = admin.storage().bucket();

// ─── Init PocketBase ─────────────────────────────────────────
const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);

async function authPB() {
  await pb.collection("_superusers").authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASS);
  console.log("Authenticated with PocketBase admin");
}

// ─── Helpers ─────────────────────────────────────────────────
function tsToISO(ts) {
  if (!ts) return "";
  if (ts.toDate) return ts.toDate().toISOString();
  if (ts.seconds) return new Date(ts.seconds * 1000).toISOString();
  if (typeof ts === "string") return ts;
  return "";
}

async function downloadFile(storagePath) {
  try {
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [buffer] = await file.download();
    const name = storagePath.split("/").pop();
    return { buffer, name, type: "application/octet-stream" };
  } catch (e) {
    console.warn(`  Failed to download ${storagePath}:`, e.message);
    return null;
  }
}

function extractStoragePath(url) {
  if (!url || !url.includes("firebasestorage")) return null;
  try {
    const u = new URL(url);
    const path = decodeURIComponent(u.pathname.split("/o/")[1]?.split("?")[0] || "");
    return path || null;
  } catch { return null; }
}

async function safeCreate(collection, data, id) {
  try {
    if (id) data.id = id;
    await pb.collection(collection).create(data);
    return true;
  } catch (e) {
    if (e?.status === 400 && e?.data?.id?.code === "validation_not_unique") {
      console.log(`  Skipping duplicate ${collection}/${id || "new"}`);
      return false;
    }
    console.error(`  Error creating ${collection}:`, e?.message || e);
    return false;
  }
}

// ─── Migration functions ─────────────────────────────────────

async function migrateUsers() {
  console.log("\n=== Migrating users ===");
  const snap = await db.collection("users").get();
  let count = 0;

  for (const doc of snap.docs) {
    const d = doc.data();
    const uid = doc.id;

    const data = {
      email: d.email || `${uid}@migrated.local`,
      password: DEFAULT_PASSWORD,
      passwordConfirm: DEFAULT_PASSWORD,
      displayName: d.displayName || "",
      role: d.role || "teacher",
      school: d.school || "",
      subject: d.subject || "",
      experienceYears: Number(d.experienceYears) || 0,
      phone: d.phone || "",
      city: d.city || "",
      position: d.position || "",
      totalPoints: Number(d.totalPoints) || 0,
      compDays: Number(d.compDays) || 0,
      onboarded: !!d.onboarded,
      onboardedAt: tsToISO(d.onboardedAt),
      online: false,
      lastSeen: tsToISO(d.lastSeen),
      preferredTheme: d.preferredTheme || "",
      accessibility: d.accessibility || {},
      emailVisibility: true,
    };

    // Download avatar if URL exists
    const formData = new FormData();
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === "object" && !(v instanceof Blob)) {
        formData.append(k, JSON.stringify(v));
      } else {
        formData.append(k, v);
      }
    }

    const avatarPath = extractStoragePath(d.avatarUrl);
    if (avatarPath) {
      const file = await downloadFile(avatarPath);
      if (file) formData.append("avatar", new Blob([file.buffer]), file.name);
    }

    const sigPath = extractStoragePath(d.signatureUrl);
    if (sigPath) {
      const file = await downloadFile(sigPath);
      if (file) formData.append("signature", new Blob([file.buffer]), file.name);
    }

    if (await safeCreate("users", formData, uid)) count++;
  }

  console.log(`  Migrated ${count}/${snap.size} users`);
}

async function migrateCollection(name, transform) {
  console.log(`\n=== Migrating ${name} ===`);
  const snap = await db.collection(name).get();
  let count = 0;

  for (const doc of snap.docs) {
    const d = doc.data();
    const data = transform(d, doc.id);
    if (await safeCreate(name, data, doc.id)) count++;
  }

  console.log(`  Migrated ${count}/${snap.size} ${name}`);
}

async function migrateCollectionWithFiles(name, transform, fileFields) {
  console.log(`\n=== Migrating ${name} (with files) ===`);
  const snap = await db.collection(name).get();
  let count = 0;

  for (const doc of snap.docs) {
    const d = doc.data();
    const data = transform(d, doc.id);

    const formData = new FormData();
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === "object" && !(v instanceof Blob)) {
        formData.append(k, JSON.stringify(v));
      } else {
        formData.append(k, String(v ?? ""));
      }
    }

    for (const { urlField, fileField } of fileFields) {
      const storagePath = extractStoragePath(d[urlField]);
      if (storagePath) {
        const file = await downloadFile(storagePath);
        if (file) formData.append(fileField, new Blob([file.buffer]), file.name);
      }
    }

    if (await safeCreate(name, formData, doc.id)) count++;
  }

  console.log(`  Migrated ${count}/${snap.size} ${name}`);
}

async function migrateNewsComments() {
  console.log("\n=== Migrating news comments ===");
  const newsSnap = await db.collection("news").get();
  let count = 0;

  for (const newsDoc of newsSnap.docs) {
    const commentsSnap = await db.collection("news").doc(newsDoc.id).collection("comments").get();
    for (const cDoc of commentsSnap.docs) {
      const c = cDoc.data();
      const data = {
        newsId: newsDoc.id,
        uid: c.uid || "",
        authorName: c.authorName || "",
        authorAvatar: c.avatarUrl || "",
        text: c.text || "",
      };
      if (await safeCreate("comments", data)) count++;
    }
  }

  console.log(`  Migrated ${count} comments`);
}

// ─── Main ────────────────────────────────────────────────────
async function main() {
  await authPB();

  await migrateUsers();

  await migrateCollection("types", (d, id) => ({
    section: d.section || "",
    subsection: d.subsection || "",
    name: d.name || "",
    defaultPoints: Number(d.defaultPoints) || 0,
    active: d.active !== false,
  }));

  await migrateCollectionWithFiles("submissions", (d) => ({
    uid: d.uid || "",
    typeId: d.typeId || "",
    typeName: d.typeName || "",
    typeSection: d.typeSection || "",
    typeSubsection: d.typeSubsection || "",
    points: Number(d.points) || 0,
    title: d.title || "",
    description: d.description || "",
    eventDate: d.eventDate || "",
    evidenceLink: d.evidenceLink || "",
    status: d.status || "pending",
    decidedAt: tsToISO(d.decidedAt),
    decidedBy: d.decidedBy || "",
    quizBookKey: d.quizBookKey || "",
    quizScorePercent: Number(d.quizScorePercent) || 0,
    quizCorrectCount: Number(d.quizCorrectCount) || 0,
    quizTotalCount: Number(d.quizTotalCount) || 0,
  }), [{ urlField: "evidenceFileUrl", fileField: "evidenceFile" }]);

  await migrateCollectionWithFiles("requests", (d) => ({
    uid: d.uid || "",
    kind: d.kind || "",
    kindLabel: d.kindLabel || "",
    compMode: d.compMode || "none",
    dateFrom: d.dateFrom || "",
    dateTo: d.dateTo || "",
    days: Number(d.days) || 0,
    note: d.note || "",
    status: d.status || "pending",
    pointsDelta: Number(d.pointsDelta) || 0,
    compDaysDelta: Number(d.compDaysDelta) || 0,
    decidedAt: tsToISO(d.decidedAt),
    decidedBy: d.decidedBy || "",
  }), [{ urlField: "evidenceFileUrl", fileField: "evidenceFile" }]);

  await migrateCollectionWithFiles("documents", (d) => ({
    fromUid: d.fromUid || "",
    toUid: d.toUid || "",
    toEmail: d.toEmail || "",
    toName: d.toName || "",
    title: d.title || "",
    body: d.body || "",
    requireSignature: !!d.requireSignature,
    status: d.status || "sent",
    signedAt: tsToISO(d.signedAt),
  }), [{ urlField: "signatureUrl", fileField: "signatureFile" }]);

  await migrateCollectionWithFiles("teacher_documents", (d) => ({
    uid: d.uid || "",
    title: d.title || "",
    description: d.description || "",
    fileName: d.fileName || "",
  }), [{ urlField: "fileUrl", fileField: "file" }]);

  await migrateCollectionWithFiles("news", (d) => ({
    uid: d.uid || "",
    authorName: d.authorName || "",
    authorRole: d.authorRole || "",
    authorAvatar: d.avatarUrl || "",
    category: d.category || "other",
    title: d.title || "",
    description: d.description || "",
    link: d.link || "",
    mood: d.mood || "",
    fontFamily: d.fontFamily || "",
    likes: d.likes || [],
    pinned: !!d.pinned,
  }), [
    { urlField: "photoUrl", fileField: "photo" },
    { urlField: "coverUrl", fileField: "cover" },
  ]);

  await migrateNewsComments();

  await migrateCollection("tickets", (d) => ({
    uid: d.uid || "",
    authorName: d.authorName || "",
    authorEmail: d.authorEmail || "",
    subject: d.subject || "",
    message: d.message || "",
    priority: d.priority || "medium",
    status: d.status || "new",
  }));

  await migrateCollection("announcements", (d) => ({
    emoji: d.emoji || "",
    text: d.text || "",
    link: d.link || "",
    startDate: d.startDate || "",
    endDate: d.endDate || "",
  }));

  await migrateCollection("admin_logs", (d) => ({
    action: d.action || "",
    targetUid: d.targetUid || "",
    targetName: d.targetName || "",
    details: d.details || "",
    adminUid: d.adminUid || "",
    adminName: d.adminName || "",
  }));

  await migrateCollection("bookQuizAttempts", (d) => ({
    uid: d.uid || "",
    bookKey: d.bookKey || "",
    bookTitle: d.bookTitle || "",
    month: d.month || "",
    correctCount: Number(d.correctCount) || 0,
    totalCount: Number(d.totalCount) || 0,
    scorePercent: Number(d.scorePercent) || 0,
    passed: !!d.passed,
    cooldownUntil: d.cooldownUntil || "",
    thresholdPercent: Number(d.thresholdPercent) || 70,
    pointsCandidate: Number(d.pointsCandidate) || 0,
  }));

  await migrateCollection("preUsers", (d, id) => ({
    email: d.email || id,
    displayName: d.displayName || "",
    position: d.position || "",
  }));

  // Settings: positions
  try {
    const posSnap = await db.collection("settings").doc("positions").get();
    if (posSnap.exists) {
      const data = posSnap.data();
      await safeCreate("settings", {
        key: "positions",
        value: data,
      });
      console.log("\n  Migrated settings/positions");
    }
  } catch (e) {
    console.warn("  Settings migration error:", e.message);
  }

  console.log("\n=== Migration complete! ===");
  console.log(`Default password for all users: ${DEFAULT_PASSWORD}`);
  console.log("Users should change their passwords on first login.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
