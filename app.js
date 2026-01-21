const STORAGE_KEY = "kpi_plain_data";

const defaultData = {
  user: null,
  teachers: [
    { id: "t1", name: "Анна Петрова", department: "Экономика" },
    { id: "t2", name: "Иван Смирнов", department: "Маркетинг" },
    { id: "t3", name: "Мария Орлова", department: "Финансы" },
  ],
  types: [
    { id: "k1", name: "Публикации", unit: "баллы", plan: 30 },
    { id: "k2", name: "Обратная связь", unit: "баллы", plan: 20 },
    { id: "k3", name: "Методические материалы", unit: "баллы", plan: 25 },
    { id: "k4", name: "Курирование проектов", unit: "баллы", plan: 15 },
  ],
  results: [
    {
      id: "r1",
      teacherId: "t1",
      typeId: "k1",
      score: 12,
      date: "2024-09-12",
      status: "approved",
      comment: "Статья в журнале ВАК",
    },
    {
      id: "r2",
      teacherId: "t1",
      typeId: "k2",
      score: 8,
      date: "2024-09-20",
      status: "pending",
      comment: "Сбор отзывов студентов",
    },
    {
      id: "r3",
      teacherId: "t2",
      typeId: "k3",
      score: 14,
      date: "2024-09-18",
      status: "approved",
      comment: "Новые методички",
    },
    {
      id: "r4",
      teacherId: "t3",
      typeId: "k4",
      score: 10,
      date: "2024-09-10",
      status: "approved",
      comment: "Сопровождение стартапа",
    },
  ],
};

const app = document.getElementById("app");
const navRight = document.getElementById("navRight");
const navLinks = document.getElementById("navLinks");
const loginForm = document.getElementById("loginForm");

