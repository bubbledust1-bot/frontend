/**
 * 统一 HTTP 封装：所有 REST 调用经此发出，组件内不写裸 fetch。
 *
 * 注意：POST /api/predict 即使返回 HTTP 200，业务仍可能 success:false，
 * 由调用方根据响应体判断，不在此抛出「业务失败」。
 */

import { getApiBaseUrl } from "./config.js";
import { getAccessToken, clearAuth, refreshAccessToken } from "../stores/authStore.js";

// 标记是否正在刷新 token，避免并发刷新
let isRefreshing = false;
// 等待刷新 token 的请求队列
let refreshQueue = [];

/**
 * 处理 401/403 错误。
 */
function handleAuthError(status) {
  if (status === 401) {
    // 401：清空登录态并跳转 /login
    clearAuth();
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  } else if (status === 403) {
    // 403：提示无权限，不要进入重定向死循环
    console.error("权限不足");
  }
}

/**
 * 执行刷新 token 并重试队列中的请求。
 */
async function processRefreshQueue() {
  try {
    const newAccessToken = await refreshAccessToken();
    // 重试队列中的所有请求
    refreshQueue.forEach(({ resolve, reject, path, options }) => {
      // 更新 Authorization header
      const newOptions = {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newAccessToken}`,
        },
      };
      // 重新发起请求
      requestWithoutRetry(path, newOptions).then(resolve).catch(reject);
    });
  } catch (e) {
    // 刷新失败，拒绝所有队列中的请求
    refreshQueue.forEach(({ reject }) => reject(e));
    handleAuthError(401);
  } finally {
    isRefreshing = false;
    refreshQueue = [];
  }
}

/**
 * 发起请求，不处理 token 刷新重试。
 */
async function requestWithoutRetry(path, options = {}) {
  const base = getApiBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = {
    Accept: "application/json",
    ...options.headers,
  };
  if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  // 添加 Authorization header
  const accessToken = getAccessToken();
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (e) {
    throw new Error(`无法连接服务器，请检查后端是否启动、地址是否为 ${base}（${e?.message || e}）`);
  }

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`服务器返回了非 JSON 内容（HTTP ${res.status}），请检查是否连错地址。`);
  }

  if (!res.ok) {
    const rawDetail = data?.detail ?? data?.message ?? data;
    let detail = "未知错误";

    if (typeof rawDetail === "string") {
      detail = rawDetail;
    } else if (Array.isArray(rawDetail)) {
      detail = rawDetail
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") {
            const loc = Array.isArray(item.loc) ? item.loc.join(".") : "";
            const msg = item.msg || JSON.stringify(item);
            return loc ? `${loc}: ${msg}` : msg;
          }
          return String(item);
        })
        .join("; ");
    } else if (rawDetail && typeof rawDetail === "object") {
      detail = rawDetail.msg || rawDetail.message || JSON.stringify(rawDetail);
    } else if (rawDetail != null) {
      detail = String(rawDetail);
    }

    throw new Error(`请求失败（HTTP ${res.status}）：${detail}`, { cause: { status: res.status } });
  }

  return data;
}

/**
 * 发起请求并解析 JSON。
 *
 * @param {string} path 以 / 开头的路径，如 /api/predict
 * @param {RequestInit} options fetch 选项
 * @returns {Promise<any>} 解析后的 JSON
 * @throws {Error} 网络失败、非 JSON、或 HTTP 状态非 2xx 时抛出（message 尽量中文）
 */
export async function request(path, options = {}) {
  try {
    return await requestWithoutRetry(path, options);
  } catch (error) {
    const status = error.cause?.status;

    // 401 且不是登录/刷新接口，尝试刷新 token
    if (status === 401 && !path.includes("/auth/login") && !path.includes("/auth/refresh")) {
      if (isRefreshing) {
        // 已经在刷新中，加入队列
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject, path, options });
        });
      }

      // 开始刷新 token
      isRefreshing = true;
      await processRefreshQueue();

      // 刷新完成后重试当前请求
      return await requestWithoutRetry(path, options);
    }

    // 处理认证错误
    handleAuthError(status);
    throw error;
  }
}

