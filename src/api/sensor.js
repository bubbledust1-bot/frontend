/**
 * 传感器与健康检查 REST 封装。
 */

import { request } from "./http.js";

export function getHealth() {
  return request("/api/health", { method: "GET" });
}

/**
 * @param {string | undefined} deviceId 可选，不传则全局最新
 */
export function getSensorLatest(deviceId) {
  const q = new URLSearchParams();
  if (deviceId) q.set("device_id", deviceId);
  const qs = q.toString();
  return request(`/api/sensor/latest${qs ? `?${qs}` : ""}`, { method: "GET" });
}

/**
 * @param {{ limit?: number, deviceId?: string }} params
 */
export function getSensorHistory(params = {}) {
  const q = new URLSearchParams();
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.deviceId) q.set("device_id", params.deviceId);
  const qs = q.toString();
  return request(`/api/sensor/history${qs ? `?${qs}` : ""}`, { method: "GET" });
}

/**
 * @param {{ withLatest?: boolean, limit?: number }} params
 */
export function getSensorDevices(params = {}) {
  const q = new URLSearchParams();
  q.set("with_latest", String(params.withLatest ?? true));
  if (params.limit != null) q.set("limit", String(params.limit));
  const qs = q.toString();
  return request(`/api/sensor/devices${qs ? `?${qs}` : ""}`, { method: "GET" });
}

/** 创建设备任务 */
export function createSensorTask(body) {
  return request("/api/sensor/tasks", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** 结束任务（active -> finished） */
export function finishSensorTask(taskId) {
  return request(`/api/sensor/tasks/${taskId}/finish`, { method: "POST" });
}

/** 删除任务（第一版仅允许 finished，后端会校验） */
export function deleteSensorTask(taskId) {
  return request(`/api/sensor/tasks/${taskId}`, { method: "DELETE" });
}

/** 任务列表（默认 recent 5） */
export function getSensorTasks(params = {}) {
  const q = new URLSearchParams();
  if (params.deviceId) q.set("device_id", params.deviceId);
  if (params.limit != null) q.set("limit", String(params.limit));
  const qs = q.toString();
  return request(`/api/sensor/tasks${qs ? `?${qs}` : ""}`, { method: "GET" });
}

/** 当前 active 任务 */
export function getActiveSensorTasks(params = {}) {
  const q = new URLSearchParams();
  if (params.deviceId) q.set("device_id", params.deviceId);
  const qs = q.toString();
  return request(`/api/sensor/tasks/active${qs ? `?${qs}` : ""}`, { method: "GET" });
}

/** 按任务窗口查询曲线记录 */
export function getSensorTaskRecords(taskId, params = {}) {
  const q = new URLSearchParams();
  if (params.limit != null) q.set("limit", String(params.limit));
  const qs = q.toString();
  return request(`/api/sensor/tasks/${taskId}/records${qs ? `?${qs}` : ""}`, { method: "GET" });
}
