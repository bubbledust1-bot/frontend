<script setup>
import { computed, onMounted } from "vue";
import { useBackendHealth } from "../composables/useBackendHealth.js";
import { useSensorMonitor } from "../composables/useSensorMonitor.js";
import { usePredict } from "../composables/usePredict.js";
import SectionBlock from "../components/platform/SectionBlock.vue";
import StatusMetricCard from "../components/platform/StatusMetricCard.vue";
import QuickEntryCard from "../components/platform/QuickEntryCard.vue";
import PageHeader from "../components/platform/PageHeader.vue";
import { formatSensorDisplayTime } from "../utils/sensorTime.js";

const health = useBackendHealth();
const sensor = useSensorMonitor({ historyFetchLimit: 80 });
const predict = usePredict();

onMounted(() => {
  health.fetchHealth();
});

const platformStatus = computed(() => {
  if (health.status === "ok" && sensor.wsConnected.value) return { text: "运行稳定", kind: "ok" };
  if (health.status === "loading" || sensor.wsConnecting.value) return { text: "初始化中", kind: "info" };
  return { text: "需关注", kind: "warn" };
});

const onlineDeviceCount = computed(() => String(sensor.deviceIds.value.length));

const latestUploadTime = computed(() => {
  const rows = sensor.history.value;
  if (!rows.length) return "暂无记录";
  return formatSensorDisplayTime(rows[0].created_at);
});

const latestPredictSummary = computed(() => {
  if (predict.loading.value) return "预测中";
  if (!predict.result.value) return "暂无记录";
  if (predict.result.value.success === true) {
    return `${predict.result.value.prediction_mpa ?? "—"} MPa`;
  }
  return `业务未通过：${predict.result.value.error || "请检查输入"}`;
});

const selectedEnvStatus = computed(() => {
  if (!sensor.selectedDeviceId.value) return "暂无异常";
  if (sensor.selectedAlarm.value === "alarm") return "温度报警";
  if (sensor.selectedAlarm.value === "ok") return "当前正常";
  return "暂无异常";
});

const recentActivities = computed(() => {
  return [
    { label: "最近一次预测", value: latestPredictSummary.value },
    { label: "最近一次设备上传", value: latestUploadTime.value },
    { label: "当前状态变化/异常", value: selectedEnvStatus.value || "暂无异常" },
  ];
});

const flowSteps = [
  "需求诊断",
  "成分检测",
  "模型预测",
  "方案评审",
  "小试/中试验证",
  "生产部署/数据回传",
];

const headerTags = computed(() => [
  { text: `平台状态：${platformStatus.value.text}`, kind: platformStatus.value.kind },
  { text: `在线设备：${onlineDeviceCount.value}`, kind: "ok" },
]);
</script>

<template>
  <div class="dashboard-page">
    <PageHeader
      title="平台总览"
      subtitle="围绕智能预测、生产监测与数据闭环，支撑材料研发过程持续优化。"
      :tags="headerTags"
    />

    <SectionBlock title="平台核心状态" subtitle="实时掌握系统运行、设备状态与关键预测信息。">
      <div class="metric-grid">
        <StatusMetricCard title="平台运行状态" :value="platformStatus.text" :kind="platformStatus.kind" hint="综合后端健康与实时通道" />
        <StatusMetricCard title="在线设备数" :value="onlineDeviceCount" kind="ok" hint="基于当前会话可见设备" />
        <StatusMetricCard title="最近预测结果" :value="latestPredictSummary" kind="info" hint="无记录时显示暂无" />
        <StatusMetricCard title="最近上传时间" :value="latestUploadTime" kind="ok" hint="来自 history/WS 最新记录" />
      </div>
    </SectionBlock>

    <SectionBlock title="研发闭环流程" subtitle="围绕数据、建模与验证形成持续优化闭环。">
      <div class="flow-grid">
        <div v-for="(s, idx) in flowSteps" :key="s" class="flow-step">
          <span class="idx">{{ idx + 1 }}</span>
          <span>{{ s }}</span>
        </div>
      </div>
    </SectionBlock>

    <SectionBlock title="快捷入口" subtitle="进入项目工作区，快速切换监测、预测、训练与数据管理。">
      <div class="entry-grid">
        <QuickEntryCard
          to="/workspace"
          title="进入项目工作台"
          desc="新建或选择实验项目后，可在项目内使用性能预测、实时监测、项目中心与数据资产。"
          cta="前往工作台"
        />
      </div>
    </SectionBlock>

    <SectionBlock title="最近活动" subtitle="展示最近一次预测、上传与状态变化。">
      <ul class="activity-list">
        <li v-for="a in recentActivities" :key="a.label">
          <span class="lab">{{ a.label }}</span>
          <strong>{{ a.value || "暂无记录" }}</strong>
        </li>
      </ul>
    </SectionBlock>
  </div>
</template>

<style scoped>
.dashboard-page {
  display: grid;
  gap: 0.8rem;
}
.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.65rem;
}
.flow-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.5rem;
}
.flow-step {
  border: 1px solid #d8e7da;
  border-radius: 10px;
  background: #fbfefb;
  padding: 0.6rem;
  font-size: 0.84rem;
  color: #3e5642;
  display: grid;
  gap: 0.25rem;
}
.idx {
  display: inline-flex;
  width: 1.35rem;
  height: 1.35rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #e8f5e9;
  color: #1b5e20;
  font-weight: 700;
}
.entry-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
}
.activity-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.5rem;
}
.activity-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.8rem;
  border: 1px solid #e1ece3;
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  background: #fcfefd;
}
.lab {
  color: #5f7662;
  font-size: 0.88rem;
}
@media (max-width: 1180px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .flow-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .entry-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 760px) {
  .flow-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
