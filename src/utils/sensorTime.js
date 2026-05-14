/**
 * 传感器记录 created_at 等时间字段：后端多为 UTC 语义，直接按字符串解析在本地 UI 上常表现为「慢 8 小时」。
 * 与 SensorSection / 图表层约定一致：仅在展示层做 +8h 补偿，不改接口原始字段。
 *
 * @param {string | null | undefined} raw
 * @returns {string}
 */
export function formatSensorDisplayTime(raw) {
  const ts = Date.parse(String(raw || ""));
  if (!Number.isFinite(ts)) return raw != null && raw !== "" ? String(raw) : "—";
  const d = new Date(ts + 8 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
