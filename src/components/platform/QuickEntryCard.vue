<script setup>
const props = defineProps({
  title: { type: String, required: true },
  desc: { type: String, required: true },
  to: { type: String, required: true },
  cta: { type: String, default: "进入" },
});
</script>

<template>
  <RouterLink :to="props.to" class="entry-card platform-card">
    <h4>{{ props.title }}</h4>
    <p>{{ props.desc }}</p>
    <span class="platform-btn">{{ props.cta }}</span>
  </RouterLink>
</template>

<style scoped>
.entry-card {
  text-decoration: none;
  color: inherit;
  display: grid;
  gap: 0.45rem;
}
.entry-card h4 {
  margin: 0;
  color: #1b5e20;
}
.entry-card p {
  margin: 0;
  color: #617765;
  font-size: 0.88rem;
  line-height: 1.45;
}
.entry-card .platform-btn {
  width: fit-content;
}
</style>
