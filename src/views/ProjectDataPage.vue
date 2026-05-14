<script setup>
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import SectionBlock from "../components/platform/SectionBlock.vue";
import DatasetListPanel from "../components/datahub/DatasetListPanel.vue";
import CreateDatasetModal from "../components/datahub/CreateDatasetModal.vue";
import DatasetEditorTable from "../components/datahub/DatasetEditorTable.vue";
import ImportMonitorDataModal from "../components/datahub/ImportMonitorDataModal.vue";
import BindingListPanel from "../components/datahub/BindingListPanel.vue";
import {
  useProjectDatasets,
  createDataset,
  deleteDataset,
  appendRows,
  saveDatasetEditing,
  createMonitorTaskBinding,
  removeMonitorTaskBinding,
  buildRowBindingMap,
} from "../stores/projectDatasetStore.js";

const route = useRoute();
const projectId = computed(() => String(route.params.projectId || ""));

const { projectDatasets, getDatasetById } = useProjectDatasets(projectId);

const activeDatasetId = ref("");
const creating = ref(false);
const importing = ref(false);
const saving = ref(false);
const err = ref("");
const ok = ref("");
const importErr = ref("");

const activeDataset = computed(() => getDatasetById(activeDatasetId.value));
const rowBindingMap = computed(() => buildRowBindingMap(activeDataset.value));

function clearMsg() {
  err.value = "";
  ok.value = "";
}

function openCreate() {
  clearMsg();
  creating.value = true;
}

function onCreate(payload) {
  clearMsg();
  try {
    const ds = createDataset({ projectId: projectId.value, ...payload });
    activeDatasetId.value = ds.id;
    creating.value = false;
    ok.value = "数据集已创建";
  } catch (e) {
    err.value = e?.message || String(e);
  }
}

function onSelectDataset(id) {
  clearMsg();
  activeDatasetId.value = id;
}

function onDeleteDataset(id) {
  clearMsg();
  const ds = getDatasetById(id);
  if (!ds) return;
  const pass = window.confirm(`Delete dataset "${ds.name}"? This cannot be undone.`);
  if (!pass) return;
  const pass2 = window.confirm("Please confirm again: table data and task bindings will be removed.");
  if (!pass2) return;
  deleteDataset(id);
  if (activeDatasetId.value === id) {
    const first = projectDatasets.value[0];
    activeDatasetId.value = first?.id || "";
  }
  ok.value = "数据集已删除";
}

function onAppendRows() {
  clearMsg();
  if (!activeDatasetId.value) return;
  appendRows(activeDatasetId.value, 10);
  ok.value = "已新增 10 行";
}

function onSaveEditing(payload) {
  clearMsg();
  if (!activeDatasetId.value) return;
  saving.value = true;
  try {
    saveDatasetEditing(activeDatasetId.value, payload.columns, payload.rows);
    ok.value = "更改已保存";
  } catch (e) {
    err.value = e?.message || String(e);
  } finally {
    saving.value = false;
  }
}

function onOpenImport() {
  clearMsg();
  importErr.value = "";
  if (!activeDataset.value) {
    err.value = "请先选择数据集";
    return;
  }
  importing.value = true;
}

function onConfirmImport(payload) {
  clearMsg();
  importErr.value = "";
  try {
    const binding = createMonitorTaskBinding(activeDatasetId.value, payload);
    if (!binding) throw new Error("绑定失败：未创建绑定记录");
    importing.value = false;
    ok.value = `已绑定任务 ${binding.taskNameSnapshot || `#${binding.taskId}`} 到第 ${payload.rangeStartRow}–${payload.rangeEndRow} 行`;
  } catch (e) {
    const raw = e?.message || String(e);
    if (/range conflict/i.test(raw)) {
      importErr.value = "绑定失败：目标范围与已有绑定重叠";
    } else if (/finished/i.test(raw)) {
      importErr.value = "绑定失败：仅允许选择已结束（finished）的监测任务";
    } else {
      importErr.value = `绑定失败：${raw}`;
    }
    err.value = importErr.value;
  }
}

function onUnbind(bindingId) {
  clearMsg();
  if (!activeDataset.value) return;
  const pass = window.confirm("Unbind this task reference?");
  if (!pass) return;
  removeMonitorTaskBinding(activeDataset.value.id, bindingId);
  ok.value = "已解绑任务引用，样本手工数据未删除";
}

watch(
  projectDatasets,
  (list) => {
    if (!list.length) {
      activeDatasetId.value = "";
      return;
    }
    if (!list.some((x) => x.id === activeDatasetId.value)) {
      activeDatasetId.value = list[0].id;
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="project-data-page">
    <SectionBlock title="数据资产管理" subtitle="统一维护数据集、样本编辑与监测任务绑定。">
      <div class="layout">
        <aside class="left-panel platform-page">
          <DatasetListPanel
            :datasets="projectDatasets"
            :active-dataset-id="activeDatasetId"
            @create="openCreate"
            @select="onSelectDataset"
            @delete="onDeleteDataset"
          />
        </aside>

        <section class="right-panel platform-page">
          <template v-if="activeDataset">
            <DatasetEditorTable
              :dataset="activeDataset"
              :row-binding-map="rowBindingMap"
              :saving="saving"
              @save="onSaveEditing"
              @append-rows="onAppendRows"
              @open-import="onOpenImport"
            />

            <div class="binding-zone">
              <BindingListPanel :bindings="activeDataset?.bindings || []" @unbind="onUnbind" />
            </div>
          </template>

          <div v-else class="empty-state">
            <h4>请先新建或选择一个数据集</h4>
            <p>左侧可以创建新数据集，或从已有数据集中选择一个继续编辑与绑定监测任务。</p>
          </div>
        </section>
      </div>

      <p v-if="err" class="msg err">{{ err }}</p>
      <p v-else-if="ok" class="msg ok">{{ ok }}</p>
    </SectionBlock>

    <CreateDatasetModal v-model="creating" @submit="onCreate" />

    <ImportMonitorDataModal
      v-model="importing"
      :dataset="activeDataset"
      :external-error="importErr"
      @confirm="onConfirmImport"
    />
  </div>
</template>

<style scoped>
.project-data-page {
  display: grid;
  gap: 0.75rem;
}
.layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 0.7rem;
}
.left-panel,
.right-panel {
  padding: 0.7rem;
  border-radius: 12px;
  min-width: 0;
}
.right-panel {
  display: grid;
  gap: 0.75rem;
}
.binding-zone {
  border-top: 1px dashed #d6e6d8;
  padding-top: 0.75rem;
}
.empty-state {
  border: 1px dashed #cfe3d2;
  border-radius: 12px;
  background: #f8fcf9;
  padding: 1rem;
  display: grid;
  gap: 0.35rem;
}
.empty-state h4 {
  margin: 0;
  color: #1b5e20;
  font-size: 0.98rem;
}
.empty-state p {
  margin: 0;
  color: #5d7660;
  font-size: 0.86rem;
}
.msg {
  margin: 0.4rem 0 0;
  font-size: 0.86rem;
}
.msg.ok {
  color: #2e7d32;
}
.msg.err {
  color: #c62828;
}
@media (max-width: 1080px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>