<script setup>
import { computed, reactive, watch } from "vue";
import { getSensorDevices, getSensorTasks, getSensorTaskRecords } from "../../api/sensor.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  dataset: { type: Object, default: null },
  externalError: { type: String, default: "" },
});

const emit = defineEmits(["update:modelValue", "confirm"]);

const state = reactive({
  loadingDevices: false,
  loadingTasks: false,
  loadingRecords: false,
  devices: [],
  tasks: [],
  taskRecords: [],
  deviceId: "",
  taskId: "",
  taskName: "",
  taskStatus: "",
  taskStartedAt: "",
  taskEndedAt: "",
  startRow: 1,
  endRow: 10,
  includeTemperature: true,
  includeHumidity: false,
  includeTime: false,
  mappingTemperature: "",
  mappingHumidity: "",
  mappingTime: "",
  error: "",
});

const rangeLength = computed(() => {
  const s = Number(state.startRow);
  const e = Number(state.endRow);
  if (!Number.isInteger(s) || !Number.isInteger(e) || s <= 0 || e < s) return 0;
  return e - s + 1;
});

const finishedTasks = computed(() => {
  return state.tasks.filter((t) => String(t.status || "").toLowerCase() === "finished");
});

const featureColumns = computed(() => {
  const cols = Array.isArray(props.dataset?.columns) ? props.dataset.columns : [];
  return cols.filter((c) => c?.role === "feature" && c?.key);
});

const selectedChannels = computed(() => {
  const channels = [];
  if (state.includeTemperature) channels.push("temperature");
  if (state.includeHumidity) channels.push("humidity");
  if (state.includeTime) channels.push("time");
  return channels;
});

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return;
    reset();
    await loadDevices();
  },
);

watch(
  () => state.deviceId,
  async (v) => {
    state.tasks = [];
    state.taskId = "";
    state.taskName = "";
    state.taskStatus = "";
    state.taskStartedAt = "";
    state.taskEndedAt = "";
    state.taskRecords = [];
    if (!v) return;
    await loadTasks(v);
  },
);

watch(
  () => props.externalError,
  (msg) => {
    if (msg) state.error = String(msg);
  },
);

watch(
  () => state.taskId,
  async (v) => {
    state.taskRecords = [];
    if (!v) return;
    const t = state.tasks.find((x) => String(x.id) === String(v));
    state.taskName = t?.task_name || `Task #${v}`;
    state.taskStatus = String(t?.status || "").toLowerCase();
    state.taskStartedAt = t?.started_at || "";
    state.taskEndedAt = t?.ended_at || "";
    await loadTaskRecords(v);
  },
);

function reset() {
  state.error = "";
  state.deviceId = "";
  state.taskId = "";
  state.taskName = "";
  state.taskStatus = "";
  state.taskStartedAt = "";
  state.taskEndedAt = "";
  state.tasks = [];
  state.taskRecords = [];
  state.startRow = 1;
  state.endRow = Math.min(10, props.dataset?.rows?.length || 1);

  const firstFeature = featureColumns.value[0]?.key || "";
  const secondFeature = featureColumns.value[1]?.key || firstFeature;
  const thirdFeature = featureColumns.value[2]?.key || secondFeature || firstFeature;

  state.includeTemperature = true;
  state.includeHumidity = false;
  state.includeTime = false;
  state.mappingTemperature = firstFeature;
  state.mappingHumidity = secondFeature;
  state.mappingTime = thirdFeature;
}

async function loadDevices() {
  state.loadingDevices = true;
  state.error = "";
  try {
    const res = await getSensorDevices({ withLatest: true, limit: 200 });
    const items = Array.isArray(res?.items) ? res.items : [];
    state.devices = items.map((x) => ({ id: String(x.device_id || x.id || "") })).filter((x) => x.id);
  } catch (e) {
    state.error = e?.message || String(e);
  } finally {
    state.loadingDevices = false;
  }
}

