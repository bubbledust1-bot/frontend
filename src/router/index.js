import { createRouter, createWebHistory } from "vue-router";
import AppShell from "../layouts/AppShell.vue";
import ProjectWorkspaceShell from "../layouts/ProjectWorkspaceShell.vue";
import DashboardView from "../views/DashboardView.vue";
import WorkspaceGuideView from "../views/WorkspaceGuideView.vue";
import PredictionView from "../views/PredictionView.vue";
import MonitoringView from "../views/MonitoringView.vue";
import ProjectCenterPage from "../views/ProjectCenterPage.vue";
import ProjectDataPage from "../views/ProjectDataPage.vue";
import ModelTrainingView from "../views/ModelTrainingView.vue";
import LoginView from "../views/LoginView.vue";
import LandingView from "../views/LandingView.vue";
import {
  projectExists,
  clearCurrentProject,
  setCurrentProjectId,
} from "../stores/projectWorkspaceStore.js";
import { isLoggedIn, mustChangePassword, isSuperadmin } from "../stores/authStore.js";

const routes = [
  {
    path: "/",
    name: "landing",
    component: LandingView,
    meta: { requiresAuth: false },
  },
  {
    path: "/login",
    name: "login",
    component: LoginView,
    meta: { requiresAuth: false },
  },
  {
    path: "/overview",
    component: AppShell,
    meta: { requiresAuth: true },
    children: [
      {
        path: "",
        name: "overview",
        component: DashboardView,
      },
    ],
  },
  {
    path: "/workspace",
    component: AppShell,
    meta: { requiresAuth: true },
    children: [
      {
        path: "",
        name: "workspace",
        component: WorkspaceGuideView,
      },
    ],
  },
  {
    path: "/settings",
    component: AppShell,
    meta: { requiresAuth: true },
    children: [
      {
        path: "",
        name: "settings",
        component: () => import("../views/UserSettingsView.vue"),
      },
    ],
  },
  {
    path: "/admin/accounts",
    component: AppShell,
    meta: { requiresAuth: true, requiresSuperadmin: true },
    children: [
      {
        path: "",
        name: "admin-accounts",
        component: () => import("../views/AccountManagementView.vue"),
      },
    ],
  },
  {
    path: "/project/:projectId",
    component: AppShell,
    meta: { requiresAuth: true },
    children: [
      {
        path: "",
        redirect: (to) => `/project/${to.params.projectId}/monitoring`,
      },
      {
        path: "prediction",
        name: "project-prediction",
        component: PredictionView,
      },
      {
        path: "monitoring",
        name: "project-monitoring",
        component: MonitoringView,
      },
      {
        path: "center",
        name: "project-center",
        component: ProjectCenterPage,
      },
      {
        path: "data",
        name: "project-data",
        component: ProjectDataPage,
      },
      {
        path: "training",
        name: "project-training",
        component: ModelTrainingView,
      },
    ],
  },
  // 兼容旧路径的重定向
  { path: "/dashboard", redirect: "/overview" },
  { path: "/prediction", redirect: "/workspace" },
  { path: "/monitoring", redirect: "/workspace" },
  { path: "/projects", redirect: "/workspace" },
  { path: "/data-hub", redirect: "/workspace" },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  // 登录页和落地页不需要认证
  if (to.path === "/login" || to.path === "/") {
    if (to.path === "/login" && isLoggedIn.value) {
      next({ path: "/overview", replace: true });
      return;
    }
    next();
    return;
  }

  // 需要认证的页面
  if (to.meta.requiresAuth !== false) {
    if (!isLoggedIn.value) {
      next({ path: "/login", replace: true });
      return;
    }

    // 强制修改密码（登录后必须先改密码）
    if (mustChangePassword.value && to.path !== "/settings") {
      next({ path: "/settings", replace: true });
      return;
    }

    // 需要 superadmin 权限的页面
    if (to.meta.requiresSuperadmin && !isSuperadmin.value) {
      next({ path: "/overview", replace: true });
      return;
    }
  }

  // 原有项目相关的路由守卫
  if (to.path === "/overview" || to.path === "/workspace") {
    clearCurrentProject();
  }
  const m = to.path.match(/^\/project\/([^/]+)/);
  if (m) {
    const id = m[1];
    if (!projectExists(id)) {
      next({ path: "/workspace", replace: true });
      return;
    }
  }
  next();
});

router.afterEach((to) => {
  const m = to.path.match(/^\/project\/([^/]+)/);
  if (m && projectExists(m[1])) {
    setCurrentProjectId(m[1]);
  }
});

export default router;
