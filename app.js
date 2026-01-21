import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
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
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import { auth, db, storage } from "./firebase-config.js";

const DEFAULT_TYPES = [
  { section: "Кәсіби даму", subsection: "Семинарлар", name: "Семинарға қатысу (мектепішілік)", defaultPoints: 5 },
  { section: "Кәсіби даму", subsection: "Семинарлар", name: "Семинарға қатысу (аудандық)", defaultPoints: 10 },
  { section: "Кәсіби даму", subsection: "Семинарлар", name: "Семинарға қатысу (облыстық)", defaultPoints: 15 },
  { section: "Кәсіби даму", subsection: "Курстар", name: "Біліктілік арттыру (72+ сағат)", defaultPoints: 25 },
  { section: "Кәсіби даму", subsection: "Сабақ", name: "Ашық сабақ өткізу", defaultPoints: 20 },
  { section: "Жеке даму", subsection: "Кітап оқу", name: "Кәсіби кітап оқу (1 кітап)", defaultPoints: 5 },
  { section: "Жеке даму", subsection: "Онлайн оқу", name: "Вебинарға қатысу (сертификатпен)", defaultPoints: 5 },
  { section: "Жеке даму", subsection: "Цифрлық дағды", name: "Цифрлық платформа меңгеру", defaultPoints: 10 },
  { section: "Қосымша даму", subsection: "Марапаттар", name: "Грамота (мектепішілік)", defaultPoints: 5 },
  { section: "Қосымша даму", subsection: "Қоғамдық жұмыс", name: "Іс-шара ұйымдастыру", defaultPoints: 10 },
  { section: "Инновациялар", subsection: "Жаңа әдіс", name: "Жаңа сабақ әдісін енгізу", defaultPoints: 20 },
  { section: "Инновациялар", subsection: "Творчество", name: "Шығармашылық жоба жасау", defaultPoints: 25 },
].map((item) => ({
  ...item,
  active: true,
}));

const app = document.getElementById("app");
const navRight = document.getElementById("navRight");
const navLinks = document.getElementById("navLinks");

const state = {
  user: null,
  profile: null,
  role: null,
  types: [],
  submissions: [],
  users: [],
  ui: { selectedTeacherId: null },
};

function navigate(route) {
  window.location.hash = `#/${route}`;
}

