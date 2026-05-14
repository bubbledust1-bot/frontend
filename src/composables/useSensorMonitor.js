import { computed, onMounted, onUnmounted, ref } from "vue";
import {
  createSensorTask,
  deleteSensorTask,
  finishSensorTask,
  getActiveSensorTasks,
  getSensorDevices,
  getSensorHistory,
  getSensorLatest,
  getSensorTaskRecords,
  getSensorTasks,
} from "../api/sensor.js";
import { createSensorSocket } from "../api/sensorSocket.js";

/**
 * 区域 B：传感器 REST 初次加载 + WebSocket 实时更新。
 *
 * 说明：本 composable 会维护“前端会话级”的已加载数据缓存。
 * - 这里的“项目起始时间”是“本次前端会话里首次看到该设备的时间（session）”；
 * - 刷新页面/重新打开后会重置，不一定等于真实工程启动时间。
 */
export function useSensorMonitor(options = {}) {
  const historyLimit = options.historyFetchLimit ?? options.historyLimit ?? 100;

  const latest = ref(null);
  const loadError = ref("");
  const wsConnected = ref(false);
  const wsConnecting = ref(false);
  const wsError = ref("");

  const tempMin = ref(20);
  const tempMax = ref(35);
  const selectedDeviceId = ref("");
  const historyDeviceFilter = ref("");
  const highlightRowId = ref(null);

  // 任务相关（第一批：先接通数据链路，后续再补完整 UI 交互）
  const activeTasks = ref([]);
  const taskListByDevice = ref({});
  const selectedTaskId = ref(null);
  const selectedTaskMode = ref("no_task"); // no_task | active_task | history_task
  const taskRecords = ref([]);
  const taskError = ref("");

  /** @type {import('vue').Ref<Array<Record<string, any>>>} */
  const allLoadedRecords = ref([]);
  const recordKeySet = new Set();
  /**
   * 注意：设备聚合相关派生值统一基于 allLoadedRecords 计算，
   * 避免直接依赖非响应式 Map 导致下拉和趋势图不刷新。
   */

  let socketApi = null;

  function toTs(createdAt) {
    const t = Date.parse(createdAt || "");
    return Number.isFinite(t) ? t : Date.now();
  }

  // 图表时间戳统一函数：当前后端时间字符串在前端表现慢 8 小时，
  // 这里仅用于图表时间轴修正（+8h），不改变后端原始字段。
  function toChartTs(createdAt, fallbackTs = Date.now()) {
    const t = Date.parse(createdAt || "");
    if (!Number.isFinite(t)) return fallbackTs;
    return t + 8 * 60 * 60 * 1000;
  }

  function toNum(v) {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function normalizeRecord(raw) {
  if (!raw || typeof raw !== "object") return null;
  const device_id = String(raw.device_id || "unknown");
  const created_at = String(raw.created_at || new Date().toISOString());
  const ingestTs = Date.now();
  
  console.log("[normalizeRecord] 原始数据:", raw);
  
  const normalized = {
    ...raw,
    device_id,
    created_at,
    // 环境温湿度（保持原有语义不变）
    temperature: toNum(raw.temperature),
    humidity: toNum(raw.humidity),
    // 材料温度（新增字段）
    material_temperature: toNum(raw.material_temperature),
    // 应变（已存在）
    pressure: toNum(raw.pressure),
    strain: toNum(raw.strain),
    // 温度状态（新增）
    temperature_status: raw.temperature_status || raw.temperatureStatus || null,
    _ts: toTs(created_at),
    _ingestTs: ingestTs,
  };
  
  console.log("[normalizeRecord] 标准化后:", normalized);
  return normalized;
}

  function recordKey(r) {
    if (r.id != null) return `id:${r.id}`;
    return [r.device_id, r.created_at, r.temperature, r.humidity, r.pressure, r.strain].join("|");
  }

  function applyRecord(raw, source = "rest") {
    const rec = normalizeRecord(raw);
    if (!rec) return false;
    const key = recordKey(rec);
    if (recordKeySet.has(key)) return false;

    recordKeySet.add(key);
    allLoadedRecords.value = [...allLoadedRecords.value, rec];

    if (source === "ws") {
      latest.value = rec;
      highlightRowId.value = rec.id ?? null;
      setTimeout(() => {
        if (highlightRowId.value === (rec.id ?? null)) highlightRowId.value = null;
      }, 1200);
    }
    return true;
  }

  function resetAll() {
    allLoadedRecords.value = [];
    recordKeySet.clear();
    latest.value = null;
    highlightRowId.value = null;
  }

  async function refreshFromRest() {
    loadError.value = "";
    taskError.value = "";

    // /devices 失败时兜底到旧逻辑
    let devicesItems = [];
    try {
      const devRes = await getSensorDevices({ withLatest: true, limit: 200 });
      devicesItems = Array.isArray(devRes?.items) ? devRes.items : [];
    } catch {
      devicesItems = [];
    }

    try {
      const [latRes, histRes, activeRes] = await Promise.all([
        getSensorLatest(undefined),
        getSensorHistory({ limit: historyLimit }),
        getActiveSensorTasks({}),
      ]);

      console.log("[refreshFromRest] latRes:", latRes);
      console.log("[refreshFromRest] histRes first item:", histRes?.items?.[0]);

      resetAll();

      for (const it of devicesItems) {
        if (it?.latest) applyRecord(it.latest, "rest");
      }

      const items = Array.isArray(histRes?.items) ? histRes.items : [];
      for (const it of items) applyRecord(it, "rest");

      const latestItem = latRes?.item ?? null;
      if (latestItem) {
        applyRecord(latestItem, "rest");
        latest.value = normalizeRecord(latestItem);
      } else if (allLoadedRecords.value.length) {
        latest.value = [...allLoadedRecords.value].sort((a, b) => b._ts - a._ts)[0] || null;
      }

      console.log("[refreshFromRest] 最终 latest.value:", latest.value);

      activeTasks.value = Array.isArray(activeRes?.items) ? activeRes.items : [];

      // 初始化：若选中设备有 active 任务，默认进入任务模式并拉任务记录
      if (!selectedDeviceId.value && deviceIds.value.length) {
        selectedDeviceId.value = deviceIds.value[0];
      }
      const activeForSelected = getActiveTaskForDevice(selectedDeviceId.value);
      if (activeForSelected) {
        await selectTask(activeForSelected.id, "active_task");
      } else {
        selectedTaskMode.value = "no_task";
        selectedTaskId.value = null;
        taskRecords.value = [];
      }
    } catch (e) {
      loadError.value = e?.message || String(e);
      console.error("[refreshFromRest] 错误:", e);
    }
  }

  const realDeviceIdsWhitelist = (() => {
    const raw = import.meta.env.VITE_REAL_DEVICE_IDS || "";
    return raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  })();

  const useRealDeviceFilter = realDeviceIdsWhitelist.length > 0;

  const hasWhitelistMatch = computed(() => {
    if (!useRealDeviceFilter) return false;
    const ids = new Set(allLoadedRecords.value.map((r) => String(r.device_id || "")));
    return realDeviceIdsWhitelist.some((id) => ids.has(id));
  });

  function isAllowedDevice(deviceId) {
    // 兜底：若白名单当前一个都匹配不上（例如设备ID写错），回退显示全部，避免下拉空白。
    if (!useRealDeviceFilter || !hasWhitelistMatch.value) return true;
    return realDeviceIdsWhitelist.includes(String(deviceId || ""));
  }

  const history = computed(() => {
    return [...allLoadedRecords.value].sort((a, b) => b._ts - a._ts);
  });

  const byDevice = computed(() => {
    /** @type {Record<string, Array<Record<string, any>>>} */
    const grouped = {};
    for (const rec of allLoadedRecords.value) {
      if (!isAllowedDevice(rec.device_id)) continue;
      if (!grouped[rec.device_id]) grouped[rec.device_id] = [];
      grouped[rec.device_id].push(rec);
    }
    for (const id of Object.keys(grouped)) {
      grouped[id].sort((a, b) => a._ts - b._ts);
    }
    return grouped;
  });

  const deviceIds = computed(() => {
    return Object.keys(byDevice.value).sort((a, b) => a.localeCompare(b));
  });

  const filteredHistory = computed(() => {
    const base = history.value.filter((r) => isAllowedDevice(r.device_id));
    const f = historyDeviceFilter.value?.trim();
    if (!f) return base;
    return base.filter((r) => r.device_id === f);
  });

  function getActiveTaskForDevice(deviceId) {
    if (!deviceId) return null;
    return activeTasks.value.find((x) => x.device_id === deviceId && x.status === "active") || null;
  }

  async function loadHistoryTasks(deviceId, limit = 5) {
    if (!deviceId) return [];
    try {
      const res = await getSensorTasks({ deviceId, limit });
      const list = Array.isArray(res?.items) ? res.items : [];
      taskListByDevice.value = { ...taskListByDevice.value, [deviceId]: list };
      return list;
    } catch (e) {
      taskError.value = e?.message || String(e);
      return [];
    }
  }

  async function selectTask(taskId, mode = "history_task") {
    if (!taskId) {
      selectedTaskId.value = null;
      selectedTaskMode.value = "no_task";
      taskRecords.value = [];
      return;
    }
    selectedTaskId.value = taskId;
    selectedTaskMode.value = mode;
    try {
      const res = await getSensorTaskRecords(taskId, { limit: 1000 });
      const taskRow = res?.task && typeof res.task === "object" ? res.task : {};
      const items = Array.isArray(res?.items) ? res.items : [];

      // 图表时间轴统一用前端接收时间，避免后端 created_at 时区差导致“曲线看不见/跑偏”。
      let merged = items.map((r, idx) => ({
        ...r,
        _ingestTs: toChartTs(r.created_at, Date.now() + idx),
      }));

      // 刷新后「实时模式·近 5 分钟」曲线：从 history 补全该时间窗内、任务窗口内、且 task 列表尚未包含的记录，避免页面重载后近 5 分钟轨迹被清空。
      const did = String(taskRow.device_id || selectedDeviceId.value || "").trim();
      const startId = Number(taskRow.start_record_id ?? 0);
      const endId = taskRow.end_record_id != null ? Number(taskRow.end_record_id) : Number.POSITIVE_INFINITY;
      // 仅当接口返回 task 元数据时合并，避免误把非任务区间数据掺入
      if (did && res?.task) {
        try {
          const histRes = await getSensorHistory({ deviceId: did, limit: 500 });
          const histItems = Array.isArray(histRes?.items) ? histRes.items : [];
          const byId = new Map(merged.map((r) => [r.id, r]));
          const now = Date.now();
          const winStart = now - 5 * 60 * 1000;
          for (const raw of histItems) {
            const rid = raw.id;
            if (rid == null) continue;
            if (rid <= startId || rid > endId) continue;
            if (byId.has(rid)) continue;
            const ts = toChartTs(raw.created_at);
            if (ts < winStart - 5000 || ts > now + 120000) continue;
            byId.set(rid, {
              ...raw,
              temperature: toNum(raw.temperature),
              humidity: toNum(raw.humidity),
              _ingestTs: ts,
            });
          }
          merged = Array.from(byId.values()).sort((a, b) => Number(a.id) - Number(b.id));
        } catch {
          /* 合并失败则仅用 task 接口数据 */
        }
      }

      taskRecords.value = merged;
    } catch (e) {
      taskError.value = e?.message || String(e);
      taskRecords.value = [];
    }
  }

  async function createTaskForDevice(deviceId, payload) {
    taskError.value = "";
    const res = await createSensorTask({ device_id: deviceId, ...payload });
    const item = res?.item;
    if (item) {
      activeTasks.value = [item, ...activeTasks.value.filter((x) => x.device_id !== item.device_id)];
      await loadHistoryTasks(item.device_id, 5);
      await selectTask(item.id, "active_task");
    }
    return res;
  }

  async function finishTaskById(taskId) {
    taskError.value = "";
    const res = await finishSensorTask(taskId);
    const item = res?.item;
    if (item) {
      activeTasks.value = activeTasks.value.filter((x) => x.id !== item.id);
      await loadHistoryTasks(item.device_id, 5);
      if (selectedTaskId.value === item.id) {
        await selectTask(item.id, "history_task");
      }
    }
    return res;
  }

  async function deleteTaskById(taskId) {
    taskError.value = "";
    const res = await deleteSensorTask(taskId);
    const item = res?.item;
    if (item) {
      await loadHistoryTasks(item.device_id, 5);
      if (selectedTaskId.value === item.id) {
        selectedTaskId.value = null;
        selectedTaskMode.value = "no_task";
        taskRecords.value = [];
      }
    }
    return res;
  }

  const selectedTaskMeta = computed(() => {
    if (!selectedTaskId.value) return null;

    const active = activeTasks.value.find((x) => x.id === selectedTaskId.value);
    if (active) return active;

    const did = selectedDeviceId.value;
    const list = (did && taskListByDevice.value[did]) || [];
    return list.find((x) => x.id === selectedTaskId.value) || null;
  });

  const selectedSeries = computed(() => {
    console.log("[selectedSeries] selectedTaskMode:", selectedTaskMode.value);
    console.log("[selectedSeries] selectedDeviceId:", selectedDeviceId.value);
    
    // 任务模式：图表优先显示任务窗口数据
    if (selectedTaskMode.value !== "no_task" && taskRecords.value.length) {
      const series = taskRecords.value.map((r) => ({
        created_at: r.created_at,
        ts: r._ingestTs ?? (Date.parse(r.created_at || "") || Date.now()),
        // 环境数据组
        temperature: toNum(r.temperature),
        humidity: toNum(r.humidity),
        // 材料状态组（新增）
        material_temperature: toNum(r.material_temperature),
        strain: toNum(r.strain),
      }));
      console.log("[selectedSeries] 任务模式数据:", series);
      return series;
    }

    // 无任务模式：显示选中设备的历史数据
    if (selectedDeviceId.value && byDevice.value[selectedDeviceId.value]) {
      const deviceRecords = byDevice.value[selectedDeviceId.value];
      const series = deviceRecords.map((r) => ({
        created_at: r.created_at,
        ts: r._ingestTs ?? r._ts,
        // 环境数据组
        temperature: r.temperature,
        humidity: r.humidity,
        // 材料状态组（新增）
        material_temperature: r.material_temperature,
        strain: r.strain,
      }));
      console.log("[selectedSeries] 无任务模式数据:", series);
      return series;
    }

    console.log("[selectedSeries] 无数据返回空数组");
    return [];
  });

  // 当前选中设备的完整记录（用于指标卡片）
  const selectedDeviceRecord = computed(() => {
    const id = selectedDeviceId.value;
    if (!id) return null;
    const arr = byDevice.value[id] || [];
    return arr.length ? arr[arr.length - 1] : null;
  });

  const selectedDeviceFirstSeenTs = computed(() => {
    const id = selectedDeviceId.value;
    if (!id) return null;
    const arr = byDevice.value[id] || [];
    if (!arr.length) return null;
    return arr[0]._ingestTs ?? arr[0]._ts;
  });

  const deviceCards = computed(() => {
    const rows = [];
    for (const id of deviceIds.value) {
      const arr = byDevice.value[id] || [];
      const record = arr.length ? arr[arr.length - 1] : null;
      let alarm = "unknown";
      // 优先根据材料温度判断状态（不是环境温度）
      if (record?.material_temperature != null) {
        alarm = record.material_temperature < Number(tempMin.value) || record.material_temperature > Number(tempMax.value) ? "alarm" : "ok";
      } else if (record?.temperature != null) {
        alarm = record.temperature < Number(tempMin.value) || record.temperature > Number(tempMax.value) ? "alarm" : "ok";
      }
      rows.push({ device_id: id, record, alarm });
    }
    return rows;
  });

  const selectedAlarm = computed(() => {
    const id = selectedDeviceId.value;
    if (!id) return "unknown";
    const d = deviceCards.value.find((x) => x.device_id === id);
    return d?.alarm || "unknown";
  });

  const exportRows = computed(() => {
    const base = history.value.filter((r) => isAllowedDevice(r.device_id));
    const f = historyDeviceFilter.value?.trim();
    const rows = f ? base.filter((r) => r.device_id === f) : base;
    return rows.map((r) => ({
      device_id: r.device_id ?? "",
      created_at: r.created_at ?? "",
      temperature: r.temperature ?? "",
      humidity: r.humidity ?? "",
      material_temperature: r.material_temperature ?? "",
      pressure: r.pressure ?? "",
      strain: r.strain ?? "",
      curing_status: r.curing_status ?? "",
    }));
  });

  function exportCsv() {
    const headers = [
      "device_id",
      "created_at",
      "temperature",
      "humidity",
      "material_temperature",
      "pressure",
      "strain",
      "curing_status",
    ];

    const esc = (v) => {
      const s = String(v ?? "");
      if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
      return s;
    };

    const lines = [headers.join(",")];
    for (const row of exportRows.value) {
      lines.push(headers.map((h) => esc(row[h])).join(","));
    }

    const csv = `\uFEFF${lines.join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dev = historyDeviceFilter.value?.trim() || "all";
    const stamp = new Date().toISOString().replaceAll(":", "-");
    a.href = url;
    a.download = `sensor_data_${dev}_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  onMounted(() => {
    refreshFromRest();

    wsConnecting.value = true;
    socketApi = createSensorSocket({
      onOpen: () => {
        wsConnecting.value = false;
        wsConnected.value = true;
        wsError.value = "";
      },
      onClose: () => {
        wsConnecting.value = false;
        wsConnected.value = false;
      },
      onError: () => {
        wsConnecting.value = false;
        wsError.value = "WebSocket 连接出错（请确认 VITE_WS_BASE_URL 与后端一致，且后端已启动）";
      },
      onParsedMessage: (data) => {
        console.log("[useSensorMonitor] 接收到 WebSocket 数据:", data);
        
        const inserted = applyRecord(data, "ws");
        console.log("[useSensorMonitor] applyRecord 插入成功?", inserted);
        
        if (!selectedDeviceId.value && deviceIds.value.length) {
          selectedDeviceId.value = deviceIds.value[0];
        }

        // active_task 模式实时追加：
        // 仅当当前选中设备与 ws 设备一致，且该设备存在 active task，才追加到 taskRecords。
        if (!inserted) return;
        const rec = normalizeRecord(data);
        if (!rec) return;

        const did = selectedDeviceId.value;
        const active = getActiveTaskForDevice(did);
        console.log("[useSensorMonitor] active task 检查：", selectedTaskMode.value, active);
        
        if (
          selectedTaskMode.value === "active_task" &&
          active &&
          selectedTaskId.value === active.id &&
          rec.device_id === did
        ) {
          // 去重后追加，确保曲线实时增长。
          const exists = taskRecords.value.some((x) => x.id != null && rec.id != null && x.id === rec.id);
          console.log("[useSensorMonitor] 追加 taskRecords 是否存在：", exists);
          if (!exists) {
            taskRecords.value = [
              ...taskRecords.value,
              {
                ...rec,
                _ingestTs: toChartTs(rec.created_at, rec._ingestTs ?? Date.now()),
              },
            ];
            console.log("[useSensorMonitor] 已追加到 taskRecords，当前数量：", taskRecords.value.length);
          }
        }
      },
    });
    socketApi.connect();
  });

  onUnmounted(() => {
    socketApi?.disconnect();
    socketApi = null;
  });

  return {
    latest,
    history,
    realDeviceIdsWhitelist,
    useRealDeviceFilter,
    loadError,

    activeTasks,
    taskListByDevice,
    selectedTaskId,
    selectedTaskMode,
    selectedTaskMeta,
    taskRecords,
    taskError,
    wsConnected,
    wsConnecting,
    wsError,

    tempMin,
    tempMax,

    selectedDeviceId,
    selectedDeviceFirstSeenTs,
    selectedDeviceRecord,
    selectedSeries,
    selectedAlarm,
    deviceIds,
    deviceCards,

    historyDeviceFilter,
    filteredHistory,
    highlightRowId,

    exportRows,
    exportCsv,

    getActiveTaskForDevice,
    loadHistoryTasks,
    selectTask,
    createTaskForDevice,
    finishTaskById,
    deleteTaskById,

    refreshFromRest,
  };
}
