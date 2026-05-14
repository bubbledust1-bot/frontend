<script setup>
import { computed, inject, nextTick, reactive, ref, unref, watch } from "vue";
import SensorTrendChart from "./SensorTrendChart.vue";
import { recordMonitorTaskActivity } from "../stores/projectWorkspaceStore.js";
import { formatSensorDisplayTime } from "../utils/sensorTime.js";

const sensor = inject("sensorMonitor", null);
/** 项目工作区下用于左栏「最近监测任务」本地记录（无注入时不写入） */
const workspaceProjectId = inject("workspaceProjectId", null);
const hasSensorProvider = computed(() => !!sensor);

/** 表格中 device_id 下拉：全部 + 已出现过的设备 */
const filterOptions = computed(() => {
  const ids = sensor?.deviceIds?.value || [];
  return [{ value: "", label: "全部设备" }, ...ids.map((id) => ({ value: id, label: id }))];
});

const chartLabel = computed(() =>
  sensor?.selectedDeviceId?.value ? `当前：${sensor.selectedDeviceId.value}` : "",
);

const exportScopeText = computed(() =>
  sensor?.historyDeviceFilter?.value
    ? `当前导出范围：设备 ${sensor.historyDeviceFilter.value}`
    : "当前导出范围：全部设备（当前会话已加载数据）",
);

/** 历史表等处的展示时间与 utils/sensorTime 统一 */
function displayTime(raw) {
  return formatSensorDisplayTime(raw);
}

/** ---------------- 任务 UI 状态（第二批：可见前端变化）---------------- */
const createOpenMap = reactive({});
const createFormMap = reactive({});
const taskPick = ref("none");

function getActiveTask(deviceId) {
  return sensor?.getActiveTaskForDevice?.(deviceId) || null;
}

function getHistoryTasks(deviceId) {
  return sensor?.taskListByDevice?.value?.[deviceId] || [];
}

function ensureCreateForm(deviceId) {
  if (!createFormMap[deviceId]) {
    createFormMap[deviceId] = {
      task_name: "",
      temp_min: null,
      temp_max: null,
    };
  }
  return createFormMap[deviceId];
}

function openCreateTask(deviceId) {
  ensureCreateForm(deviceId);
  createOpenMap[deviceId] = !createOpenMap[deviceId];
}

async function submitCreateTask(deviceId) {
  const form = ensureCreateForm(deviceId);
  if (!form.task_name?.trim()) {
    alert("请输入任务名称");
    return;
  }
  try {
    await sensor.createTaskForDevice(deviceId, {
      task_name: form.task_name.trim(),
      temp_min: form.temp_min,
      temp_max: form.temp_max,
    });
    createOpenMap[deviceId] = false;
    await sensor.loadHistoryTasks(deviceId, 5);
    if (sensor.selectedDeviceId.value === deviceId) {
      const active = getActiveTask(deviceId);
      taskPick.value = active ? `active:${active.id}` : "none";
    }
  } catch (e) {
    alert(e?.message || String(e));
  }
}

async function handleFinishTask(taskId, deviceId) {
  try {
    await sensor.finishTaskById(taskId);
    await sensor.loadHistoryTasks(deviceId, 5);
    if (sensor.selectedDeviceId.value === deviceId) taskPick.value = `history:${taskId}`;
  } catch (e) {
    alert(e?.message || String(e));
  }
}

async function handleDeleteTask(task) {
  if (task.status !== "finished") {
    alert("仅已结束任务可删除，请先结束任务");
    return;
  }
  const ok = window.confirm("确认删除此任务吗？");
  if (!ok) return;
  try {
    await sensor.deleteTaskById(task.id);
    await sensor.loadHistoryTasks(task.device_id, 5);
    if (sensor.selectedTaskId.value === task.id) taskPick.value = "none";
  } catch (e) {
    alert(e?.message || String(e));
  }
}

const selectedDeviceTasks = computed(() => {
  const did = sensor?.selectedDeviceId?.value;
  if (!did) return [];
  return getHistoryTasks(did);
});

const taskOptions = computed(() => {
  const did = sensor?.selectedDeviceId?.value;
  if (!did) return [{ value: "none", label: "无任务（图像不显示）" }];

  const opts = [{ value: "none", label: "无任务（图像不显示）" }];
  const active = getActiveTask(did);
  if (active) {
    opts.push({ value: `active:${active.id}`, label: `当前任务：${active.task_name}` });
  }

  for (const t of selectedDeviceTasks.value) {
    if (t.status === "deleted") continue;
    if (active && t.id === active.id) continue;
    opts.push({ value: `history:${t.id}`, label: `历史任务：${t.task_name}` });
  }
  return opts;
});


