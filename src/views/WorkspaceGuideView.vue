<script setup>
import { RouterLink } from "vue-router";
import SectionBlock from "../components/platform/SectionBlock.vue";
</script>

<template>
  <div class="workspace-guide platform-page">
    <SectionBlock title="请先选择或新建项目" subtitle="性能预测、实时监测、项目中心与数据资产均在「当前项目」下使用；全局总览请用左侧「总览看板」。">
      <p class="lead">
        本平台以<strong>实验研究项目</strong>为唯一工作上下文。请先在左侧<strong>新建项目</strong>，或从项目列表中选择一个项目；选中后将默认进入<strong>实时监测</strong>。
      </p>
      <ul class="hints">
        <li>未选中项目时，无法进入项目工作区内的功能页。</li>
        <li>项目数据第一版保存在本机浏览器（localStorage），刷新后仍保留。</li>
      </ul>
      <p class="actions">
        <RouterLink to="/overview" class="btn secondary">查看全局总览</RouterLink>
      </p>
    </SectionBlock>
  </div>
</template>

<style scoped>
.workspace-guide {
  padding: 0.5rem 0;
}
.lead {
  margin: 0 0 0.75rem;
  color: #3f5643;
  line-height: 1.55;
  font-size: 0.92rem;
}
.hints {
  margin: 0 0 1rem;
  padding-left: 1.2rem;
  color: #5f7662;
  line-height: 1.5;
  font-size: 0.86rem;
}
.actions {
  margin: 0;
}
.btn {
  display: inline-block;
  padding: 0.45rem 0.9rem;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid #66bb6a;
  background: #e8f5e9;
  color: #1b5e20;
}
.btn.secondary {
  background: #fff;
}
</style>
