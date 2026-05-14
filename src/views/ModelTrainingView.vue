<script setup>
import { computed, inject, reactive, watch } from "vue";
import {
  trainingState,
  loadLocalProjectDatasets,
  selectDataset,
  runDatasetAnalysis,
  runUploadAnalysis,
  startTrainingJob,
  loadModelVersions,
  setActiveModel,
  removeModelVersion,
} from "../stores/modelTrainingStore.js";

const workspaceProjectId = inject("workspaceProjectId", computed(() => ""));

const form = reactive({
  datasetId: "",
  targetColumn: "",
  taskName: "",
  selectedAlgorithms: ["RandomForest", "XGBoost", "GradientBoosting", "ExtraTrees", "LinearRegression"],
  cvFolds: 5,
  splitTrain: 70,
  splitVal: 15,
  splitTest: 15,
  tuningEnabled: true,
  randomState: 42,
  qualityModeUsed: "standard",
});

const algoOptions = ["RandomForest", "XGBoost", "GradientBoosting", "ExtraTrees", "LinearRegression"];

const progressPct = computed(() => Number(trainingState.progress?.progress_pct || 0));
const hasHeatmap = computed(() => (trainingState.analysis?.heatmap?.columns || []).length >= 2);
const histogramEntries = computed(() => Object.entries(trainingState.analysis?.histograms || {}));

const targetOptions = computed(() => {
  if (trainingState.sourceType === "upload") {
    return trainingState.uploadedColumns || trainingState.analysis?.all_columns || [];
  }
  return trainingState.analysis?.all_columns || [];
});

function ensureProjectId() {
  return workspaceProjectId?.value || "demo-project";
}

function bytesToReadable(n) {
  if (!n) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

watch(
  () => workspaceProjectId?.value,
  async () => {
    const pid = ensureProjectId();
    loadLocalProjectDatasets(pid);
    if (!form.datasetId && trainingState.datasets.length) {
      form.datasetId = trainingState.datasets[0].id;
      selectDataset(form.datasetId);
    }
    await loadModelVersions(pid);
  },
  { immediate: true },
);

watch(
  () => form.datasetId,
  (v) => selectDataset(v),
);

watch(
  () => trainingState.sourceType,
  () => {
    trainingState.analysis = null;
    trainingState.analysisStatus = "idle";
    form.targetColumn = "";
  },
);

async function onAnalyzeDataset() {
  await runDatasetAnalysis({
    projectId: ensureProjectId(),
    datasetId: form.datasetId,
    targetColumn: form.targetColumn || undefined,
  });
  if (trainingState.analysis?.target_column) {
    form.targetColumn = trainingState.analysis.target_column;
  }
}

async function onUploadFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  await runUploadAnalysis({
    projectId: ensureProjectId(),
    targetColumn: form.targetColumn || undefined,
    file,
  });
  if (trainingState.analysis?.target_column) {
    form.targetColumn = trainingState.analysis.target_column;
  }
}

async function onAnalyzeUpload() {
  if (!trainingState.uploadedFile?.raw) {
    trainingState.err = "请先选择文件";
    return;
  }
  await runUploadAnalysis({
    projectId: ensureProjectId(),
    targetColumn: form.targetColumn || undefined,
    file: trainingState.uploadedFile.raw,
  });
}

async function onStartTraining() {
  const sum = Number(form.splitTrain) + Number(form.splitVal) + Number(form.splitTest);
  if (sum !== 100) {
    trainingState.err = "训练/验证/测试比例之和必须等于 100";
    return;
  }
  if (!form.selectedAlgorithms.length) {
    trainingState.err = "请至少勾选 1 个算法";
    return;
  }

  const taskName = window.prompt("请输入训练任务名称", form.taskName || "我的训练任务");
  if (!taskName) return;
  form.taskName = taskName;

  const target = form.targetColumn || trainingState.analysis?.target_column || "target";
  const features = (trainingState.analysis?.numeric_columns || []).filter((c) => c !== target);

  const rows = trainingState.trainingRows || [];
  if (!rows.length) {
    trainingState.err = "当前没有可训练数据。请先完成一次数据分析（导入数据资产或上传CSV）";
    return;
  }

  await startTrainingJob({
    project_id: ensureProjectId(),
    dataset_id: trainingState.sourceType === "dataset" ? form.datasetId : null,
    upload_session_id: trainingState.sourceType === "upload" ? trainingState.uploadSessionId : null,
    task_name: taskName,
    target_column: target,
    feature_columns: features,
    selected_algorithms: [...form.selectedAlgorithms],
    split_config: {
      train: Number(form.splitTrain) / 100,
      val: Number(form.splitVal) / 100,
      test: Number(form.splitTest) / 100,
    },
    cv_folds: Number(form.cvFolds),
    random_state: Number(form.randomState),
    tuning_enabled: Boolean(form.tuningEnabled),
    quality_mode_used: form.qualityModeUsed,
    sample_count: Number(trainingState.analysis?.sample_count || 0),
    training_rows: trainingState.trainingRows || [],
  });

  await loadModelVersions(ensureProjectId());
}

