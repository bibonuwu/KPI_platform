export const RATING_SNAPSHOT_KEY = "rating_snapshot";

export const elements = {
  app: document.getElementById("app"),
  navRight: document.getElementById("navRight"),
  sidebar: document.getElementById("sidebar"),
};

export const state = {
  user: null,
  profile: null,
  role: null,
  types: [],
  submissions: [],
  users: [],
  ui: { selectedTeacherId: null },
};

export function navigate(route) {
  window.location.hash = `#/${route}`;
}

export function parseRoute() {
  const hash = window.location.hash.replace(/^#\//, "");
  const [path, queryString] = hash.split("?");
  const params = new URLSearchParams(queryString || "");
  return { path: path || "profile", params };
}

export function getRoute() {
  return parseRoute().path;
}
