<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

const props = defineProps({
  series: { type: Array, default: () => [] },
  deviceLabel: { type: String, default: "" },
  taskMode: { type: String, default: "no_task" }, // no_task | active_task | history_task
});

const mode = ref("overview"); // overview | realtime
const nowTs = ref(Date.now());
const envCanvasRef = ref(null);
const materialCanvasRef = ref(null);

let timer = null;

const chartPadding = { left: 60, right: 60, top: 30, bottom: 40 };
const chartWidth = 860;
const chartHeight = 280;

const sortedSeries = computed(() => {
  const arr = Array.isArray(props.series) ? props.series : [];
  return [...arr]
    .map((x) => ({
      ts: Number(x.ts),
      created_at: x.created_at,
      // 环境数据组
      temperature: x.temperature == null ? null : Number(x.temperature),
      humidity: x.humidity == null ? null : Number(x.humidity),
      // 材料状态组（新增）
      material_temperature: x.material_temperature == null ? null : Number(x.material_temperature),
      strain: x.strain == null ? null : Number(x.strain),
    }))
    .filter((x) => Number.isFinite(x.ts))
    .sort((a, b) => a.ts - b.ts);
});

const xRange = computed(() => {
  const points = sortedSeries.value;
  const now = nowTs.value;

  if (!points.length) {
    const end = now;
    const start = end - 60_000;
    return { start, end, windowSec: 60 };
  }

  const minTs = points[0].ts;
  const maxTs = points[points.length - 1].ts;
  const span = Math.max(1_000, maxTs - minTs);
  const pad = Math.max(2_000, Math.floor(span * 0.05));

  let rightEdge = now;
  if (props.taskMode === "history_task") {
    rightEdge = maxTs;
  } else if (props.taskMode === "active_task") {
    rightEdge = Math.max(maxTs, now);
  }

  if (mode.value === "realtime") {
    const end = rightEdge;
    const start = end - 300_000;
    return { start, end, windowSec: 300 };
  }

  const start = minTs - pad;
  const end = maxTs + pad;
  return { start, end, windowSec: Math.ceil((end - start) / 1000) };
});

const visibleSeries = computed(() => {
  const { start, end } = xRange.value;
  return sortedSeries.value.filter((p) => p.ts >= start && p.ts <= end);
});

function formatTime(ts) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function calculateYRange(points, key) {
  const valid = points
    .map((p) => p[key])
    .filter((v) => v != null && Number.isFinite(v));
  
  if (valid.length === 0) {
    return { min: 0, max: 100 };
  }
  
  let min = Math.min(...valid);
  let max = Math.max(...valid);
  
  if (min === max) {
    min = min - 10;
    max = max + 10;
  }
  
  const padding = (max - min) * 0.1;
  return { min: min - padding, max: max + padding };
}

function mapY(v, range) {
  const { top, bottom } = chartPadding;
  const ph = chartHeight - top - bottom;
  const normalized = (v - range.min) / (range.max - range.min || 1);
  const clamped = Math.max(0, Math.min(1, normalized));
  return top + ph - clamped * ph;
}

function mapX(ts, range) {
  const { left, right } = chartPadding;
  const pw = chartWidth - left - right;
  return left + ((ts - range.start) / (range.end - range.start || 1)) * pw;
}

const SERIES_GAP_BREAK_MS = 120000;

function splitPointsByTimeGap(points, gapMs, key) {
  const valid = points.filter((p) => p[key] != null && Number.isFinite(p[key]));
  if (valid.length < 2) return valid.length ? [valid] : [];
  
  const out = [];
  let cur = [valid[0]];
  for (let i = 1; i < valid.length; i++) {
    const p = valid[i];
    const prev = valid[i - 1];
    if (p.ts - prev.ts > gapMs) {
      out.push(cur);
      cur = [p];
    } else {
      cur.push(p);
    }
  }
  out.push(cur);
  return out;
}