async function onActivateModel(modelVersionId) {
  await setActiveModel(ensureProjectId(), modelVersionId);
}

async function onDeleteModel(modelVersionId) {
  const ok = window.confirm("确认删除该模型版本？删除后不可恢复。");
  if (!ok) return;
  await removeModelVersion(ensureProjectId(), modelVersionId);
}
</script>

<template>
  <div class="model-training-page">
    <div class="layout">
      <section class="left platform-page">
        <h3>模型训练 / 数据与分析</h3>

        <div class="card">
          <h4>数据源选择</h4>
          <div class="row">
            <button class="btn" :class="{ on: trainingState.sourceType === 'dataset' }" @click="trainingState.sourceType = 'dataset'">导入数据资产</button>
            <button class="btn" :class="{ on: trainingState.sourceType === 'upload' }" @click="trainingState.sourceType = 'upload'">上传文件</button>
          </div>

          <template v-if="trainingState.sourceType === 'dataset'">
            <div class="row two">
              <label>
                <span>可选数据集</span>
                <select v-model="form.datasetId">
                  <option value="">请选择数据集</option>
                  <option v-for="ds in trainingState.datasets" :key="ds.id" :value="ds.id">
                    {{ ds.name }}（行数 {{ ds.rows?.length || 0 }}）
                  </option>
                </select>
              </label>
              <label>
                <span>目标列</span>
                <select v-model="form.targetColumn" :disabled="!targetOptions.length">
                  <option value="">请选择目标列</option>
                  <option v-for="c in targetOptions" :key="`ds-target-${c}`" :value="c">{{ c }}</option>
                </select>
              </label>
            </div>
            <p v-if="!trainingState.datasets.length" class="hint warn">当前项目暂无数据集，请先在数据资产页面创建并保存。</p>
            <button class="btn primary" :disabled="trainingState.loadingAnalysis || !form.datasetId" @click="onAnalyzeDataset">
              {{ trainingState.loadingAnalysis ? "分析中..." : "数据分析" }}
            </button>
          </template>

          <template v-else>
            <div class="row two">
              <label>
                <span>上传 csv/xlsx（<=10MB）</span>
                <input type="file" accept=".csv,.xlsx" @change="onUploadFile" />
              </label>
              <label>
                <span>目标列</span>
                <select v-model="form.targetColumn" :disabled="!targetOptions.length">
                  <option value="">请选择目标列</option>
                  <option v-for="c in targetOptions" :key="`up-target-${c}`" :value="c">{{ c }}</option>
                </select>
              </label>
            </div>
            <p v-if="trainingState.uploadedFile" class="hint">
              文件：{{ trainingState.uploadedFile.name }} · {{ bytesToReadable(trainingState.uploadedFile.size) }} · 状态：{{ trainingState.uploadStatus }}
            </p>
            <p v-if="trainingState.uploadError" class="hint err">{{ trainingState.uploadError }}</p>
            <button class="btn primary" :disabled="trainingState.loadingAnalysis || !trainingState.uploadedFile" @click="onAnalyzeUpload">
              {{ trainingState.loadingAnalysis ? "分析中..." : "重新分析" }}
            </button>
          </template>
        </div>

        <div class="analysis-scroll">
          <div class="card" v-if="trainingState.analysisStatus === 'loading'">
            <h4>分析状态</h4>
            <p>正在分析数据，请稍候...</p>
          </div>

          <div class="card" v-if="trainingState.analysisStatus === 'empty'">
            <h4>分析状态</h4>
            <p>暂无可分析数据。</p>
          </div>

          <div class="card" v-if="trainingState.analysisStatus === 'success' && trainingState.analysis">
            <h4>数据质量报告</h4>
            <div class="quality-grid">
              <div class="quality-item"><span>数据源</span><strong>{{ trainingState.analysis.dataset_name || "—" }}</strong></div>
              <div class="quality-item"><span>样本数</span><strong>{{ trainingState.analysis.sample_count }}</strong></div>
              <div class="quality-item"><span>特征列数</span><strong>{{ trainingState.analysis.feature_count }}</strong></div>
              <div class="quality-item"><span>目标列</span><strong>{{ trainingState.analysis.target_column }}</strong></div>
              <div class="quality-item"><span>重复行</span><strong>{{ trainingState.analysis.duplicate_rows }}</strong></div>
              <div class="quality-item"><span>缺失率</span><strong>{{ trainingState.analysis.missing_rate }}</strong></div>
            </div>
          </div>

          <div class="card" v-if="trainingState.analysisStatus === 'success' && trainingState.analysis">
            <h4>缺失值概览</h4>
            <ul class="kv-list">
              <li v-for="(v, k) in trainingState.analysis.missing_by_column || {}" :key="k">{{ k }}：{{ (v * 100).toFixed(1) }}%</li>
            </ul>
          </div>

          <div class="card" v-if="trainingState.analysisStatus === 'success' && trainingState.analysis">
            <h4>Pearson 相关性热图</h4>
            <p v-if="!hasHeatmap" class="hint warn">{{ trainingState.analysis.message || "数值列不足，无法生成热图" }}</p>
            <div v-else class="heatmap-wrap">
              <div class="heatmap-grid" :style="{ gridTemplateColumns: `140px repeat(${trainingState.analysis.heatmap.columns.length}, minmax(56px,1fr))` }">
                <div class="cell head">列</div>
                <div v-for="c in trainingState.analysis.heatmap.columns" :key="`h-${c}`" class="cell head">{{ c }}</div>
                <template v-for="(row, i) in trainingState.analysis.heatmap.matrix" :key="`r-${i}`">
                  <div class="cell row-head">{{ trainingState.analysis.heatmap.columns[i] }}</div>
                  <div
                    v-for="(val, j) in row"
                    :key="`c-${i}-${j}`"
                    class="cell val"
                    :style="{ background: `rgba(27,94,32, ${Math.min(1, Math.abs(Number(val || 0))) * 0.8})`, color: Math.abs(Number(val || 0)) > 0.55 ? '#fff' : '#1f2b20' }"
                  >
                    {{ Number(val || 0).toFixed(2) }}
                  </div>
                </template>
              </div>
            </div>
          </div>

          <div class="card" v-if="trainingState.analysisStatus === 'success' && trainingState.analysis">
            <h4>变量分布图（数值列）</h4>
            <p v-if="!histogramEntries.length" class="hint warn">暂无可展示的数值列分布。</p>
            <div v-else class="hist-scroll">
              <div class="hist-grid">
                <div v-for="[col, hist] in histogramEntries" :key="col" class="hist-card">
                  <p class="hist-title">{{ col }}</p>
                  <div class="bars">
                    <div
                      v-for="(cnt, idx) in hist.counts"
                      :key="`${col}-${idx}`"
                      class="bar"
                      :style="{ height: `${Math.max(6, (cnt / Math.max(...hist.counts, 1)) * 80)}px` }"
                      :title="`bin ${idx + 1}: ${cnt}`"
                    />
                  </div>
                  <p class="hist-meta">{{ Number(hist.min).toFixed(2) }} ~ {{ Number(hist.max).toFixed(2) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside class="right platform-page">
        <h3>训练配置 / 进度 / 版本</h3>

        <div class="card">
          <h4>训练配置</h4>
          <label>
            <span>目标列</span>
            <select v-model="form.targetColumn" :disabled="!targetOptions.length">
              <option value="">请选择目标列</option>
              <option v-for="c in targetOptions" :key="`cfg-target-${c}`" :value="c">{{ c }}</option>
            </select>
          </label>
          <label>
            <span>算法</span>
            <div class="chips">
              <label v-for="a in algoOptions" :key="a" class="chip"><input v-model="form.selectedAlgorithms" type="checkbox" :value="a" />{{ a }}</label>
            </div>
          </label>
          <div class="row three">
            <label><span>Train%</span><input v-model.number="form.splitTrain" type="number" min="1" max="98" /></label>
            <label><span>Val%</span><input v-model.number="form.splitVal" type="number" min="1" max="98" /></label>
            <label><span>Test%</span><input v-model.number="form.splitTest" type="number" min="1" max="98" /></label>
          </div>
          <div class="row three">
            <label><span>K-fold</span><select v-model.number="form.cvFolds"><option :value="3">3</option><option :value="5">5</option><option :value="10">10</option></select></label>
            <label><span>随机种子</span><input v-model.number="form.randomState" type="number" /></label>
            <label><span>质量模式</span><select v-model="form.qualityModeUsed"><option value="standard">standard</option><option value="strict">strict</option></select></label>
          </div>
          <label class="inline"><input v-model="form.tuningEnabled" type="checkbox" />启用超参数微调</label>
          <button class="btn primary" :disabled="trainingState.analysisStatus !== 'success'" @click="onStartTraining">开始训练</button>
          <p v-if="trainingState.analysisStatus !== 'success'" class="hint warn">请先完成一次数据分析后再训练。</p>
        </div>

        <div class="card" v-if="trainingState.progress">
          <h4>训练进度</h4>
          <div class="progress-box">
            <div class="progress-bar"><span :style="{ width: `${progressPct}%` }" /></div>
            <p>状态：{{ trainingState.progress.status }} / {{ progressPct }}%</p>
          </div>
          <ul class="stage-list">
            <li v-for="s in trainingState.progress.stages || []" :key="s.stage" :class="s.status">
              <span>{{ s.stage }}</span>
              <strong>{{ s.status === 'todo' ? '未开始' : s.status === 'running' ? '进行中' : s.status === 'done' ? '已完成' : '失败' }}</strong>
            </li>
          </ul>
        </div>

        <div class="card">
          <h4>训练日志</h4>
          <ul class="log-list">
            <li v-for="(l, i) in trainingState.logs" :key="`${l.at}-${i}`">[{{ l.stage }}] {{ l.message }}</li>
          </ul>
        </div>

        <div class="card">
          <h4>训练指标（当前任务）</h4>
          <div class="metric-scroll">
            <div v-for="(m, i) in trainingState.metrics" :key="i" class="metric">
              <p>{{ m.model_name }} {{ m.is_best ? "(best)" : "" }}</p>
              <p>R2={{ m.r2 }} · MAE={{ m.mae }} · MSE={{ m.mse }} · RMSE={{ m.rmse }}</p>
            </div>
          </div>
        </div>

        <div class="card">
          <h4>模型版本</h4>
          <button class="btn" @click="loadModelVersions(ensureProjectId())">刷新版本</button>
          <div class="version-scroll">
            <ul>
              <li v-for="m in trainingState.modelVersions" :key="m.model_version_id" class="version-item">
                <div>
                  <p>{{ m.task_name }} · {{ m.model_name }} <span v-if="m.is_active_for_prediction" class="active-pill">ACTIVE</span></p>
                  <p class="sub">{{ m.created_at }} · R2: {{ m.metrics?.r2 ?? "-" }} · MAE: {{ m.metrics?.mae ?? "-" }} · RMSE: {{ m.metrics?.rmse ?? "-" }}</p>
                </div>
                <div class="actions">
                  <button class="btn mini" @click="onActivateModel(m.model_version_id)">{{ m.is_active_for_prediction ? "已启用" : "设为右侧模型" }}</button>
                  <button class="btn mini danger" @click="onDeleteModel(m.model_version_id)">删除</button>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <p v-if="trainingState.err" class="msg err">{{ trainingState.err }}</p>
        <p v-else-if="trainingState.ok" class="msg ok">{{ trainingState.ok }}</p>
      </aside>
    </div>
  </div>
</template>

<style scoped>
/* ========== 主容器 ========== */
.model-training-page { 
  display: flex; 
  flex-direction: column; 
  gap: 1.25rem; 
  width: 100%; 
  min-height: 0;
}

/* ========== 左右布局 ========== */
.layout { 
  display: grid; 
  grid-template-columns: minmax(0, 2fr) minmax(380px, 1fr); 
  gap: 1.25rem; 
  width: 100%;
  align-items: start;
}

/* ========== 左侧分析区 ========== */
.left { 
  padding: 1.25rem; 
  border-radius: 12px; 
  display: flex; 
  flex-direction: column; 
  gap: 1.25rem;
  min-width: 0;
}

.analysis-scroll { 
  display: flex; 
  flex-direction: column; 
  gap: 1.25rem;
  min-width: 0;
}

/* ========== 右侧配置区 - 关键修复：稳定的纵向流式布局 ========== */
.right { 
  padding: 1.25rem; 
  border-radius: 12px; 
  display: flex; 
  flex-direction: column; 
  gap: 1.25rem;
  align-items: stretch;
  min-width: 0;
}

/* ========== 卡片组件 - 独立不重叠 ========== */
.card { 
  border: 1px solid #dbe8dc; 
  border-radius: 12px; 
  background: #fff; 
  padding: 1.1rem 1.25rem; 
  display: flex; 
  flex-direction: column; 
  gap: 0.85rem;
  flex-shrink: 0;
  min-width: 0;
}

/* ========== 标题和文字 ========== */
h3, h4, p { margin: 0; }
h3 { 
  color: #1b5e20; 
  font-size: 1.25rem; 
  font-weight: 700; 
  line-height: 1.3;
}
h4 { 
  color: #2f5f35; 
  font-size: 1.05rem; 
  font-weight: 600; 
  line-height: 1.3;
}

/* ========== 表单布局 ========== */
.row { 
  display: flex; 
  flex-wrap: wrap; 
  gap: 0.85rem; 
  align-items: flex-start; 
}
.row.two { 
  display: grid; 
  grid-template-columns: 1fr 1fr; 
  gap: 0.85rem; 
}
.row.three { 
  display: grid; 
  grid-template-columns: 1fr 1fr 1fr; 
  gap: 0.85rem; 
}

label { 
  display: flex; 
  flex-direction: column; 
  gap: 0.4rem; 
  font-size: 0.9rem; 
  color: #4d6951; 
  font-weight: 500; 
}
input, select { 
  font: inherit; 
  padding: 0.6rem 0.75rem; 
  border: 1px solid #b9d7bc; 
  border-radius: 8px; 
  font-size: 0.95rem; 
  width: 100%; 
  box-sizing: border-box; 
}

.inline { 
  display: flex; 
  align-items: center; 
  gap: 0.85rem; 
  flex-wrap: wrap; 
}

/* ========== 算法选择 ========== */
.chips { 
  display: flex; 
  flex-wrap: wrap; 
  gap: 0.6rem; 
}
.chip { 
  display: inline-flex; 
  align-items: center; 
  gap: 0.5rem; 
  border: 1px solid #d1e4d3; 
  border-radius: 999px; 
  padding: 0.4rem 0.75rem; 
  background: #f8fcf9; 
  font-size: 0.85rem; 
}

/* ========== 按钮 ========== */
.btn { 
  border: 1px solid #9fcea3; 
  border-radius: 10px; 
  background: #fff; 
  color: #1b5e20; 
  padding: 0.65rem 1rem; 
  cursor: pointer; 
  font-size: 0.95rem; 
  font-weight: 600; 
  transition: all 0.15s ease; 
}
.btn:hover { 
  background: #f5faf5; 
  border-color: #81c784; 
}
.btn.on, .btn.primary { 
  background: #e8f5e9; 
}
.btn.on:hover, .btn.primary:hover { 
  background: #c8e6c9; 
}
.btn.mini { 
  font-size: 0.85rem; 
  white-space: nowrap; 
  padding: 0.4rem 0.7rem; 
}
.btn.danger { 
  border-color: #ef9a9a; 
  color: #b71c1c; 
}
.btn.danger:hover { 
  background: #ffebee; 
  border-color: #e57373; 
}

/* ========== 提示文字 ========== */
.hint { 
  margin: 0; 
  color: #5b745e; 
  font-size: 0.9rem; 
  line-height: 1.5; 
}
.hint.warn { 
  color: #8d6e00; 
}
.hint.err { 
  color: #c62828; 
}

/* ========== 数据质量卡片 ========== */
.quality-grid { 
  display: grid; 
  grid-template-columns: repeat(3, minmax(0, 1fr)); 
  gap: 0.85rem; 
}
.quality-item { 
  border: 1px solid #e4eee6; 
  border-radius: 10px; 
  background: #fcfefc; 
  padding: 0.9rem 1rem; 
  display: flex; 
  flex-direction: column; 
  gap: 0.4rem; 
}
.quality-item span { 
  font-size: 0.85rem; 
  color: #6b7f70; 
}
.quality-item strong { 
  font-size: 1.1rem; 
  color: #1f5d2a; 
  font-weight: 700; 
}

/* ========== 列表 ========== */
.kv-list { 
  margin: 0; 
  padding-left: 1.5rem; 
  display: flex; 
  flex-direction: column; 
  gap: 0.4rem; 
}

/* ========== 热图 ========== */
.heatmap-wrap { 
  overflow: auto; 
  max-height: 450px; 
  border: 1px solid #e0ebe3; 
  border-radius: 10px; 
}
.heatmap-wrap::-webkit-scrollbar { 
  width: 10px; 
  height: 10px; 
}
.heatmap-wrap::-webkit-scrollbar-track { 
  background: #f1f8f2; 
  border-radius: 5px; 
}
.heatmap-wrap::-webkit-scrollbar-thumb { 
  background: rgba(93, 122, 99, 0.4); 
  border-radius: 5px; 
}
.heatmap-wrap::-webkit-scrollbar-thumb:hover { 
  background: rgba(93, 122, 99, 0.6); 
}
.heatmap-grid { 
  display: grid; 
  gap: 1px; 
  background: #d7e8d9; 
  min-width: 750px; 
}
.cell { 
  padding: 0.6rem 0.75rem; 
  background: #fff; 
  font-size: 0.85rem; 
}
.cell.head { 
  background: #f1f8f2; 
  font-weight: 700; 
  position: sticky; 
  top: 0; 
  z-index: 1; 
}
.cell.row-head { 
  background: #f8fcf9; 
  font-weight: 600; 
  position: sticky; 
  left: 0; 
  z-index: 1; 
}
.cell.val { 
  text-align: center; 
  font-variant-numeric: tabular-nums; 
}

/* ========== 直方图 ========== */
.hist-scroll { 
  max-height: 450px; 
  overflow: auto; 
  border: 1px solid #e0ebe3; 
  border-radius: 10px; 
  padding: 0.6rem; 
}
.hist-scroll::-webkit-scrollbar { 
  width: 10px; 
}
.hist-scroll::-webkit-scrollbar-track { 
  background: #f1f8f2; 
  border-radius: 5px; 
}
.hist-scroll::-webkit-scrollbar-thumb { 
  background: rgba(93, 122, 99, 0.4); 
  border-radius: 5px; 
}
.hist-scroll::-webkit-scrollbar-thumb:hover { 
  background: rgba(93, 122, 99, 0.6); 
}
.hist-grid { 
  display: grid; 
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); 
  gap: 1rem; 
}
.hist-card { 
  border: 1px solid #edf3ee; 
  border-radius: 10px; 
  padding: 0.8rem; 
  display: flex; 
  flex-direction: column; 
  gap: 0.5rem; 
}
.hist-title { 
  font-size: 0.95rem; 
  color: #2f5f35; 
  font-weight: 600; 
}
.hist-meta { 
  font-size: 0.85rem; 
  color: #6f8572; 
}
.bars { 
  display: grid; 
  grid-template-columns: repeat(12, 1fr); 
  align-items: end; 
  gap: 3px; 
  min-height: 120px; 
  background: #f8fcf9; 
  padding: 0.5rem; 
  border-radius: 8px; 
}
.bar { 
  background: linear-gradient(180deg, #66bb6a, #2e7d32); 
  border-radius: 3px 3px 0 0; 
}

/* ========== 训练进度 ========== */
.progress-box { 
  display: flex; 
  flex-direction: column; 
  gap: 0.5rem; 
}
.progress-bar { 
  width: 100%; 
  height: 14px; 
  border-radius: 999px; 
  background: #e7f1e8; 
  overflow: hidden; 
}
.progress-bar span { 
  display: block; 
  height: 100%; 
  background: linear-gradient(90deg, #66bb6a, #2e7d32); 
  transition: width 0.3s ease; 
}
.stage-list { 
  list-style: none; 
  margin: 0; 
  padding: 0; 
  display: flex; 
  flex-direction: column; 
  gap: 0.5rem; 
  max-height: 260px; 
  overflow: auto; 
}
.stage-list li { 
  border: 1px solid #edf3ee; 
  border-radius: 10px; 
  padding: 0.55rem 0.8rem; 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  font-size: 0.9rem; 
}
.stage-list li.todo strong { 
  color: #90a4ae; 
}
.stage-list li.running strong { 
  color: #2e7d32; 
}
.stage-list li.done strong { 
  color: #2e7d32; 
}
.stage-list li.failed strong { 
  color: #c62828; 
}

/* ========== 训练日志 - 内部滚动 ========== */
.log-list { 
  margin: 0; 
  padding-left: 1.5rem; 
  display: flex; 
  flex-direction: column; 
  gap: 0.4rem; 
  max-height: 240px; 
  overflow-y: auto; 
}
.log-list::-webkit-scrollbar { 
  width: 8px; 
}
.log-list::-webkit-scrollbar-track { 
  background: #f1f8f2; 
  border-radius: 4px; 
}
.log-list::-webkit-scrollbar-thumb { 
  background: rgba(93, 122, 99, 0.35); 
  border-radius: 4px; 
}

/* ========== 训练指标 - 内部滚动 ========== */
.metric-scroll { 
  max-height: 220px; 
  overflow-y: auto; 
  display: flex; 
  flex-direction: column; 
  gap: 0.6rem; 
}
.metric-scroll::-webkit-scrollbar { 
  width: 8px; 
}
.metric-scroll::-webkit-scrollbar-track { 
  background: #f1f8f2; 
  border-radius: 4px; 
}
.metric-scroll::-webkit-scrollbar-thumb { 
  background: rgba(93, 122, 99, 0.35); 
  border-radius: 4px; 
}
.metric { 
  border: 1px solid #edf3ee; 
  border-radius: 10px; 
  padding: 0.65rem 0.8rem; 
}

/* ========== 模型版本 - 内部滚动 ========== */
.version-scroll { 
  max-height: 340px; 
  overflow-y: auto; 
}
.version-scroll::-webkit-scrollbar { 
  width: 8px; 
}
.version-scroll::-webkit-scrollbar-track { 
  background: #f1f8f2; 
  border-radius: 4px; 
}
.version-scroll::-webkit-scrollbar-thumb { 
  background: rgba(93, 122, 99, 0.35); 
  border-radius: 4px; 
}
.version-scroll ul { 
  margin: 0; 
  padding: 0; 
  list-style: none; 
}
.version-item { 
  display: flex; 
  flex-direction: column;
  align-items: flex-start;
  gap: 0.45rem; 
  border: 1px solid #edf3ee; 
  border-radius: 10px; 
  padding: 0.75rem 0.85rem; 
  margin-bottom: 0.6rem; 
}
.version-item > div:first-child { 
  width: 100%;
}
.version-item > div:last-child { 
  align-self: flex-end;
}
.actions { 
  display: flex; 
  gap: 0.5rem; 
  flex-wrap: wrap; 
}
.active-pill { 
  margin-left: 0.6rem; 
  border-radius: 999px; 
  background: #e8f5e9; 
  color: #1b5e20; 
  font-size: 0.78rem; 
  padding: 0.2rem 0.55rem; 
  border: 1px solid #a5d6a7; 
  font-weight: 600; 
}
.sub { 
  color: #6f8572; 
  font-size: 0.83rem; 
}

/* ========== 消息提示 ========== */
.msg { 
  margin: 0; 
  font-size: 0.95rem; 
}
.msg.ok { 
  color: #2e7d32; 
}
.msg.err { 
  color: #c62828; 
}

/* ========== 响应式 ========== */
@media (max-width: 1200px) {
  .layout { 
    grid-template-columns: 1fr; 
  }
  .quality-grid { 
    grid-template-columns: repeat(2, minmax(0, 1fr)); 
  }
}
@media (max-width: 768px) {
  .quality-grid { 
    grid-template-columns: 1fr; 
  }
  .row.two, .row.three { 
    grid-template-columns: 1fr; 
  }
}
</style>
