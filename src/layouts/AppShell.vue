<script setup>
import { computed, ref } from "vue";
import { useRoute, useRouter, RouterLink, RouterView } from "vue-router";
import { useBackendHealth } from "../composables/useBackendHealth.js";
import {
  useProjectWorkspace,
  createProject,
  clearCurrentProject,
  getProjectById,
  projectExists,
} from "../stores/projectWorkspaceStore.js";
/** Vite 打包真实 logo，避免 public 占位图与缓存导致的色块误判 */
import logoSrc from "../assets/logo1.png";
import WorkspaceTopbar from "../components/WorkspaceTopbar.vue";

const route = useRoute();
const router = useRouter();
const health = useBackendHealth();
health.fetchHealth();

const {
  sortedProjects,
  sidebarCollapsed,
  currentProjectId,
  recentProjects,
  recentPredictions,
  recentMonitorTasks,
  recordProjectVisit,
} = useProjectWorkspace();

const showNewModal = ref(false);
const newName = ref("");
const newDesc = ref("");
const newError = ref("");

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}

/** 写死：Logo → 总览 + 清除当前项目 */
function goOverview() {
  clearCurrentProject();
  router.push("/overview");
}

/**
 * 侧栏「性能预测 / 实时监测 / 项目中心 / 数据资产」解析用项目 id：
 * 优先本地 current → 当前路由 → 列表首项；无则引导页。
 */
const navProjectId = computed(() => {
  const cur = currentProjectId.value;
  if (cur && projectExists(cur)) return cur;
  const rid = route.params.projectId;
  if (rid && projectExists(String(rid))) return String(rid);
  const first = sortedProjects.value[0];
  return first?.id ?? null;
});

function moduleHref(sub) {
  const id = navProjectId.value;
  if (!id) return "/workspace";
  return `/project/${id}/${sub}`;
}

function isModuleActive(sub) {
  if (sub === "overview") return route.path === "/overview";
  const id = route.params.projectId;
  if (!id || !projectExists(String(id))) return false;
  return route.path === `/project/${id}/${sub}`;
}

/** 收起态：仅预测 / 监测两个核心入口 */
function goCollapsedModule(sub) {
  const id = navProjectId.value;
  if (!id) {
    router.push("/workspace");
    return;
  }
  recordProjectVisit(id);
  router.push(`/project/${id}/${sub}`);
}

function openNewProject() {
  newError.value = "";
  newName.value = "";
  newDesc.value = "";
  showNewModal.value = true;
  sidebarCollapsed.value = false;
}

function closeNewModal() {
  showNewModal.value = false;
}

function submitNewProject() {
  newError.value = "";
  try {
    const name = newName.value.trim();
    if (!name) {
      newError.value = "请填写项目名称";
      return;
    }
    const p = createProject({ name, description: newDesc.value || null });
    recordProjectVisit(p.id);
    showNewModal.value = false;
    router.push(`/project/${p.id}/monitoring`);
  } catch (e) {
    newError.value = e?.message || String(e);
  }
}

function openProject(id) {
  recordProjectVisit(id);
  router.push(`/project/${id}/monitoring`);
}

function openRecentProject(projectId) {
  recordProjectVisit(projectId);
  router.push(`/project/${projectId}/monitoring`);
}

function openRecentPrediction(row) {
  const pid = String(row.projectId || "");
  if (!pid) return;
  recordProjectVisit(pid);
  router.push(`/project/${pid}/prediction`);
}

function openRecentMonitor(row) {
  const pid = String(row.projectId || "");
  if (!pid) return;
  recordProjectVisit(pid);
  router.push(`/project/${pid}/monitoring`);
}

function projectNameById(id) {
  const p = sortedProjects.value.find((x) => x.id === id);
  return p?.name || id;
}

function predictionSummary(row) {
  if (row.success === true) return `${row.prediction_mpa ?? "—"} MPa`;
  if (row.success === false) return `未通过：${row.error || "—"}`;
  return "已记录";
}

function monitorTaskSummary(row) {
  const name = row.taskName || `任务 #${row.taskId}`;
  const dev = row.deviceId ? ` · ${row.deviceId}` : "";
  return `${name}${dev}`;
}

