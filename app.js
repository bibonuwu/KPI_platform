const STORAGE_KEY = "kpi_plain_data";

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
].map((item, index) => ({
  id: `k${index + 1}`,
  ...item,
  active: true,
}));

const defaultData = {
  userId: null,
  ui: { selectedTeacherId: null },
  users: [
    {
      id: "u1",
      email: "admin@demo.kz",
      password: "admin123",
      displayName: "Админ Демо",
      role: "admin",
      school: "КПИ демо-лицей",
      subject: "Менеджмент",
      experienceYears: 8,
      phone: "+7 777 111 22 33",
      city: "Алматы",
      position: "Методист",
      totalPoints: 44,
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 40,
    },
    {
      id: "u2",
      email: "teacher@demo.kz",
      password: "teacher123",
      displayName: "Анна Петрова",
      role: "teacher",
      school: "КПИ демо-лицей",
      subject: "Экономика",
      experienceYears: 5,
      phone: "+7 777 888 00 11",
      city: "Астана",
      position: "Преподаватель",
      totalPoints: 20,
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 15,
    },
    {
      id: "u3",
      email: "teacher2@demo.kz",
      password: "teacher123",
      displayName: "Иван Смирнов",
      role: "teacher",
      school: "КПИ демо-лицей",
      subject: "Маркетинг",
      experienceYears: 4,
      phone: "+7 701 333 44 55",
      city: "Шымкент",
      position: "Преподаватель",
      totalPoints: 24,
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
    },
  ],
  types: [...DEFAULT_TYPES],
  submissions: [
    {
      id: "s1",
      uid: "u2",
      typeId: "k1",
      typeName: "Семинарға қатысу (мектепішілік)",
      typeSection: "Кәсіби даму",
      typeSubsection: "Семинарлар",
      points: 5,
      title: "Участие в школьном семинаре",
      description: "Отчет о проделанной работе",
      eventDate: "2024-09-12",
      evidenceLink: "https://example.com/report",
      evidenceFileUrl: "",
      status: "approved",
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
      decidedAt: Date.now() - 1000 * 60 * 60 * 24 * 6,
    },
    {
      id: "s2",
      uid: "u2",
      typeId: "k2",
      typeName: "Семинарға қатысу (аудандық)",
      typeSection: "Кәсіби даму",
      typeSubsection: "Семинарлар",
      points: 10,
      title: "Сбор отзывов студентов",
      description: "Обратная связь по курсу",
      eventDate: "2024-09-20",
      evidenceLink: "",
      evidenceFileUrl: "",
      status: "pending",
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    },
    {
      id: "s3",
      uid: "u3",
      typeId: "k6",
      typeName: "Кәсіби кітап оқу (1 кітап)",
      typeSection: "Жеке даму",
      typeSubsection: "Кітап оқу",
      points: 5,
      title: "Книга по стратегии",
      description: "Применил выводы на практике",
      eventDate: "2024-09-10",
      evidenceLink: "",
      evidenceFileUrl: "",
      status: "approved",
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 9,
      decidedAt: Date.now() - 1000 * 60 * 60 * 24 * 8,
    },
  ],
};

const app = document.getElementById("app");
const navRight = document.getElementById("navRight");
const navLinks = document.getElementById("navLinks");

