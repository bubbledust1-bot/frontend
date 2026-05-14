<script setup>
import { computed, reactive, watch } from "vue";

const props = defineProps({
  dataset: { type: Object, default: null },
  rowBindingMap: { type: Object, default: () => ({}) },
  saving: { type: Boolean, default: false },
});

const emit = defineEmits(["save", "appendRows", "openImport"]);

const draft = reactive({ columns: [], rows: [] });

watch(
  () => props.dataset,
  (ds) => {
    if (!ds) {
      draft.columns = [];
      draft.rows = [];
      return;
    }
    draft.columns = (ds.columns || []).map((c) => ({ ...c }));
    draft.rows = (ds.rows || []).map((r) => ({ rowNo: r.rowNo, cells: { ...(r.cells || {}) } }));
  },
  { immediate: true },
);

const editableColumns = computed(() => draft.columns.filter((c) => c.role !== "id"));

function save() {
  emit("save", { columns: draft.columns, rows: draft.rows });
}
</script>

<template>
  <div v-if="dataset" class="editor">
    <div class="editor-top">
      <div>
        <h4>{{ dataset.name }}</h4>
        <p>Feature {{ dataset.featureCount }} · Target {{ dataset.targetCount }} · Rows {{ draft.rows.length }}</p>
      </div>
      <div class="actions">
        <button type="button" class="btn" @click="emit('openImport')">Import Monitor Task</button>
        <button type="button" class="btn" @click="emit('appendRows')">Add 10 Rows</button>
        <button type="button" class="btn primary" :disabled="saving" @click="save">{{ saving ? "Saving..." : "Save" }}</button>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>
              <input type="text" value="ID" disabled />
            </th>
            <th v-for="col in editableColumns" :key="col.key">
              <input v-model="col.name" type="text" maxlength="48" />
            </th>
            <th class="task-col">Monitor Task</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in draft.rows" :key="row.rowNo">
            <td class="id-col">{{ row.rowNo }}</td>
            <td v-for="col in editableColumns" :key="`${row.rowNo}-${col.key}`">
              <input v-model="row.cells[col.key]" type="text" />
            </td>
            <td class="task-col-cell">
              <template v-if="rowBindingMap[row.rowNo]">
                <span
                  class="task-tag"
                  :class="{ light: !rowBindingMap[row.rowNo].isStartRow }"
                  :title="`${rowBindingMap[row.rowNo].deviceId} / ${rowBindingMap[row.rowNo].rangeStartRow}-${rowBindingMap[row.rowNo].rangeEndRow}`"
                >
                  Task: {{ rowBindingMap[row.rowNo].taskName }}
                </span>
              </template>
              <span v-else class="task-empty">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div v-else class="empty">Select or create a dataset first.</div>
</template>

<style scoped>
.editor { display: grid; gap: 0.7rem; }
.editor-top { display: flex; justify-content: space-between; gap: 0.7rem; align-items: flex-start; }
h4 { margin: 0; color: #1b5e20; }
p { margin: 0.22rem 0 0; color: #66806a; font-size: 0.82rem; }
.actions { display: flex; flex-wrap: wrap; gap: 0.45rem; justify-content: flex-end; }
.btn { border: 1px solid #9fcea3; border-radius: 8px; background: #fff; color: #1b5e20; padding: 0.38rem 0.65rem; cursor: pointer; }
.btn.primary { background: #e8f5e9; }
.table-wrap { overflow: auto; border: 1px solid #dbe7dd; border-radius: 10px; background: #fff; }
table { width: 100%; border-collapse: collapse; min-width: 920px; }
th, td { border-bottom: 1px solid #ebf2ec; border-right: 1px solid #edf3ee; padding: 0.24rem; vertical-align: middle; }
tr:last-child td { border-bottom: none; }
th:last-child, td:last-child { border-right: none; }
input { width: 100%; box-sizing: border-box; font: inherit; border: 1px solid #d4e4d6; border-radius: 6px; padding: 0.3rem 0.38rem; }
.id-col { text-align: center; font-weight: 700; color: #35573b; background: #f6fbf7; }
.task-col { min-width: 180px; }
.task-col-cell { white-space: nowrap; }
.task-tag { display: inline-flex; align-items: center; border-radius: 999px; border: 1px solid #81c784; background: #e8f5e9; color: #1b5e20; font-size: 0.75rem; font-weight: 700; padding: 0.18rem 0.55rem; }
.task-tag.light { opacity: 0.65; }
.task-empty { color: #92a593; font-size: 0.78rem; }
.empty { margin: 0; color: #6f8572; }
</style>