import { reactive, ref } from "vue";
import { postPredict } from "../api/predict.js";

/**
 * 与训练文档接近的一组演示默认值，可直接点击提交做课堂演示。
 */
export const DEMO_FORM_DEFAULTS = {
  Day: 28,
  "L/S Ratio": 0.09,
  "Aggregate Ratio": 0.83,
  "Active Ratio": 0.17,
  "Activation Index": 0.01,
  "Si-Al Ratio": 0.5,
  "Ca Ratio": 0.5,
};

/**
 * 区域 A：材料预测表单与结果状态。
 *
 * - result：POST /api/predict 的完整 JSON（HTTP 200 时），含 success / error / warnings / record_id 等。
 * - networkError：仅表示「连不上服务器」「HTTP 非 2xx」等传输层问题；
 *   与业务上 success:false 无关，切勿混用。
 */
export function usePredict() {
  const form = reactive({ ...DEMO_FORM_DEFAULTS });
  const loading = ref(false);
  /** @type {import('vue').Ref<Record<string, unknown> | null>} */
  const result = ref(null);
  const networkError = ref("");

  /**
   * 将表单转为与后端一致的键名提交（数字字段转 number）。
   */
  function buildPayload() {
    return {
      Day: Number(form.Day),
      "L/S Ratio": Number(form["L/S Ratio"]),
      "Aggregate Ratio": Number(form["Aggregate Ratio"]),
      "Active Ratio": Number(form["Active Ratio"]),
      "Activation Index": Number(form["Activation Index"]),
      "Si-Al Ratio": Number(form["Si-Al Ratio"]),
      "Ca Ratio": Number(form["Ca Ratio"]),
    };
  }

  async function submit() {
    loading.value = true;
    networkError.value = "";
    result.value = null;
    try {
      const payload = buildPayload();
      result.value = await postPredict(payload);
    } catch (e) {
      networkError.value = e?.message || String(e);
    } finally {
      loading.value = false;
    }
  }

  return {
    form,
    loading,
    result,
    networkError,
    submit,
  };
}
