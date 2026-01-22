import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getDownloadURL, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import { db, storage } from "./firebase-config.js";
import { state } from "./state.js";

export async function ensureUserProfile(user) {
  const refDoc = doc(db, "users", user.uid);
  const snap = await getDoc(refDoc);
  if (snap.exists()) {
    return snap.data();
  }
  const newProfile = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || "",
    role: "teacher",
    school: "",
    subject: "",
    experienceYears: 0,
    phone: "",
    city: "",
    position: "",
    avatarUrl: "",
    totalPoints: 0,
    createdAt: serverTimestamp(),
  };
  await setDoc(refDoc, newProfile);
  return newProfile;
}

export async function loadTypes() {
  const snap = await getDocs(collection(db, "types"));
  state.types = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function loadSubmissions() {
  if (!state.user) return;
  if (state.role === "admin") {
    const q = query(collection(db, "submissions"), orderBy("createdAt", "desc"), limit(500));
    const snap = await getDocs(q);
    state.submissions = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } else {
    const q = query(collection(db, "submissions"), where("uid", "==", state.user.uid), limit(200));
    const snap = await getDocs(q);
    state.submissions = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  }
}

export async function loadUsers() {
  if (!state.user) {
    state.users = [];
    return;
  }
  const q = query(collection(db, "users"), orderBy("totalPoints", "desc"), limit(500));
  const snap = await getDocs(q);
  state.users = snap.docs.map((docSnap) => docSnap.data());
}

export async function refreshAll() {
  await loadTypes();
  await loadSubmissions();
  await loadUsers();
}

export async function updateProfile(uid, update) {
  await updateDoc(doc(db, "users", uid), update);
}

export async function setRole(uid, role) {
  await updateDoc(doc(db, "users", uid), { role });
}

export async function addSubmission(submission) {
  await addDoc(collection(db, "submissions"), {
    ...submission,
    createdAt: serverTimestamp(),
  });
}

export async function uploadEvidence(uid, file) {
  if (!file) return "";
  const path = `evidence/${uid}/${Date.now()}_${file.name}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
}

export async function uploadAvatar(uid, file) {
  if (!file) return "";
  const filename = file.name || "avatar.png";
  const path = `avatars/${uid}/${Date.now()}_${filename}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
}

export async function seedDefaultTypes(defaultTypes) {
  const existing = new Set(state.types.map((type) => type.name.toLowerCase()));
  for (const type of defaultTypes) {
    if (!existing.has(type.name.toLowerCase())) {
      await addDoc(collection(db, "types"), type);
    }
  }
}

export async function addType(payload) {
  await addDoc(collection(db, "types"), payload);
}

export async function toggleType(id, active) {
  await updateDoc(doc(db, "types", id), { active });
}

export async function approveSubmission(submission, adminUid) {
  const subRef = doc(db, "submissions", submission.id);
  await updateDoc(subRef, {
    status: "approved",
    decidedAt: serverTimestamp(),
    decidedBy: adminUid,
  });
  const ownerRef = doc(db, "users", submission.uid);
  const ownerSnap = await getDoc(ownerRef);
  if (ownerSnap.exists()) {
    const current = ownerSnap.data().totalPoints ?? 0;
    await updateDoc(ownerRef, { totalPoints: current + (submission.points || 0) });
  }
}

export async function rejectSubmission(submission, adminUid) {
  const subRef = doc(db, "submissions", submission.id);
  await updateDoc(subRef, {
    status: "rejected",
    decidedAt: serverTimestamp(),
    decidedBy: adminUid,
  });
}