async function onTaskPickChange() {
  const v = taskPick.value;
  if (!v || v === "none") {
    await sensor.selectTask(null, "no_task");
    return;
  }
  const [mode, idStr] = String(v).split(":");
  const taskId = Number(idStr);
  if (!Number.isFinite(taskId)) {
    await sensor.selectTask(null, "no_task");
    return;
  }
  await sensor.selectTask(taskId, mode === "active" ? "active_task" : "history_task");
  // 左栏最近区：记录本次查看的监测任务（仅本地，不改监测业务逻辑）
  const pid = workspaceProjectId ? unref(workspaceProjectId) : null;
  if (pid) {
    await nextTick();
    const meta = sensor.selectedTaskMeta?.value;
    recordMonitorTaskActivity({
      projectId: String(pid),
      taskId,
      deviceId: sensor.selectedDeviceId?.value != null ? String(sensor.selectedDeviceId.value) : "",
      taskName: meta?.task_name || `任务 #${taskId}`,
    });
  }
}

watch(
  () => sensor?.deviceIds?.value?.slice() || [],
  async (ids) => {
    for (const did of ids) {
      await sensor.loadHistoryTasks(did, 5);
    }
  },
  { immediate: true },
);

watch(
  () => sensor?.selectedDeviceId?.value,
  async (did) => {
    if (!did) {
      taskPick.value = "none";
      return;
    }
    await sensor.loadHistoryTasks(did, 5);
    const active = getActiveTask(did);
    if (active) {
      taskPick.value = `active:${active.id}`;
      await sensor.selectTask(active.id, "active_task");
    } else {
      taskPick.value = "none";
      await sensor.selectTask(null, "no_task");
    }
  },
  { immediate: true },
);
</script>

