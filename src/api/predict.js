/**
 * 预测接口：POST /api/predict
 * 入参为普通对象，将序列化为 JSON；不做字段校验（由 algorithm 负责）。
 */

import { request } from "./http.js";

/**
 * @param {Record<string, unknown>} body 材料参数字典
 * @returns {Promise<Record<string, unknown>>} 后端返回体（含 success、record_id 等）
 */
export function postPredict(body) {
  return request("/api/predict", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function postUserModelPredict(projectId, modelVersionId, inputs) {
  return request("/api/training/predict", {
    method: "POST",
    body: JSON.stringify({ project_id: projectId, model_version_id: modelVersionId, inputs }),
  });
}
