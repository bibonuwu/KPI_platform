import { signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth } from "./firebase-config.js";
import { elements, getRoute, navigate, parseRoute, state } from "./state.js";
import {
  approvedResults,
  buildByType,
  buildDailySeries,
  buildHeatmap,
  escapeValue,
  formatDate,
  isImage,
  isPdf,
  loadRatingSnapshot,
  pendingResults,
  pickEvidence,
  renderBarChart,
  renderHeatmap,
  resultsByUser,
  saveRatingSnapshot,
  sumResults,
} from "./utils.js";
import {
  addSubmission,
  addType,
  approveSubmission,
  refreshAll,
  rejectSubmission,
  seedDefaultTypes,
  setRole,
  toggleType,
  updateProfile,
  uploadEvidence,
} from "./api.js";

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

export function renderNav() {
  if (!state.user) {
    elements.navRight.innerHTML = "<small class=\"muted\">Вы не авторизованы</small>";
  } else {
    elements.navRight.innerHTML = `
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
  [...elements.navLinks.querySelectorAll(".navLink")].forEach((link) => {
    const target = link.getAttribute("href").replace(/^#\//, "").split("?")[0];
    link.classList.toggle("active", target === route);
    if (!state.user) {
      link.classList.add("disabled");
    } else {
      link.classList.remove("disabled");
    }
  });

  if (state.role !== "admin") {
    [...elements.navLinks.querySelectorAll("a[href^='#/admin']")].forEach((link) => {
      link.classList.add("hidden");
    });
  } else {
    [...elements.navLinks.querySelectorAll("a[href^='#/admin']")].forEach((link) => {
      link.classList.remove("hidden");
    });
  }
}

function renderProfile() {
  const section = elements.app.querySelector("[data-route='profile']");
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
    await updateProfile(state.user.uid, update);
    state.profile = { ...state.profile, ...update };
    await refreshAll();
    render();
  });

  const bootstrapButton = section.querySelector("#bootstrapAdmin");
  if (bootstrapButton) {
    bootstrapButton.addEventListener("click", async () => {
      await setRole(state.user.uid, "admin");
      state.role = "admin";
      await refreshAll();
      render();
    });
  }
}

function renderRating() {
  const section = elements.app.querySelector("[data-route='rating']");
  if (!state.user) {
    section.innerHTML = renderLocked("Рейтинг");
    return;
  }

  const rows = state.users
    .filter((item) => item.role !== "admin")
    .map((teacher) => ({ ...teacher, total: teacher.totalPoints ?? 0 }))
    .sort((a, b) => b.total - a.total);

  const previousSnapshot = loadRatingSnapshot();
  const previousRanks = new Map(previousSnapshot.map((item, index) => [item.uid, index + 1]));
  const nextSnapshot = rows.map((row) => ({ uid: row.uid, total: row.total }));

  section.innerHTML = `
    <div class="sectionTitle">
      <h1>Рейтинг преподавателей</h1>
      <span class="badge">UFC-стиль</span>
    </div>
    <p class="sectionLead">Сводка по утверждённым результатам KPI с динамикой мест.</p>
    <div class="ratingBoard">
      ${rows
        .map((row, index) => {
          const currentRank = index + 1;
          const prevRank = previousRanks.get(row.uid);
          const delta = prevRank ? prevRank - currentRank : 0;
          const trend =
            prevRank === undefined
              ? "<span class='trend new'>NEW</span>"
              : delta > 0
                ? `<span class='trend up'>▲ +${delta}</span>`
                : delta < 0
                  ? `<span class='trend down'>▼ ${delta}</span>`
                  : "<span class='trend same'>• 0</span>";
          return `
            <div class="ratingRow">
              <div class="ratingRank">${currentRank}</div>
              <div class="ratingMain">
                <div class="ratingName">${row.displayName || row.email}</div>
                <div class="ratingMeta">${row.school || "—"} · ${row.subject || "—"}</div>
              </div>
              <div class="ratingScore">
                <span>${row.total}</span>
                ${trend}
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;

  saveRatingSnapshot(nextSnapshot);
}

function renderStats() {
  const section = elements.app.querySelector("[data-route='stats']");
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
  const pending = pendingResults(resultsByUser(state.user.uid));

  return `
    <div class="sectionTitle">
      <h1>Личная статистика</h1>
      <span class="badge">Ваши KPI</span>
    </div>
    <p class="sectionLead">Сводка по достижениям за последние 14 дней и по типам KPI.</p>
    <div class="statsGrid">
      <div class="statCard">
        <small class="muted">Всего заявок</small>
        <h2>${resultsByUser(state.user.uid).length}</h2>
      </div>
      <div class="statCard">
        <small class="muted">Одобрено</small>
        <h2>${approved.length}</h2>
      </div>
      <div class="statCard">
        <small class="muted">В ожидании</small>
        <h2>${pending.length}</h2>
      </div>
      <div class="statCard">
        <small class="muted">Баллы</small>
        <h2>${sumResults(approved)}</h2>
      </div>
    </div>
    <div class="chartGrid">
      <div class="chartCard">
        <div class="chartHead"><h3>Баллы по дням</h3></div>
        ${renderBarChart(daily.map((item) => ({ label: item.day, value: item.points })))}
      </div>
      <div class="chartCard">
        <div class="chartHead"><h3>Баллы по типам</h3></div>
        ${renderBarChart(byType.map((item) => ({ label: item.name, value: item.points })))}
      </div>
      <div class="chartCard">
        <div class="chartHead"><h3>Статус заявок</h3></div>
        ${renderBarChart([
          { label: "Одобрено", value: approved.length },
          { label: "В ожидании", value: pending.length },
        ])}
      </div>
    </div>
  `;
}

function renderAdminStats() {
  const approved = approvedResults(state.submissions);
  const pending = pendingResults(state.submissions);
  const rejected = state.submissions.filter((item) => item.status === "rejected");
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
  const heat = buildHeatmap(approved, 14, state.users);

  return `
    <div class="sectionTitle">
      <h1>Статистика платформы</h1>
      <span class="badge">Админ-обзор</span>
    </div>
    <p class="sectionLead">Сводные KPI по преподавателям и типам достижений.</p>
    <div class="statsGrid">
      <div class="statCard">
        <small class="muted">Преподаватели</small>
        <h2>${state.users.filter((item) => item.role !== "admin").length}</h2>
      </div>
      <div class="statCard">
        <small class="muted">Заявки</small>
        <h2>${state.submissions.length}</h2>
      </div>
      <div class="statCard">
        <small class="muted">На проверке</small>
        <h2>${pending.length}</h2>
      </div>
      <div class="statCard">
        <small class="muted">Баллы (всего)</small>
        <h2>${sumResults(approved)}</h2>
      </div>
    </div>
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
      <div class="chartCard">
        <div class="chartHead"><h3>Статусы заявок</h3></div>
        ${renderBarChart([
          { label: "Одобрено", value: approved.length },
          { label: "В ожидании", value: pending.length },
          { label: "Отклонено", value: rejected.length },
        ])}
      </div>
    </div>
    <div class="sectionInner">
      <h3>Тепловая карта (преподаватель / день)</h3>
      ${renderHeatmap(heat)}
    </div>
  `;
}

function renderAddResult() {
  const section = elements.app.querySelector("[data-route='add']");
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
    const fileUrl = await uploadEvidence(state.user.uid, file);

    await addSubmission({
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
    });
    await refreshAll();
    render();
  });
}

function renderApprovals() {
  const section = elements.app.querySelector("[data-route='admin/approvals']");
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

  section.querySelector("#refreshApprovals").addEventListener("click", async () => {
    await refreshAll();
    render();
  });

  section.querySelectorAll("button[data-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.id;
      const action = button.dataset.action;
      const target = state.submissions.find((item) => item.id === id);
      if (target) {
        if (action === "approve") {
          await approveSubmission(target, state.user.uid);
        } else {
          await rejectSubmission(target, state.user.uid);
        }
        await refreshAll();
        render();
      }
    });
  });
}

function renderTypes() {
  const section = elements.app.querySelector("[data-route='admin/types']");
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
        await toggleType(type.id, input.checked);
        await refreshAll();
        render();
      }
    });
  });

  section.querySelector("#seedTypes").addEventListener("click", async () => {
    await seedDefaultTypes(DEFAULT_TYPES);
    await refreshAll();
    render();
  });

  section.querySelector("#typeForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    await addType({
      section: formData.get("section"),
      subsection: formData.get("subsection"),
      name: formData.get("name"),
      defaultPoints: Number(formData.get("points")),
      active: true,
    });
    await refreshAll();
    render();
  });
}

function renderUsers() {
  const section = elements.app.querySelector("[data-route='admin/users']");
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
        await setRole(target.uid, button.dataset.action);
        await refreshAll();
        render();
      });
    });
  }

  search.addEventListener("input", renderRows);
  section.querySelector("#refreshUsers").addEventListener("click", async () => {
    await refreshAll();
    render();
  });
  renderRows();
}

function renderTeacherDetail() {
  const section = elements.app.querySelector("[data-route='admin/teacher']");
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
  const loginSection = elements.app.querySelector("[data-route='login']");
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
  const section = elements.app.querySelector("[data-route='register']");
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

export function updateRouteVisibility() {
  const route = getRoute();
  elements.app.querySelectorAll("[data-route]").forEach((section) => {
    section.classList.toggle("hidden", section.dataset.route !== route);
  });
}

export function render() {
  renderNav();
  renderSections();
  updateRouteVisibility();
}

export function bindAuthForms(onLogin, onRegister) {
  const loginForm = elements.app.querySelector("[data-route='login'] #loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", onLogin);
  }

  const registerForm = elements.app.querySelector("[data-route='register'] #registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", onRegister);
  }
}
