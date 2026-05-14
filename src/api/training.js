import { request } from "./http.js";

export function analyzeTrainingDataset(body) {
  return request("/api/training/analyze/dataset", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function analyzeTrainingUpload({ projectId, targetColumn, file }) {
  const fd = new FormData();
  fd.append("project_id", projectId);
  if (targetColumn) fd.append("target_column", targetColumn);
  fd.append("file", file);

  const res = await fetch("/api/training/analyze/upload", {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return await res.json();
}

export function createTrainingJob(body) {
  return request("/api/training/jobs", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getTrainingJob(jobId) {
  return request(`/api/training/jobs/${jobId}`, { method: "GET" });
}

export function getTrainingJobProgress(jobId) {
  return request(`/api/training/jobs/${jobId}/progress`, { method: "GET" });
}

export function getTrainingJobLogs(jobId) {
  return request(`/api/training/jobs/${jobId}/logs`, { method: "GET" });
}

export function getTrainingJobMetrics(jobId) {
  return request(`/api/training/jobs/${jobId}/metrics`, { method: "GET" });
}

export function listModelVersions(projectId) {
  const q = new URLSearchParams();
  q.set("project_id", projectId);
  return request(`/api/training/models?${q.toString()}`, { method: "GET" });
}

export function getModelVersion(modelVersionId) {
  return request(`/api/training/models/${modelVersionId}`, { method: "GET" });
}

export function activateModelVersion(projectId, modelVersionId) {
  return request(`/api/training/models/${modelVersionId}/activate-for-prediction`, {
    method: "POST",
    body: JSON.stringify({ project_id: projectId }),
  });
}

export function deleteModelVersion(projectId, modelVersionId) {
  const q = new URLSearchParams();
  q.set("project_id", projectId);
  return request(`/api/training/models/${modelVersionId}?${q.toString()}`, {
    method: "DELETE",
  });
}