/** 最近区合并为单一列表（按时间倒序），不再分子标题 */
const recentUnified = computed(() => {
  const rows = [];
  for (const r of recentProjects.value) {
    rows.push({
      kind: "visit",
      at: r.visitedAt,
      projectId: r.projectId,
      label: projectNameById(r.projectId),
      sub: "访问项目",
    });
  }
  for (const r of recentPredictions.value) {
    rows.push({
      kind: "prediction",
      at: r.at,
      projectId: r.projectId,
      label: projectNameById(r.projectId),
      sub: `预测 · ${predictionSummary(r)}`,
    });
  }
  for (const r of recentMonitorTasks.value) {
    rows.push({
      kind: "monitor",
      at: r.at,
      projectId: r.projectId,
      raw: r,
      label: projectNameById(r.projectId),
      sub: `监测 · ${monitorTaskSummary(r)}`,
    });
  }
  rows.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return rows.slice(0, 5);
});

function openRecentUnified(item) {
  if (item.kind === "visit") openRecentProject(item.projectId);
  else if (item.kind === "prediction") openRecentPrediction({ projectId: item.projectId });
  else openRecentMonitor(item.raw);
}

const routeProjectId = computed(() => String(route.params.projectId || ""));

/** 顶栏仅展示项目名称：全局总览不展示；/workspace 等无 projectId 也不展示 */
const topbarProjectName = computed(() => {
  if (route.path === "/overview") return "";
  const id = routeProjectId.value;
  if (!id || !projectExists(id)) return "";
  return getProjectById(id)?.name || "";
});
</script>

