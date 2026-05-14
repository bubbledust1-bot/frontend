<script setup>
import { reactive, watch } from "vue";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue", "submit"]);

const form = reactive({
  name: "",
  featureCount: 4,
  targetCount: 1,
  error: "",
});

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      form.name = "";
      form.featureCount = 4;
      form.targetCount = 1;
      form.error = "";
    }
  },
);

function close() {
  emit("update:modelValue", false);
}

function submit() {
  form.error = "";
  const name = String(form.name || "").trim();
  const f = Number(form.featureCount);
  const t = Number(form.targetCount);
  if (!name) {
    form.error = "请填写数据集名称";
    return;
  }
  if (!Number.isInteger(f) || f <= 0 || !Number.isInteger(t) || t <= 0) {
    form.error = "特征数和性能数都必须是正整数";
    return;
  }
  emit("submit", { name, featureCount: f, targetCount: t });
}
</script>

<template>
  <div v-if="modelValue" class="backdrop" @click.self="close">
    <div class="modal platform-page">
      <h3>新建数据集</h3>
      <div class="grid">
        <label>
          <span>数据集名称</span>
          <input v-model.trim="form.name" type="text" maxlength="120" autocomplete="off" />
        </label>
        <label>
          <span>特征数</span>
          <input v-model.number="form.featureCount" type="number" min="1" step="1" />
        </label>
        <label>
          <span>性能数</span>
          <input v-model.number="form.targetCount" type="number" min="1" step="1" />
        </label>
      </div>
      <p class="hint">总列数 = 1（编号） + 特征数 + 性能数</p>
      <p v-if="form.error" class="err">{{ form.error }}</p>
      <div class="actions">
        <button type="button" class="btn" @click="close">取消</button>
        <button type="button" class="btn primary" @click="submit">创建</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.36); display: flex; justify-content: center; align-items: center; z-index: 220; padding: 1rem; }
.modal { width: min(520px, 100%); padding: 1rem; border-radius: 12px; display: grid; gap: .7rem; }
h3 { margin: 0; color: #1b5e20; }
.grid { display: grid; gap: .55rem; }
label { display: grid; gap: .25rem; font-size: .84rem; color: #48604c; }
input { font: inherit; padding: .45rem .55rem; border: 1px solid #b9d7bc; border-radius: 8px; }
.hint { margin: 0; font-size: .78rem; color: #6a816d; }
.err { margin: 0; color: #c62828; font-size: .84rem; }
.actions { display: flex; justify-content: flex-end; gap: .5rem; }
.btn { border: 1px solid #9fcea3; border-radius: 8px; background: #fff; color: #1b5e20; padding: .38rem .7rem; cursor: pointer; }
.btn.primary { background: #e8f5e9; }
</style>
