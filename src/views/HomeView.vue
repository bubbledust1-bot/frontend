<script setup>
import { computed, onMounted, provide, watch } from "vue";
import PredictSection from "../components/PredictSection.vue";
import SensorSection from "../components/SensorSection.vue";
import { usePredict } from "../composables/usePredict.js";
import { useBackendHealth } from "../composables/useBackendHealth.js";
import { useSensorMonitor } from "../composables/useSensorMonitor.js";
import { getApiBaseUrl, getWsBaseUrl } from "../api/config.js";

const predict = usePredict();
const health = useBackendHealth();
const sensor = useSensorMonitor({ historyFetchLimit: 100 });

provide("sensorMonitor", sensor);

const predictSummary = computed(() => {
  if (predict.loading.value) {
    return { label: "预测中…", kind: "loading" };
  }
  const r = predict.result.value;
  if (!r) {
    return { label: "尚未预测", kind: "idle" };
  }
  if (r.success === true) {
    return { label: "成功", kind: "ok" };
  }
  if (r.success === false) {
    return { label: "业务未通过", kind: "biz" };
  }
  return { label: "—", kind: "idle" };
});

const wsLabel = computed(() => {
  if (sensor.wsConnecting) return "连接中";
  if (sensor.wsConnected) return "已连接";
  return "断开";
});

const wsKind = computed(() => {
  if (sensor.wsConnecting) return "pending";
  if (sensor.wsConnected) return "ok";
  return "bad";
});

onMounted(() => {
  health.fetchHealth();
});

/** WebSocket 能连上通常说明 8000 端口可达；若首次 REST 探活因竞态失败，这里再探一次 */
watch(
  () => sensor.wsConnected,
  (ok) => {
    if (ok && health.status !== "ok") {
      health.fetchHealth();
    }
  },
);

function apiHint() {
  try {
    const a = getApiBaseUrl();
    const w = getWsBaseUrl();
    return `REST ${a} · WS ${w}`;
  } catch {
    return "";
  }
}
</script>

<template>
  <div class="page">
    <header class="hero">
      <div class="hero-titles">
        <h1>深眸智链 <span class="en">DeepSight SynCore</span></h1>
        <p class="sub">材料强度预测与环境实时监测平台</p>
      </div>

      <div class="status-bar" aria-label="系统状态摘要">
        <div
          class="pill"
          :data-kind="health.status === 'ok' ? 'ok' : health.status === 'loading' ? 'pending' : 'bad'"
          :title="health.status !== 'ok' && health.detail ? health.detail : ''"
        >
          <span class="k">后端</span>
          <span class="v">{{
            health.status === "loading" ? "检查中" : health.status === "ok" ? "正常" : "异常"
          }}</span>
        </div>
        <div class="pill" :data-kind="wsKind">
          <span class="k">实时通道</span>
          <span class="v">{{ wsLabel }}</span>
        </div>
        <div class="pill" :data-kind="predictSummary.kind === 'ok' ? 'ok' : predictSummary.kind === 'biz' ? 'warn' : predictSummary.kind === 'loading' ? 'pending' : 'idle'">
          <span class="k">最近预测</span>
          <span class="v">{{ predictSummary.label }}</span>
        </div>
        <div
          v-if="sensor.selectedDeviceId"
          class="pill"
          :data-kind="sensor.selectedAlarm === 'alarm' ? 'bad' : sensor.selectedAlarm === 'ok' ? 'ok' : 'idle'"
        >
          <span class="k">当前设备环境</span>
          <span class="v">{{
            sensor.selectedAlarm === "alarm" ? "超温报警" : sensor.selectedAlarm === "ok" ? "正常" : "无温度数据"
          }}</span>
        </div>
      </div>
      <p class="env-hint">{{ apiHint() }}</p>
    </header>

    <div class="grid-main">
      <PredictSection
        :form="predict.form"
        :loading="predict.loading"
        :result="predict.result"
        :network-error="predict.networkError"
        :submit="predict.submit"
      />
      <SensorSection />
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 1.25rem 1.25rem 2.5rem;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", sans-serif;
  color: var(--ds-text, #2d3a2e);
}

.hero {
  margin-bottom: 1.5rem;
  padding: 1.25rem 1.35rem;
  background: linear-gradient(135deg, rgba(232, 245, 233, 0.95), rgba(200, 230, 201, 0.35));
  border: 1px solid var(--ds-border, #c8e6c9);
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(46, 125, 50, 0.08);
}

.hero-titles h1 {
  margin: 0 0 0.35rem;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ds-heading, #1b5e20);
}

.en {
  font-weight: 500;
  font-size: 1.05rem;
  opacity: 0.85;
}

.sub {
  margin: 0;
  color: var(--ds-muted, #546e57);
  font-size: 0.98rem;
}

.status-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  font-size: 0.82rem;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(46, 125, 50, 0.25);
}

.pill .k {
  color: #5d7a60;
  font-weight: 600;
}

.pill .v {
  font-weight: 700;
  color: #1b5e20;
}

.pill[data-kind="ok"] {
  border-color: rgba(46, 125, 50, 0.45);
  background: rgba(200, 230, 201, 0.45);
}

.pill[data-kind="bad"] {
  border-color: rgba(198, 40, 40, 0.35);
  background: rgba(255, 235, 238, 0.85);
}

.pill[data-kind="pending"] {
  border-color: rgba(2, 119, 189, 0.35);
  background: rgba(227, 242, 253, 0.85);
}

.pill[data-kind="warn"] {
  border-color: rgba(245, 124, 0, 0.4);
  background: rgba(255, 243, 224, 0.9);
}

.pill[data-kind="idle"] {
  opacity: 0.95;
}

.env-hint {
  margin: 0.65rem 0 0;
  font-size: 0.72rem;
  color: #78967c;
  word-break: break-all;
}

.grid-main {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 960px) {
  .grid-main {
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
}
</style>