<template>
  <div class="app-shell" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <!-- 侧栏不用 platform-page：避免整栏卡片圆角/阴影与窄栏内容溢出叠在主区上 -->
    <aside class="sidebar" aria-label="工作台导航">
      <!-- ========== 收起态：仅 Logo + 收起按钮 + 预测 + 监测 ========== -->
      <div v-if="sidebarCollapsed" class="sidebar-collapsed-stack">
        <div class="collapsed-brand-block">
          <button type="button" class="collapsed-logo-btn" title="总览看板" @click="goOverview">
            <img :src="logoSrc" alt="" class="logo-img-collapsed" />
          </button>
          <div class="collapsed-brand-text">
            <span class="collapsed-brand-line1">DeepSight</span>
            <span class="collapsed-brand-line2">SynCore</span>
          </div>
        </div>
        <div class="sidebar-collapsed-rail" aria-label="侧栏快捷操作">
          <button
            type="button"
            class="rail-icon-btn"
            title="展开侧栏"
            aria-label="展开侧栏"
            @click="toggleSidebar"
          >
            <svg class="ico-svg" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M13 5l7 7-7 7M6 5l7 7-7 7"
              />
            </svg>
          </button>
          <button
            type="button"
            class="rail-icon-btn"
            title="性能预测"
            aria-label="性能预测"
            @click="goCollapsedModule('prediction')"
          >
            <svg class="ico-svg" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                d="M4 19V5M8 16l3-5 4 3 5-8"
              />
              <path fill="none" stroke="currentColor" stroke-width="2" d="M4 19h16" />
            </svg>
          </button>
          <button
            type="button"
            class="rail-icon-btn"
            title="实时监测"
            aria-label="实时监测"
            @click="goCollapsedModule('monitoring')"
          >
            <svg class="ico-svg" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                d="M4 14v4h4M4 10l4 4M8 6l4 10 4-6 4 4"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- ========== 展开态 ========== -->
      <div v-else class="sidebar-scroll">
        <!-- 1. 品牌区：Logo 左 | DeepSight / SynCore 两行右 | 收起 -->
        <div class="brand-row-expanded">
          <button type="button" class="logo-thumb-btn" title="总览看板（清除当前项目）" @click="goOverview">
            <img :src="logoSrc" alt="" class="logo-img-expanded" />
          </button>
          <button type="button" class="brand-title-stack" title="总览看板（清除当前项目）" @click="goOverview">
            <span class="brand-line brand-line-primary">DeepSight</span>
            <span class="brand-line brand-line-secondary">SynCore</span>
          </button>
          <button
            type="button"
            class="collapse-panel-btn"
            :title="sidebarCollapsed ? '展开侧栏' : '收起侧栏'"
            aria-label="收起侧栏"
            @click="toggleSidebar"
          >
            <svg class="collapse-svg" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 5l-7 7 7 7M21 5l-7 7 7 7"
              />
            </svg>
          </button>
        </div>

        <!-- 2. 功能模块区 -->
        <div class="block modules-block">
          <RouterLink
            to="/overview"
            class="mod-link"
            :class="{ active: isModuleActive('overview') }"
            @click="clearCurrentProject"
          >
            <span class="mod-ico">▦</span><span>总览</span>
          </RouterLink>
          <RouterLink :to="moduleHref('monitoring')" class="mod-link" :class="{ active: isModuleActive('monitoring') }">
            <span class="mod-ico">◌</span><span>监测</span>
          </RouterLink>
          <RouterLink :to="moduleHref('prediction')" class="mod-link" :class="{ active: isModuleActive('prediction') }">
            <span class="mod-ico">◢</span><span>预测</span>
          </RouterLink>
          <RouterLink :to="moduleHref('training')" class="mod-link" :class="{ active: isModuleActive('training') }">
            <span class="mod-ico">◍</span><span>训练</span>
          </RouterLink>
          <RouterLink :to="moduleHref('center')" class="mod-link" :class="{ active: isModuleActive('center') }">
            <span class="mod-ico">◫</span><span>项目</span>
          </RouterLink>
          <RouterLink :to="moduleHref('data')" class="mod-link" :class="{ active: isModuleActive('data') }">
            <span class="mod-ico">▤</span><span>数据</span>
          </RouterLink>
          <p v-if="!navProjectId" class="mod-hint">未选项目时，除总览外将前往工作台选择项目</p>
        </div>

        <!-- 3. 项目区 -->
        <div class="block projects-block">
          <p class="block-label">项目</p>
          <button type="button" class="btn-new" @click="openNewProject">+ 新建项目</button>
          <ul class="project-list">
            <li v-for="p in sortedProjects" :key="p.id">
              <button
                type="button"
                class="project-item"
                :class="{ active: routeProjectId === p.id }"
                @click="openProject(p.id)"
              >
                <span class="p-name">{{ p.name }}</span>
                <span class="p-sub">更新 {{ p.updated_at?.slice(0, 16) || "—" }}</span>
              </button>
            </li>
          </ul>
          <p v-if="!sortedProjects.length" class="empty-hint">暂无项目，请先新建</p>
        </div>

        <!-- 4. 最近区（合并列表，不分子块） -->
        <div class="block recent-block">
          <p class="block-label">最近</p>
          <ul class="recent-list">
            <li v-for="(item, i) in recentUnified" :key="`u-${i}-${item.at}-${item.kind}`">
              <button type="button" class="recent-row" @click="openRecentUnified(item)">
                <span class="r-main">{{ item.label }}</span>
                <span class="r-sub">{{ item.sub }}</span>
              </button>
            </li>
          </ul>
          <p v-if="!recentUnified.length" class="empty-hint mini">暂无记录</p>
        </div>
      </div>
    </aside>

    <div class="main-column">
      <!-- 右侧固定顶栏：搜索 / 项目名称（非总览） / 后端状态 / 通知 / 账户；与下方内容区分离，内容区单独滚动 -->
      <WorkspaceTopbar :project-name="topbarProjectName" :health-status="health.status" />

      <main class="main-scroll platform-page">
        <RouterView />
      </main>
    </div>

    <div v-if="showNewModal" class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="new-proj-title">
      <div class="modal platform-page">
        <h2 id="new-proj-title">新建项目</h2>
        <form class="modal-form" @submit.prevent="submitNewProject">
          <label>
            项目名称（必填）
            <input v-model="newName" type="text" maxlength="128" required autocomplete="off" />
          </label>
          <label>
            项目说明（可选）
            <textarea v-model="newDesc" rows="3" maxlength="2000" placeholder="可填写实验目的、标段等" />
          </label>
          <p v-if="newError" class="err">{{ newError }}</p>
          <div class="modal-actions">
            <button type="button" class="btn ghost" @click="closeNewModal">取消</button>
            <button type="submit" class="btn primary">创建并进入监测</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
/**
 * 工作台骨架：左栏 fixed 占满视口且单独滚动；右侧列 flex 列 = 顶栏 + 仅主内容区纵向滚动（整页不跟着滚）。
 */
.app-shell {
  --sidebar-expanded-w: 268px;
  --sidebar-collapsed-w: 52px;
  min-height: 100vh;
  min-height: 100dvh;
  background: #f4f9f4;
}
.app-shell.sidebar-collapsed {
  --sidebar-w: var(--sidebar-collapsed-w);
}
.app-shell:not(.sidebar-collapsed) {
  --sidebar-w: var(--sidebar-expanded-w);
}

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 40;
  width: var(--sidebar-w);
  height: 100vh;
  height: 100dvh;
  box-sizing: border-box;
  border-right: 1px solid #e0ebe3;
  background: #fafdfb;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* 防止子项（尤其收起态 Logo）因 min-content 宽度撑出侧栏与主区重叠 */
  min-width: 0;
}

