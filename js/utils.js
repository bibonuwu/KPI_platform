import { RATING_SNAPSHOT_KEY, state } from "./state.js";

export function formatDate(value) {
  if (!value) return "—";
  const date = value.toDate ? value.toDate() : new Date(value);
  return date.toLocaleDateString("ru-RU");
}

export function sumResults(results) {
  return results.reduce((total, item) => total + (item.points || 0), 0);
}

export function resultsByUser(userId) {
  return state.submissions.filter((item) => item.uid === userId);
}

export function approvedResults(items) {
  return items.filter((item) => item.status === "approved");
}

export function pendingResults(items) {
  return items.filter((item) => item.status === "pending");
}

export function isImage(url) {
  return /\.(png|jpg|jpeg|webp)$/i.test(url || "");
}

export function isPdf(url) {
  return /\.pdf$/i.test(url || "");
}

export function pickEvidence(item) {
  const link = (item.evidenceLink || "").trim();
  const fileUrl = (item.evidenceFileUrl || "").trim();
  return { link, fileUrl };
}

export function escapeValue(value) {
  return String(value ?? "").replace(/"/g, "&quot;");
}

export function loadRatingSnapshot() {
  try {
    const raw = localStorage.getItem(RATING_SNAPSHOT_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
}

export function saveRatingSnapshot(snapshot) {
  localStorage.setItem(RATING_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export function buildDailySeries(items, days) {
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

export function buildByType(items) {
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

export function buildHeatmap(items, days, teachers) {
  const daily = buildDailySeries(items, days);
  const dayKeys = daily.map((item) => item.day);
  const filteredTeachers = teachers.filter((item) => item.role !== "admin");
  const matrix = new Map();
  let max = 0;

  filteredTeachers.forEach((teacher) => {
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

  return { dayKeys, teachers: filteredTeachers, matrix, max };
}

export function renderBarChart(data) {
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

export function renderHeatmap(heat) {
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

export function heatColor(score, max) {
  if (!max) return "#f3f4f6";
  const ratio = score / max;
  if (ratio > 0.7) return "#d1fae5";
  if (ratio > 0.3) return "#fef3c7";
  if (score > 0) return "#fee2e2";
  return "#f3f4f6";
}
