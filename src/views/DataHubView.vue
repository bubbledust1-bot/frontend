<script setup>
import SectionBlock from "../components/platform/SectionBlock.vue";
import QuickEntryCard from "../components/platform/QuickEntryCard.vue";
import PageHeader from "../components/platform/PageHeader.vue";
const headerTags = [
  { text: "数据沉淀", kind: "ok" },
  { text: "方案复用", kind: "info" },
];
</script>

<template>
  <div class="datahub-page">
    <PageHeader
      title="数据资产"
      subtitle="沉淀预测与监测数据资产，支撑方案复用与持续优化。"
      :tags="headerTags"
    />

    <SectionBlock title="资产入口" subtitle="第一版聚焦数据中枢感：先把关键资产入口做清楚">
      <div class="entry-grid">
        <QuickEntryCard
          to="/prediction"
          title="历史预测资产"
          desc="沉淀历史预测记录、参数输入、结果摘要，支持后续方案复盘与比对。"
          cta="查看预测入口"
        />
        <QuickEntryCard
          to="/monitoring"
          title="传感器数据资产"
          desc="沉淀设备历史上传、监测趋势与状态变化，为工艺优化提供数据依据。"
          cta="查看监测入口"
        />
        <QuickEntryCard
          to="/projects"
          title="历史方案复用"
          desc="以项目维度组织历史方案与结果，逐步形成可复用的材料研发经验库。"
          cta="查看项目入口"
        />
      </div>
    </SectionBlock>

    <SectionBlock title="数据沉淀说明" subtitle="强调“正在建设”的边界，不夸大当前实现">
      <div class="notes-grid">
        <article class="note-card">
          <h4>历史记录管理</h4>
          <p>逐步沉淀预测结果与监测记录，形成可追溯的研发数据底座。</p>
        </article>
        <article class="note-card">
          <h4>私有数据库方向</h4>
          <p>面向企业/团队建设私有数据资产仓，保障数据连续性与业务沉淀价值。</p>
        </article>
        <article class="note-card">
          <h4>方案复用与追溯</h4>
          <p>后续支持按项目检索历史方案，复盘参数、结果与监测过程，提升迭代效率。</p>
        </article>
      </div>

      <p class="foot-note">
        当前为轻量第一版：入口与结构已建立，后续将逐步接入更完整的历史记录管理与复用能力。
      </p>
    </SectionBlock>
  </div>
</template>

<style scoped>
.datahub-page {
  display: grid;
  gap: 0.8rem;
}
.entry-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
}
.notes-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
}
.note-card {
  border: 1px solid #dbe9dd;
  border-radius: 12px;
  background: #fcfefd;
  padding: 0.7rem;
}
.note-card h4 {
  margin: 0;
  color: #1b5e20;
  font-size: 0.95rem;
}
.note-card p {
  margin: 0.4rem 0 0;
  color: #4e6752;
  font-size: 0.84rem;
  line-height: 1.5;
}
.foot-note {
  margin: 0.55rem 0 0;
  color: #6b7f70;
  font-size: 0.84rem;
}
@media (max-width: 1180px) {
  .entry-grid,
  .notes-grid {
    grid-template-columns: 1fr;
  }
}
</style>