/* —— 收起态 —— */
.sidebar-collapsed-stack {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  padding: 14px 0 16px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.collapsed-brand-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding-bottom: 14px;
  margin-bottom: 6px;
  border-bottom: 1px solid #e3ebe4;
}
.collapsed-brand-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}
.collapsed-brand-line1 {
  font-size: 0.56rem;
  font-weight: 800;
  color: #1b4524;
  letter-spacing: 0.03em;
  text-align: center;
  line-height: 1.15;
}
.collapsed-brand-line2 {
  font-size: 0.48rem;
  font-weight: 700;
  color: #2e5233;
  letter-spacing: 0.06em;
  text-align: center;
  line-height: 1.15;
  opacity: 0.92;
}
.sidebar-collapsed-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding-top: 4px;
}
.collapsed-logo-btn {
  border: none;
  padding: 0;
  margin: 0;
  background: transparent;
  cursor: pointer;
  border-radius: 10px;
  line-height: 0;
  width: 100%;
  max-width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.collapsed-logo-btn:hover {
  background: rgba(46, 125, 50, 0.08);
}
.logo-img-collapsed {
  /* 52px 栏宽：图片须 ≤52，避免与右侧主内容区水平重叠 */
  width: 44px;
  height: 44px;
  max-width: 100%;
  object-fit: contain;
  display: block;
}
.rail-icon-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  max-width: 100%;
  padding: 0;
  border: 1px solid #d5e3d7;
  border-radius: 10px;
  background: #fff;
  color: #2e5233;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 2px rgba(27, 94, 32, 0.06);
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}
.rail-icon-btn:hover {
  background: #f1f8f2;
  border-color: #9ccc9f;
  color: #1b5e20;
}
.ico-svg {
  width: 18px;
  height: 18px;
}

/* —— 展开态滚动区 —— */
.sidebar-scroll {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 18px 10px 20px;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  min-height: 0;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
.sidebar-scroll::-webkit-scrollbar {
  width: 6px;
}
.sidebar-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.sidebar-scroll::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 999px;
  transition: background 0.9s ease;
}
.sidebar-scroll:hover {
  scrollbar-color: rgba(93, 122, 99, 0.28) transparent;
}
.sidebar-scroll:hover::-webkit-scrollbar-thumb {
  background: rgba(93, 122, 99, 0.28);
}
.sidebar-scroll::-webkit-scrollbar-button {
  display: none;
  width: 0;
  height: 0;
}

