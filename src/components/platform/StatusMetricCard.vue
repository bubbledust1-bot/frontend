<script setup>
const props = defineProps({
  title: { type: String, required: true },
  value: { type: String, required: true },
  hint: { type: String, default: "" },
  kind: { type: String, default: "ok" }, // ok | info | warn | bad
});
</script>

<template>
  <article class="platform-card metric-card">
    <div class="head">
      <h4>{{ props.title }}</h4>
      <span class="platform-tag" :class="props.kind">{{ props.kind === 'ok' ? '正常' : props.kind === 'info' ? '信息' : props.kind === 'warn' ? '注意' : '异常' }}</span>
    </div>
    <p class="value">{{ props.value }}</p>
    <p v-if="props.hint" class="hint">{{ props.hint }}</p>
  </article>
</template>

<style scoped>
.metric-card h4 {
  margin: 0;
  font-size: 0.9rem;
  color: #3e5642;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}
.value {
  margin: 0.55rem 0 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: #1b5e20;
}
.hint {
  margin: 0.3rem 0 0;
  color: #6b7f70;
  font-size: 0.82rem;
}
</style>