function drawBase(ctx, range, title, leftLabel, rightLabel) {
  const w = chartWidth;
  const h = chartHeight;
  const { left, right, top, bottom } = chartPadding;
  const pw = w - left - right;
  const ph = h - top - bottom;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "#eaf1ea";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i += 1) {
    const y = top + (ph * i) / 5;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + pw, y);
    ctx.stroke();
  }
  for (let i = 0; i <= 6; i += 1) {
    const x = left + (pw * i) / 6;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, top + ph);
    ctx.stroke();
  }

  ctx.strokeStyle = "#9fb39f";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, top + ph);
  ctx.lineTo(left + pw, top + ph);
  ctx.stroke();

  ctx.textAlign = "center";
  for (let i = 0; i <= 6; i += 1) {
    const t = range.start + ((range.end - range.start) * i) / 6;
    const x = left + (pw * i) / 6;
    ctx.fillStyle = "#4a6350";
    ctx.font = "11px sans-serif";
    ctx.fillText(formatTime(t), x, top + ph + 18);
  }

  ctx.save();
  ctx.fillStyle = "#2e7d32";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.translate(16, top + ph / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(leftLabel, 0, 0);
  ctx.restore();

  if (rightLabel) {
    ctx.save();
    ctx.fillStyle = "#1565c0";
    ctx.textAlign = "center";
    ctx.translate(w - 14, top + ph / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(rightLabel, 0, 0);
    ctx.restore();
  }

  ctx.fillStyle = "#4a6350";
  ctx.textAlign = "center";
  ctx.font = "11px sans-serif";
  ctx.fillText("Time", left + pw / 2, h - 8);

  ctx.fillStyle = "#1b5e20";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(title, left, 14);
}

function drawYAxisLabels(ctx, range, labelFormatter, side = "left", color = "#4a6350") {
  const { left, right, top, bottom } = chartPadding;
  const pw = chartWidth - left - right;
  const ph = chartHeight - top - bottom;

  ctx.fillStyle = color;
  ctx.font = "11px sans-serif";
  
  const steps = 5;
  for (let i = 0; i <= steps; i += 1) {
    const value = range.min + ((range.max - range.min) * (steps - i)) / steps;
    const y = top + (ph * i) / steps;
    const label = labelFormatter(value);
    
    if (side === "left") {
      ctx.textAlign = "right";
      ctx.fillText(label, left - 8, y + 4);
    } else {
      ctx.textAlign = "left";
      ctx.fillText(label, left + pw + 8, y + 4);
    }
  }
}

function drawSeriesLine(ctx, points, key, color, yRange) {
  const segments = splitPointsByTimeGap(points, SERIES_GAP_BREAK_MS, key);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  for (const seg of segments) {
    if (seg.length < 2) continue;
    ctx.beginPath();
    let first = true;
    for (const p of seg) {
      const v = p[key];
      const x = mapX(p.ts, xRange.value);
      const y = mapY(v, yRange);
      if (first) {
        ctx.moveTo(x, y);
        first = false;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
}

function drawLegend(ctx, legendItems) {
  let offsetX = 200;
  ctx.font = "12px sans-serif";
  ctx.textAlign = "left";

  for (const item of legendItems) {
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(offsetX, 14);
    ctx.lineTo(offsetX + 26, 14);
    ctx.stroke();
    ctx.fillStyle = "#374d3a";
    ctx.fillText(item.label, offsetX + 32, 18);
    offsetX += 160;
  }
}

function renderEnvChart() {
  const canvas = envCanvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const points = visibleSeries.value;
  
  const tempRange = calculateYRange(points, "temperature");
  const humidRange = calculateYRange(points, "humidity");

  drawBase(ctx, xRange.value, "环境数据趋势", "Temperature (℃)", "Humidity (%)");
  
  drawYAxisLabels(ctx, tempRange, (v) => v.toFixed(1), "left", "#e65100");
  drawYAxisLabels(ctx, humidRange, (v) => v.toFixed(0) + "%", "right", "#1565c0");
  
  drawSeriesLine(ctx, points, "temperature", "#e65100", tempRange);
  drawSeriesLine(ctx, points, "humidity", "#1565c0", humidRange);
  
  drawLegend(ctx, [
    { label: "环境温度", color: "#e65100" },
    { label: "环境湿度", color: "#1565c0" },
  ]);
}

function renderMaterialChart() {
  const canvas = materialCanvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const points = visibleSeries.value;
  
  const matTempRange = calculateYRange(points, "material_temperature");
  const strainRange = calculateYRange(points, "strain");

  drawBase(ctx, xRange.value, "材料状态趋势", "Material Temp (℃)", "Strain");
  
  drawYAxisLabels(ctx, matTempRange, (v) => v.toFixed(1), "left", "#bf360c");
  drawYAxisLabels(ctx, strainRange, (v) => v.toFixed(0), "right", "#6a1b9a");
  
  drawSeriesLine(ctx, points, "material_temperature", "#bf360c", matTempRange);
  drawSeriesLine(ctx, points, "strain", "#6a1b9a", strainRange);
  
  drawLegend(ctx, [
    { label: "材料温度", color: "#bf360c" },
    { label: "形变", color: "#6a1b9a" },
  ]);
}

function renderAllCharts() {
  renderEnvChart();
  renderMaterialChart();
}

watch([sortedSeries, xRange, mode], () => {
  console.log("[SensorTrendChart] 重新渲染图表");
  console.log("[SensorTrendChart] sortedSeries:", sortedSeries.value);
  renderAllCharts();
});

onMounted(() => {
  renderAllCharts();
  timer = setInterval(() => {
    nowTs.value = Date.now();
    if (mode.value === "realtime" || mode.value === "overview") {
      renderAllCharts();
    }
  }, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
  timer = null;
});
</script>

<template>
  <div class="trend-card">
    <div class="top-row">
      <div class="mode-switch" role="tablist" aria-label="趋势图模式">
        <button
          type="button"
          class="seg"
          :class="{ active: mode === 'overview' }"
          @click="mode = 'overview'"
        >
          总览模式
        </button>
        <button
          type="button"
          class="seg"
          :class="{ active: mode === 'realtime' }"
          @click="mode = 'realtime'"
        >
          实时模式（近5分钟）
        </button>
      </div>
      <div class="meta">
        <span>{{ props.deviceLabel || '未选择设备' }}</span>
        <span>窗口 {{ xRange.windowSec }}s</span>
      </div>
    </div>

    <div class="charts-wrapper">
      <div class="chart-item">
        <canvas ref="envCanvasRef" :width="chartWidth" :height="chartHeight" class="chart-canvas" />
      </div>
      <div class="chart-item">
        <canvas ref="materialCanvasRef" :width="chartWidth" :height="chartHeight" class="chart-canvas" />
      </div>
    </div>

    <p class="caption">
      总览模式起点说明：当前实现以“本次前端会话首次看到该设备”的时间作为起点；刷新页面后会重置，可能与真实项目启动时间不一致。
    </p>
  </div>
</template>

<style scoped>
.trend-card {
  border: 1px solid #c8e6c9;
  border-radius: 10px;
  background: #fff;
  padding: 0.65rem;
}
.top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}
.mode-switch {
  display: inline-flex;
  background: #f2f7f2;
  border: 1px solid #cfe2cf;
  border-radius: 8px;
  overflow: hidden;
}
.seg {
  border: none;
  background: transparent;
  padding: 0.35rem 0.7rem;
  cursor: pointer;
  color: #456148;
  font-weight: 600;
}
.seg.active {
  background: #e8f5e9;
  color: #1b5e20;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  color: #5f7a61;
  font-size: 0.8rem;
}
.charts-wrapper {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}
.chart-item {
  border: 1px solid #edf3ed;
  border-radius: 8px;
  overflow: hidden;
}
.chart-canvas {
  width: 100%;
  max-width: 100%;
  height: auto;
  display: block;
}
.caption {
  margin: 0.75rem 0 0;
  color: #78967c;
  font-size: 0.77rem;
}
@media (min-width: 1200px) {
  .charts-wrapper {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
