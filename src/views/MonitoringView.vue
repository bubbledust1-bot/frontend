<script setup>
import { computed, provide, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import SensorSection from "../components/SensorSection.vue";
import { useSensorMonitor } from "../composables/useSensorMonitor.js";
import SectionBlock from "../components/platform/SectionBlock.vue";
import PageHeader from "../components/platform/PageHeader.vue";
import { formatSensorDisplayTime } from "../utils/sensorTime.js";

const route = useRoute();
const sensor = useSensorMonitor({ historyFetchLimit: 100 });
provide("sensorMonitor", sensor);

onMounted(() => {
  if (route.query.deviceId) {
    sensor.selectedDeviceId.value = String(route.query.deviceId);
  }
  if (route.query.taskId) {
    const taskId = Number(route.query.taskId);
    if (!isNaN(taskId)) {
      if (sensor.selectedDeviceId.value) {
        sensor.loadHistoryTasks(sensor.selectedDeviceId.value).then(() => {
          sensor.selectTask(taskId, "history_task");
        });
      }
    }
  }
});

const wsStateText = computed(() => {
  if (sensor.wsConnecting.value) return "连接中";
  return sensor.wsConnected.value ? "已连接" : "未连接";
});

const onlineCount = computed(() => sensor.deviceIds.value.length);
const selectedDevice = computed(() => sensor.selectedDeviceId.value || "未选择");
const latestUploadAt = computed(() => {
  const rows = sensor.history.value;
  if (!rows.length) return "暂无记录";
  return formatSensorDisplayTime(rows[0].created_at);
});
const envStatus = computed(() => {
  if (!sensor.selectedDeviceId.value) return "暂无异常";
  if (sensor.selectedAlarm.value === "alarm") return "温度报警";
  if (sensor.selectedAlarm.value === "ok") return "当前正常";
  return "暂无异常";
});

const selectedRecord = computed(() => {
  const rec = sensor.selectedDeviceRecord?.value || null;
  console.log("[MonitoringView] selectedRecord:", rec);
  return rec;
});

const headerTags = computed(() => [
  { text: `设备：${onlineCount.value}`, kind: "ok" },
  { text: `通道：${wsStateText.value}`, kind: sensor.wsConnected.value ? "ok" : sensor.wsConnecting.value ? "info" : "bad" },
]);
</script>

<template>
  <div class="monitor-page">
    <PageHeader
      title="实时监测"
      subtitle="围绕生产监测与过程追踪，持续回传数据并支撑工艺优化。"
      :tags="headerTags"
    />

    <SectionBlock title="核心指标" subtitle="环境数据与材料状态实时展示。">
      <div class="metric-cards">
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">环境温度</span>
          </div>
          <div class="metric-value">
            {{ selectedRecord?.temperature != null ? `${selectedRecord.temperature.toFixed(1)} ℃` : "—" }}
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">环境湿度</span>
          </div>
          <div class="metric-value">
            {{ selectedRecord?.humidity != null ? `${selectedRecord.humidity.toFixed(1)} %` : "—" }}
          </div>
        </div>

        <div class="metric-card material">
          <div class="metric-header">
            <span class="metric-label">材料温度</span>
            <span
              class="status-pill"
              :class="{
                normal: selectedRecord?.temperature_status === 'normal',
                alert: selectedRecord?.temperature_status === 'alert',
                unknown: !selectedRecord?.temperature_status || selectedRecord.temperature_status === 'unknown'
              }"
            >
              {{ (() => {
                const s = selectedRecord?.temperature_status;
                if (s === 'normal') return '正常';
                if (s === 'alert') return '报警';
                return '未知';
              })() }}
            </span>
          </div>
          <div class="metric-value">
            {{ selectedRecord?.material_temperature != null ? `${selectedRecord.material_temperature.toFixed(1)} ℃` : "—" }}
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">形变</span>
          </div>
          <div class="metric-value">
            {{ selectedRecord?.strain != null ? selectedRecord.strain.toFixed(0) : "—" }}
          </div>
        </div>
      </div>
    </SectionBlock>

    <SectionBlock title="监测摘要" subtitle="关键设备与数据通道状态总览。">
      <div class="summary-row">
        <div class="sum-item">
          <span>在线设备数</span>
          <strong>{{ onlineCount }}</strong>
        </div>
        <div class="sum-item">
          <span>当前选中设备</span>
          <strong>{{ selectedDevice }}</strong>
        </div>
        <div class="sum-item">
          <span>最近上传时间</span>
          <strong>{{ latestUploadAt }}</strong>
        </div>
        <div class="sum-item">
          <span>当前环境状态</span>
          <strong :class="{ warn: envStatus === '温度报警' }">{{ envStatus }}</strong>
        </div>
        <div class="sum-item">
          <span>WebSocket 状态</span>
          <strong>{{ wsStateText }}</strong>
        </div>
      </div>
    </SectionBlock>

    <SectionBlock title="监测工作区" subtitle="覆盖设备状态、趋势分析与历史记录查询。">
      <SensorSection />
    </SectionBlock>
  </div>
</template>

<style scoped>
.monitor-page {
  display: grid;
  gap: 0.8rem;
}
.metric-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}
.metric-card {
  border: 1px solid #dbe9dd;
  border-radius: 10px;
  padding: 0.8rem 0.9rem;
  background: #fbfefb;
  display: grid;
  gap: 0.5rem;
}
.metric-card.material {
  border-left: 3px solid #e65100;
}
.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.metric-label {
  color: #648067;
  font-size: 0.85rem;
  font-weight: 600;
}
.metric-value {
  color: #1b5e20;
  font-size: 1.4rem;
  font-weight: 700;
  line-height: 1.3;
}
.status-pill {
  font-size: 0.72rem;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-weight: 700;
}
.status-pill.normal {
  background: #e8f5e9;
  color: #2e7d32;
}
.status-pill.alert {
  background: #ffebee;
  color: #c62828;
}
.status-pill.unknown {
  background: #eceff1;
  color: #546e7a;
}
.summary-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.55rem;
}
.sum-item {
  border: 1px solid #dbe9dd;
  border-radius: 10px;
  padding: 0.55rem 0.65rem;
  background: #fbfefb;
  display: grid;
  gap: 0.28rem;
}
.sum-item span {
  color: #648067;
  font-size: 0.78rem;
}
.sum-item strong {
  color: #1b5e20;
  font-size: 0.95rem;
}
.sum-item strong.warn {
  color: #d84315;
}
@media (min-width: 1000px) {
  .metric-cards {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (max-width: 1200px) {
  .summary-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .summary-row {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
