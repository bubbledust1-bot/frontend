<script setup>
import SectionBlock from "../components/platform/SectionBlock.vue";
import PageHeader from "../components/platform/PageHeader.vue";

// 六步闭环：与商业计划书一致，作为项目中心核心主线。
const flowSteps = [
  "需求诊断",
  "成分检测",
  "模型预测",
  "方案评审",
  "小试/中试验证",
  "生产部署/数据回传",
];

// 轻量演示项目数据：先做产品感，不接复杂后端。
const projectCards = [
  {
    name: "桥梁修复绿色材料一期",
    stage: "模型预测",
    stageIndex: 2,
    updatedAt: "2026-04-06 19:20",
    status: "进行中",
    note: "已完成前期参数采集与基础配方录入，正在进行强度预测与方案对比。",
  },
  {
    name: "海工耐久配方验证",
    stage: "小试/中试验证",
    stageIndex: 4,
    updatedAt: "2026-04-06 17:05",
    status: "重点推进",
    note: "已通过初步评审，正在按环境监测结果迭代养护工艺。",
  },
  {
    name: "低碳固废协同利用项目",
    stage: "方案评审",
    stageIndex: 3,
    updatedAt: "2026-04-05 21:40",
    status: "待评审",
    note: "预测结果已形成，等待专家组进行最终方案确认与试验排期。",
  },
];

const headerTags = [
  { text: "过程跟踪", kind: "ok" },
  { text: "持续优化", kind: "info" },
];
</script>

<template>
  <div class="projects-page">
    <PageHeader
      title="项目中心"
      subtitle="围绕六步闭环进行过程跟踪，连接预测、监测与部署回传。"
      :tags="headerTags"
    />

    <SectionBlock title="六步闭环流程" subtitle="需求诊断 → 成分检测 → 模型预测 → 方案评审 → 小试/中试验证 → 生产部署/数据回传">
      <div class="flow-row">
        <div
          v-for="(step, idx) in flowSteps"
          :key="step"
          class="flow-item"
          :class="{ active: idx === 2 }"
        >
          <span class="num">{{ idx + 1 }}</span>
          <span class="txt">{{ step }}</span>
        </div>
      </div>
    </SectionBlock>

    <SectionBlock title="项目列表" subtitle="当前展示为演示态项目卡，结构已按真实产品信息组织">
      <div class="cards-grid">
        <article v-for="p in projectCards" :key="p.name" class="project-card">
          <header>
            <h4>{{ p.name }}</h4>
            <span class="platform-tag" :class="p.status === '重点推进' ? 'warn' : p.status === '进行中' ? 'ok' : 'info'">
              {{ p.status }}
            </span>
          </header>

          <div class="kv"><span>当前阶段</span><strong>{{ p.stage }}</strong></div>
          <div class="kv"><span>最近更新</span><strong>{{ p.updatedAt }}</strong></div>
          <div class="kv"><span>阶段位置</span><strong>第 {{ p.stageIndex + 1 }} / 6 步</strong></div>

          <p class="note">{{ p.note }}</p>

          <button type="button" class="platform-btn">详情建设中</button>
        </article>
      </div>
    </SectionBlock>
  </div>
</template>

<style scoped>
.projects-page {
  display: grid;
  gap: 0.8rem;
}
.flow-row {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.5rem;
}
.flow-item {
  border: 1px solid #d9e8db;
  border-radius: 10px;
  background: #fbfefb;
  padding: 0.55rem;
  display: grid;
  gap: 0.25rem;
}
.flow-item.active {
  border-color: #9ccc9f;
  background: #eef8ef;
}
.num {
  width: 1.3rem;
  height: 1.3rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #e8f5e9;
  color: #1b5e20;
  font-size: 0.75rem;
  font-weight: 700;
}
.txt {
  color: #3e5642;
  font-size: 0.82rem;
}
.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
}
.project-card {
  border: 1px solid #dbe9dd;
  border-radius: 12px;
  background: #fcfefd;
  padding: 0.7rem;
  display: grid;
  gap: 0.45rem;
}
.project-card header {
  display: flex;
  justify-content: space-between;
  gap: 0.6rem;
  align-items: flex-start;
}
.project-card h4 {
  margin: 0;
  color: #1b5e20;
  font-size: 0.95rem;
}
.kv {
  display: flex;
  justify-content: space-between;
  gap: 0.7rem;
  font-size: 0.84rem;
}
.kv span {
  color: #637b66;
}
.kv strong {
  color: #2d4731;
}
.note {
  margin: 0.1rem 0 0;
  color: #4e6752;
  font-size: 0.84rem;
  line-height: 1.5;
  min-height: 3.1em;
}
@media (max-width: 1180px) {
  .flow-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .cards-grid {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 760px) {
  .cards-grid,
  .flow-row {
    grid-template-columns: 1fr;
  }
}
</style>
