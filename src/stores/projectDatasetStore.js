import { computed, ref, watch } from "vue";

const LS_DATASETS = "ds_project_datasets_v1";

/** @type {import('vue').Ref<Array<any>>} */
const datasets = ref([]);

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(LS_DATASETS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(rows) {
  try {
    localStorage.setItem(LS_DATASETS, JSON.stringify(rows));
  } catch {
    // ignore quota errors in local-first v1
  }
}

datasets.value = loadFromStorage();

watch(
  datasets,
  (v) => {
    saveToStorage(v);
  },
  { deep: true },
);

function mkColumns(featureCount, targetCount) {
  const cols = [{ key: "row_no", name: "ID", role: "id", readonly: true }];
  for (let i = 1; i <= featureCount; i += 1) {
    cols.push({ key: `feature_${i}`, name: `Feature${i}`, role: "feature", readonly: false });
  }
  for (let i = 1; i <= targetCount; i += 1) {
    cols.push({ key: `target_${i}`, name: `Target${i}`, role: "target", readonly: false });
  }
  return cols;
}

function mkRows(columns, count, startNo = 1) {
  const editable = columns.filter((c) => c.role !== "id");
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const rowNo = startNo + i;
    /** @type {Record<string, string>} */
    const cells = {};
    for (const col of editable) cells[col.key] = "";
    rows.push({ rowNo, cells });
  }
  return rows;
}

function getDatasetById(datasetId) {
  return datasets.value.find((x) => x.id === datasetId) || null;
}

function getDatasetsByProject(projectId) {
  return datasets.value
    .filter((x) => x.projectId === projectId)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}

export function createDataset(payload) {
  const projectId = String(payload.projectId || "").trim();
  const name = String(payload.name || "").trim();
  const featureCount = Number(payload.featureCount || 0);
  const targetCount = Number(payload.targetCount || 0);

  if (!projectId) throw new Error("Missing projectId");
  if (!name) throw new Error("Dataset name is required");
  if (!Number.isInteger(featureCount) || featureCount <= 0) throw new Error("Feature count must be positive integer");
  if (!Number.isInteger(targetCount) || targetCount <= 0) throw new Error("Target count must be positive integer");

  const ts = nowIso();
  const columns = mkColumns(featureCount, targetCount);
  const rows = mkRows(columns, 10, 1);

  const ds = {
    id: uid("dataset"),
    schemaVersion: 2,
    projectId,
    name,
    featureCount,
    targetCount,
    columns,
    rows,
    bindings: [],
    createdAt: ts,
    updatedAt: ts,
  };

  datasets.value = [...datasets.value, ds];
  return ds;
}

export function deleteDataset(datasetId) {
  datasets.value = datasets.value.filter((x) => x.id !== datasetId);
}

export function appendRows(datasetId, chunk = 10) {
  const idx = datasets.value.findIndex((x) => x.id === datasetId);
  if (idx < 0) return;
  const cur = datasets.value[idx];
  const startNo = (cur.rows?.length || 0) + 1;
  const addRows = mkRows(cur.columns, chunk, startNo);
  const next = { ...cur, rows: [...cur.rows, ...addRows], updatedAt: nowIso() };
  const copy = [...datasets.value];
  copy[idx] = next;
  datasets.value = copy;
}

export function saveDatasetEditing(datasetId, columns, rows) {
  const idx = datasets.value.findIndex((x) => x.id === datasetId);
  if (idx < 0) return null;
  const cur = datasets.value[idx];
  const next = {
    ...cur,
    columns: Array.isArray(columns) ? columns : cur.columns,
    rows: Array.isArray(rows) ? rows : cur.rows,
    updatedAt: nowIso(),
  };
  const copy = [...datasets.value];
  copy[idx] = next;
  datasets.value = copy;
  return next;
}

function overlap(aStart, aEnd, bStart, bEnd) {
  return Math.max(aStart, bStart) <= Math.min(aEnd, bEnd);
}

export function findBindingConflict(dataset, startRow, endRow) {
  const list = Array.isArray(dataset?.bindings) ? dataset.bindings : [];
  for (const b of list) {
    if (overlap(startRow, endRow, Number(b.rangeStartRow), Number(b.rangeEndRow))) {
      return b;
    }
  }
  return null;
}