.brand-row-expanded {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 36px;
  align-items: center;
  column-gap: 10px;
  min-height: 0;
  flex-shrink: 0;
  padding-bottom: 14px;
  margin-bottom: 10px;
  border-bottom: 1px solid #e3ebe4;
}
.logo-thumb-btn {
  grid-column: 1;
  align-self: center;
  flex-shrink: 0;
  border: none;
  padding: 2px 0;
  background: transparent;
  cursor: pointer;
  border-radius: 10px;
  line-height: 0;
  text-align: left;
  display: block;
}
.logo-thumb-btn:hover {
  background: rgba(46, 125, 50, 0.06);
}
.logo-img-expanded {
  width: auto;
  max-height: 52px;
  height: auto;
  max-width: 120px;
  object-fit: contain;
  object-position: left center;
  display: block;
}
.brand-title-stack {
  grid-column: 2;
  min-width: 0;
  margin: 0;
  padding: 4px 2px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 2px;
}
.brand-title-stack:hover {
  background: rgba(46, 125, 50, 0.05);
}
.brand-line {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.brand-line-primary {
  font-size: 1.12rem;
  font-weight: 700;
  color: #1b4524;
  line-height: 1.2;
  letter-spacing: -0.01em;
}
.brand-line-secondary {
  font-size: 0.88rem;
  font-weight: 600;
  color: #2e5233;
  line-height: 1.15;
  letter-spacing: 0.02em;
  opacity: 0.95;
}
/* 收起侧栏：圆角方块 + 双竖线箭头，语义为「收入侧栏」 */
.collapse-panel-btn {
  grid-column: 3;
  justify-self: end;
  align-self: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid #cfd8ce;
  border-radius: 10px;
  background: linear-gradient(180deg, #ffffff, #f4f7f4);
  color: #3d5a42;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}
.collapse-panel-btn:hover {
  background: linear-gradient(180deg, #f8fcf8, #eef5ee);
  border-color: #9ccc9f;
  color: #1b5e20;
  box-shadow: 0 2px 6px rgba(27, 94, 32, 0.08);
}
.collapse-svg {
  width: 18px;
  height: 18px;
}

.block {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.block-label {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #8a9b8c;
  text-transform: uppercase;
}

.mod-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  text-decoration: none;
  color: #314338;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 9px;
  padding: 0.48rem 0.58rem;
  font-weight: 600;
  font-size: 1.26rem;
  min-height: 36px;
  transition: background 0.15s ease, color 0.15s ease;
}
.mod-link:hover {
  background: #f5f8f6;
}
.mod-link.active {
  background: #edf6ef;
  color: #1e5a2a;
}
.mod-link.active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: 999px;
  background: #2e7d32;
}
.mod-ico {
  width: 1.5rem;
  color: #708471;
  font-size: 1.17rem;
  text-align: center;
}
.mod-link.active .mod-ico {
  color: #2e7d32;
}
.mod-hint {
  margin: 0.15rem 0 0;
  font-size: 0.72rem;
  color: #8fa393;
  line-height: 1.4;
}

.btn-new {
  border: 1px solid #43a047;
  background: linear-gradient(180deg, #e8f5e9, #dcedc8);
  color: #1b5e20;
  font-weight: 700;
  padding: 0.5rem 0.65rem;
  border-radius: 9px;
  cursor: pointer;
  font-size: 0.88rem;
}
.btn-new:hover {
  filter: brightness(1.02);
}

.project-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  max-height: 220px;
  overflow-y: auto;
}
.project-item {
  width: 100%;
  text-align: left;
  border: 1px solid #e8eeea;
  background: #fff;
  border-radius: 9px;
  padding: 0.42rem 0.5rem;
  cursor: pointer;
  display: grid;
  gap: 0.12rem;
}
.project-item:hover {
  border-color: #aed581;
}
.project-item.active {
  border-color: #43a047;
  box-shadow: 0 0 0 1px rgba(67, 160, 71, 0.2);
}
.p-name {
  font-weight: 600;
  font-size: 0.84rem;
  color: #1b5e20;
  word-break: break-all;
}
.p-sub {
  font-size: 0.7rem;
  color: #7a8f7d;
}

.empty-hint {
  margin: 0;
  font-size: 0.76rem;
  color: #9aaa9c;
}
.empty-hint.mini {
  margin-bottom: 0.35rem;
}

.recent-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
}
.recent-row {
  width: 100%;
  text-align: left;
  border: 1px solid #e5ede6;
  background: #fcfefc;
  border-radius: 8px;
  padding: 0.32rem 0.42rem;
  cursor: pointer;
  font-size: 0.78rem;
  color: #35533a;
  display: grid;
  gap: 0.08rem;
}
.recent-row:hover {
  background: #f0f7f1;
  border-color: #c5d8c7;
}
.r-sub {
  font-size: 0.7rem;
  color: #7a8f7d;
}

.main-column {
  margin-left: var(--sidebar-w);
  width: calc(100% - var(--sidebar-w));
  min-width: 0;
  height: 100vh;
  height: 100dvh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.85rem 1rem 1.25rem;
  -webkit-overflow-scrolling: touch;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 1rem;
}
.modal {
  width: 100%;
  max-width: 420px;
  padding: 1rem 1.15rem;
  border-radius: 12px;
  border: 1px solid #c8e6c9;
  background: #fff;
  box-shadow: 0 8px 32px rgba(27, 94, 32, 0.12);
}
.modal h2 {
  margin: 0 0 0.75rem;
  font-size: 1.05rem;
  color: #1b5e20;
}
.modal-form {
  display: grid;
  gap: 0.65rem;
}
.modal-form label {
  display: grid;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: #455a47;
}
.modal-form input,
.modal-form textarea {
  font: inherit;
  padding: 0.4rem 0.5rem;
  border: 1px solid #aed581;
  border-radius: 8px;
}
.err {
  margin: 0;
  color: #c62828;
  font-size: 0.85rem;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.25rem;
}
.btn {
  padding: 0.4rem 0.85rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid #66bb6a;
  font-size: 0.88rem;
}
.btn.ghost {
  background: #fff;
  color: #34533a;
}
.btn.primary {
  background: #e8f5e9;
  color: #1b5e20;
}

@media (max-width: 900px) {
  .main-scroll {
    padding: 0.65rem 0.75rem 1rem;
  }
}
</style>
