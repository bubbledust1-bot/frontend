<script setup>
import { computed } from "vue";

const props = defineProps({
  form: { type: Object, required: true },
  loading: { type: Object, required: true },
  result: { type: Object, required: true },
  networkError: { type: Object, required: true },
  submit: { type: Function, required: true },
});

/** 业务是否预测成功（仅当已有结果且 success===true） */
const bizOk = computed(() => props.result.value && props.result.value.success === true);
const bizFail = computed(() => props.result.value && props.result.value.success === false);

/** 预测请求网络状态（只看请求层） */
const requestNetState = computed(() => {
  if (props.loading.value) return "loading";
  if (props.networkError.value) return "bad";
  if (props.result.value) return "ok";
  return "idle";
});

const requestNetText = computed(() => {
  if (requestNetState.value === "loading") return "运行中";
  if (requestNetState.value === "bad") return "异常";
  if (requestNetState.value === "ok") return "正常";
  return "待预测";
});

/** warnings 统一成数组展示（后端可能给 warnings 或 warning） */
const warnList = computed(() => {
  const r = props.result.value;
  if (!r) return [];
  const w = r.warnings ?? r.warning;
  if (Array.isArray(w)) return w;
  if (w == null || w === "") return [];
  return [String(w)];
});
</script>

<template>
  <section class="card">
    <h2>平台模型输入参数</h2>

    <form class="form-grid" @submit.prevent="props.submit">
      <label class="field">
        <span>Day（养护天数）</span>
        <input v-model.number="props.form.Day" type="number" step="1" min="1" required />
      </label>

      <label class="field">
        <span>L/S Ratio</span>
        <input v-model.number="props.form['L/S Ratio']" type="number" step="0.0001" required />
      </label>

      <label class="field">
        <span>Aggregate Ratio</span>
        <input v-model.number="props.form['Aggregate Ratio']" type="number" step="0.0001" required />
      </label>

      <label class="field">
        <span>Active Ratio</span>
        <input v-model.number="props.form['Active Ratio']" type="number" step="0.0001" required />
      </label>

      <label class="field">
        <span>Activation Index</span>
        <input v-model.number="props.form['Activation Index']" type="number" step="0.0001" required />
      </label>

      <label class="field">
        <span>Si-Al Ratio</span>
        <input v-model.number="props.form['Si-Al Ratio']" type="number" step="0.0001" required />
      </label>

      <label class="field">
        <span>Ca Ratio</span>
        <input v-model.number="props.form['Ca Ratio']" type="number" step="0.0001" required />
      </label>

      <div class="actions-row">
        <button type="submit" class="btn primary" :disabled="props.loading.value">
          {{ props.loading.value ? "预测中..." : "开始预测" }}
        </button>
      </div>
    </form>

    <div class="req-status" :data-kind="requestNetState">
      <strong>预测请求网络状态：</strong>{{ requestNetText }}
    </div>

    <div v-if="props.networkError.value" class="banner network">
      <strong>请求异常详情：</strong>{{ props.networkError.value }}
    </div>

    <div v-if="props.loading.value" class="banner loading">正在请求后端，请稍候…</div>

    <div v-if="props.result.value" class="result-block">
      <h3>预测结果</h3>
      <div class="result-main" :class="{ bad: bizFail }">
        <p class="main-value" v-if="bizOk">{{ props.result.value.prediction_mpa }} MPa</p>
        <p class="main-value" v-else>预测失败</p>
        <p class="main-sub">记录编号：{{ props.result.value.record_id ?? "--" }}</p>
      </div>

      <ul class="kv">
        <li><span>业务状态</span><span :class="bizOk ? 'tag ok' : 'tag bad'">{{ bizOk ? '正常' : '异常' }}</span></li>
        <li><span>单位</span><span>{{ props.result.value.unit || 'MPa' }}</span></li>
      </ul>

      <div v-if="bizFail" class="banner error">
        <strong>失败原因：</strong>{{ props.result.value.error || "请检查输入参数" }}
      </div>

      <div v-if="warnList.length" class="banner warn">
        <strong>提示：</strong>
        <ul>
          <li v-for="(w, i) in warnList" :key="i">{{ w }}</li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.card {
  border: 1px solid #d6e7d8;
  border-radius: 12px;
  padding: 0.8rem;
  background: #fbfefb;
}
h2 {
  margin: 0;
  font-size: 1rem;
  color: #35533b;
}
.form-grid {
  margin-top: 0.6rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
}
.field {
  display: grid;
  gap: 0.22rem;
  font-size: 0.82rem;
  color: #4e6951;
}
input {
  font: inherit;
  padding: 0.36rem 0.48rem;
  border: 1px solid #b9d7bc;
  border-radius: 8px;
}
.actions-row {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  margin-top: 0.2rem;
}
.btn {
  border: 1px solid #9fcea3;
  border-radius: 8px;
  background: #fff;
  color: #1b5e20;
  padding: 0.34rem 0.62rem;
  cursor: pointer;
}
.btn.primary {
  background: #e8f5e9;
}
.req-status {
  padding: 0.55rem 0.75rem;
  border-radius: 6px;
  margin: 0.35rem 0;
  font-size: 0.92rem;
  border: 1px solid #d7dde5;
  background: #f7f9fb;
}
.req-status[data-kind="ok"] {
  border-color: #81c784;
  background: #edf8ee;
}
.req-status[data-kind="bad"] {
  border-color: #ef9a9a;
  background: #ffebee;
}
.req-status[data-kind="loading"] {
  border-color: #64b5f6;
  background: #e3f2fd;
}
.banner {
  padding: 0.6rem 0.75rem;
  border-radius: 6px;
  margin: 0.5rem 0;
  font-size: 0.95rem;
}
.network {
  background: #fff3e0;
  border: 1px solid #ffb74d;
}
.loading {
  background: #e3f2fd;
  border: 1px solid #64b5f6;
}
.error {
  background: #ffebee;
  border: 1px solid #e57373;
}
.warn {
  background: #fff8e1;
  border: 1px solid #ffca28;
}
.result-block {
  margin-top: 0.75rem;
}
.kv {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0;
}
.kv li {
  display: flex;
  gap: 0.75rem;
  margin: 0.25rem 0;
}
.kv span:first-child {
  width: 140px;
  color: #607d8b;
}
.tag {
  font-weight: 600;
}
.tag.ok {
  color: #2e7d32;
}
.tag.bad {
  color: #c62828;
}
.highlight {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1565c0;
}
.result-main {
  border: 1px solid #d6e7d8;
  background: #fbfefb;
  border-radius: 12px;
  padding: 0.75rem;
  display: grid;
  gap: 0.2rem;
}
.result-main.bad {
  border-color: #ef9a9a;
  background: #fff6f6;
}
.main-value {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  color: #1b5e20;
}
.main-sub {
  margin: 0;
  color: #6b7f70;
  font-size: 0.84rem;
}
</style>
