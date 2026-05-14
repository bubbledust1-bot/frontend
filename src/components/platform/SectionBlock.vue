<script setup>
const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
});
</script>

<template>
  <section class="platform-card section-block">
    <header>
      <h3 class="platform-title">{{ props.title }}</h3>
      <p v-if="props.subtitle" class="platform-subtitle">{{ props.subtitle }}</p>
    </header>
    <div class="body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.section-block {
  display: grid;
  gap: 0.65rem;
}
header {
  border-bottom: 1px dashed #deebdf;
  padding-bottom: 0.5rem;
}
.body {
  min-width: 0;
}
</style>