export function createMonitorTaskBinding(datasetId, payload) {
  const idx = datasets.value.findIndex((x) => x.id === datasetId);
  if (idx < 0) throw new Error("Dataset not found");
  const cur = datasets.value[idx];

  const start = Number(payload.rangeStartRow);
  const end = Number(payload.rangeEndRow);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start <= 0 || end < start) {
    throw new Error("Invalid sample row range");
  }
  if (end > cur.rows.length) {
    throw new Error(`Row range exceeds dataset length (${cur.rows.length})`);
  }

  const status = String(payload.taskStatus || "").toLowerCase();
  if (status !== "finished") {
    throw new Error("Only finished tasks are allowed");
  }

  const sampleCount = end - start + 1;
  const taskRecordCountSnapshotRaw = Number(payload.taskRecordCountSnapshot);
  const taskRecordCountSnapshot = Number.isFinite(taskRecordCountSnapshotRaw) && taskRecordCountSnapshotRaw >= 0
    ? Math.floor(taskRecordCountSnapshotRaw)
    : 0;

  const selectedChannelsRaw = Array.isArray(payload.selectedChannels) ? payload.selectedChannels : [];
  const allowChannels = new Set(["temperature", "humidity", "time"]);
  const selectedChannels = [...new Set(selectedChannelsRaw.map((x) => String(x || "").toLowerCase()))].filter((x) => allowChannels.has(x));
  if (!selectedChannels.length) {
    throw new Error("At least one channel must be selected");
  }

  const featureColumns = (cur.columns || []).filter((c) => c?.role === "feature");
  const featureKeys = new Set(featureColumns.map((c) => String(c.key)));
  const featureNameMap = new Map(featureColumns.map((c) => [String(c.key), String(c.name || c.key)]));
  const fieldMappingsRaw = Array.isArray(payload.fieldMappings) ? payload.fieldMappings : [];
  const fieldMappings = fieldMappingsRaw
    .map((m) => {
      const sourceField = String(m?.sourceField || "").toLowerCase();
      const targetColumnKey = String(m?.targetColumnKey || "");
      return {
        sourceField,
        targetColumnKey,
        targetColumnName: featureNameMap.get(targetColumnKey) || targetColumnKey,
      };
    })
    .filter((m) => selectedChannels.includes(m.sourceField));

  if (fieldMappings.length !== selectedChannels.length) {
    throw new Error("Field mappings are incomplete");
  }

  const seenSource = new Set();
  for (const m of fieldMappings) {
    if (seenSource.has(m.sourceField)) {
      throw new Error(`Duplicate mapping for ${m.sourceField}`);
    }
    seenSource.add(m.sourceField);
    if (!featureKeys.has(m.targetColumnKey)) {
      throw new Error(`Mapped target for ${m.sourceField} must be a feature column`);
    }
  }

  const conflict = findBindingConflict(cur, start, end);
  if (conflict) {
    throw new Error(
      `Range conflict with existing binding ${conflict.rangeStartRow}-${conflict.rangeEndRow} (${conflict.taskNameSnapshot || conflict.taskId})`,
    );
  }

  const binding = {
    id: uid("binding"),
    datasetId: cur.id,
    projectId: cur.projectId,
    deviceId: String(payload.deviceId || ""),
    taskId: Number(payload.taskId),
    taskNameSnapshot: payload.taskNameSnapshot || `Task #${payload.taskId}`,
    taskStatusSnapshot: "finished",
    rangeStartRow: start,
    rangeEndRow: end,
    sampleCount,
    taskRecordCountSnapshot,
    selectedChannels,
    fieldMappings,
    taskStartedAt: payload.taskStartedAt || "",
    taskEndedAt: payload.taskEndedAt || "",
    createdAt: nowIso(),
  };

  const next = {
    ...cur,
    schemaVersion: 2,
    bindings: [binding, ...(cur.bindings || [])],
    updatedAt: nowIso(),
  };
  const copy = [...datasets.value];
  copy[idx] = next;
  datasets.value = copy;
  return binding;
}

export function removeMonitorTaskBinding(datasetId, bindingId) {
  const idx = datasets.value.findIndex((x) => x.id === datasetId);
  if (idx < 0) return null;
  const cur = datasets.value[idx];
  const next = {
    ...cur,
    bindings: (cur.bindings || []).filter((b) => b.id !== bindingId),
    updatedAt: nowIso(),
  };
  const copy = [...datasets.value];
  copy[idx] = next;
  datasets.value = copy;
  return next;
}

export function buildRowBindingMap(dataset) {
  /** @type {Record<number, { taskName: string, taskId: number, deviceId: string, isStartRow: boolean, rangeStartRow: number, rangeEndRow: number }>} */
  const map = {};
  const list = Array.isArray(dataset?.bindings) ? dataset.bindings : [];
  for (const b of list) {
    const start = Number(b.rangeStartRow);
    const end = Number(b.rangeEndRow);
    for (let rowNo = start; rowNo <= end; rowNo += 1) {
      map[rowNo] = {
        taskName: b.taskNameSnapshot || `Task #${b.taskId}`,
        taskId: Number(b.taskId),
        deviceId: String(b.deviceId || ""),
        isStartRow: rowNo === start,
        rangeStartRow: start,
        rangeEndRow: end,
      };
    }
  }
  return map;
}

export function useProjectDatasets(projectIdRef) {
  const projectDatasets = computed(() => {
    const pid = String(projectIdRef?.value || "");
    if (!pid) return [];
    return getDatasetsByProject(pid);
  });

  return {
    datasets,
    projectDatasets,
    getDatasetById,
  };
}