const state = loadData();

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(defaultData);
  try {
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(defaultData),
      ...parsed,
      ui: { ...structuredClone(defaultData.ui), ...(parsed.ui || {}) },
      users: parsed.users || structuredClone(defaultData.users),
      types: parsed.types || structuredClone(defaultData.types),
      submissions: parsed.submissions || structuredClone(defaultData.submissions),
    };
  } catch (error) {
    return structuredClone(defaultData);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getCurrentUser() {
  return state.users.find((user) => user.id === state.userId) || null;
}

function setUserId(userId) {
  state.userId = userId;
  saveData();
  render();
}

function logout() {
  state.userId = null;
  saveData();
  render();
  navigate("login");
}

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

function findUser(id) {
  return state.users.find((user) => user.id === id);
}

function findType(id) {
  return state.types.find((type) => type.id === id);
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ru-RU");
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ru-RU");
}

function sumResults(results) {
  return results.reduce((total, item) => total + item.points, 0);
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
  return /\.(png|jpg|jpeg|webp)$/i.test(url || "") || (url || "").startsWith("data:image/");
}

function isPdf(url) {
  return /\.pdf$/i.test(url || "") || (url || "").startsWith("data:application/pdf");
}

function pickEvidence(item) {
  const link = (item.evidenceLink || "").trim();
  const fileUrl = (item.evidenceFileUrl || "").trim();
  return {
    link,
    fileUrl,
  };
}

function renderNav() {
  const user = getCurrentUser();
  if (!user) {
    navRight.innerHTML = "<small class=\"muted\">Вы не авторизованы</small>";
  } else {
    navRight.innerHTML = `
      <span class="badge">${user.role === "admin" ? "Админ" : "Преподаватель"}</span>
      <strong>${user.displayName || user.email}</strong>
      <button class="btn secondary" id="logoutBtn">Выйти</button>
    `;
    document.getElementById("logoutBtn").addEventListener("click", logout);
  }

  const route = getRoute();
  [...navLinks.querySelectorAll(".navLink")].forEach((link) => {
    const target = link.getAttribute("href").replace(/^#\//, "").split("?")[0];
    link.classList.toggle("active", target === route);
    if (!user) {
      link.classList.add("disabled");
    } else {
      link.classList.remove("disabled");
    }
  });

  if (user?.role !== "admin") {
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
  const user = getCurrentUser();
  if (!user) {
    section.innerHTML = renderLocked("Профиль");
    return;
  }

  const items = resultsByUser(user.id);
  const approved = approvedResults(items);
  const pending = pendingResults(items);
  const hasAdmin = state.users.some((item) => item.role === "admin");

  section.innerHTML = `
    <div class="sectionTitle">
      <h1>Профиль</h1>
      <span class="badge">${user.role === "admin" ? "Администратор" : "Преподаватель"}</span>
    </div>
    <p class="sectionLead">Редактируйте данные и отслеживайте статус достижений.</p>
    <div class="grid2">
      <div class="card mini">
        <h3>${user.displayName || "Без имени"}</h3>
        <small class="muted">Подтверждённые баллы</small>
        <h2>${sumResults(approved)}</h2>
      </div>
      <div class="card mini">
        <h3>Заявки в ожидании</h3>
        <small class="muted">Требуют проверки</small>
        <h2>${pending.length}</h2>
      </div>
    </div>

    ${!hasAdmin && user.role !== "admin" ? `
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
          <input class="input" name="displayName" value="${escapeValue(user.displayName)}" />
        </div>
        <div class="stack">
          <label>Школа</label>
          <input class="input" name="school" value="${escapeValue(user.school)}" />
        </div>
        <div class="stack">
          <label>Предмет</label>
          <input class="input" name="subject" value="${escapeValue(user.subject)}" />
        </div>
        <div class="stack">
          <label>Стаж (лет)</label>
          <input class="input" type="number" min="0" name="experienceYears" value="${user.experienceYears ?? 0}" />
        </div>
        <div class="stack">
          <label>Телефон</label>
          <input class="input" name="phone" value="${escapeValue(user.phone)}" />
        </div>
        <div class="stack">
          <label>Город</label>
          <input class="input" name="city" value="${escapeValue(user.city)}" />
        </div>
        <div class="stack">
          <label>Должность</label>
          <input class="input" name="position" value="${escapeValue(user.position)}" />
        </div>
        <div class="stack">
          <label>Email</label>
          <div class="input">${user.email}</div>
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
  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    Object.assign(user, {
      displayName: data.get("displayName")?.trim() || "",
      school: data.get("school")?.trim() || "",
      subject: data.get("subject")?.trim() || "",
      experienceYears: Number(data.get("experienceYears")) || 0,
      phone: data.get("phone")?.trim() || "",
      city: data.get("city")?.trim() || "",
      position: data.get("position")?.trim() || "",
    });
    saveData();
    render();
  });

  const bootstrapButton = section.querySelector("#bootstrapAdmin");
  if (bootstrapButton) {
    bootstrapButton.addEventListener("click", () => {
      user.role = "admin";
      saveData();
      render();
    });
  }
}

function renderRating() {
  const section = app.querySelector("[data-route='rating']");
  const user = getCurrentUser();
  if (!user) {
    section.innerHTML = renderLocked("Рейтинг");
    return;
  }

  const rows = state.users
    .filter((item) => item.role !== "admin")
    .map((teacher) => {
      const approved = approvedResults(resultsByUser(teacher.id));
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
  const user = getCurrentUser();
  if (!user) {
    section.innerHTML = renderLocked("Статистика");
    return;
  }

  if (user.role === "admin") {
    section.innerHTML = renderAdminStats();
  } else {
    section.innerHTML = renderTeacherStats(user);
  }
}

function renderTeacherStats(user) {
  const approved = approvedResults(resultsByUser(user.id));
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
      points: sumResults(approvedResults(resultsByUser(teacher.id))),
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
  const user = getCurrentUser();
  if (!user) {
    section.innerHTML = renderLocked("Добавить результат");
    return;
  }

  if (user.role !== "teacher") {
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
      ${renderResultsTable(resultsByUser(user.id).slice(0, 5))}
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
      const selectedType = findType(typeSelect.value);
      pointsInput.value = selectedType ? selectedType.defaultPoints : "";
    });
  }

  sectionSelect.addEventListener("change", updateSelectors);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const typeId = data.get("typeId");
    const type = findType(typeId);
    if (!type) {
      alert("Выберите тип достижения.");
      return;
    }

    const file = form.querySelector("input[name='file']").files[0];
    let fileUrl = "";
    if (file) {
      fileUrl = await readFileAsDataUrl(file);
    }

    const submission = {
      id: `s${Date.now()}`,
      uid: user.id,
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
      createdAt: Date.now(),
    };
    state.submissions.unshift(submission);
    saveData();
    render();
  });
}