function parseRoute() {
  const hash = window.location.hash.replace(/^#\//, "");
  const [path, queryString] = hash.split("?");
  const params = new URLSearchParams(queryString || "");
  return { path: path || "profile", params };
}

function getRoute() {
  return parseRoute().path;
}

function formatDate(value) {
  if (!value) return "—";
  const date = value.toDate ? value.toDate() : new Date(value);
  return date.toLocaleDateString("ru-RU");
}

function sumResults(results) {
  return results.reduce((total, item) => total + (item.points || 0), 0);
}

function resultsByUser(userId) {
  return state.submissions.filter((item) => item.uid === userId);
}

function approvedResults(items) {
  return items.filter((item) => item.status === "approved");
}

function pendingResults(items) {
  return items.filter((item) => item.status === "pending");
}

function isImage(url) {
  return /\.(png|jpg|jpeg|webp)$/i.test(url || "");
}

function isPdf(url) {
  return /\.pdf$/i.test(url || "");
}

function pickEvidence(item) {
  const link = (item.evidenceLink || "").trim();
  const fileUrl = (item.evidenceFileUrl || "").trim();
  return {
    link,
    fileUrl,
  };
}

function escapeValue(value) {
  return String(value ?? "").replace(/"/g, "&quot;");
}

async function ensureUserProfile(user) {
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
    totalPoints: 0,
    createdAt: serverTimestamp(),
  };
  await setDoc(refDoc, newProfile);
  return newProfile;
}

async function loadTypes() {
  const snap = await getDocs(collection(db, "types"));
  state.types = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

async function loadSubmissions() {
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

async function loadUsers() {
  if (state.role !== "admin") {
    state.users = [];
    return;
  }
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  state.users = snap.docs.map((docSnap) => docSnap.data());
}

async function refreshAll() {
  await loadTypes();
  await loadSubmissions();
  await loadUsers();
  render();
}

function renderNav() {
  if (!state.user) {
    navRight.innerHTML = "<small class=\"muted\">Вы не авторизованы</small>";
  } else {
    navRight.innerHTML = `
      <span class="badge">${state.role === "admin" ? "Админ" : "Преподаватель"}</span>
      <strong>${state.profile?.displayName || state.user.email}</strong>
      <button class="btn secondary" id="logoutBtn">Выйти</button>
    `;
    document.getElementById("logoutBtn").addEventListener("click", async () => {
      await signOut(auth);
      render();
      navigate("login");
    });
  }

  const route = getRoute();
  [...navLinks.querySelectorAll(".navLink")].forEach((link) => {
    const target = link.getAttribute("href").replace(/^#\//, "").split("?")[0];
    link.classList.toggle("active", target === route);
    if (!state.user) {
      link.classList.add("disabled");
    } else {
      link.classList.remove("disabled");
    }
  });

  if (state.role !== "admin") {
    [...navLinks.querySelectorAll("a[href^='#/admin']")].forEach((link) => {
      link.classList.add("hidden");
    });
  } else {
    [...navLinks.querySelectorAll("a[href^='#/admin']")].forEach((link) => {
      link.classList.remove("hidden");
    });
  }
}

function renderProfile() {
  const section = app.querySelector("[data-route='profile']");
  if (!state.user) {
    section.innerHTML = renderLocked("Профиль");
    return;
  }

  const items = resultsByUser(state.user.uid);
  const approved = approvedResults(items);
  const pending = pendingResults(items);
  const hasAdmin = state.users.some((item) => item.role === "admin");

  section.innerHTML = `
    <div class="sectionTitle">
      <h1>Профиль</h1>
      <span class="badge">${state.role === "admin" ? "Администратор" : "Преподаватель"}</span>
    </div>
    <p class="sectionLead">Редактируйте данные и отслеживайте статус достижений.</p>
    <div class="grid2">
      <div class="card mini">
        <h3>${state.profile?.displayName || "Без имени"}</h3>
        <small class="muted">Подтверждённые баллы</small>
        <h2>${sumResults(approved)}</h2>
      </div>
      <div class="card mini">
        <h3>Заявки в ожидании</h3>
        <small class="muted">Требуют проверки</small>
        <h2>${pending.length}</h2>
      </div>
    </div>

    ${!hasAdmin && state.role !== "admin" ? `
      <div class="card notice">
        <h3>Первый запуск</h3>
        <p class="sectionLead">Администратор ещё не назначен. Нажмите, чтобы назначить себя админом.</p>
        <button class="btn" id="bootstrapAdmin">Сделать меня администратором</button>
      </div>
    ` : ""}

    <div class="sectionInner">
      <h3>Данные профиля</h3>
      <form id="profileForm" class="grid2">
        <div class="stack">
          <label>ФИО</label>
          <input class="input" name="displayName" value="${escapeValue(state.profile?.displayName)}" />
        </div>
        <div class="stack">
          <label>Школа</label>
          <input class="input" name="school" value="${escapeValue(state.profile?.school)}" />
        </div>
        <div class="stack">
          <label>Предмет</label>
          <input class="input" name="subject" value="${escapeValue(state.profile?.subject)}" />
        </div>
        <div class="stack">
          <label>Стаж (лет)</label>
          <input class="input" type="number" min="0" name="experienceYears" value="${state.profile?.experienceYears ?? 0}" />
        </div>
        <div class="stack">
          <label>Телефон</label>
          <input class="input" name="phone" value="${escapeValue(state.profile?.phone)}" />
        </div>
        <div class="stack">
          <label>Город</label>
          <input class="input" name="city" value="${escapeValue(state.profile?.city)}" />
        </div>
        <div class="stack">
          <label>Должность</label>
          <input class="input" name="position" value="${escapeValue(state.profile?.position)}" />
        </div>
        <div class="stack">
          <label>Email</label>
          <div class="input">${state.profile?.email || "—"}</div>
        </div>
        <button class="btn" type="submit">Сохранить профиль</button>
      </form>
    </div>
    <div class="sectionInner">
      <h3>Последние заявки</h3>
      ${renderResultsTable(items.slice(0, 6))}
    </div>
  `;

  const profileForm = section.querySelector("#profileForm");
  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    const update = {
      displayName: data.get("displayName")?.trim() || "",
      school: data.get("school")?.trim() || "",
      subject: data.get("subject")?.trim() || "",
      experienceYears: Number(data.get("experienceYears")) || 0,
      phone: data.get("phone")?.trim() || "",
      city: data.get("city")?.trim() || "",
      position: data.get("position")?.trim() || "",
    };
    await updateDoc(doc(db, "users", state.user.uid), update);
    state.profile = { ...state.profile, ...update };
    await refreshAll();
  });

  const bootstrapButton = section.querySelector("#bootstrapAdmin");
  if (bootstrapButton) {
    bootstrapButton.addEventListener("click", async () => {
      await updateDoc(doc(db, "users", state.user.uid), { role: "admin" });
      state.role = "admin";
      await refreshAll();
    });
  }
}

function renderRating() {
  const section = app.querySelector("[data-route='rating']");
  if (!state.user) {
    section.innerHTML = renderLocked("Рейтинг");
    return;
  }

  const rows = state.users
    .filter((item) => item.role !== "admin")
    .map((teacher) => {
      const approved = approvedResults(resultsByUser(teacher.uid));
      return { ...teacher, total: sumResults(approved) };
    })
    .sort((a, b) => b.total - a.total);

  section.innerHTML = `
    <div class="sectionTitle">
      <h1>Рейтинг преподавателей</h1>
      <span class="badge">Обновляется автоматически</span>
    </div>
    <p class="sectionLead">Сводка по утверждённым результатам KPI.</p>
    <table class="table">
      <thead>
        <tr>
          <th>#</th>
          <th>Преподаватель</th>
          <th>Школа</th>
          <th>Баллы</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${row.displayName || row.email}</td>
                <td>${row.school || "—"}</td>
                <td><strong>${row.total}</strong></td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderStats() {
  const section = app.querySelector("[data-route='stats']");
  if (!state.user) {
    section.innerHTML = renderLocked("Статистика");
    return;
  }

  if (state.role === "admin") {
    section.innerHTML = renderAdminStats();
  } else {
    section.innerHTML = renderTeacherStats();
  }
}

function renderTeacherStats() {
  const approved = approvedResults(resultsByUser(state.user.uid));
  const daily = buildDailySeries(approved, 14);
  const byType = buildByType(approved);

  return `
    <div class="sectionTitle">
      <h1>Личная статистика</h1>
      <span class="badge">Ваши KPI</span>
    </div>
    <p class="sectionLead">Сводка по достижениям за последние 14 дней и по типам KPI.</p>
    <div class="chartGrid">
      <div class="chartCard">
        <div class="chartHead"><h3>Баллы по дням</h3></div>
        ${renderBarChart(daily.map((item) => ({ label: item.day, value: item.points })))}
      </div>
      <div class="chartCard">
        <div class="chartHead"><h3>Баллы по типам</h3></div>
        ${renderBarChart(byType.map((item) => ({ label: item.name, value: item.points })))}
      </div>
    </div>
  `;
}

function renderAdminStats() {
  const approved = approvedResults(state.submissions);
  const topTeachers = state.users
    .filter((item) => item.role !== "admin")
    .map((teacher) => ({
      name: teacher.displayName || teacher.email,
      points: sumResults(approvedResults(resultsByUser(teacher.uid))),
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 10);

  const byType = buildByType(approved);
  const daily = buildDailySeries(approved, 14);
  const heat = buildHeatmap(approved, 14);

  return `
    <div class="sectionTitle">
      <h1>Статистика платформы</h1>
      <span class="badge">Админ-обзор</span>
    </div>
    <p class="sectionLead">Сводные KPI по преподавателям и типам достижений.</p>
    <div class="chartGrid">
      <div class="chartCard">
        <div class="chartHead"><h3>Топ преподавателей</h3></div>
        ${renderBarChart(topTeachers.map((item) => ({ label: item.name, value: item.points })))}
      </div>
      <div class="chartCard">
        <div class="chartHead"><h3>Баллы по типам</h3></div>
        ${renderBarChart(byType.map((item) => ({ label: item.name, value: item.points })))}
      </div>
      <div class="chartCard">
        <div class="chartHead"><h3>Динамика за 14 дней</h3></div>
        ${renderBarChart(daily.map((item) => ({ label: item.day, value: item.points })))}
      </div>
    </div>
    <div class="sectionInner">
      <h3>Тепловая карта (преподаватель / день)</h3>
      ${renderHeatmap(heat)}
    </div>
  `;
}

function renderAddResult() {
  const section = app.querySelector("[data-route='add']");
  if (!state.user) {
    section.innerHTML = renderLocked("Добавить результат");
    return;
  }

  if (state.role !== "teacher") {
    section.innerHTML = renderOnlyTeacher();
    return;
  }

  const sections = [...new Set(state.types.filter((t) => t.active).map((t) => t.section))];

  section.innerHTML = `
    <h1>Добавить достижение</h1>
    <p class="sectionLead">Создайте заявку на подтверждение KPI.</p>
    <form id="addForm" class="stack">
      <div class="grid2">
        <div class="stack">
          <label>Раздел</label>
          <select name="section" class="input">
            <option value="">— Выберите —</option>
            ${sections.map((item) => `<option value="${item}">${item}</option>`).join("")}
          </select>
        </div>
        <div class="stack">
          <label>Дата достижения</label>
          <input class="input" type="date" name="eventDate" required />
        </div>
      </div>
      <div class="grid2" id="addSelectors"></div>
      <div class="grid2">
        <div class="stack">
          <label>Название</label>
          <input class="input" type="text" name="title" required />
        </div>
        <div class="stack">
          <label>Баллы</label>
          <input class="input" type="number" name="points" readonly />
        </div>
      </div>
      <div>
        <label>Описание</label>
        <textarea class="input" name="description" rows="3"></textarea>
      </div>
      <div class="grid2">
        <div class="stack">
          <label>Ссылка (необязательно)</label>
          <input class="input" type="url" name="link" />
        </div>
        <div class="stack">
          <label>Файл (PDF/JPG/PNG)</label>
          <input class="input" type="file" name="file" accept=".pdf,.jpg,.jpeg,.png" />
        </div>
      </div>
      <button class="btn" type="submit">Отправить на согласование</button>
    </form>
    <div class="sectionInner">
      <h3>Ваши последние заявки</h3>
      ${renderResultsTable(resultsByUser(state.user.uid).slice(0, 5))}
    </div>
  `;

  const form = section.querySelector("#addForm");
  const selectors = section.querySelector("#addSelectors");
  const sectionSelect = form.querySelector("select[name='section']");
  const pointsInput = form.querySelector("input[name='points']");
  const eventDateInput = form.querySelector("input[name='eventDate']");
  eventDateInput.value = new Date().toISOString().slice(0, 10);

  function updateSelectors() {
    const selectedSection = sectionSelect.value;
    const subsections = [...new Set(state.types.filter((t) => t.section === selectedSection && t.active).map((t) => t.subsection))];
    selectors.innerHTML = `
      <div class="stack">
        <label>Подраздел</label>
        <select name="subsection" class="input">
          <option value="">— Выберите —</option>
          ${subsections.map((item) => `<option value="${item}">${item}</option>`).join("")}
        </select>
      </div>
      <div class="stack">
        <label>Тип достижения</label>
        <select name="typeId" class="input">
          <option value="">— Выберите —</option>
        </select>
      </div>
    `;

    const subsectionSelect = selectors.querySelector("select[name='subsection']");
    const typeSelect = selectors.querySelector("select[name='typeId']");

    function updateTypes() {
      const selectedSubsection = subsectionSelect.value;
      const types = state.types.filter(
        (type) => type.section === selectedSection && type.subsection === selectedSubsection && type.active
      );
      typeSelect.innerHTML = `
        <option value="">— Выберите —</option>
        ${types
          .map((type) => `<option value="${type.id}">${type.name} — ${type.defaultPoints} балл(ов)</option>`)
          .join("")}
      `;
      pointsInput.value = "";
    }

    subsectionSelect.addEventListener("change", updateTypes);
    typeSelect.addEventListener("change", () => {
      const selectedType = state.types.find((type) => type.id === typeSelect.value);
      pointsInput.value = selectedType ? selectedType.defaultPoints : "";
    });
  }

  sectionSelect.addEventListener("change", updateSelectors);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const typeId = data.get("typeId");
    const type = state.types.find((item) => item.id === typeId);
    if (!type) {
      alert("Выберите тип достижения.");
      return;
    }

    const file = form.querySelector("input[name='file']").files[0];
    let fileUrl = "";
    if (file) {
      const path = `evidence/${state.user.uid}/${Date.now()}_${file.name}`;
      const fileRef = ref(storage, path);
      await uploadBytes(fileRef, file);
      fileUrl = await getDownloadURL(fileRef);
    }

    await addDoc(collection(db, "submissions"), {
      uid: state.user.uid,
      typeId: type.id,
      typeName: type.name,
      typeSection: type.section,
      typeSubsection: type.subsection,
      points: type.defaultPoints,
      title: data.get("title")?.trim() || "",
      description: data.get("description")?.trim() || "",
      eventDate: data.get("eventDate"),
      evidenceLink: data.get("link")?.trim() || "",
      evidenceFileUrl: fileUrl,
      status: "pending",
      createdAt: serverTimestamp(),
    });
    await refreshAll();
  });
}

function renderApprovals() {
  const section = app.querySelector("[data-route='admin/approvals']");
  if (!state.user) {
    section.innerHTML = renderLocked("Админ: одобрения");
    return;
  }
  if (state.role !== "admin") {
    section.innerHTML = renderOnlyAdmin();
    return;
  }

  const pending = pendingResults(state.submissions);
  section.innerHTML = `
    <div class="row" style="align-items:center">
      <h1 style="margin-bottom:0">Заявки на одобрение</h1>
      <button class="btn secondary" id="refreshApprovals" style="margin-left:auto">Обновить</button>
    </div>
    <p class="sectionLead">Утвердите результаты или отправьте на доработку.</p>
    ${pending.length === 0 ? "<div class='success'>Нет заявок на согласование.</div>" : ""}
    ${renderApprovalTable(pending)}
  `;

  section.querySelector("#refreshApprovals").addEventListener("click", refreshAll);

  section.querySelectorAll("button[data-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.id;
      const action = button.dataset.action;
      const target = state.submissions.find((item) => item.id === id);
      if (target) {
        const subRef = doc(db, "submissions", target.id);
        if (action === "approve") {
          await updateDoc(subRef, {
            status: "approved",
            decidedAt: serverTimestamp(),
            decidedBy: state.user.uid,
          });
          const ownerRef = doc(db, "users", target.uid);
          const ownerSnap = await getDoc(ownerRef);
          if (ownerSnap.exists()) {
            const current = ownerSnap.data().totalPoints ?? 0;
            await updateDoc(ownerRef, { totalPoints: current + (target.points || 0) });
          }
        } else {
          await updateDoc(subRef, {
            status: "rejected",
            decidedAt: serverTimestamp(),
            decidedBy: state.user.uid,
          });
        }
        await refreshAll();
      }
    });
  });
}

function renderTypes() {
  const section = app.querySelector("[data-route='admin/types']");
  if (!state.user) {
    section.innerHTML = renderLocked("Админ: типы KPI");
    return;
  }
  if (state.role !== "admin") {
    section.innerHTML = renderOnlyAdmin();
    return;
  }

  const sortedTypes = [...state.types].sort((a, b) => {
    const first = `${a.section} ${a.subsection} ${a.name}`;
    const second = `${b.section} ${b.subsection} ${b.name}`;
    return first.localeCompare(second, "ru");
  });

  section.innerHTML = `
    <h1>Типы KPI</h1>
    <p class="sectionLead">Настройте показатели, разделы и плановые значения.</p>
    <div class="row" style="margin-bottom:12px">
      <button class="btn secondary" id="seedTypes">Заполнить базовые типы</button>
    </div>
    <div style="overflow-x:auto">
      <table class="table" style="min-width: 900px">
        <thead>
          <tr>
            <th>Раздел</th>
            <th>Подраздел</th>
            <th>Название</th>
            <th>Баллы</th>
            <th>Активен</th>
          </tr>
        </thead>
        <tbody>
          ${sortedTypes
            .map(
              (type) => `
                <tr>
                  <td>${type.section}</td>
                  <td>${type.subsection}</td>
                  <td>${type.name}</td>
                  <td>${type.defaultPoints}</td>
                  <td>
                    <label class="toggle">
                      <input type="checkbox" data-id="${type.id}" ${type.active ? "checked" : ""} />
                      <span> ${type.active ? "Да" : "Нет"}</span>
                    </label>
                  </td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
    <div class="sectionInner">
      <h3>Добавить новый тип</h3>
      <form id="typeForm" class="grid2">
        <input class="input" name="section" placeholder="Раздел" required />
        <input class="input" name="subsection" placeholder="Подраздел" required />
        <input class="input" name="name" placeholder="Название" required />
        <input class="input" type="number" name="points" placeholder="Баллы" min="0" required />
        <button class="btn" type="submit">Добавить</button>
      </form>
    </div>
  `;

  section.querySelectorAll("input[type='checkbox'][data-id]").forEach((input) => {
    input.addEventListener("change", async () => {
      const type = state.types.find((item) => item.id === input.dataset.id);
      if (type) {
        await updateDoc(doc(db, "types", type.id), { active: input.checked });
        await refreshAll();
      }
    });
  });

  section.querySelector("#seedTypes").addEventListener("click", async () => {
    const existing = new Set(state.types.map((type) => type.name.toLowerCase()));
    for (const type of DEFAULT_TYPES) {
      if (!existing.has(type.name.toLowerCase())) {
        await addDoc(collection(db, "types"), type);
      }
    }
    await refreshAll();
  });

  section.querySelector("#typeForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    await addDoc(collection(db, "types"), {
      section: formData.get("section"),
      subsection: formData.get("subsection"),
      name: formData.get("name"),
      defaultPoints: Number(formData.get("points")),
      active: true,
    });
    await refreshAll();
  });
}

function renderUsers() {
  const section = app.querySelector("[data-route='admin/users']");
  if (!state.user) {
    section.innerHTML = renderLocked("Админ: пользователи");
    return;
  }
  if (state.role !== "admin") {
    section.innerHTML = renderOnlyAdmin();
    return;
  }

  section.innerHTML = `
    <div class="row" style="align-items:center">
      <h1 style="margin-bottom:0">Пользователи</h1>
      <input class="input" id="userSearch" placeholder="Поиск: ФИО / email / школа / предмет" style="max-width: 320px" />
      <button class="btn secondary" id="refreshUsers">Обновить</button>
    </div>
    <div style="overflow-x:auto; margin-top: 12px">
      <table class="table" style="min-width: 1100px">
        <thead>
          <tr>
            <th>ФИО</th>
            <th>Школа</th>
            <th>Предмет</th>
            <th>Email</th>
            <th>Баллы</th>
            <th>Роль</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="usersTable"></tbody>
      </table>
    </div>
  `;

  const tbody = section.querySelector("#usersTable");
  const search = section.querySelector("#userSearch");

  function renderRows() {
    const queryValue = search.value.trim().toLowerCase();
    const filtered = state.users.filter((item) => {
      const haystack = [item.displayName, item.email, item.school, item.subject].join(" ").toLowerCase();
      return haystack.includes(queryValue);
    });

    tbody.innerHTML = filtered
      .map(
        (item) => `
          <tr>
            <td><b>${item.displayName || "—"}</b></td>
            <td><small class="muted">${item.school || "—"}</small></td>
            <td><small class="muted">${item.subject || "—"}</small></td>
            <td><small class="muted">${item.email}</small></td>
            <td><b>${item.totalPoints ?? 0}</b></td>
            <td><span class="badge">${item.role}</span></td>
            <td style="white-space:nowrap">
              <button class="btn secondary" data-action="teacher" data-id="${item.uid}">teacher</button>
              <button class="btn" data-action="admin" data-id="${item.uid}">admin</button>
              <button class="btn secondary" data-action="details" data-id="${item.uid}">Профиль</button>
            </td>
          </tr>
        `
      )
      .join("");

    tbody.querySelectorAll("button[data-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        const target = state.users.find((item) => item.uid === button.dataset.id);
        if (!target) return;
        if (button.dataset.action === "details") {
          state.ui.selectedTeacherId = target.uid;
          navigate(`admin/teacher?uid=${target.uid}`);
          return;
        }
        await updateDoc(doc(db, "users", target.uid), { role: button.dataset.action });
        await refreshAll();
      });
    });
  }

  search.addEventListener("input", renderRows);
  section.querySelector("#refreshUsers").addEventListener("click", refreshAll);
  renderRows();
}