<template>
  <section v-if="hasSensorProvider" class="card sensor">
    <h2>传感器监测</h2>

    <div class="toolbar">
      <div class="thresholds">
        <span class="th-label">统一温度阈值（℃）</span>
        <label>下限 <input v-model.number="sensor.tempMin.value" type="number" step="0.1" /></label>
        <label>上限 <input v-model.number="sensor.tempMax.value" type="number" step="0.1" /></label>
        <span class="th-hint">全局阈值 = 安全底线；任务温区 = 当前任务控制范围</span>
      </div>
      <button type="button" class="btn" @click="sensor.refreshFromRest">刷新列表</button>
    </div>

    <div class="status-row">
      <span
        class="badge"
        :class="{
          on: sensor.wsConnected.value,
          pending: sensor.wsConnecting.value && !sensor.wsConnected.value,
          off: !sensor.wsConnected.value && !sensor.wsConnecting.value,
        }"
      >
        实时通道：{{
          sensor.wsConnecting.value && !sensor.wsConnected.value
            ? "连接中"
            : sensor.wsConnected.value
              ? "已连接"
              : "未连接"
        }}
      </span>
      <span v-if="sensor.wsError.value" class="ws-err">{{ sensor.wsError.value }}</span>
      <span v-if="sensor.taskError.value" class="ws-err">任务：{{ sensor.taskError.value }}</span>
    </div>

    <div v-if="sensor.loadError.value" class="banner err">{{ sensor.loadError.value }}</div>

    <h3>设备状态</h3>
    <p v-if="!sensor.deviceCards.value.length" class="muted">暂无设备数据。请等待 ESP32 上传或点击刷新。</p>
    <div v-else class="device-grid">
      <article
        v-for="d in sensor.deviceCards.value"
        :key="d.device_id"
        class="device-card"
        :class="{
          active: sensor.selectedDeviceId.value === d.device_id,
          alarm: d.alarm === 'alarm',
        }"
        @click="sensor.selectedDeviceId.value = d.device_id"
      >
        <header>
          <span class="did">{{ d.device_id }}</span>
          <span class="pill-alarm" :data-a="d.alarm">{{
            d.alarm === "alarm" ? "报警" : d.alarm === "ok" ? "正常" : "—"
          }}</span>
        </header>
        <dl>
          <div><dt>环境温度</dt><dd>{{ d.record?.temperature ?? "—" }}℃</dd></div>
          <div><dt>环境湿度</dt><dd>{{ d.record?.humidity ?? "—" }}%</dd></div>
          <div><dt>材料温度</dt><dd>{{ d.record?.material_temperature ?? "—" }}℃</dd></div>
          <div><dt>形变</dt><dd>{{ d.record?.strain ?? "—" }}</dd></div>
          <div class="full"><dt>材料状态</dt>
            <dd>
              {{ (() => {
                const status = d.record?.temperature_status;
                if (status === "normal") return "正常";
                if (status === "alarm") return "报警";
                return "未知";
              })() }}
            </dd>
          </div>
          <div class="full"><dt>最后更新</dt><dd>{{ displayTime(d.record?.created_at) }}</dd></div>
        </dl>

        <!-- 设备卡片任务区（可见变化 1） -->
        <div class="task-block" @click.stop>
          <h4>任务区</h4>
          <template v-if="getActiveTask(d.device_id)">
            <p class="task-line"><strong>任务：</strong>{{ getActiveTask(d.device_id).task_name }}</p>
            <p class="task-line">
              <strong>温区：</strong>{{ getActiveTask(d.device_id).temp_min ?? "—" }} ~
              {{ getActiveTask(d.device_id).temp_max ?? "—" }} ℃
            </p>
            <p class="task-line"><strong>开始：</strong>{{ displayTime(getActiveTask(d.device_id).started_at) }}</p>
            <p class="task-line"><span class="platform-tag ok">进行中</span></p>
            <button
              type="button"
              class="btn task-btn"
              @click="handleFinishTask(getActiveTask(d.device_id).id, d.device_id)"
            >
              结束任务
            </button>
          </template>

          <template v-else>
            <button type="button" class="btn task-btn" @click="openCreateTask(d.device_id)">新建任务</button>
            <div v-if="createOpenMap[d.device_id]" class="task-form">
              <label>任务名称 <input v-model="ensureCreateForm(d.device_id).task_name" type="text" placeholder="如：桥梁A段晨间养护" /></label>
              <label>温度下限 <input v-model.number="ensureCreateForm(d.device_id).temp_min" type="number" step="0.1" /></label>
              <label>温度上限 <input v-model.number="ensureCreateForm(d.device_id).temp_max" type="number" step="0.1" /></label>
              <button type="button" class="btn" @click="submitCreateTask(d.device_id)">确认创建</button>
            </div>
          </template>
        </div>

        <!-- 历史任务入口（可见变化 2） -->
        <div class="task-history" @click.stop>
          <h4>历史任务（最近 5 条）</h4>
          <p v-if="!getHistoryTasks(d.device_id).length" class="muted mini">暂无任务</p>
          <ul v-else>
            <li v-for="t in getHistoryTasks(d.device_id)" :key="t.id">
              <div class="row1">
                <strong>{{ t.task_name }}</strong>
                <span class="platform-tag" :class="t.status === 'active' ? 'ok' : t.status === 'finished' ? 'info' : 'bad'">
                  {{ t.status === "active" ? "进行中" : t.status === "finished" ? "已结束" : "已删除" }}
                </span>
              </div>
              <div class="mini">{{ displayTime(t.started_at) }} ~ {{ t.ended_at ? displayTime(t.ended_at) : "进行中" }}</div>
              <div class="mini">温区：{{ t.temp_min ?? "—" }} ~ {{ t.temp_max ?? "—" }} ℃</div>
              <div class="actions">
                <button
                  type="button"
                  class="btn small"
                  @click="taskPick = `${t.status === 'active' ? 'active' : 'history'}:${t.id}`; onTaskPickChange()"
                >
                  查看
                </button>
                <button
                  v-if="t.status === 'finished'"
                  type="button"
                  class="btn small danger"
                  @click="handleDeleteTask(t)"
                >
                  删除任务
                </button>
              </div>
            </li>
          </ul>
        </div>
      </article>
    </div>

    <h3>趋势图（按设备 / 任务）</h3>
    <div class="chart-toolbar">
      <label>
        当前查看设备
        <select v-model="sensor.selectedDeviceId.value" class="sel">
          <option v-for="id in sensor.deviceIds.value" :key="id" :value="id">{{ id }}</option>
        </select>
      </label>

      <!-- 任务选择框（可见变化 3） -->
      <label>
        任务选择
        <select v-model="taskPick" class="sel" @change="onTaskPickChange">
          <option v-for="opt in taskOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </label>

      <p v-if="sensor.selectedAlarm.value === 'alarm'" class="alarm-inline">当前选中设备温度超出阈值，请关注。</p>
    </div>

    <SensorTrendChart
      :series="sensor.selectedSeries.value"
      :device-label="chartLabel"
      :task-mode="sensor.selectedTaskMode.value"
    />

    <h3>历史数据</h3>
    <div class="table-filters">
      <label>
        表格筛选
        <select v-model="sensor.historyDeviceFilter.value" class="sel">
          <option v-for="opt in filterOptions" :key="opt.value || 'all'" :value="opt.value">{{ opt.label }}</option>
        </select>
      </label>
      <span class="hint">当前已加载 {{ sensor.history.value.length }} 条（初始化 history + 后续 WebSocket）</span>
      <button type="button" class="btn" @click="sensor.exportCsv">导出数据 CSV</button>
    </div>
    <p class="export-scope">{{ exportScopeText }}</p>

    <div class="table-wrap">
      <table class="table dense">
        <thead>
          <tr>
            <th>时间</th>
            <th>device_id</th>
            <th>环境温度</th>
            <th>环境湿度</th>
            <th>材料温度</th>
            <th>应变</th>
            <th>材料状态</th>
            <th>养护状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!sensor.filteredHistory.value.length">
            <td colspan="8" class="empty-cell">暂无记录（或筛选无匹配）</td>
          </tr>
          <template v-else>
            <tr
              v-for="row in sensor.filteredHistory.value"
              :key="row.id ?? row.created_at + row.device_id"
              :class="{ flash: sensor.highlightRowId.value === row.id }"
            >
              <td>{{ displayTime(row.created_at) }}</td>
              <td>{{ row.device_id }}</td>
              <td>{{ row.temperature ?? "—" }}</td>
              <td>{{ row.humidity ?? "—" }}</td>
              <td>{{ row.material_temperature ?? "—" }}</td>
              <td>{{ row.strain ?? "—" }}</td>
              <td>
                {{ (() => {
                  const status = row.temperature_status;
                  if (status === "normal") return "正常";
                  if (status === "alarm") return "报警";
                  return "未知";
                })() }}
              </td>
              <td>{{ row.curing_status ?? "—" }}</td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </section>
  <section v-else class="card sensor">
    <h2>传感器监测</h2>
    <div class="banner err">传感器模块初始化失败：未注入 sensorMonitor。请刷新页面或检查 HomeView 的 provide。</div>
  </section>