async function loadTasks(deviceId) {
  state.loadingTasks = true;
  state.error = "";
  try {
    const res = await getSensorTasks({ deviceId, limit: 50 });
    state.tasks = Array.isArray(res?.items) ? res.items : [];
  } catch (e) {
    state.error = e?.message || String(e);
  } finally {
    state.loadingTasks = false;
  }
}

async function loadTaskRecords(taskId) {
  state.loadingRecords = true;
  state.error = "";
  try {
    const res = await getSensorTaskRecords(taskId, { limit: 2000 });
    state.taskRecords = Array.isArray(res?.items) ? res.items : [];
  } catch (e) {
    state.error = e?.message || String(e);
  } finally {
    state.loadingRecords = false;
  }
}

function close() {
  emit("update:modelValue", false);
}

function pushMapping(list, checked, sourceField, targetColumnKey) {
  if (!checked) return;
  list.push({ sourceField, targetColumnKey: String(targetColumnKey || "") });
}

function confirm() {
  state.error = "";
  if (!state.deviceId) {
    state.error = "Please select a device";
    return;
  }
  if (!state.taskId) {
    state.error = "Please select a monitor task";
    return;
  }
  if (state.taskStatus !== "finished") {
    state.error = "Only finished monitor tasks are allowed";
    return;
  }
  if (!rangeLength.value) {
    state.error = "Please set a valid sample row range";
    return;
  }
  if (!selectedChannels.value.length) {
    state.error = "Please select at least one channel";
    return;
  }

  const featureKeys = new Set(featureColumns.value.map((c) => String(c.key)));
  const fieldMappings = [];
  pushMapping(fieldMappings, state.includeTemperature, "temperature", state.mappingTemperature);
  pushMapping(fieldMappings, state.includeHumidity, "humidity", state.mappingHumidity);
  pushMapping(fieldMappings, state.includeTime, "time", state.mappingTime);

  for (const mapping of fieldMappings) {
    if (!mapping.targetColumnKey) {
      state.error = `Please select target column for ${mapping.sourceField}`;
      return;
    }
    if (!featureKeys.has(mapping.targetColumnKey)) {
      state.error = `Target column for ${mapping.sourceField} must be a feature column`;
      return;
    }
  }

  emit("confirm", {
    deviceId: state.deviceId,
    taskId: Number(state.taskId),
    taskNameSnapshot: state.taskName,
    taskStatus: "finished",
    taskStartedAt: state.taskStartedAt,
    taskEndedAt: state.taskEndedAt,
    taskRecordCountSnapshot: state.taskRecords.length,
    selectedChannels: selectedChannels.value,
    fieldMappings,
    rangeStartRow: Number(state.startRow),
    rangeEndRow: Number(state.endRow),
  });
}
</script>

