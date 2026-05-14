/**
 * 从环境变量读取后端地址，供 REST 与 WebSocket 共用。
 *
 * 开发时复制 .env.example 为 .env，修改 VITE_API_BASE_URL / VITE_WS_BASE_URL。
 * 换局域网 IP 或云域名时只改 .env，无需改业务代码。
 */

/** 去掉末尾斜杠，避免拼接路径出现 // */
function trimSlash(url) {
  if (!url) return "";
  return String(url).replace(/\/+$/, "");
}

/**
 * REST 根地址
 */
export function getApiBaseUrl() {
  const raw = import.meta.env.VITE_API_BASE_URL || "https://backend-production-c2dcd.up.railway.app";
  return trimSlash(raw);
}

/**
 * WebSocket 根地址（不含 /ws/sensor）
 */
export function getWsBaseUrl() {
  const raw = import.meta.env.VITE_WS_BASE_URL || "wss://backend-production-c2dcd.up.railway.app";
  return trimSlash(raw);
}

/** 完整传感器 WebSocket URL */
export function getSensorWebSocketUrl() {
  return `${getWsBaseUrl()}/ws/sensor`;
}
