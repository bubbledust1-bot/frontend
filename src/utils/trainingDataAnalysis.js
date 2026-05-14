function isMissing(v) {
  return v === null || v === undefined || String(v).trim() === "";
}

function toNumber(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

function pearson(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i += 1) {
    const vx = x[i] - mx;
    const vy = y[i] - my;
    num += vx * vy;
    dx += vx * vx;
    dy += vy * vy;
  }
  const den = Math.sqrt(dx * dy);
  if (!den) return 0;
  return num / den;
}

export function parseCsvText(text) {
  const lines = String(text || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((x) => x.trim().length > 0);
  if (!lines.length) return { columns: [], rows: [] };
  const headers = lines[0].split(",").map((x) => x.trim());
  const rows = lines.slice(1).map((line) => {
    const vals = line.split(",");
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = vals[i] ?? "";
    });
    return obj;
  });
  return { columns: headers, rows };
}

export function datasetToRows(dataset) {
  const columns = Array.isArray(dataset?.columns) ? dataset.columns : [];
  const rows = Array.isArray(dataset?.rows) ? dataset.rows : [];
  const editable = columns.filter((c) => c?.role !== "id");
  return rows.map((r) => {
    const out = {};
    editable.forEach((c) => {
      out[c.key] = r?.cells?.[c.key] ?? "";
    });
    return out;
  });
}

export function analyzeRows(rows, { targetColumn } = {}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  if (!safeRows.length) {
    return {
      sample_count: 0,
      feature_count: 0,
      target_column: targetColumn || "",
      duplicate_rows: 0,
      missing_rate: 0,
      numeric_columns: [],
      non_numeric_columns: [],
      missing_by_column: {},
      heatmap: { columns: [], matrix: [] },
      histograms: {},
      top_related_to_target: [],
      can_analyze: false,
      message: "暂无可分析数据",
    };
  }

  const columns = Object.keys(safeRows[0] || {});
  const target = columns.includes(targetColumn) ? targetColumn : columns[columns.length - 1];

  const duplicate_rows = safeRows.length - new Set(safeRows.map((x) => JSON.stringify(x))).size;

  const missing_by_column = {};
  const numeric_columns = [];
  const non_numeric_columns = [];

  for (const col of columns) {
    const vals = safeRows.map((r) => r[col]);
    const miss = vals.filter((v) => isMissing(v)).length;
    missing_by_column[col] = miss / safeRows.length;

    const valid = vals.filter((v) => !isMissing(v));
    const nums = valid.map((v) => toNumber(v));
    const isNum = valid.length > 0 && nums.every((v) => v !== null);
    if (isNum) numeric_columns.push(col);
    else non_numeric_columns.push(col);
  }

  const missing_rate =
    Object.values(missing_by_column).reduce((a, b) => a + Number(b || 0), 0) /
    Math.max(1, columns.length);

  const numericForHeat = numeric_columns;
  const matrix = numericForHeat.map((c1) =>
    numericForHeat.map((c2) => {
      if (c1 === c2) return 1;
      const pairs = safeRows
        .map((r) => [toNumber(r[c1]), toNumber(r[c2])])
        .filter((p) => p[0] !== null && p[1] !== null);
      if (pairs.length < 2) return 0;
      const x = pairs.map((p) => p[0]);
      const y = pairs.map((p) => p[1]);
      return Number(pearson(x, y).toFixed(4));
    }),
  );

  const histograms = {};
  for (const c of numeric_columns) {
    const vals = safeRows.map((r) => toNumber(r[c])).filter((v) => v !== null);
    if (!vals.length) continue;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const bins = 12;
    const width = max > min ? (max - min) / bins : 1;
    const counts = new Array(bins).fill(0);
    vals.forEach((v) => {
      let idx = Math.floor((v - min) / width);
      if (idx < 0) idx = 0;
      if (idx >= bins) idx = bins - 1;
      counts[idx] += 1;
    });
    histograms[c] = { min, max, bins, counts };
  }

  const top_related_to_target = [];
  if (numeric_columns.includes(target)) {
    numeric_columns
      .filter((c) => c !== target)
      .forEach((c) => {
        const i = numericForHeat.indexOf(c);
        const j = numericForHeat.indexOf(target);
        const score = i >= 0 && j >= 0 ? matrix[i][j] : 0;
        top_related_to_target.push({ column: c, score: Number(score.toFixed(4)) });
      });
    top_related_to_target.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
  }

  return {
    sample_count: safeRows.length,
    feature_count: Math.max(0, columns.length - 1),
    all_columns: columns,
    target_column: target,
    duplicate_rows,
    missing_rate: Number(missing_rate.toFixed(4)),
    numeric_columns,
    non_numeric_columns,
    missing_by_column,
    heatmap: { columns: numericForHeat, matrix },
    histograms,
    top_related_to_target: top_related_to_target.slice(0, 8),
    can_analyze: numeric_columns.length >= 2,
    message: numeric_columns.length >= 2 ? "" : "数值列不足，无法计算相关性热图",
  };
}
