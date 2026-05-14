<script setup>
import { computed } from "vue";
import { useRoute, RouterLink, RouterView } from "vue-router";
import { useBackendHealth } from "../composables/useBackendHealth.js";
import { useSensorMonitor } from "../composables/useSensorMonitor.js";

const route = useRoute();
const health = useBackendHealth();
// 只用于顶栏“实时通道状态”展示，避免改动现有监测页内部逻辑。
const sensor = useSensorMonitor({ historyFetchLimit: 50 });

health.fetchHealth();

const wsText = computed(() => {
  if (sensor.wsConnecting.value) return "连接中";
  return sensor.wsConnected.value ? "已连接" : "未连接";
});

const wsKind = computed(() => {
  if (sensor.wsConnecting.value) return "info";
  return sensor.wsConnected.value ? "ok" : "bad";
});

const healthKind = computed(() => {
  if (health.status === "loading") return "info";
  return health.status === "ok" ? "ok" : "bad";
});

const navItems = [
  { to: "/dashboard", label: "总览看板" },
  { to: "/prediction", label: "强度预测" },
  { to: "/monitoring", label: "环境监测" },
  { to: "/projects", label: "项目中心" },
  { to: "/data-hub", label: "数据资产" },
];
</script>

<template>
  <div class="platform-shell">
    <aside class="side platform-page">
      <h2>深眸智链</h2>
      <p class="sub">DeepSight SynCore</p>
      <nav>
        <RouterLink
          v-for="n in navItems"
          :key="n.to"
          :to="n.to"
          class="nav-link"
          :class="{ active: route.path === n.to }"
        >
          {{ n.label }}
        </RouterLink>
      </nav>
    </aside>

    <main class="main">
      <header class="top platform-page">
        <div class="title-wrap">
          <h1>材料智能监测平台</h1>
          <p>以展示为中心的多页面平台框架（第一版）</p>
        </div>
        <div class="status-wrap">
          <span class="platform-tag" :class="healthKind">
            后端：{{ health.status === "loading" ? "检查中" : health.status === "ok" ? "正常" : "异常" }}
          </span>
          <span class="platform-tag" :class="wsKind">实时通道：{{ wsText }}</span>
        </div>
      </header>

      <section class="content platform-page">
        <RouterView />
      </section>
    </main>
  </div>
</template>

<style scoped>
.platform-shell {
  max-width: 1280px;
  margin: 0 auto;
  padding: 1rem;
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 1rem;
}

.side {
  padding: 1rem;
  height: fit-content;
}
.side h2 {
  margin: 0;
  color: #1b5e20;
}
.sub {
  margin: 0.25rem 0 0.9rem;
  color: #6b7f70;
  font-size: 0.86rem;
}

nav {
  display: grid;
  gap: 0.45rem;
}
.nav-link {
  display: block;
  text-decoration: none;
  color: #34533a;
  border: 1px solid #d5e5d8;
  background: #fff;
  border-radius: 8px;
  padding: 0.45rem 0.65rem;
  font-weight: 600;
}
.nav-link.active {
  background: #e8f5e9;
  border-color: #9ccc9f;
  color: #1b5e20;
}

.main {
  min-width: 0;
}
.top {
  padding: 0.9rem 1rem;
  margin-bottom: 0.8rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.8rem;
}
.title-wrap h1 {
  margin: 0;
  font-size: 1.2rem;
  color: #1b5e20;
}
.title-wrap p {
  margin: 0.25rem 0 0;
  color: #6b7f70;
  font-size: 0.86rem;
}
.status-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.content {
  padding: 0.95rem;
}

@media (max-width: 980px) {
  .platform-shell {
    grid-template-columns: 1fr;
  }
}
</style>
