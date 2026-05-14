<script setup>
import { computed, inject, reactive, ref, unref, watch } from "vue";
import PredictSection from "../components/PredictSection.vue";
import { usePredict } from "../composables/usePredict.js";
import SectionBlock from "../components/platform/SectionBlock.vue";
import PageHeader from "../components/platform/PageHeader.vue";
import { recordPredictionActivity } from "../stores/projectWorkspaceStore.js";
import { postUserModelPredict } from "../api/predict.js";
import { listModelVersions } from "../api/training.js";

const predict = usePredict();
const workspaceProjectId = inject("workspaceProjectId", null);

const userModelState = reactive({
  versions: [],
  selectedModelVersionId: "",
  loadingVersions: false,
  loadingPredict: false,
  result: null,
  networkError: "",
});

const userForm = reactive({
  Day: 28,
  "L/S Ratio": 0.09,
  "Aggregate Ratio": 0.83,
  "Active Ratio": 0.17,
  "Activation Index": 0.01,
  "Si-Al Ratio": 0.5,
  "Ca Ratio": 0.5,
});

const projectId = computed(() => (workspaceProjectId ? String(unref(workspaceProjectId) || "") : "demo-project"));

const selectedModel = computed(() => userModelState.versions.find((x) => x.model_version_id === userModelState.selectedModelVersionId) || null);

const userFeatureColumns = computed(() => {
  const cols = selectedModel.value?.feature_columns;
  if (Array.isArray(cols) && cols.length) return cols;
  return Object.keys(userForm);
});

const userFormFields = computed(() => userFeatureColumns.value.map((c) => ({ key: c, label: c })));

async function loadVersions() {
  userModelState.loadingVersions = true;
  try {
    const res = await listModelVersions(projectId.value);
    userModelState.versions = Array.isArray(res.items) ? res.items : [];
    if (!userModelState.selectedModelVersionId && userModelState.versions.length) {
      const active = userModelState.versions.find((x) => x.is_active_for_prediction);
      userModelState.selectedModelVersionId = (active || userModelState.versions[0]).model_version_id;
    }
  } catch (e) {
    userModelState.networkError = e?.message || String(e);
  } finally {
    userModelState.loadingVersions = false;
  }
}

async function submitUserModelPredict() {
  userModelState.loadingPredict = true;
  userModelState.networkError = "";
  userModelState.result = null;
  try {
    const inputs = {};
    userFeatureColumns.value.forEach((k) => {
      const raw = userForm[k];
      const n = Number(raw);
      inputs[k] = Number.isFinite(n) ? n : raw;
    });
    const res = await postUserModelPredict(projectId.value, userModelState.selectedModelVersionId || null, inputs);
    userModelState.result = res;
  } catch (e) {
    userModelState.networkError = e?.message || String(e);
  } finally {
    userModelState.loadingPredict = false;
  }
}

watch(
  () => predict.result.value,
  (r) => {
    if (!r) return;
    const id = workspaceProjectId ? unref(workspaceProjectId) : null;
    if (!id) return;
    recordPredictionActivity(String(id), {
      success: r.success === true,
      prediction_mpa: r.prediction_mpa,
      record_id: r.record_id,
      error: r.error,
    });
  },
);

watch(projectId, async () => {
  await loadVersions();
}, { immediate: true });

const headerTags = computed(() => {
  const tags = [];
  if (predict.loading.value || userModelState.loadingPredict) tags.push({ text: "状态：预测中", kind: "info" });
  else tags.push({ text: "状态：待预测", kind: "info" });
  return tags;
});
</script>