</template>

<style scoped>
.card {
  border: 1px solid var(--ds-border, #c8e6c9);
  border-radius: 12px;
  padding: 1.15rem 1.25rem;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 2px 12px rgba(27, 94, 32, 0.06);
}
h2 {
  margin-top: 0;
  color: var(--ds-heading, #1b5e20);
  font-size: 1.2rem;
}
h3 {
  font-size: 1rem;
  color: #2e7d32;
  margin: 1rem 0 0.5rem;
}
h4 {
  margin: 0;
  color: #2d4a31;
  font-size: 0.86rem;
}
.lead {
  font-size: 0.86rem;
  color: #4a6350;
  line-height: 1.45;
  margin: 0 0 0.75rem;
}
.lead code {
  font-size: 0.78rem;
  background: rgba(46, 125, 50, 0.08);
  padding: 0.05rem 0.25rem;
  border-radius: 4px;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 0.65rem;
}
.thresholds {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  font-size: 0.85rem;
  color: #455a47;
}
.thresholds input {
  width: 4.5rem;
  padding: 0.3rem 0.4rem;
  border: 1px solid #aed581;
  border-radius: 6px;
}
.th-label {
  font-weight: 600;
}
.th-hint {
  font-size: 0.78rem;
  color: #78967c;
}
.btn {
  padding: 0.4rem 0.85rem;
  cursor: pointer;
  border-radius: 8px;
  border: 1px solid #66bb6a;
  background: #e8f5e9;
  color: #1b5e20;
  font-weight: 600;
}
.btn.small {
  padding: 0.25rem 0.55rem;
  font-size: 0.76rem;
}
.btn.danger {
  border-color: #ef9a9a;
  background: #ffebee;
  color: #c62828;
}
.status-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.35rem 0 0.75rem;
}
.badge {
  display: inline-block;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 600;
}
.badge.on {
  background: #e8f5e9;
  color: #1b5e20;
  border: 1px solid #81c784;
}
.badge.pending {
  background: #e3f2fd;
  color: #1565c0;
  border: 1px solid #64b5f6;
}
.badge.off {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ef9a9a;
}
.ws-err {
  color: #c62828;
  font-size: 0.88rem;
}
.banner.err {
  background: #ffebee;
  border: 1px solid #e57373;
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}
.muted {
  color: #78967c;
  font-size: 0.92rem;
}
.muted.mini {
  font-size: 0.78rem;
}

.device-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 0.65rem;
}
.device-card {
  border: 1px solid #c8e6c9;
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
  background: #fafefa;
  cursor: pointer;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}