function renderTeacherDetail() {
  const section = app.querySelector("[data-route='admin/teacher']");
  if (!state.user) {
    section.innerHTML = renderLocked("Админ: преподаватель");
    return;
  }
  if (state.role !== "admin") {
    section.innerHTML = renderOnlyAdmin();
    return;
  }

  const { params } = parseRoute();
  const paramId = params.get("uid") || state.ui.selectedTeacherId;
  const teacher = state.users.find((item) => item.uid === paramId) || state.users[0];

  if (!teacher) {
    section.innerHTML = "<div class='error'>Преподаватель не найден.</div>";
    return;
  }

  const items = state.submissions.filter((item) => item.uid === teacher.uid);
  const stats = {
    total: sumResults(approvedResults(items)),
    approved: approvedResults(items).length,
    pending: pendingResults(items).length,
  };

  section.innerHTML = `
    <div class="row" style="align-items:center">
      <h1 style="margin-bottom:0">Учитель: ${teacher.displayName || teacher.email}</h1>
      <button class="btn secondary" style="margin-left:auto" id="backUsers">← Назад</button>
    </div>
    <div class="row" style="margin-top:12px">
      <div class="card" style="flex:1 1 360px">
        <h3>Профиль</h3>
        <div class="stack" style="gap:8px">
          <div><small class="muted">Email</small><div><b>${teacher.email}</b></div></div>
          <div><small class="muted">Школа</small><div><b>${teacher.school || "—"}</b></div></div>
          <div><small class="muted">Предмет</small><div><b>${teacher.subject || "—"}</b></div></div>
          <div><small class="muted">Стаж</small><div><b>${teacher.experienceYears ?? 0}</b> лет</div></div>
          <div><small class="muted">Телефон</small><div><b>${teacher.phone || "—"}</b></div></div>
          <div><small class="muted">Город</small><div><b>${teacher.city || "—"}</b></div></div>
          <div><small class="muted">Должность</small><div><b>${teacher.position || "—"}</b></div></div>
        </div>
        <hr />
        <div class="row" style="gap:10px">
          <div class="badge">Баллы: <b>${stats.total}</b></div>
          <div class="badge">Approved: <b>${stats.approved}</b></div>
          <div class="badge">Pending: <b>${stats.pending}</b></div>
        </div>
      </div>
      <div class="card" style="flex:1 1 640px">
        <h3>Достижения / заявки</h3>
        ${renderResultsTable(items)}
      </div>
    </div>
  `;

  section.querySelector("#backUsers").addEventListener("click", () => navigate("admin/users"));
}

