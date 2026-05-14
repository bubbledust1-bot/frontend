import { reactive } from "vue";
import { getHealth } from "../api/sensor.js";

/**
 * 顶栏后端健康状态（GET /api/health）。
 * 仅表示后端在线性，不等于某次业务请求必成功。
 */
export function useBackendHealth() {
  const state = reactive({
    status: "idle", // idle | loading | ok | bad
    detail: "",
  });

  async function fetchHealth() {
    state.status = "loading";
    state.detail = "";
    try {
      const data = await getHealth();
      const ok = data?.ok === true || data?.success === true || data?.status === "ok";
      state.status = ok ? "ok" : "bad";
      if (!ok) {
        state.detail = data?.detail || data?.message || "健康检查返回异常";
      }
    } catch (e) {
      state.status = "bad";
      state.detail = e?.message || String(e);
    }
  }

  return {
    get status() {
      return state.status;
    },
    get detail() {
      return state.detail;
    },
    fetchHealth,
  };
}
