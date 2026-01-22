import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import { ensureUserProfile, refreshAll } from "./api.js";
import { navigate, state } from "./state.js";
import { bindAuthForms, render, updateRouteVisibility } from "./render.js";

async function handleLogin(event) {
  event.preventDefault();
  const data = new FormData(event.target);
  const email = data.get("email").trim();
  const password = data.get("password");
  await signInWithEmailAndPassword(auth, email, password);
}

async function handleRegister(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const email = formData.get("email").trim();
  const password = formData.get("password");
  const displayName = formData.get("displayName");
  const school = formData.get("school") || "";
  const subject = formData.get("subject") || "";
  const experienceYears = Number(formData.get("experienceYears")) || 0;

  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  await setDoc(doc(db, "users", cred.user.uid), {
    uid: cred.user.uid,
    email,
    displayName,
    role: "teacher",
    school,
    subject,
    experienceYears,
    phone: "",
    city: "",
    position: "",
    totalPoints: 0,
    createdAt: serverTimestamp(),
  });
}

window.addEventListener("hashchange", updateRouteVisibility);

onAuthStateChanged(auth, async (user) => {
  state.user = user;
  if (user) {
    state.profile = await ensureUserProfile(user);
    state.role = state.profile.role || "teacher";
    await refreshAll();
  } else {
    state.profile = null;
    state.role = null;
    state.types = [];
    state.submissions = [];
    state.users = [];
  }
  render();
  bindAuthForms(handleLogin, handleRegister);
});

if (!window.location.hash) {
  navigate("login");
}

render();
bindAuthForms(handleLogin, handleRegister);