<template>
  <div class="prediction-page">
    <PageHeader
      title="智能预测"
      subtitle="统一参数输入下，对比平台模型与项目模型预测结果。"
      :tags="headerTags"
    />

    <div class="main-grid">
      <SectionBlock title="平台模型" subtitle="用于快速给出基线预测结果。">
        <PredictSection
          :form="predict.form"
          :loading="predict.loading"
          :result="predict.result"
          :network-error="predict.networkError"
          :submit="predict.submit"
        />
      </SectionBlock>

      <SectionBlock title="项目模型" subtitle="基于当前项目训练版本进行预测。">
        <div class="user-model-wrap">
          <div class="row">
            <label class="field">
              <span>模型版本</span>
              <select v-model="userModelState.selectedModelVersionId" :disabled="userModelState.loadingVersions || !userModelState.versions.length">
                <option value="">请选择模型版本</option>
                <option v-for="m in userModelState.versions" :key="m.model_version_id" :value="m.model_version_id">
                  {{ m.task_name }} · {{ m.model_name }}{{ m.is_active_for_prediction ? '（active）' : '' }}
                </option>
              </select>
            </label>
            <button class="btn" :disabled="userModelState.loadingVersions" @click="loadVersions">刷新模型</button>
          </div>

          <p v-if="!userModelState.versions.length" class="hint warn">暂无用户模型，请先到模型训练页完成训练。</p>

          <div v-if="userModelState.selectedModelVersionId" class="form-grid">
            <label v-for="f in userFormFields" :key="f.key" class="field">
              <span>{{ f.label }}</span>
              <input v-model="userForm[f.key]" type="number" step="any" />
            </label>
          </div>

          <button
            class="btn primary"
            :disabled="!userModelState.selectedModelVersionId || userModelState.loadingPredict"
            @click="submitUserModelPredict"
          >
            {{ userModelState.loadingPredict ? "预测中..." : "使用用户模型预测" }}
          </button>

          <div class="result-card" :class="{ bad: userModelState.result && userModelState.result.success === false }">
            <h4>用户模型结果</h4>
            <p v-if="!userModelState.result" class="hint">请选择模型并输入参数后进行预测。</p>
            <template v-else>
              <p class="main" v-if="userModelState.result.success">{{ userModelState.result.prediction_mpa }} MPa</p>
              <p class="main" v-else>预测失败</p>
              <p class="hint">{{ userModelState.result.success ? `模型：${userModelState.result.model_name}（${userModelState.result.model_version_id}）` : userModelState.result.error }}</p>
              <div class="mini-kv"><span>record_id</span><strong>{{ userModelState.result.record_id || "—" }}</strong></div>
            </template>
            <p v-if="userModelState.networkError" class="error">{{ userModelState.networkError }}</p>
          </div>
        </div>
      </SectionBlock>
    </div>
  </div>
</template>

<style scoped>
.prediction-page { display: grid; gap: 0.8rem; }
.main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
.user-model-wrap { display: grid; gap: 0.55rem; }
.row { display: flex; gap: 0.5rem; align-items: end; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.45rem; }
.field { display: grid; gap: 0.2rem; font-size: 0.82rem; color: #4e6951; }
input, select { font: inherit; padding: 0.36rem 0.48rem; border: 1px solid #b9d7bc; border-radius: 8px; }
.btn { border: 1px solid #9fcea3; border-radius: 8px; background: #fff; color: #1b5e20; padding: 0.34rem 0.62rem; cursor: pointer; }
.btn.primary { background: #e8f5e9; }
.result-card { border: 1px solid #d6e7d8; background: #fbfefb; border-radius: 12px; padding: 0.8rem; display: grid; gap: 0.45rem; }
.result-card.bad { border-color: #ef9a9a; background: #fff6f6; }
.result-card h4 { margin: 0; color: #35533b; }
.main { margin: 0; font-size: 1.45rem; font-weight: 800; color: #1b5e20; }
.hint { margin: 0; color: #6b7f70; font-size: 0.85rem; }
.hint.warn { color: #8d6e00; }
.error { margin: 0; color: #c62828; font-size: 0.84rem; }
.mini-kv { display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #e0ebe1; padding-top: 0.4rem; font-size: 0.86rem; }
@media (max-width: 1040px) { .main-grid { grid-template-columns: 1fr; } }
</style>