function renderApprovals() {
  const section = app.querySelector("[data-route='admin/approvals']");
  const user = getCurrentUser();
  if (!user) {
    section.innerHTML = renderLocked("Админ: одобрения");
    return;
  }
  if (user.role !== "admin") {
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

  section.querySelector("#refreshApprovals").addEventListener("click", render);

  section.querySelectorAll("button[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;
      const action = button.dataset.action;
      const target = state.submissions.find((item) => item.id === id);
      if (target) {
        if (action === "approve") {
          target.status = "approved";
          target.decidedAt = Date.now();
          const owner = findUser(target.uid);
          if (owner) {
            owner.totalPoints = (owner.totalPoints || 0) + (target.points || 0);
          }
        } else {
          target.status = "rejected";
          target.decidedAt = Date.now();
        }
        saveData();
        render();
      }
    });
  });
}

function renderTypes() {
  const section = app.querySelector("[data-route='admin/types']");
  const user = getCurrentUser();
  if (!user) {
    section.innerHTML = renderLocked("Админ: типы KPI");
    return;
  }
  if (user.role !== "admin") {
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
    input.addEventListener("change", () => {
      const type = findType(input.dataset.id);
      if (type) {
        type.active = input.checked;
        saveData();
        render();
      }
    });
  });

  section.querySelector("#seedTypes").addEventListener("click", () => {
    const existing = new Set(state.types.map((type) => type.name.toLowerCase()));
    DEFAULT_TYPES.forEach((type) => {
      if (!existing.has(type.name.toLowerCase())) {
        state.types.push({ ...type, id: `k${Date.now()}${Math.random().toString(16).slice(2, 6)}` });
      }
    });
    saveData();
    render();
  });

  section.querySelector("#typeForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const newType = {
      id: `k${Date.now()}`,
      section: formData.get("section"),
      subsection: formData.get("subsection"),
      name: formData.get("name"),
      defaultPoints: Number(formData.get("points")),
      active: true,
    };
    state.types.push(newType);
    saveData();
    render();
  });
}