function renderResultsTable(items) {
  if (items.length === 0) {
    return "<div class='success'>Нет результатов для отображения.</div>";
  }
  return `
    <table class="table">
      <thead>
        <tr>
          <th>Дата</th>
          <th>Тип</th>
          <th>Название</th>
          <th>Баллы</th>
          <th>Статус</th>
          <th>Доказательство</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map((item) => {
            const evidence = pickEvidence(item);
            const evidenceUrl = evidence.fileUrl || evidence.link;
            return `
              <tr>
                <td>${formatDate(item.eventDate || item.createdAt)}</td>
                <td>${item.typeName || item.typeId}</td>
                <td>
                  <div><b>${item.title || "—"}</b></div>
                  ${item.description ? `<small class="muted">${item.description}</small>` : ""}
                </td>
                <td>${item.points}</td>
                <td>${renderStatus(item.status)}</td>
                <td>
                  ${evidenceUrl ? `
                    <div class="stack" style="gap:6px">
                      <a class="badge" href="${evidenceUrl}" target="_blank" rel="noreferrer">Открыть</a>
                      <small class="muted" style="max-width: 200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${evidenceUrl}</small>
                      ${isImage(evidenceUrl) ? `<img src="${evidenceUrl}" alt="evidence" class="evidenceThumb" />` : ""}
                      ${isPdf(evidenceUrl) ? `<small class="muted">PDF файл</small>` : ""}
                    </div>
                  ` : "<small class='muted'>—</small>"}
                </td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

function renderApprovalTable(items) {
  if (items.length === 0) {
    return "";
  }
  return `
    <table class="table">
      <thead>
        <tr>
          <th>Преподаватель</th>
          <th>Тип / Название</th>
          <th>Баллы</th>
          <th>Дата</th>
          <th>Доказательство</th>
          <th>Действия</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map((item) => {
            const owner = state.users.find((user) => user.uid === item.uid);
            const evidence = pickEvidence(item);
            const evidenceUrl = evidence.fileUrl || evidence.link;
            return `
              <tr>
                <td>${owner?.displayName || owner?.email || "—"}</td>
                <td>
                  <div class="badge">${item.typeName || item.typeId}</div>
                  <div style="margin-top:6px"><b>${item.title}</b></div>
                  ${item.description ? `<small class="muted">${item.description}</small>` : ""}
                </td>
                <td><b>${item.points}</b></td>
                <td>${formatDate(item.eventDate || item.createdAt)}</td>
                <td>
                  ${evidenceUrl ? `
                    <div class="stack" style="gap:6px">
                      <a class="badge" href="${evidenceUrl}" target="_blank" rel="noreferrer">Открыть</a>
                      <small class="muted" style="max-width: 200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${evidenceUrl}</small>
                    </div>
                  ` : "<small class='muted'>—</small>"}
                </td>
                <td>
                  <div class="row">
                    <button class="btn" data-action="approve" data-id="${item.id}">Одобрить</button>
                    <button class="btn secondary" data-action="reject" data-id="${item.id}">Отклонить</button>
                  </div>
                </td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

function renderStatus(status) {
  if (status === "approved") {
    return "<span class='status approved'>Одобрено</span>";
  }
  if (status === "rejected") {
    return "<span class='status rejected'>Отклонено</span>";
  }
  return "<span class='status pending'>На проверке</span>";
}

function renderLocked(title) {
  return `
    <h1>${title}</h1>
    <div class="error">Для доступа требуется авторизация. Перейдите на страницу входа.</div>
  `;
}

function renderOnlyAdmin() {
  return `
    <h1>Доступ только администраторам</h1>
    <div class="error">Эта секция доступна только пользователям с ролью администратора.</div>
  `;
}

function renderOnlyTeacher() {
  return `
    <h1>Только для преподавателей</h1>
    <div class="error">Добавление результатов доступно только преподавателям.</div>
  `;
}

function renderLogin() {
  const loginSection = app.querySelector("[data-route='login']");
  if (!loginSection) return;

  if (!state.user) {
    loginSection.innerHTML = `
      <h1>Вход в систему</h1>
      <p class="sectionLead">Введите email и пароль или перейдите к регистрации.</p>
      <form id="loginForm" class="stack">
        <div class="grid2">
          <div class="stack">
            <label>Email</label>
            <input class="input" name="email" type="email" placeholder="you@example.com" required />
          </div>
          <div class="stack">
            <label>Пароль</label>
            <input class="input" name="password" type="password" placeholder="••••••" required />
          </div>
        </div>
        <button class="btn" type="submit">Войти</button>
      </form>
      <div class="row" style="margin-top:12px">
        <span class="muted">Нет аккаунта?</span>
        <a class="badge" href="#/register">Регистрация</a>
      </div>
    `;
    const form = loginSection.querySelector("#loginForm");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const email = data.get("email").trim();
      const password = data.get("password");
      await signInWithEmailAndPassword(auth, email, password);
    });
    return;
  }

  loginSection.innerHTML = `
    <h1>Вы уже авторизованы</h1>
    <p class="sectionLead">Используйте меню навигации, чтобы перейти в нужный раздел.</p>
    <button class="btn" id="goProfile">Перейти в профиль</button>
  `;
  loginSection.querySelector("#goProfile").addEventListener("click", () => navigate("profile"));
}

