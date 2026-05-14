/**
 * 项目工作台：第一版本地持久化（localStorage），不接 backend。
 * 路由守卫与组件共用同一状态，避免重复实例。
 */

import { computed, ref, watch } from "vue";

const LS_PROJECTS = "ds_projects_v1";
const LS_CURRENT_ID = "ds_current_project_id";
const LS_SIDEBAR = "ds_sidebar_collapsed";
const LS_RECENT_PROJECTS = "ds_recent_projects_v1";
const LS_RECENT_PREDS = "ds_recent_predictions_v1";
const LS_RECENT_MONITOR = "ds_recent_monitor_tasks_v1";

function nowIso() {
  return new Date().toISOString();
}

function newProjectId() {
  return `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/** @type {import('vue').Ref<Array<{ id: string, name: string, description: string | null, created_at: string, updated_at: string }>>} */
export const projects = ref([]);

/** @type {import('vue').Ref<string | null>} */
export const currentProjectId = ref(null);

/** @type {import('vue').Ref<boolean>} */
export const sidebarCollapsed = ref(false);

/** @type {import('vue').Ref<Array<{ projectId: string, visitedAt: string }>>} */
export const recentProjects = ref([]);

/** @type {import('vue').Ref<Array<Record<string, unknown>>>} */
export const recentPredictions = ref([]);

/** @type {import('vue').Ref<Array<Record<string, unknown>>>} */
export const recentMonitorTasks = ref([]);

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function initFromStorage() {
  const list = loadJson(LS_PROJECTS, []);
  projects.value = Array.isArray(list) ? list : [];

  const id = localStorage.getItem(LS_CURRENT_ID);
  currentProjectId.value = id && typeof id === "string" ? id : null;

  sidebarCollapsed.value = localStorage.getItem(LS_SIDEBAR) === "1";

  recentProjects.value = loadJson(LS_RECENT_PROJECTS, []);
  recentPredictions.value = loadJson(LS_RECENT_PREDS, []);
  recentMonitorTasks.value = loadJson(LS_RECENT_MONITOR, []);
}

initFromStorage();

watch(
  projects,
  (v) => {
    try {
      localStorage.setItem(LS_PROJECTS, JSON.stringify(v));
    } catch {
      /* 忽略配额错误 */
    }
  },
  { deep: true },
);

watch(currentProjectId, (id) => {
  try {
    if (id) localStorage.setItem(LS_CURRENT_ID, id);
    else localStorage.removeItem(LS_CURRENT_ID);
  } catch {
    /* ignore */
  }
});

watch(sidebarCollapsed, (c) => {
  try {
    localStorage.setItem(LS_SIDEBAR, c ? "1" : "0");
  } catch {
    /* ignore */
  }
});

function persistRecentProjects() {
  try {
    localStorage.setItem(LS_RECENT_PROJECTS, JSON.stringify(recentProjects.value.slice(0, 5)));
  } catch {
    /* ignore */
  }
}

function persistRecentPreds() {
  try {
    localStorage.setItem(LS_RECENT_PREDS, JSON.stringify(recentPredictions.value.slice(0, 5)));
  } catch {
    /* ignore */
  }
}

function persistRecentMonitor() {
  try {
    localStorage.setItem(LS_RECENT_MONITOR, JSON.stringify(recentMonitorTasks.value.slice(0, 5)));
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} id
 */
export function projectExists(id) {
  if (!id) return false;
  return projects.value.some((p) => p.id === id);
}

/**
 * @param {string} id
 */
export function getProjectById(id) {
  return projects.value.find((p) => p.id === id) ?? null;
}

export function clearCurrentProject() {
  currentProjectId.value = null;
}

/**
 * @param {string} id
 */
export function setCurrentProjectId(id) {
  currentProjectId.value = id;
}

/**
 * @param {{ name: string, description?: string | null }} payload
 */
export function createProject(payload) {
  const name = String(payload.name || "").trim();
  if (!name) throw new Error("项目名称不能为空");
  const description = payload.description != null && String(payload.description).trim() ? String(payload.description).trim() : null;
  const t = nowIso();
  const p = {
    id: newProjectId(),
    name,
    description,
    created_at: t,
    updated_at: t,
  };
  projects.value = [...projects.value, p];
  return p;
}

/**
 * @param {string} id
 * @param {{ name?: string, description?: string | null }} patch
 */
export function updateProject(id, patch) {
  const idx = projects.value.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  const cur = projects.value[idx];
  const next = { ...cur, updated_at: nowIso() };
  if (patch.name != null) next.name = String(patch.name).trim() || cur.name;
  if (patch.description !== undefined) {
    next.description =
      patch.description != null && String(patch.description).trim() ? String(patch.description).trim() : null;
  }
  const copy = [...projects.value];
  copy[idx] = next;
  projects.value = copy;
  return next;
}

/**
 * @param {string} projectId
 */
export function recordProjectVisit(projectId) {
  if (!projectId) return;
  const row = { projectId, visitedAt: nowIso() };
  recentProjects.value = [row, ...recentProjects.value.filter((x) => x.projectId !== projectId)].slice(0, 10);
  persistRecentProjects();
}

/**
 * @param {string} projectId
 * @param {Record<string, unknown>} detail
 */
export function recordPredictionActivity(projectId, detail) {
  if (!projectId) return;
  const row = { projectId, at: nowIso(), ...detail };
  recentPredictions.value = [row, ...recentPredictions.value].slice(0, 10);
  persistRecentPreds();
}

/**
 * 左栏「最近监测任务」：仅本地记录，不接 backend。
 * @param {{ projectId: string, taskId: number, deviceId?: string, taskName?: string }} payload
 */
export function recordMonitorTaskActivity(payload) {
  if (!payload?.projectId || payload.taskId == null) return;
  const key = `${payload.projectId}:${payload.taskId}`;
  const row = {
    projectId: String(payload.projectId),
    taskId: Number(payload.taskId),
    deviceId: payload.deviceId != null ? String(payload.deviceId) : "",
    taskName: payload.taskName || `任务 #${payload.taskId}`,
    at: nowIso(),
  };
  recentMonitorTasks.value = [
    row,
    ...recentMonitorTasks.value.filter((x) => `${x.projectId}:${x.taskId}` !== key),
  ].slice(0, 10);
  persistRecentMonitor();
}

/**
 * 组件内使用：与 store 同源 ref
 */
export function useProjectWorkspace() {
  const sortedProjects = computed(() => [...projects.value].sort((a, b) => b.updated_at.localeCompare(a.updated_at)));

  return {
    projects,
    sortedProjects,
    currentProjectId,
    sidebarCollapsed,
    recentProjects,
    recentPredictions,
    recentMonitorTasks,
    projectExists,
    getProjectById,
    clearCurrentProject,
    setCurrentProjectId,
    createProject,
    updateProject,
    recordProjectVisit,
    recordPredictionActivity,
  };
}
