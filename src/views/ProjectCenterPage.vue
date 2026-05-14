<script setup>
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import SectionBlock from "../components/platform/SectionBlock.vue";
import { getProjectById, updateProject } from "../stores/projectWorkspaceStore.js";

const route = useRoute();

const projectId = computed(() => String(route.params.projectId || ""));

const flowSteps = [
  "需求诊断",
  "成分检测",
  "模型预测",
  "方案评审",
  "小试/中试验证",
  "生产部署/数据回传",
];

const draftName = ref("");
const draftDesc = ref("");
const savedHint = ref("");

const project = computed(() => getProjectById(projectId.value));

watch(
  project,
  (p) => {
    if (p) {
      draftName.value = p.name;
      draftDesc.value = p.description || "";
    }
  },
  { immediate: true },
);

function saveBasic() {
  savedHint.value = "";
  const p = project.value;
  if (!p) return;
  updateProject(p.id, { name: draftName.value, description: draftDesc.value || null });
  savedHint.value = "已保存";
  setTimeout(() => {
    savedHint.value = "";
  }, 2000);
}
</script>

<template>
  <div class="project-center-page">
    <SectionBlock title="项目概况" subtitle="统一管理项目基础信息与当前阶段。">
      <div v-if="!project" class="muted">项目不存在</div>
      <form v-else class="form" @submit.prevent="saveBasic">
        <label>
          项目名称
          <input v-model="draftName" type="text" required maxlength="128" />
        </label>
        <label>
          项目说明
          <textarea v-model="draftDesc" rows="3" maxlength="2000" placeholder="可选" />
        </label>
        <div class="row">
          <button type="submit" class="btn">保存</button>
          <span v-if="savedHint" class="ok">{{ savedHint }}</span>
        </div>
        <p class="meta">创建时间 {{ project.created_at }} · 更新 {{ project.updated_at }}</p>
      </form>
    </SectionBlock>

    <SectionBlock title="研发流程" subtitle="按阶段推进材料研发、验证与部署。">
      <div class="flow-row">
        <div v-for="(step, idx) in flowSteps" :key="step" class="flow-item" :class="{ active: idx === 2 }">
          <span class="num">{{ idx + 1 }}</span>
          <span class="txt">{{ step }}</span>
        </div>
      </div>
    </SectionBlock>

    <SectionBlock title="快捷操作" subtitle="快速进入核心工作模块。">
      <div class="quick-grid">
        <RouterLink class="quick-link" :to="`/project/${projectId}/monitoring`">进入监测</RouterLink>
        <RouterLink class="quick-link" :to="`/project/${projectId}/prediction`">进入预测</RouterLink>
        <RouterLink class="quick-link" :to="`/project/${projectId}/training`">进入训练</RouterLink>
        <RouterLink class="quick-link" :to="`/project/${projectId}/data`">进入数据资产</RouterLink>
      </div>
    </SectionBlock>
  </div>
</template>

<style scoped>
.project-center-page {
  display: grid;
  gap: 0.75rem;
}
.form {
  display: grid;
  gap: 0.65rem;
  max-width: 32rem;
}
.form label {
  display: grid;
  gap: 0.3rem;
  font-size: 0.86rem;
  color: #455a47;
}
.form input,
.form textarea {
  padding: 0.4rem 0.5rem;
  border: 1px solid #aed581;
  border-radius: 8px;
  font: inherit;
}
.row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.btn {
  padding: 0.4rem 0.85rem;
  border-radius: 8px;
  border: 1px solid #66bb6a;
  background: #e8f5e9;
  color: #1b5e20;
  font-weight: 600;
  cursor: pointer;
}
.ok {
  color: #2e7d32;
  font-size: 0.86rem;
}
.meta {
  margin: 0;
  font-size: 0.78rem;
  color: #78967c;
}
.muted {
  color: #78967c;
}
.flow-row {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.45rem;
}
.flow-item {
  border: 1px solid #d8e7da;
  border-radius: 10px;
  background: #fbfefb;
  padding: 0.5rem;
  font-size: 0.78rem;
  color: #3e5642;
  display: grid;
  gap: 0.25rem;
  text-align: center;
}
.flow-item.active {
  border-color: #66bb6a;
  background: #e8f5e9;
}
.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
}
.quick-link {
  border: 1px solid #dbe8dc;
  border-radius: 10px;
  padding: 0.6rem 0.7rem;
  text-decoration: none;
  color: #2e5234;
  font-weight: 600;
  background: #fff;
  text-align: center;
}
.quick-link:hover {
  border-color: #8dbf91;
  background: #f6fbf6;
}
.num {
  display: inline-flex;
  width: 1.35rem;
  height: 1.35rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #e8f5e9;
  color: #1b5e20;
  font-weight: 700;
  margin: 0 auto;
}
@media (max-width: 1100px) {
  .flow-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 560px) {
  .flow-row {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