<template>
  <div v-if="modelValue" class="backdrop" @click.self="close">
    <div class="modal platform-page">
      <h3>Import Monitor Task</h3>
      <p class="sub">Reference binding mode: keep mapping metadata for future training (no row-by-row value fill now).</p>

      <div class="grid">
        <label>
          <span>Device</span>
          <select v-model="state.deviceId" :disabled="state.loadingDevices">
            <option value="">Select device</option>
            <option v-for="d in state.devices" :key="d.id" :value="d.id">{{ d.id }}</option>
          </select>
        </label>

        <label>
          <span>Monitor Task (finished)</span>
          <select v-model="state.taskId" :disabled="!state.deviceId || state.loadingTasks">
            <option value="">Select finished task</option>
            <option v-for="t in finishedTasks" :key="t.id" :value="String(t.id)">
              {{ t.task_name || `Task #${t.id}` }}
            </option>
          </select>
        </label>
      </div>

      <div class="grid two">
        <label>
          <span>Row start</span>
          <input v-model.number="state.startRow" type="number" min="1" step="1" />
        </label>
        <label>
          <span>Row end</span>
          <input v-model.number="state.endRow" type="number" min="1" step="1" />
        </label>
      </div>

      <div class="channel-zone">
        <h4>Channel Mapping (metadata only)</h4>

        <div class="channel-item">
          <label class="check-label">
            <input v-model="state.includeTemperature" type="checkbox" />
            <span>温度 (temperature)</span>
          </label>
          <select v-model="state.mappingTemperature" :disabled="!state.includeTemperature">
            <option value="">Select feature column</option>
            <option v-for="c in featureColumns" :key="`temp-${c.key}`" :value="c.key">{{ c.name }}</option>
          </select>
        </div>

        <div class="channel-item">
          <label class="check-label">
            <input v-model="state.includeHumidity" type="checkbox" />
            <span>湿度 (humidity)</span>
          </label>
          <select v-model="state.mappingHumidity" :disabled="!state.includeHumidity">
            <option value="">Select feature column</option>
            <option v-for="c in featureColumns" :key="`hum-${c.key}`" :value="c.key">{{ c.name }}</option>
          </select>
        </div>

        <div class="channel-item">
          <label class="check-label">
            <input v-model="state.includeTime" type="checkbox" />
            <span>时间 (time)</span>
          </label>
          <select v-model="state.mappingTime" :disabled="!state.includeTime">
            <option value="">Select feature column</option>
            <option v-for="c in featureColumns" :key="`time-${c.key}`" :value="c.key">{{ c.name }}</option>
          </select>
        </div>
      </div>

      <div class="check">
        <p>Task record count: <strong>{{ state.taskRecords.length || 0 }}</strong></p>
        <p>Sample rows count: <strong>{{ rangeLength || 0 }}</strong></p>
        <p class="ok">Reference binding mode: task record count and sample rows do not need to match.</p>
      </div>

      <p v-if="state.error" class="err">{{ state.error }}</p>

      <div class="actions">
        <button type="button" class="btn" @click="close">Cancel</button>
        <button type="button" class="btn primary" :disabled="state.loadingRecords" @click="confirm">Confirm Bind</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.36); display: flex; justify-content: center; align-items: center; z-index: 230; padding: 1rem; }
.modal { width: min(760px, 100%); padding: 1rem; border-radius: 12px; display: grid; gap: 0.7rem; max-height: calc(100vh - 2rem); overflow: auto; }
h3 { margin: 0; color: #1b5e20; }
.sub { margin: 0; color: #637a66; font-size: 0.83rem; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem; }
.grid.two { grid-template-columns: 1fr 1fr; }
label { display: grid; gap: 0.25rem; font-size: 0.84rem; color: #48604c; }
select,
input { font: inherit; padding: 0.45rem 0.55rem; border: 1px solid #b9d7bc; border-radius: 8px; }
.channel-zone { border: 1px solid #dce9de; border-radius: 10px; background: #fbfefb; padding: 0.6rem; display: grid; gap: 0.55rem; }
.channel-zone h4 { margin: 0; font-size: 0.85rem; color: #2f5f35; }
.channel-item { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 0.5rem; align-items: center; }
.check-label { display: flex; align-items: center; gap: 0.4rem; margin: 0; }
.check { border: 1px solid #dce9de; border-radius: 10px; background: #fbfefb; padding: 0.5rem 0.6rem; display: grid; gap: 0.2rem; }
.check p { margin: 0; color: #57705a; font-size: 0.82rem; }
.check p.ok { color: #1b5e20; }
.err { margin: 0; color: #c62828; font-size: 0.84rem; }
.actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
.btn { border: 1px solid #9fcea3; border-radius: 8px; background: #fff; color: #1b5e20; padding: 0.38rem 0.7rem; cursor: pointer; }
.btn.primary { background: #e8f5e9; }
@media (max-width: 860px) {
  .grid,
  .grid.two,
  .channel-item { grid-template-columns: 1fr; }
}
</style>