.device-card:hover {
  border-color: #81c784;
  box-shadow: 0 2px 8px rgba(46, 125, 50, 0.12);
}
.device-card.active {
  border-color: #43a047;
  box-shadow: 0 0 0 2px rgba(67, 160, 71, 0.25);
}
.device-card.alarm {
  background: #fff8e1;
  border-color: #ffb74d;
}
.device-card > header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.35rem;
}
.did {
  font-weight: 700;
  font-size: 0.88rem;
  color: #1b5e20;
  word-break: break-all;
}
.pill-alarm {
  font-size: 0.72rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  font-weight: 700;
}
.pill-alarm[data-a="ok"] {
  background: #e8f5e9;
  color: #2e7d32;
}
.pill-alarm[data-a="alarm"] {
  background: #ffccbc;
  color: #bf360c;
}
.pill-alarm[data-a="unknown"] {
  background: #eceff1;
  color: #546e7a;
}
dl {
  margin: 0;
  display: grid;
  gap: 0.25rem;
}
dl div {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.82rem;
}
dl div.full {
  flex-direction: column;
}
dt {
  color: #78967c;
}
dd {
  margin: 0;
  font-weight: 600;
  color: #374d3a;
}

.task-block,
.task-history {
  margin-top: 0.55rem;
  border-top: 1px dashed #dce9dd;
  padding-top: 0.5rem;
  display: grid;
  gap: 0.35rem;
}
.task-line {
  margin: 0;
  font-size: 0.78rem;
  color: #3f5643;
}
.task-btn {
  width: fit-content;
}
.task-form {
  display: grid;
  gap: 0.35rem;
}
.task-form label {
  display: grid;
  gap: 0.15rem;
  font-size: 0.78rem;
  color: #4a6350;
}
.task-form input {
  padding: 0.3rem 0.4rem;
  border-radius: 6px;
  border: 1px solid #aed581;
}
.task-history ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.35rem;
}
.task-history li {
  border: 1px solid #e0ebe1;
  border-radius: 8px;
  padding: 0.4rem;
  background: #fff;
}
.row1 {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: center;
}
.mini {
  font-size: 0.74rem;
  color: #607a64;
  margin-top: 0.2rem;
}
.actions {
  margin-top: 0.3rem;
  display: flex;
  gap: 0.35rem;
}

.chart-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
  font-size: 0.88rem;
}
.sel {
  margin-left: 0.35rem;
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  border: 1px solid #aed581;
  background: #fff;
  min-width: 180px;
}
.alarm-inline {
  margin: 0;
  color: #e65100;
  font-size: 0.85rem;
  font-weight: 600;
}
.task-empty {
  border: 1px dashed #b7cfb9;
  background: #f7fbf7;
  border-radius: 10px;
  padding: 0.8rem;
  margin-bottom: 0.45rem;
}
.task-empty .m1 {
  margin: 0;
  color: #2d4a31;
  font-weight: 700;
}
.task-empty .m2 {
  margin: 0.2rem 0 0;
  color: #5f7963;
  font-size: 0.84rem;
}

.table-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.4rem;
  font-size: 0.88rem;
}
.hint {
  color: #78967c;
  font-size: 0.8rem;
}

.table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
}
.table th,
.table td {
  border: 1px solid #e0ebe0;
  padding: 0.35rem 0.45rem;
  text-align: left;
}
.table th {
  background: #e8f5e9;
  font-weight: 600;
  color: #374d3a;
  font-size: 0.82rem;
}
.dense td {
  font-size: 0.82rem;
}
.table-wrap {
  overflow: auto;
  max-height: 380px;
  border: 1px solid #c8e6c9;
  border-radius: 8px;
}
.empty-cell {
  text-align: center;
  color: #78967c;
  padding: 1rem !important;
}

.export-scope {
  margin: -0.1rem 0 0.45rem;
  color: #78967c;
  font-size: 0.8rem;
}

@keyframes flash-bg {
  from {
    background: rgba(200, 230, 201, 0.65);
  }
  to {
    background: transparent;
  }
}
tr.flash td {
  animation: flash-bg 1.2s ease-out;
}
</style>
