// NIS AI by Bibon — chat UI logic. Лёгкий, без зависимостей.

// Прямой URL Cloud Function v2 (Cloud Run). Работает локально, на чужом домене и в продакшне.
const API = "https://chat-qlebq6gwma-uc.a.run.app";
const STORAGE_KEY = "nis-ai-bibon:history";

const $log = document.getElementById("log");
const $form = document.getElementById("form");
const $input = document.getElementById("input");
const $send = document.getElementById("send");
const $clear = document.getElementById("clear");

let history = loadHistory();
let pending = false;
restoreHistory();

$form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = $input.value.trim();
  if (!text || pending) return;
  $input.value = "";
  resizeInput();
  await ask(text);
});

$input.addEventListener("input", resizeInput);
$input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    $form.requestSubmit();
  }
});

$clear.addEventListener("click", () => {
  history = [];
  localStorage.removeItem(STORAGE_KEY);
  Array.from($log.querySelectorAll(".msg")).slice(1).forEach(n => n.remove());
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".quick__btn");
  if (btn && !pending) {
    const q = btn.dataset.q || btn.textContent.trim();
    $input.value = q;
    $form.requestSubmit();
  }
});

async function ask(text) {
  pending = true;
  setBusy(true);
  appendMessage("user", text);
  history.push({ role: "user", content: text });
  saveHistory();

  const typing = appendTyping();
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history.slice(-10) }),
    });
    typing.remove();
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      appendError(err?.error === "upstream_error" ? "AI временно недоступен, попробуйте позже." : "Не удалось получить ответ.");
      return;
    }
    const data = await res.json();
    const reply = (data?.reply || "").trim();
    if (!reply) {
      appendError("Пустой ответ. Попробуйте переформулировать.");
      return;
    }
    appendMessage("assistant", reply);
    history.push({ role: "assistant", content: reply });
    saveHistory();
  } catch (err) {
    typing.remove();
    console.error(err);
    appendError("Проблема с сетью. Проверьте подключение.");
  } finally {
    pending = false;
    setBusy(false);
    $input.focus();
  }
}

function setBusy(b) {
  $send.disabled = b;
  $input.disabled = b;
}

function appendMessage(role, text) {
  const div = document.createElement("div");
  div.className = `msg msg--${role === "user" ? "user" : "bot"}`;
  const ava = document.createElement("div");
  ava.className = "ava";
  ava.textContent = role === "user" ? "Я" : "AI";
  const bub = document.createElement("div");
  bub.className = "bubble";
  bub.textContent = text;
  div.append(ava, bub);
  $log.appendChild(div);
  $log.scrollTop = $log.scrollHeight;
  return div;
}

function appendTyping() {
  const div = document.createElement("div");
  div.className = "msg msg--bot";
  div.innerHTML = `<div class="ava">AI</div><div class="bubble"><span class="typing"><span></span><span></span><span></span></span></div>`;
  $log.appendChild(div);
  $log.scrollTop = $log.scrollHeight;
  return div;
}

function appendError(text) {
  const div = document.createElement("div");
  div.className = "msg msg--bot";
  div.innerHTML = `<div class="ava">!</div><div class="bubble err"></div>`;
  div.querySelector(".bubble").textContent = text;
  $log.appendChild(div);
  $log.scrollTop = $log.scrollHeight;
}

function resizeInput() {
  $input.style.height = "auto";
  $input.style.height = Math.min($input.scrollHeight, 140) + "px";
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(-20) : [];
  } catch { return []; }
}

function saveHistory() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-20))); } catch { /* quota */ }
}

function restoreHistory() {
  history.forEach(m => appendMessage(m.role, m.content));
}
