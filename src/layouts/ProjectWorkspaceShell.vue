<script setup>
import { computed, provide } from "vue";
import { useRoute, RouterLink, RouterView } from "vue-router";
import { getProjectById } from "../stores/projectWorkspaceStore.js";

const route = useRoute();

const projectId = computed(() => String(route.params.projectId || ""));

const project = computed(() => getProjectById(projectId.value));

/** 子页（预测等）注入：当前路由所属项目 id */
provide(
  "workspaceProjectId",
  computed(() => projectId.value),
);
provide("workspaceProject", project);
</script>

<template>
  <div class="project-workspace">
    <div v-if="!project" class="missing">
      <p>未找到该项目，请从左侧选择一个有效项目。</p>
      <RouterLink to="/workspace" class="link">返回引导页</RouterLink>
    </div>
    <!-- 二级 Tab 已移除：仅保留左侧导航切换；子路由内容由此出口渲染 -->
    <div v-else class="workspace-body">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.project-workspace {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}
.missing {
  padding: 1.5rem;
  border: 1px dashed #b7cfb9;
  border-radius: 10px;
  background: #f9fcf9;
  color: #3f5643;
}
.link {
  color: #1b5e20;
  font-weight: 600;
}
.workspace-body {
  min-width: 0;
}
</style>
