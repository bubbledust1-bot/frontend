<script setup>
const props = defineProps({
  bindings: { type: Array, default: () => [] },
});

const emit = defineEmits(["unbind"]);

const fieldLabels = {
  temperature: "温度",
  humidity: "湿度",
  time: "时间",
};

function fmt(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return String(v);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function channelText(binding) {
  const list = Array.isArray(binding?.selectedChannels) ? binding.selectedChannels : [];
  if (!list.length) return "—";
  return list.map((x) => fieldLabels[x] || x).join(" / ");
}
</script>

<template>
  <div class="binding-panel">
    <h4>Task Bindings</h4>

    <p v-if="!bindings.length" class="empty">No bindings for current dataset.</p>

    <ul v-else class="list">
      <li v-for="b in bindings" :key="b.id" class="item">
        <div class="meta">
          <p><strong>{{ b.taskNameSnapshot || `Task #${b.taskId}` }}</strong> · {{ b.deviceId }}</p>
          <p>Sample range: rows {{ b.rangeStartRow }}-{{ b.rangeEndRow }} ({{ b.sampleCount }})</p>
          <p>Task records: {{ b.taskRecordCountSnapshot }} · Ended: {{ fmt(b.taskEndedAt) }}</p>
          <p>Channels: {{ channelText(b) }}</p>
          <p v-if="Array.isArray(b.fieldMappings) && b.fieldMappings.length" class="mappings">
            Mappings:
            <span v-for="m in b.fieldMappings" :key="`${b.id}-${m.sourceField}`" class="mapping-item">
              {{ fieldLabels[m.sourceField] || m.sourceField }} -> {{ m.targetColumnName || m.targetColumnKey }}
            </span>
          </p>
        </div>
        <button type="button" class="btn danger" @click="emit('unbind', b.id)">Unbind</button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.binding-panel { display: grid; gap: 0.55rem; }
h4 { margin: 0; color: #1b5e20; }
.empty { margin: 0; color: #6f8572; font-size: 0.84rem; }
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.45rem; }
.item { border: 1px solid #dbe8dc; border-radius: 10px; background: #fcfefc; padding: 0.55rem 0.65rem; display: flex; justify-content: space-between; align-items: center; gap: 0.6rem; }
.meta p { margin: 0; color: #55705a; font-size: 0.79rem; line-height: 1.45; }
.meta p strong { color: #1b5e20; }
.mappings { display: flex; flex-wrap: wrap; gap: 0.35rem 0.45rem; align-items: center; }
.mapping-item { display: inline-flex; border: 1px solid #c8e6c9; background: #f1f8f2; color: #2e7d32; border-radius: 999px; padding: 0.05rem 0.45rem; font-size: 0.75rem; }
.btn { border: 1px solid #ef9a9a; border-radius: 8px; background: #fff; color: #b71c1c; padding: 0.32rem 0.58rem; cursor: pointer; white-space: nowrap; }
</style>
