import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const FIREBASE_CDN = /^https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.5\//;

export default defineConfig({
  plugins: [react()],
  build: { rollupOptions: { external: [FIREBASE_CDN] } },
  optimizeDeps: {
    exclude: [
      "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js",
      "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js",
      "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js",
      "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js"
    ]
  }
});
