import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAQlLh2Abk92sZVCSsYSCxvps4Uld3C1Lk",
  authDomain: "bibonrat.firebaseapp.com",
  databaseURL: "https://bibonrat-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bibonrat",
  storageBucket: "bibonrat.firebasestorage.app",
  messagingSenderId: "78759159251",
  appId: "1:78759159251:web:3e40d7d5a2aa762f01bb26",
};

const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
