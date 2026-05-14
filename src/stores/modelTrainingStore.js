import { reactive } from "vue";
import {
  createTrainingJob,
  getTrainingJob,
  getTrainingJobProgress,
  getTrainingJobLogs,
  getTrainingJobMetrics,
  listModelVersions,
  activateModelVersion,
  deleteModelVersion,
} from "../api/training.js";
import { analyzeRows, datasetToRows, parseCsvText } from "../utils/trainingDataAnalysis.js";

const LS_DATASETS_KEY = "ds_project_datasets_v1";

export const trainingState = reactive({
  sourceType: "dataset",
  selectedProjectId: "",
  selectedDatasetId: "",
  uploadSessionId: "",

  datasets: [],
  selectedDataset: null,

  uploadedFile: null,
  uploadedColumns: [],
  uploadStatus: "idle", // idle|parsing|ready|error
  uploadError: "",

  analysis: null,
  trainingRows: [],
  loadingAnalysis: false,
  analysisStatus: "idle", // idle|loading|success|error|empty

  jobId: "",
  jobDetail: null,
  progress: null,
  logs: [],
  metrics: [],
  polling: false,

  modelVersions: [],
  err: "",
  ok: "",
});

let pollTimer = null;

function setMsg({ ok = "", err = "" } = {}) {
  trainingState.ok = ok;
  trainingState.err = err;
}

function readLocalDatasets() {
  try {
    const raw = localStorage.getItem(LS_DATASETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeDatasetRows(ds) {
  if (!ds) return [];
  if (Array.isArray(ds.previewRows) && ds.previewRows.length) return ds.previewRows;
  if (Array.isArray(ds.data) && ds.data.length) return ds.data;
  if (Array.isArray(ds.tableData) && ds.tableData.length) return ds.tableData;
  if (Array.isArray(ds.rows) && ds.rows.length) {
    const mapped = datasetToRows(ds);
    if (mapped.some((r) => Object.keys(r || {}).length > 0)) return mapped;
    if (typeof ds.rows[0] === "object" && !ds.rows[0]?.cells) return ds.rows;
  }
  return [];
}

export function loadLocalProjectDatasets(projectId) {
  const all = readLocalDatasets();
  trainingState.datasets = all
    .filter((x) => String(x.projectId || "") === String(projectId || ""))
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}

export function selectDataset(datasetId) {
  trainingState.selectedDatasetId = datasetId || "";
  trainingState.selectedDataset = trainingState.datasets.find((x) => x.id === datasetId) || null;
}

export async function runDatasetAnalysis({ projectId, datasetId, targetColumn }) {
  trainingState.loadingAnalysis = true;
  trainingState.analysisStatus = "loading";
  setMsg();
  try {
    trainingState.selectedProjectId = projectId;
    loadLocalProjectDatasets(projectId);
    selectDataset(datasetId);

    if (!trainingState.selectedDataset) {
      trainingState.analysis = null;
      trainingState.analysisStatus = "empty";
      setMsg({ err: "未找到数据集，请先在数据资产中创建或保存数据集" });
      return;
    }

    const rows = normalizeDatasetRows(trainingState.selectedDataset);
    trainingState.trainingRows = rows;
    if (!rows.length) {
      throw new Error("当前数据集没有可训练的表格行，请先在数据资产中导入或保存表格数据");
    }
    const result = analyzeRows(rows, { targetColumn });
    result.dataset_name = trainingState.selectedDataset.name || "未命名数据集";
    result.updated_at = trainingState.selectedDataset.updatedAt || "";

    trainingState.analysis = result;
    trainingState.analysisStatus = "success";
    setMsg({ ok: "数据分析完成" });
  } catch (e) {
    trainingState.analysisStatus = "error";
    setMsg({ err: e?.message || String(e) });
  } finally {
    trainingState.loadingAnalysis = false;
  }
}

export async function runUploadAnalysis({ projectId, targetColumn, file }) {
  trainingState.loadingAnalysis = true;
  trainingState.uploadStatus = "parsing";
  trainingState.uploadError = "";
  trainingState.analysisStatus = "loading";
  setMsg();

  try {
    trainingState.selectedProjectId = projectId;
    trainingState.uploadedFile = {
      name: file?.name || "",
      size: Number(file?.size || 0),
      type: file?.type || "",
      raw: file,
    };

    const ext = (file?.name || "").toLowerCase().split(".").pop();
    if (!ext || !["csv", "xlsx"].includes(ext)) {
      throw new Error("仅支持 csv / xlsx 文件");
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("文件大小超过 10MB 限制");
    }

    if (ext === "xlsx") {
      throw new Error("当前版本前端仅支持 CSV 解析，XLSX 请先转为 CSV 后上传");
    }

    const text = await file.text();
    const parsed = parseCsvText(text);
    trainingState.uploadedColumns = parsed.columns || [];
    trainingState.trainingRows = parsed.rows || [];
    const result = analyzeRows(parsed.rows, { targetColumn });
    result.dataset_name = file.name;
    result.updated_at = new Date().toISOString();

    trainingState.analysis = result;
    trainingState.uploadSessionId = `up_${Date.now()}`;
    trainingState.uploadStatus = "ready";
    trainingState.analysisStatus = "success";
    setMsg({ ok: "文件解析并分析完成" });
  } catch (e) {
    trainingState.uploadStatus = "error";
    trainingState.analysisStatus = "error";
    trainingState.uploadError = e?.message || String(e);
    setMsg({ err: trainingState.uploadError });
  } finally {
    trainingState.loadingAnalysis = false;
  }
}

export async function startTrainingJob(payload) {
  setMsg();
  const res = await createTrainingJob(payload);
  trainingState.jobId = res.job_id;
  trainingState.polling = true;
  await pollTrainingJob(true);
  return res;
}

async function pollTrainingJob(immediate = false) {
  if (!trainingState.jobId) return;
  if (immediate) await refreshTrainingJob();
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    await refreshTrainingJob();
    const st = trainingState.progress?.status;
    if (st === "success" || st === "failed") stopTrainingPolling();
  }, 1200);
}

export function stopTrainingPolling() {
  trainingState.polling = false;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export async function refreshTrainingJob() {
  if (!trainingState.jobId) return;
  const [d, p, l, m] = await Promise.all([
    getTrainingJob(trainingState.jobId),
    getTrainingJobProgress(trainingState.jobId),
    getTrainingJobLogs(trainingState.jobId),
    getTrainingJobMetrics(trainingState.jobId),
  ]);
  trainingState.jobDetail = d.item || null;
  trainingState.progress = p;
  trainingState.logs = Array.isArray(l.items) ? l.items : [];
  trainingState.metrics = Array.isArray(m.items) ? m.items : [];
}

export async function loadModelVersions(projectId) {
  const res = await listModelVersions(projectId);
  trainingState.modelVersions = Array.isArray(res.items) ? res.items : [];
}

export async function setActiveModel(projectId, modelVersionId) {
  await activateModelVersion(projectId, modelVersionId);
  await loadModelVersions(projectId);
  setMsg({ ok: "已设置为性能预测右侧当前模型" });
}

export async function removeModelVersion(projectId, modelVersionId) {
  await deleteModelVersion(projectId, modelVersionId);
  await loadModelVersions(projectId);
  setMsg({ ok: "模型已删除" });
}