function renderRegister() {
  const section = app.querySelector("[data-route='register']");
  if (!section) return;
  if (state.user) {
    section.innerHTML = `
      <h1>Регистрация</h1>
      <div class="success">Вы уже вошли в систему.</div>
      <button class="btn" id="backProfile">Перейти в профиль</button>
    `;
    section.querySelector("#backProfile").addEventListener("click", () => navigate("profile"));
    return;
  }

  section.innerHTML = `
    <h1>Регистрация</h1>
    <p class="sectionLead">Создайте аккаунт преподавателя. Админом можно стать через профиль.</p>
    <form id="registerForm" class="stack">
      <div class="grid2">
        <div class="stack">
          <label>ФИО</label>
          <input class="input" name="displayName" required />
        </div>
        <div class="stack">
          <label>Email</label>
          <input class="input" type="email" name="email" required />
        </div>
      </div>
      <div class="grid2">
        <div class="stack">
          <label>Пароль</label>
          <input class="input" type="password" name="password" required />
        </div>
        <div class="stack">
          <label>Школа</label>
          <input class="input" name="school" />
        </div>
      </div>
      <div class="grid2">
        <div class="stack">
          <label>Предмет</label>
          <input class="input" name="subject" />
        </div>
        <div class="stack">
          <label>Стаж (лет)</label>
          <input class="input" type="number" min="0" name="experienceYears" value="0" />
        </div>
      </div>
      <button class="btn" type="submit">Создать аккаунт</button>
    </form>
  `;

  section.querySelector("#registerForm").addEventListener("submit", async (event) => {
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
  });
}

