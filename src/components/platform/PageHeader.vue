<script setup>
/**
 * 平台统一页头组件：
 * - 统一标题、副标题、状态标签位置
 * - 保证五页切换时视觉风格一致
 */
const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
  tags: { type: Array, default: () => [] }, // [{ text, kind }]
});
</script>

<template>
  <header class="platform-page page-header">
    <div class="left">
      <h2>{{ props.title }}</h2>
      <p>{{ props.subtitle }}</p>
    </div>
    <div v-if="props.tags.length" class="tags">
      <span v-for="t in props.tags" :key="`${t.text}-${t.kind}`" class="platform-tag" :class="t.kind || 'info'">
        {{ t.text }}
      </span>
    </div>
  </header>
</template>

<style scoped>
.page-header {
  padding: 0.95rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.8rem;
}
.left h2 {
  margin: 0;
  color: #1b5e20;
  font-size: 1.22rem;
}
.left p {
  margin: 0.35rem 0 0;
  color: #5f7662;
  line-height: 1.45;
  font-size: 0.9rem;
}
.tags {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}
@media (max-width: 900px) {
  .page-header {
    flex-direction: column;
  }
}
</style>