const state = loadData();

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(defaultData);
  try {
    const parsed = JSON.parse(raw);
    return { ...structuredClone(defaultData), ...parsed };
  } catch (error) {
    return structuredClone(defaultData);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setUser(user) {
  state.user = user;
  saveData();
  render();
}

function logout() {
  state.user = null;
  saveData();
  render();
  navigate("login");
}

function navigate(route) {
  window.location.hash = `#/${route}`;
}

function getRoute() {
  const hash = window.location.hash.replace(/^#\//, "");
  return hash || "profile";
}

function teacherById(id) {
  return state.teachers.find((teacher) => teacher.id === id);
}

function typeById(id) {
  return state.types.find((type) => type.id === id);
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ru-RU");
}

function sumResults(results) {
  return results.reduce((total, item) => total + item.score, 0);
}

function resultsByTeacher(teacherId) {
  return state.results.filter((item) => item.teacherId === teacherId);
}

function approvedResults(items) {
  return items.filter((item) => item.status === "approved");
}

function pendingResults(items) {
  return items.filter((item) => item.status === "pending");
}

function renderNav() {
  if (!state.user) {
    navRight.innerHTML = "<small class=\"muted\">Вы не авторизованы</small>";
  } else {
    navRight.innerHTML = `
      <span class="badge">${state.user.role === "admin" ? "Админ" : "Преподаватель"}</span>
      <strong>${state.user.name}</strong>
      <button class="btn secondary" id="logoutBtn">Выйти</button>
    `;
    document.getElementById("logoutBtn").addEventListener("click", logout);
  }

  const route = getRoute();
  [...navLinks.querySelectorAll(".navLink")].forEach((link) => {
    const target = link.getAttribute("href").replace(/^#\//, "");
    link.classList.toggle("active", target === route);
    if (!state.user) {
      link.classList.add("disabled");
    } else {
      link.classList.remove("disabled");
    }
  });

  if (state.user?.role !== "admin") {
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
  const activeTeacher =
    state.user.role === "admin"
      ? state.teachers[0]
      : state.teachers.find((teacher) => teacher.name === state.user.name) || state.teachers[0];
  const items = resultsByTeacher(activeTeacher.id);
  const approved = approvedResults(items);
  const pending = pendingResults(items);

  section.innerHTML = `
    <div class="sectionTitle">
      <h1>Профиль</h1>
      <span class="badge">${activeTeacher.department}</span>
    </div>
    <p class="sectionLead">Быстрый обзор по преподавателю и статусам KPI.</p>
    <div class="grid2">
      <div class="card mini">
        <h3>${activeTeacher.name}</h3>
        <small class="muted">Текущие баллы (одобрено)</small>
        <h2>${sumResults(approved)}</h2>
      </div>
      <div class="card mini">
        <h3>Запросы на согласование</h3>
        <small class="muted">Ожидают подтверждения</small>
        <h2>${pending.length}</h2>
      </div>
    </div>
    <div class="sectionInner">
      <h3>Последние активности</h3>
      ${renderResultsTable(items.slice(0, 4))}
    </div>
  `;
}

function renderRating() {
  const section = app.querySelector("[data-route='rating']");
  if (!state.user) {
    section.innerHTML = renderLocked("Рейтинг");
    return;
  }

  const rows = state.teachers
    .map((teacher) => {
      const approved = approvedResults(resultsByTeacher(teacher.id));
      return { ...teacher, total: sumResults(approved) };
    })
    .sort((a, b) => b.total - a.total);

  section.innerHTML = `
    <div class="sectionTitle">
      <h1>Рейтинг преподавателей</h1>
      <span class="badge">Обновляется в реальном времени</span>
    </div>
    <p class="sectionLead">Сводка по утверждённым результатам KPI.</p>
    <table class="table">
      <thead>
        <tr>
          <th>#</th>
          <th>Преподаватель</th>
          <th>Факультет</th>
          <th>Баллы</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${row.name}</td>
                <td>${row.department}</td>
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
  const headers = state.types.map((type) => type.name);
  const gridTemplate = `200px repeat(${headers.length}, 1fr)`;

  const grid = state.teachers
    .map((teacher) => {
      const items = approvedResults(resultsByTeacher(teacher.id));
      const cells = state.types
        .map((type) => {
          const score = items
            .filter((item) => item.typeId === type.id)
            .reduce((sum, item) => sum + item.score, 0);
          return `<div class="heatCell" style="background:${heatColor(score, type.plan)}">${score}</div>`;
        })
        .join("");
      return `<div class="heatName">${teacher.name}</div>${cells}`;
    })
    .join("");

  section.innerHTML = `
    <div class="sectionTitle">
      <h1>Статистика по KPI</h1>
      <span class="badge">Тепловая карта</span>
    </div>
    <p class="sectionLead">Быстрый обзор достижения планов по каждому показателю.</p>
    <div class="heatWrap">
      <div class="heatGrid" style="grid-template-columns:${gridTemplate}">
        <div class="heatHead">Преподаватель</div>
        ${headers.map((name) => `<div class="heatHead">${name}</div>`).join("")}
        ${grid}
      </div>
    </div>
    <div class="sectionInner">
      <h3>Объяснение цветов</h3>
      <div class="row">
        <span class="badge">0-30% плана</span>
        <span class="badge">31-70% плана</span>
        <span class="badge">71%+ плана</span>
      </div>
    </div>
  `;
}

function renderAddResult() {
  const section = app.querySelector("[data-route='add']");
  if (!state.user) {
    section.innerHTML = renderLocked("Добавить результат");
    return;
  }

  if (state.user.role !== "teacher") {
    section.innerHTML = renderOnlyTeacher();
    return;
  }

  const teacher = state.teachers.find((item) => item.name === state.user.name) || state.teachers[0];

  section.innerHTML = `
    <h1>Добавить результат</h1>
    <p class="sectionLead">Создайте заявку на подтверждение KPI.</p>
    <form id="addForm" class="stack">
      <div class="grid2">
        <div class="stack">
          <label>Тип KPI</label>
          <select name="type">
            ${state.types.map((type) => `<option value="${type.id}">${type.name}</option>`).join("")}
          </select>
        </div>
        <div class="stack">
          <label>Баллы</label>
          <input class="input" type="number" name="score" min="1" required />
        </div>
      </div>
      <div class="grid2">
        <div class="stack">
          <label>Дата</label>
          <input class="input" type="date" name="date" required />
        </div>
        <div class="stack">
          <label>Комментарий</label>
          <input class="input" type="text" name="comment" placeholder="Опишите результат" />
        </div>
      </div>
      <button class="btn" type="submit">Отправить на согласование</button>
    </form>
    <div class="sectionInner">
      <h3>Ваши последние заявки</h3>
      ${renderResultsTable(resultsByTeacher(teacher.id).slice(0, 5))}
    </div>
  `;

  section.querySelector("#addForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const result = {
      id: `r${Date.now()}`,
      teacherId: teacher.id,
      typeId: formData.get("type"),
      score: Number(formData.get("score")),
      date: formData.get("date"),
      status: "pending",
      comment: formData.get("comment") || "",
    };
    state.results.unshift(result);
    saveData();
    render();
  });
}

function renderApprovals() {
  const section = app.querySelector("[data-route='admin/approvals']");
  if (!state.user) {
    section.innerHTML = renderLocked("Админ: одобрения");
    return;
  }
  if (state.user.role !== "admin") {
    section.innerHTML = renderOnlyAdmin();
    return;
  }

  const pending = pendingResults(state.results);
  section.innerHTML = `
    <h1>Заявки на одобрение</h1>
    <p class="sectionLead">Утвердите результаты или отправьте на доработку.</p>
    ${pending.length === 0 ? "<div class='success'>Нет заявок на согласование.</div>" : ""}
    ${renderApprovalTable(pending)}
  `;

  section.querySelectorAll("button[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;
      const action = button.dataset.action;
      const target = state.results.find((item) => item.id === id);
      if (target) {
        target.status = action === "approve" ? "approved" : "rejected";
        saveData();
        render();
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
  if (state.user.role !== "admin") {
    section.innerHTML = renderOnlyAdmin();
    return;
  }

  section.innerHTML = `
    <h1>Типы KPI</h1>
    <p class="sectionLead">Настройте показатели и плановые значения.</p>
    <table class="table">
      <thead>
        <tr>
          <th>Название</th>
          <th>План</th>
          <th>Ед.</th>
        </tr>
      </thead>
      <tbody>
        ${state.types
          .map(
            (type) => `
              <tr>
                <td>${type.name}</td>
                <td>${type.plan}</td>
                <td>${type.unit}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
    <div class="sectionInner">
      <h3>Добавить новый тип</h3>
      <form id="typeForm" class="grid2">
        <input class="input" name="name" placeholder="Название" required />
        <input class="input" type="number" name="plan" placeholder="План" min="1" required />
        <button class="btn" type="submit">Добавить</button>
      </form>
    </div>
  `;

  section.querySelector("#typeForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const newType = {
      id: `k${Date.now()}`,
      name: formData.get("name"),
      plan: Number(formData.get("plan")),
      unit: "баллы",
    };
    state.types.push(newType);
    saveData();
    render();
  });
}

function renderUsers() {
  const section = app.querySelector("[data-route='admin/users']");
  if (!state.user) {
    section.innerHTML = renderLocked("Админ: пользователи");
    return;
  }
  if (state.user.role !== "admin") {
    section.innerHTML = renderOnlyAdmin();
    return;
  }

  section.innerHTML = `
    <h1>Пользователи</h1>
    <p class="sectionLead">Данные преподавателей и их подразделения.</p>
    <table class="table">
      <thead>
        <tr>
          <th>Преподаватель</th>
          <th>Подразделение</th>
          <th>Баллы (одобрено)</th>
        </tr>
      </thead>
      <tbody>
        ${state.teachers
          .map((teacher) => {
            const total = sumResults(approvedResults(resultsByTeacher(teacher.id)));
            return `
              <tr>
                <td>${teacher.name}</td>
                <td>${teacher.department}</td>
                <td>${total}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

function renderTeacherDetail() {
  const section = app.querySelector("[data-route='admin/teacher']");
  if (!state.user) {
    section.innerHTML = renderLocked("Админ: преподаватель");
    return;
  }
  if (state.user.role !== "admin") {
    section.innerHTML = renderOnlyAdmin();
    return;
  }

  const selectedId = section.dataset.teacherId || state.teachers[0]?.id;
  const teacher = teacherById(selectedId);
  const items = resultsByTeacher(teacher.id);

  section.innerHTML = `
    <h1>Карточка преподавателя</h1>
    <p class="sectionLead">Детальная информация по KPI и заявкам.</p>
    <div class="grid2">
      <div class="stack">
        <label>Преподаватель</label>
        <select id="teacherSelect">
          ${state.teachers
            .map(
              (item) => `<option value="${item.id}" ${item.id === teacher.id ? "selected" : ""}>${item.name}</option>`
            )
            .join("")}
        </select>
      </div>
      <div class="stack">
        <label>Подразделение</label>
        <div class="input">${teacher.department}</div>
      </div>
    </div>
    <div class="sectionInner">
      <h3>Заявки и результаты</h3>
      ${renderResultsTable(items)}
    </div>
  `;

  section.querySelector("#teacherSelect").addEventListener("change", (event) => {
    section.dataset.teacherId = event.target.value;
    render();
  });
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
          <th>Показатель</th>
          <th>Баллы</th>
          <th>Статус</th>
          <th>Комментарий</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map((item) => {
            const type = typeById(item.typeId);
            return `
              <tr>
                <td>${formatDate(item.date)}</td>
                <td>${type?.name || "—"}</td>
                <td>${item.score}</td>
                <td>${renderStatus(item.status)}</td>
                <td>${item.comment || "—"}</td>
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
          <th>Показатель</th>
          <th>Баллы</th>
          <th>Дата</th>
          <th>Комментарий</th>
          <th>Действия</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map((item) => {
            const teacher = teacherById(item.teacherId);
            const type = typeById(item.typeId);
            return `
              <tr>
                <td>${teacher?.name || "—"}</td>
                <td>${type?.name || "—"}</td>
                <td>${item.score}</td>
                <td>${formatDate(item.date)}</td>
                <td>${item.comment || "—"}</td>
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

function heatColor(score, plan) {
  const ratio = plan === 0 ? 0 : score / plan;
  if (ratio > 0.7) return "#d1fae5";
  if (ratio > 0.3) return "#fef3c7";
  return "#fee2e2";
}

function renderLogin() {
  if (!state.user) return;
  const loginSection = app.querySelector("[data-route='login']");
  loginSection.innerHTML = `
    <h1>Вы уже авторизованы</h1>
    <p class="sectionLead">Используйте меню навигации, чтобы перейти в нужный раздел.</p>
    <button class="btn" id="goProfile">Перейти в профиль</button>
  `;
  loginSection.querySelector("#goProfile").addEventListener("click", () => navigate("profile"));
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

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const name = formData.get("name");
  const role = formData.get("role");
  if (!name) return;
  setUser({ name, role });
  navigate("profile");
});

window.addEventListener("hashchange", updateRouteVisibility);

if (!window.location.hash) {
  navigate("login");
}

render();
