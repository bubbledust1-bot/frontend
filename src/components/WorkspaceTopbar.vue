<script setup>
import { computed, ref, onMounted, watchEffect } from "vue";
import { useRouter } from "vue-router";
import { currentUser, logout, isSuperadmin } from "../stores/authStore.js";
import {
  registrationRequests,
  hasPendingRequests as checkPendingRequests,
  loadRequestsFromStorage,
} from "../stores/registrationStore.js";
import GlobalSearchBox from "./platform/GlobalSearchBox.vue";

const props = defineProps({
  /** 当前项目名称；全局总览等场景传空字符串则不展示 */
  projectName: { type: String, default: "" },
  /** 后端状态：idle | loading | ok | bad */
  healthStatus: { type: String, default: "loading" },
});

/** 通知状态 */
const showNotifications = ref(false);
const hasPendingRequests = computed(() => {
  return isSuperadmin && checkPendingRequests();
});

onMounted(() => {
  loadRequestsFromStorage();
});

const router = useRouter();

/** 搜索框状态 */
const searchQuery = ref("");

/** 用户菜单下拉显示状态 */
const showUserMenu = ref(false);

const healthLabel = computed(() => {
  const s = props.healthStatus;
  if (s === "loading" || s === "idle") return "检查中";
  if (s === "ok") return "正常";
  if (s === "bad") return "异常";
  return "未检";
});

const healthKind = computed(() => {
  const s = props.healthStatus;
  if (s === "loading" || s === "idle") return "info";
  if (s === "ok") return "ok";
  return "bad";
});

const userDisplayName = computed(() => {
  return currentUser.value?.nickname || currentUser.value?.username || "用户";
});

const avatarInitial = computed(() => {
  const n = String(userDisplayName.value || "").trim();
  return n ? n.charAt(0).toUpperCase() : "用";
});

function goToSettings() {
  showUserMenu.value = false;
  router.push("/settings");
}

function goToAccountManagement() {
  showUserMenu.value = false;
  router.push("/admin/accounts");
}

function handleLogout() {
  showUserMenu.value = false;
  logout();
  router.push("/login");
}
</script>

<template>
  <header class="workspace-topbar" aria-label="工作区顶栏">
    <div class="topbar-inner">
      <div class="topbar-search-wrap">
        <GlobalSearchBox v-model="searchQuery" />
      </div>

      <div class="topbar-center">
        <span v-if="projectName" class="project-title">{{ projectName }}</span>
      </div>

      <div class="topbar-trail">
        <span class="health-pill" :class="healthKind" title="GET /api/health">
          后端：{{ healthLabel }}
        </span>

        <button
          type="button"
          class="icon-trigger"
          aria-label="通知"
          @click="showNotifications = !showNotifications"
          :title="hasPendingRequests ? '有新的账户申请' : '通知'"
        >
          <svg class="bell-ico" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7M13.73 21a2 2 0 01-3.46 0"
            />
          </svg>
          <span v-if="hasPendingRequests && isSuperadmin" class="notify-dot" aria-hidden="true" />
        </button>

        <div class="user-menu-container">
          <button
            type="button"
            class="account"
            @click="showUserMenu = !showUserMenu"
            aria-expanded="showUserMenu"
            aria-haspopup="true"
          >
            <span class="avatar" :title="userDisplayName">{{ avatarInitial }}</span>
            <span class="nickname">{{ userDisplayName }}</span>
            <svg class="caret-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="none" stroke="currentColor" stroke-width="2" d="M6 9l6 6 6-6" />
            </svg>
          </button>

          <div v-if="showUserMenu" class="user-dropdown" role="menu">
            <button type="button" class="dropdown-item" @click="goToSettings" role="menuitem">
              <span class="item-ico">⚙</span>
              <span>用户设置</span>
            </button>
            <button
              v-if="isSuperadmin"
              type="button"
              class="dropdown-item"
              @click="goToAccountManagement"
              role="menuitem"
            >
              <span class="item-ico">👥</span>
              <span>账户管理</span>
            </button>
            <div class="dropdown-divider" role="separator"></div>
            <button type="button" class="dropdown-item danger" @click="handleLogout" role="menuitem">
              <span class="item-ico">🚪</span>
              <span>退出登录</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.workspace-topbar {
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.97);
  border-bottom: 1px solid #dde8df;
  box-shadow: 0 1px 0 rgba(27, 94, 32, 0.04);
}

.topbar-inner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 1rem;
  min-height: 52px;
  box-sizing: border-box;
}

.topbar-search-wrap {
  flex: 0 1 280px;
  min-width: 120px;
}

.topbar-center {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 0.5rem;
}

.project-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #1b5e20;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topbar-trail {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.health-pill {
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.28rem 0.55rem;
  border-radius: 999px;
  border: 1px solid transparent;
  white-space: nowrap;
}
.health-pill.ok {
  background: #e8f5e9;
  color: #1b5e20;
  border-color: #a5d6a7;
}
.health-pill.info {
  background: #e3f2fd;
  color: #1565c0;
  border-color: #90caf9;
}
.health-pill.bad {
  background: #ffebee;
  color: #c62828;
  border-color: #ef9a9a;
}

.icon-trigger {
  position: relative;
  width: 38px;
  height: 38px;
  padding: 0;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #3d5a42;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;
}
.icon-trigger:hover {
  background: rgba(46, 125, 50, 0.08);
}

.bell-ico {
  width: 20px;
  height: 20px;
}

.notify-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #e53935;
  border: 1.5px solid #fff;
  box-shadow: 0 0 0 1px rgba(229, 57, 53, 0.25);
}

.user-menu-container {
  position: relative;
}

.account {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.6rem;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.account:hover {
  background: rgba(46, 125, 50, 0.06);
  border-color: #c8e6c9;
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(145deg, #c8e6c9, #81c784);
  color: #1b5e20;
  font-weight: 800;
  font-size: 0.92rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid rgba(46, 125, 50, 0.25);
}

.nickname {
  font-size: 0.88rem;
  font-weight: 600;
  color: #2e4a31;
  max-width: 7rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.caret-icon {
  width: 16px;
  height: 16px;
  color: #6b8f72;
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 200px;
  background: #fff;
  border: 1px solid #c8e6c9;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(27, 94, 32, 0.15);
  z-index: 100;
  overflow: hidden;
}

.dropdown-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 1rem;
  border: none;
  background: transparent;
  color: #314338;
  font-size: 0.9rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease;
}

.dropdown-item:hover {
  background: #f5fbf6;
}

.dropdown-item.danger {
  color: #c62828;
}

.dropdown-item.danger:hover {
  background: #ffebee;
}

.item-ico {
  font-size: 1.1rem;
  line-height: 1;
}

.dropdown-divider {
  height: 1px;
  background: #e8f5e9;
  margin: 0.25rem 0;
}

@media (max-width: 760px) {
  .topbar-inner {
    flex-wrap: wrap;
    min-height: auto;
    padding: 0.5rem 0.65rem;
  }
  .topbar-search-wrap {
    flex: 1 1 100%;
    order: 0;
  }
  .topbar-center {
    order: 2;
    flex: 1 1 auto;
    justify-content: flex-start;
  }
  .topbar-trail {
    order: 1;
    margin-left: auto;
  }
}
</style>