function renderUsers() {
  const section = app.querySelector("[data-route='admin/users']");
  const user = getCurrentUser();
  if (!user) {
    section.innerHTML = renderLocked("Админ: пользователи");
    return;
  }
  if (user.role !== "admin") {
    section.innerHTML = renderOnlyAdmin();
    return;
  }

  section.innerHTML = `
    <div class="row" style="align-items:center">
      <h1 style="margin-bottom:0">Пользователи</h1>
      <input class="input" id="userSearch" placeholder="Поиск: ФИО / email / школа / предмет" style="max-width: 320px" />
      <button class="btn secondary" id="refreshUsers">Обновить</button>
    </div>
    <div id="userStatus"></div>
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
    const query = search.value.trim().toLowerCase();
    const filtered = state.users.filter((item) => {
      const haystack = [item.displayName, item.email, item.school, item.subject].join(" ").toLowerCase();
      return haystack.includes(query);
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
              <button class="btn secondary" data-action="teacher" data-id="${item.id}">teacher</button>
              <button class="btn" data-action="admin" data-id="${item.id}">admin</button>
              <button class="btn secondary" data-action="details" data-id="${item.id}">Профиль</button>
            </td>
          </tr>
        `
      )
      .join("");

    tbody.querySelectorAll("button[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = findUser(button.dataset.id);
        if (!target) return;
        if (button.dataset.action === "details") {
          state.ui.selectedTeacherId = target.id;
          saveData();
          navigate("admin/teacher");
          return;
        }
        target.role = button.dataset.action;
        saveData();
        render();
      });
    });
  }

  search.addEventListener("input", renderRows);
  section.querySelector("#refreshUsers").addEventListener("click", renderRows);
  renderRows();
}

function renderTeacherDetail() {
  const section = app.querySelector("[data-route='admin/teacher']");
  const user = getCurrentUser();
  if (!user) {
    section.innerHTML = renderLocked("Админ: преподаватель");
    return;
  }
  if (user.role !== "admin") {
    section.innerHTML = renderOnlyAdmin();
    return;
  }

  const { params } = parseRoute();
  const paramId = params.get("uid");
  const selectedId = paramId || state.ui.selectedTeacherId || state.users.find((item) => item.role !== "admin")?.id;
  const teacher = findUser(selectedId);

  if (!teacher) {
    section.innerHTML = "<div class='error'>Преподаватель не найден.</div>";
    return;
  }

  const items = resultsByUser(teacher.id);
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
            const owner = findUser(item.uid);
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

  const user = getCurrentUser();
  if (!user) {
    loginSection.innerHTML = `
      <h1>Вход в систему</h1>
      <p class="sectionLead">Введите email и пароль или перейдите к регистрации.</p>
      <form id="loginForm" class="stack">
        <div class="grid2">
          <div class="stack">
            <label>Email</label>
            <input class="input" name="email" type="email" placeholder="teacher@demo.kz" required />
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
      <div class="sectionInner">
        <h3>Демо-доступы</h3>
        <div class="row">
          <span class="badge">admin@demo.kz / admin123</span>
          <span class="badge">teacher@demo.kz / teacher123</span>
        </div>
      </div>
    `;
    const form = loginSection.querySelector("#loginForm");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const email = data.get("email").trim().toLowerCase();
      const password = data.get("password");
      const match = state.users.find((item) => item.email.toLowerCase() === email && item.password === password);
      if (!match) {
        alert("Неверный email или пароль.");
        return;
      }
      setUserId(match.id);
      navigate("profile");
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
  const user = getCurrentUser();
  if (user) {
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

  section.querySelector("#registerForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const email = formData.get("email").trim().toLowerCase();
    if (state.users.some((item) => item.email.toLowerCase() === email)) {
      alert("Пользователь с таким email уже существует.");
      return;
    }
    const newUser = {
      id: `u${Date.now()}`,
      email,
      password: formData.get("password"),
      displayName: formData.get("displayName"),
      role: "teacher",
      school: formData.get("school") || "",
      subject: formData.get("subject") || "",
      experienceYears: Number(formData.get("experienceYears")) || 0,
      phone: "",
      city: "",
      position: "",
      totalPoints: 0,
      createdAt: Date.now(),
    };
    state.users.push(newUser);
    saveData();
    setUserId(newUser.id);
    navigate("profile");
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

function escapeValue(value) {
  return String(value ?? "").replace(/"/g, "&quot;");
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
    const key = item.eventDate || new Date(item.createdAt).toISOString().slice(0, 10);
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
      .filter((item) => item.uid === teacher.id)
      .forEach((item) => {
        const day = item.eventDate || new Date(item.createdAt).toISOString().slice(0, 10);
        if (!map.has(day)) return;
        map.set(day, (map.get(day) || 0) + (item.points || 0));
      });
    map.forEach((value) => {
      if (value > max) max = value;
    });
    matrix.set(teacher.id, map);
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
            const values = matrix.get(teacher.id);
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

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}

window.addEventListener("hashchange", updateRouteVisibility);

if (!window.location.hash) {
  navigate("login");
}

render();