function renderSections() {
  renderProfile();
  renderRating();
  renderStats();
  renderAddResult();
  renderApprovals();
  renderTypes();
  renderUsers();
  renderTeacherDetail();
  renderLogin();
  renderRegister();
}

function updateRouteVisibility() {
  const route = getRoute();
  app.querySelectorAll("[data-route]").forEach((section) => {
    section.classList.toggle("hidden", section.dataset.route !== route);
  });
}

function render() {
  renderNav();
  renderSections();
  updateRouteVisibility();
}

function buildDailySeries(items, days) {
  const list = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    list.push({ day: key, points: 0 });
  }
  const map = new Map(list.map((item) => [item.day, item]));
  items.forEach((item) => {
    const key = item.eventDate || (item.createdAt?.toDate ? item.createdAt.toDate().toISOString().slice(0, 10) : "");
    if (map.has(key)) {
      map.get(key).points += item.points || 0;
    }
  });
  return list;
}

function buildByType(items) {
  const map = new Map();
  items.forEach((item) => {
    const key = item.typeName || item.typeId;
    map.set(key, (map.get(key) || 0) + (item.points || 0));
  });
  return [...map.entries()]
    .map(([name, points]) => ({ name, points }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 12);
}

function buildHeatmap(items, days) {
  const daily = buildDailySeries(items, days);
  const dayKeys = daily.map((item) => item.day);
  const teachers = state.users.filter((item) => item.role !== "admin");
  const matrix = new Map();
  let max = 0;

  teachers.forEach((teacher) => {
    const map = new Map(dayKeys.map((day) => [day, 0]));
    items
      .filter((item) => item.uid === teacher.uid)
      .forEach((item) => {
        const day = item.eventDate || (item.createdAt?.toDate ? item.createdAt.toDate().toISOString().slice(0, 10) : "");
        if (!map.has(day)) return;
        map.set(day, (map.get(day) || 0) + (item.points || 0));
      });
    map.forEach((value) => {
      if (value > max) max = value;
    });
    matrix.set(teacher.uid, map);
  });

  return { dayKeys, teachers, matrix, max };
}

function renderBarChart(data) {
  if (!data.length) {
    return "<div class='muted'>Нет данных</div>";
  }
  const max = Math.max(...data.map((item) => item.value), 1);
  return `
    <div class="barList">
      ${data
        .map(
          (item) => `
            <div class="barRow">
              <span class="barLabel">${item.label}</span>
              <span class="barValue" style="width:${(item.value / max) * 100}%">
                <span>${item.value}</span>
              </span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderHeatmap(heat) {
  const { dayKeys, teachers, matrix, max } = heat;
  if (!teachers.length) {
    return "<div class='muted'>Нет данных для тепловой карты.</div>";
  }
  const gridTemplate = `200px repeat(${dayKeys.length}, 1fr)`;

  return `
    <div class="heatWrap">
      <div class="heatGrid" style="grid-template-columns:${gridTemplate}">
        <div class="heatHead">Преподаватель</div>
        ${dayKeys.map((day) => `<div class="heatHead">${day.slice(5)}</div>`).join("")}
        ${teachers
          .map((teacher) => {
            const values = matrix.get(teacher.uid);
            const cells = dayKeys
              .map((day) => {
                const value = values.get(day) || 0;
                return `<div class="heatCell" style="background:${heatColor(value, max)}">${value}</div>`;
              })
              .join("");
            return `<div class="heatName">${teacher.displayName || teacher.email}</div>${cells}`;
          })
          .join("")}
      </div>
    </div>
  `;
}

function heatColor(score, max) {
  if (!max) return "#f3f4f6";
  const ratio = score / max;
  if (ratio > 0.7) return "#d1fae5";
  if (ratio > 0.3) return "#fef3c7";
  if (score > 0) return "#fee2e2";
  return "#f3f4f6";
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
    render();
  }
});

if (!window.location.hash) {
  navigate("login");
}

render();
