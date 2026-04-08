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
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  runTransaction,
  increment,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCekqSbjlZDcTw7DB3vr_FLBFXsv9ooCt4",
  authDomain: "kpiplatform-85ef9.firebaseapp.com",
  projectId: "kpiplatform-85ef9",
  storageBucket: "kpiplatform-85ef9.firebasestorage.app",
  messagingSenderId: "1020879305293",
  appId: "1:1020879305293:web:07d435100d116ae998fa04"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const MICROSOFT_TENANT = "common";

export {
  onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut, OAuthProvider, updatePassword, reauthenticateWithCredential,
  EmailAuthProvider, sendPasswordResetEmail,
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, getDocs,
  query, where, orderBy, limit, serverTimestamp, runTransaction, increment, arrayUnion, arrayRemove,
  ref, uploadBytes, getDownloadURL
};
