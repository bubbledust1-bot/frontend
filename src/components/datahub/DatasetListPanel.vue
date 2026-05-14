<script setup>
const props = defineProps({
  datasets: { type: Array, default: () => [] },
  activeDatasetId: { type: String, default: "" },
});

const emit = defineEmits(["select", "create", "delete"]);

function fmt(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return String(v);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
</script>

<template>
  <div class="dataset-list">
    <div class="top">
      <h4>数据集列表</h4>
      <button type="button" class="btn primary" @click="emit('create')">+ 新建数据</button>
    </div>

    <p v-if="!datasets.length" class="empty">当前项目暂无数据集，请先创建。</p>

    <ul v-else class="rows">
      <li v-for="ds in datasets" :key="ds.id">
        <button type="button" class="item" :class="{ active: ds.id === activeDatasetId }" @click="emit('select', ds.id)">
          <span class="name">{{ ds.name }}</span>
          <span class="meta">特征 {{ ds.featureCount }} · 性能 {{ ds.targetCount }} · 行数 {{ ds.rows?.length || 0 }}</span>
          <span class="meta">更新 {{ fmt(ds.updatedAt) }}</span>
        </button>
        <button type="button" class="btn danger mini" @click="emit('delete', ds.id)">删除</button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.dataset-list { display: grid; gap: 0.6rem; }
.top { display: flex; justify-content: space-between; align-items: center; gap: 0.6rem; }
h4 { margin: 0; color: #1b5e20; }
.rows { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.45rem; }
.rows li { display: grid; grid-template-columns: 1fr auto; gap: 0.45rem; align-items: center; }
.item {
  text-align: left;
  border: 1px solid #dbe8dc;
  border-radius: 10px;
  background: #fcfefc;
  padding: 0.52rem 0.62rem;
  display: grid;
  gap: 0.15rem;
  cursor: pointer;
}
.item.active { border-color: #66bb6a; background: #eef7ef; }
.name { font-weight: 700; color: #1b5e20; }
.meta { font-size: 0.75rem; color: #6c836f; }
.btn { border: 1px solid #9fcea3; border-radius: 8px; background: #fff; color: #1b5e20; padding: 0.35rem 0.55rem; cursor: pointer; }
.btn.primary { background: #e8f5e9; }
.btn.danger { border-color: #ef9a9a; color: #b71c1c; }
.btn.mini { font-size: 0.76rem; }
.empty { margin: 0; color: #6f8472; font-size: 0.86rem; }
</style>
